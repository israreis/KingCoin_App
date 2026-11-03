import * as ImagePicker from 'expo-image-picker';

import type {
  Categoria,
  Conta,
  Meta,
  Movimentacao,
  NovaConta,
  NovaMeta,
  NovaMovimentacao,
  NovaRecorrencia,
  Orcamento,
  Perfil,
  Recorrencia,
  Tipo,
} from '@/types';

import { ehErroDeRede, falhar } from './erros';
import { hojeISO, moeda } from './format';
import { adicionarPendencia, comCache, lerPendencias, lerSessaoSalva, sincronizarPendencias } from './offline';
import { calcularPeriodo } from './periodos';
import { supabase } from './supabase';

const CAMPOS_CATEGORIA = 'id, nome, tipo, user_id';
const CAMPOS_MOVIMENTACAO = `id, data, valor, descricao, categoria_id, conta_id, comprovante_path, categorias(${CAMPOS_CATEGORIA})`;

async function usuarioAtual(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Sessão expirada. Entre novamente.');
  return id;
}

/** Prefixo de cache por usuário (funciona sem internet). */
async function chaveCache(nome: string): Promise<string> {
  let id: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    id = data.session?.user.id;
  } catch {
    id = undefined;
  }
  if (!id) id = (await lerSessaoSalva())?.user.id;
  return `${id ?? 'anonimo'}:${nome}`;
}

// --- Categorias ------------------------------------------------------------

async function buscarCategoriasServidor(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select(CAMPOS_CATEGORIA)
    .order('nome');
  falhar(error);
  return (data ?? []) as Categoria[];
}

export async function listarCategorias(): Promise<Categoria[]> {
  return comCache(await chaveCache('categorias'), buscarCategoriasServidor);
}

export async function criarCategoria(nome: string, tipo: Tipo): Promise<void> {
  const userId = await usuarioAtual();
  const { error } = await supabase.from('categorias').insert({ nome, tipo, user_id: userId });
  falhar(error);
}

export async function renomearCategoria(id: number, nome: string): Promise<void> {
  const { error } = await supabase.from('categorias').update({ nome }).eq('id', id);
  falhar(error);
}

export async function excluirCategoria(id: number): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  falhar(error);
}

// --- Movimentações ---------------------------------------------------------

type FiltroMovimentacoes = {
  inicio?: string;
  fim?: string;
  limite?: number;
};

async function buscarMovimentacoesServidor(filtro: FiltroMovimentacoes): Promise<Movimentacao[]> {
  let consulta = supabase
    .from('movimentacoes')
    .select(CAMPOS_MOVIMENTACAO)
    .order('data', { ascending: false })
    .order('id', { ascending: false });

  if (filtro.inicio) consulta = consulta.gte('data', filtro.inicio);
  if (filtro.fim) consulta = consulta.lte('data', filtro.fim);
  if (filtro.limite) consulta = consulta.limit(filtro.limite);

  const { data, error } = await consulta;
  falhar(error);
  return (data ?? []) as unknown as Movimentacao[];
}

let sincronizacao: Promise<number> | null = null;

/** Envia as movimentações criadas sem internet (uma sincronização por vez). */
function sincronizar(): Promise<number> {
  if (!sincronizacao) {
    sincronizacao = sincronizarPendencias(inserirMovimentacao)
      .catch(() => 0)
      .finally(() => {
        sincronizacao = null;
      });
  }
  return sincronizacao;
}

/** Junta à lista as movimentações que ainda aguardam envio. */
async function mesclarPendencias(
  lista: Movimentacao[],
  filtro: FiltroMovimentacoes,
): Promise<Movimentacao[]> {
  const pendencias = await lerPendencias();
  if (pendencias.length === 0) return lista;

  const categorias = await listarCategorias().catch(() => [] as Categoria[]);
  const locais: Movimentacao[] = [];
  for (const { localId, dados } of pendencias) {
    if (filtro.inicio && dados.data < filtro.inicio) continue;
    if (filtro.fim && dados.data > filtro.fim) continue;
    const categoria = categorias.find((c) => c.id === dados.categoria_id);
    if (!categoria) continue;
    locais.push({ id: localId, ...dados, categorias: categoria, pendente: true });
  }

  const todas = [...locais, ...lista].sort((a, b) => b.data.localeCompare(a.data));
  return filtro.limite ? todas.slice(0, filtro.limite) : todas;
}

export async function listarMovimentacoes(
  filtro: FiltroMovimentacoes = {},
): Promise<Movimentacao[]> {
  await sincronizar();
  const nome = `movs:${filtro.inicio ?? ''}:${filtro.fim ?? ''}:${filtro.limite ?? ''}`;
  const lista = await comCache(await chaveCache(nome), () => buscarMovimentacoesServidor(filtro));
  return mesclarPendencias(lista, filtro);
}

export async function buscarMovimentacao(id: number): Promise<Movimentacao> {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(CAMPOS_MOVIMENTACAO)
    .eq('id', id)
    .single();
  falhar(error);
  return data as unknown as Movimentacao;
}

async function inserirMovimentacao(dados: NovaMovimentacao): Promise<void> {
  const { error } = await supabase.from('movimentacoes').insert(dados);
  falhar(error);
}

/** Sem internet, guarda no aparelho e envia depois (`pendente: true`). */
export async function criarMovimentacao(dados: NovaMovimentacao): Promise<{ pendente: boolean }> {
  try {
    await inserirMovimentacao(dados);
    return { pendente: false };
  } catch (e) {
    if (!ehErroDeRede(e)) throw e;
    await adicionarPendencia(dados);
    return { pendente: true };
  }
}

export async function editarMovimentacao(id: number, dados: NovaMovimentacao): Promise<void> {
  const { error } = await supabase.from('movimentacoes').update(dados).eq('id', id);
  falhar(error);
}

export async function excluirMovimentacao(id: number): Promise<void> {
  // Apaga também o comprovante anexado, se houver (sem travar a exclusão se falhar).
  const { data } = await supabase
    .from('movimentacoes')
    .select('comprovante_path')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('movimentacoes').delete().eq('id', id);
  falhar(error);

  const caminho = (data as { comprovante_path: string | null } | null)?.comprovante_path;
  if (caminho) {
    await supabase.storage.from('comprovantes').remove([caminho]).catch(() => undefined);
  }
}

// --- Metas -----------------------------------------------------------------

async function buscarMetasServidor(): Promise<Meta[]> {
  const { data, error } = await supabase
    .from('metas')
    .select('id, nome, valor_meta, valor_atual, criado_em')
    .order('criado_em', { ascending: false });
  falhar(error);
  return (data ?? []) as Meta[];
}

export async function listarMetas(): Promise<Meta[]> {
  return comCache(await chaveCache('metas'), buscarMetasServidor);
}

export async function buscarMeta(id: number): Promise<Meta> {
  const { data, error } = await supabase
    .from('metas')
    .select('id, nome, valor_meta, valor_atual, criado_em')
    .eq('id', id)
    .single();
  falhar(error);
  return data as Meta;
}

export async function criarMeta(dados: NovaMeta): Promise<void> {
  const { error } = await supabase.from('metas').insert(dados);
  falhar(error);
}

export async function editarMeta(id: number, dados: NovaMeta): Promise<void> {
  const { error } = await supabase.from('metas').update(dados).eq('id', id);
  falhar(error);
}

export async function excluirMeta(id: number): Promise<void> {
  const { error } = await supabase.from('metas').delete().eq('id', id);
  falhar(error);
}

/** Soma `valor` ao que já foi guardado na meta. */
export async function aportarMeta(
  id: number,
  valor: number,
): Promise<{ meta: Meta; antes: number; depois: number }> {
  const meta = await buscarMeta(id);
  const depois = Math.round((meta.valor_atual + valor) * 100) / 100;

  const { error } = await supabase.from('metas').update({ valor_atual: depois }).eq('id', id);
  falhar(error);

  return { meta: { ...meta, valor_atual: depois }, antes: meta.valor_atual, depois };
}

// --- Orçamentos ------------------------------------------------------------

const CAMPOS_ORCAMENTO = `id, categoria_id, valor_limite, categorias(${CAMPOS_CATEGORIA})`;

async function buscarOrcamentosServidor(): Promise<Orcamento[]> {
  const { data, error } = await supabase.from('orcamentos').select(CAMPOS_ORCAMENTO).order('id');
  falhar(error);
  return (data ?? []) as unknown as Orcamento[];
}

export async function listarOrcamentos(): Promise<Orcamento[]> {
  return comCache(await chaveCache('orcamentos'), buscarOrcamentosServidor);
}

export async function buscarOrcamento(id: number): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select(CAMPOS_ORCAMENTO)
    .eq('id', id)
    .single();
  falhar(error);
  return data as unknown as Orcamento;
}

export async function criarOrcamento(categoriaId: number, valorLimite: number): Promise<void> {
  const { error } = await supabase
    .from('orcamentos')
    .insert({ categoria_id: categoriaId, valor_limite: valorLimite });
  falhar(error);
}

export async function editarOrcamento(id: number, valorLimite: number): Promise<void> {
  const { error } = await supabase
    .from('orcamentos')
    .update({ valor_limite: valorLimite })
    .eq('id', id);
  falhar(error);
}

export async function excluirOrcamento(id: number): Promise<void> {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id);
  falhar(error);
}

/**
 * Depois de lançar uma despesa, informa se ela fez a categoria atingir 80% ou 100%
 * do orçamento do mês. Devolve o texto do aviso ou null.
 */
export async function avisoDeOrcamento(
  categoriaId: number,
  dataDaDespesa: string,
  valorNovo: number,
): Promise<string | null> {
  const { inicio, fim } = calcularPeriodo('este_mes');
  if (dataDaDespesa < inicio || dataDaDespesa > fim) return null;

  const { data: orcamento } = await supabase
    .from('orcamentos')
    .select('valor_limite, categorias(nome)')
    .eq('categoria_id', categoriaId)
    .maybeSingle();
  if (!orcamento) return null;

  const { data: gastos, error } = await supabase
    .from('movimentacoes')
    .select('valor')
    .eq('categoria_id', categoriaId)
    .gte('data', inicio)
    .lte('data', fim);
  if (error) return null;

  const limite = Number((orcamento as { valor_limite: number }).valor_limite);
  const nome = (orcamento as unknown as { categorias: { nome: string } }).categorias?.nome ?? '';
  const depois = (gastos ?? []).reduce((soma, g) => soma + Number((g as { valor: number }).valor), 0);
  const antes = depois - valorNovo;

  if (antes < limite && depois >= limite) {
    return `Você ultrapassou o orçamento de "${nome}": ${moeda(depois)} de ${moeda(limite)}.`;
  }
  if (antes < limite * 0.8 && depois >= limite * 0.8) {
    return `Atenção: você já usou ${Math.round((depois / limite) * 100)}% do orçamento de "${nome}".`;
  }
  return null;
}

// --- Contas ----------------------------------------------------------------

async function buscarContasServidor(): Promise<Conta[]> {
  const { data, error } = await supabase
    .from('contas')
    .select('id, nome, saldo_inicial')
    .order('nome');
  falhar(error);
  return (data ?? []) as Conta[];
}

export async function listarContas(): Promise<Conta[]> {
  return comCache(await chaveCache('contas'), buscarContasServidor);
}

export async function criarConta(dados: NovaConta): Promise<void> {
  const { error } = await supabase.from('contas').insert(dados);
  falhar(error);
}

export async function editarConta(id: number, dados: NovaConta): Promise<void> {
  const { error } = await supabase.from('contas').update(dados).eq('id', id);
  falhar(error);
}

export async function excluirConta(id: number): Promise<void> {
  const { error } = await supabase.from('contas').delete().eq('id', id);
  falhar(error);
}

// --- Movimentações recorrentes ------------------------------------------------

const CAMPOS_RECORRENCIA = `id, categoria_id, conta_id, valor, descricao, dia_do_mes, inicio, ativa, categorias(${CAMPOS_CATEGORIA})`;

async function buscarRecorrenciasServidor(): Promise<Recorrencia[]> {
  const { data, error } = await supabase
    .from('recorrencias')
    .select(CAMPOS_RECORRENCIA)
    .order('dia_do_mes');
  falhar(error);
  return (data ?? []) as unknown as Recorrencia[];
}

export async function listarRecorrencias(): Promise<Recorrencia[]> {
  return comCache(await chaveCache('recorrencias'), buscarRecorrenciasServidor);
}

export async function buscarRecorrencia(id: number): Promise<Recorrencia> {
  const { data, error } = await supabase
    .from('recorrencias')
    .select(CAMPOS_RECORRENCIA)
    .eq('id', id)
    .single();
  falhar(error);
  return data as unknown as Recorrencia;
}

export async function criarRecorrencia(dados: NovaRecorrencia): Promise<void> {
  const { error } = await supabase.from('recorrencias').insert({ inicio: hojeISO(), ...dados });
  falhar(error);
}

export async function editarRecorrencia(id: number, dados: NovaRecorrencia): Promise<void> {
  const { error } = await supabase.from('recorrencias').update(dados).eq('id', id);
  falhar(error);
}

export async function excluirRecorrencia(id: number): Promise<void> {
  const { error } = await supabase.from('recorrencias').delete().eq('id', id);
  falhar(error);
}

/** Lança as recorrências vencidas. Devolve quantas movimentações foram criadas. */
export async function gerarRecorrencias(): Promise<number> {
  const { data, error } = await supabase.rpc('gerar_recorrencias', { p_hoje: hojeISO() });
  falhar(error);
  return typeof data === 'number' ? data : 0;
}

// --- Perfil ----------------------------------------------------------------

async function buscarPerfilServidor(userId: string): Promise<Perfil> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, sobrenome, telefone, foto_url')
    .eq('id', userId)
    .maybeSingle();
  falhar(error);
  return (data as Perfil | null) ?? { id: userId, nome: null, sobrenome: null, telefone: null, foto_url: null };
}

export async function buscarPerfil(userId: string): Promise<Perfil> {
  return comCache(await chaveCache('perfil'), () => buscarPerfilServidor(userId));
}

export async function salvarPerfil(
  userId: string,
  dados: { nome: string; sobrenome: string; telefone: string },
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...dados });
  falhar(error);

  // Mantém o nome também na sessão (usado na saudação da Carteira).
  await supabase.auth
    .updateUser({ data: { nome: dados.nome, sobrenome: dados.sobrenome } })
    .catch(() => undefined);
}

/** Abre a galeria, envia a imagem escolhida e devolve a URL pública (ou null se cancelou). */
export async function escolherEEnviarFoto(userId: string): Promise<string | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new Error('Permita o acesso às fotos para escolher uma imagem.');
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (resultado.canceled || resultado.assets.length === 0) return null;

  const resposta = await fetch(resultado.assets[0].uri);
  const arquivo = await resposta.arrayBuffer();

  const caminho = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(caminho, arquivo, { contentType: 'image/jpeg', upsert: true });
  falhar(error);

  const { data } = supabase.storage.from('avatars').getPublicUrl(caminho);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: erroPerfil } = await supabase
    .from('profiles')
    .upsert({ id: userId, foto_url: url });
  falhar(erroPerfil);

  return url;
}

// --- Conta -----------------------------------------------------------------

/** Apaga arquivos, dados e o próprio usuário. Ação definitiva. */
export async function excluirMinhaConta(userId: string): Promise<void> {
  for (const bucket of ['avatars', 'comprovantes']) {
    const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (data && data.length > 0) {
      await supabase.storage.from(bucket).remove(data.map((arquivo) => `${userId}/${arquivo.name}`));
    }
  }

  const { error } = await supabase.rpc('excluir_minha_conta');
  falhar(error);

  // A conta já não existe: apenas limpa a sessão local.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}
