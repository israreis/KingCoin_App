import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

import type { NovaMovimentacao } from '@/types';

import { ehErroDeRede } from './erros';

// --- Estado "sem conexão" ----------------------------------------------------

let offline = false;
const ouvintes = new Set<() => void>();

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function definirOffline(valor: boolean) {
  if (offline === valor) return;
  offline = valor;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function useOffline(): boolean {
  return useSyncExternalStore(assinar, () => offline, () => false);
}

// --- Cache de leitura --------------------------------------------------------

const PREFIXO = 'kingcoin:cache:';
const CHAVE_PENDENCIAS = 'kingcoin:pendencias';

async function lerJson<T>(chave: string): Promise<T | null> {
  try {
    const bruto = await AsyncStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Busca no servidor e guarda uma cópia. Sem internet, devolve a última cópia salva.
 */
export async function comCache<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  try {
    const dados = await buscar();
    definirOffline(false);
    AsyncStorage.setItem(PREFIXO + chave, JSON.stringify(dados)).catch(() => undefined);
    return dados;
  } catch (e) {
    if (!ehErroDeRede(e)) throw e;
    definirOffline(true);
    const salvo = await lerJson<T>(PREFIXO + chave);
    if (salvo !== null) return salvo;
    throw e;
  }
}

/** Apaga cache e pendências (ao sair da conta). */
export async function limparCache(): Promise<void> {
  try {
    const chaves = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(
      chaves.filter((c) => c.startsWith(PREFIXO) || c === CHAVE_PENDENCIAS),
    );
  } catch {
    // sem problemas: o cache é só uma conveniência
  }
}

/** Sessão gravada pelo Supabase no aparelho (usada quando não dá para renová-la offline). */
export async function lerSessaoSalva(): Promise<Session | null> {
  try {
    const chaves = await AsyncStorage.getAllKeys();
    const chave = chaves.find((c) => c.startsWith('sb-') && c.endsWith('-auth-token'));
    if (!chave) return null;
    const sessao = await lerJson<Session>(chave);
    return sessao?.user ? sessao : null;
  } catch {
    return null;
  }
}

// --- Fila de movimentações criadas sem internet ---------------------------------

export type Pendencia = { localId: number; dados: NovaMovimentacao };

export async function lerPendencias(): Promise<Pendencia[]> {
  return (await lerJson<Pendencia[]>(CHAVE_PENDENCIAS)) ?? [];
}

export async function adicionarPendencia(dados: NovaMovimentacao): Promise<void> {
  const lista = await lerPendencias();
  // Ids locais negativos e únicos, mesmo se duas forem criadas no mesmo milissegundo.
  const menor = lista.reduce((m, p) => Math.min(m, p.localId), 0);
  lista.push({ localId: Math.min(-Date.now(), menor - 1), dados });
  await AsyncStorage.setItem(CHAVE_PENDENCIAS, JSON.stringify(lista));
}

/** Envia as pendências; para na primeira falha de conexão. Devolve quantas foram enviadas. */
export async function sincronizarPendencias(
  enviar: (dados: NovaMovimentacao) => Promise<void>,
): Promise<number> {
  const lista = await lerPendencias();
  if (lista.length === 0) return 0;

  const restantes: Pendencia[] = [];
  let enviadas = 0;

  for (let i = 0; i < lista.length; i++) {
    try {
      await enviar(lista[i].dados);
      enviadas++;
    } catch (e) {
      if (ehErroDeRede(e)) {
        restantes.push(...lista.slice(i));
        break;
      }
      // Erro de validação (ex.: categoria apagada): descarta para não travar a fila.
    }
  }

  await AsyncStorage.setItem(CHAVE_PENDENCIAS, JSON.stringify(restantes));
  return enviadas;
}
