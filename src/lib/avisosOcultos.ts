import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const CHAVE = 'kingcoin:avisos-ocultos';

/**
 * Avisos de orçamento que o usuário ocultou. Cada aviso tem uma chave própria
 * (orçamento + nível + mês), então ocultar "atenção" não esconde um futuro "estourado"
 * nem o aviso do mês seguinte.
 */
export function chaveAvisoOrcamento(id: number, nivel: string, mes: string): string {
  return `orcamento:${id}:${nivel}:${mes}`;
}

export function useAvisosOcultos() {
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((texto) => {
        const lista = texto ? (JSON.parse(texto) as unknown) : [];
        if (Array.isArray(lista)) setOcultos(new Set(lista.map(String)));
      })
      .catch(() => {});
  }, []);

  const ocultar = useCallback((chaves: string[]) => {
    setOcultos((atuais) => {
      const novos = new Set(atuais);
      chaves.forEach((c) => novos.add(c));
      AsyncStorage.setItem(CHAVE, JSON.stringify([...novos])).catch(() => {});
      return novos;
    });
  }, []);

  return { ocultos, ocultar };
}
