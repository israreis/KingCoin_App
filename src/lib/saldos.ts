import type { Categoria, Meta, Tipo } from '@/types';

import { MESES_ABREV, isoParaData, normalizar, paraISO } from './format';

type ComTipo = { valor: number; categorias: Pick<Categoria, 'nome' | 'tipo'> };

export type Totais = { receitas: number; despesas: number; economia: number };

export function totaisPorTipo(movs: ComTipo[]): Totais {
  const totais: Totais = { receitas: 0, despesas: 0, economia: 0 };
  for (const mov of movs) {
    if (mov.categorias.tipo === 'RECEITA') totais.receitas += mov.valor;
    else if (mov.categorias.tipo === 'DESPESA') totais.despesas += mov.valor;
    else totais.economia += mov.valor;
  }
  return totais;
}

export type Resumo = { valor: number; variacao: number; porcentagem: number };

/** Compara o valor atual com o anterior (mesma regra do KingCoin web). */
export function resumo(atual: number, anterior: number): Resumo {
  if (anterior !== 0) {
    const variacao = atual - anterior;
    return { valor: atual, variacao, porcentagem: (variacao / Math.abs(anterior)) * 100 };
  }
  if (atual > 0) return { valor: atual, variacao: atual, porcentagem: 100 };
  if (atual < 0) return { valor: atual, variacao: atual, porcentagem: -100 };
  return { valor: atual, variacao: 0, porcentagem: 0 };
}

export function progressoMeta(meta: Pick<Meta, 'valor_meta' | 'valor_atual'>): number {
  if (meta.valor_meta <= 0) return 0;
  return Math.min((meta.valor_atual / meta.valor_meta) * 100, 100);
}

// --- Dados dos gráficos do dashboard ---------------------------------------

type ComData = ComTipo & { data: string };

/** Saldo acumulado (receitas - despesas) no fim de cada um dos últimos `qtd` meses. */
export function evolucaoCarteira(movs: ComData[], qtd = 6, hoje: Date = new Date()) {
  const labels: string[] = [];
  const valores: number[] = [];

  for (let atras = qtd - 1; atras >= 0; atras--) {
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth() - atras, 1);
    const ultimoDia = new Date(primeiroDia.getFullYear(), primeiroDia.getMonth() + 1, 0);

    let saldo = 0;
    for (const mov of movs) {
      if (isoParaData(mov.data) > ultimoDia) continue;
      if (mov.categorias.tipo === 'RECEITA') saldo += mov.valor;
      else if (mov.categorias.tipo === 'DESPESA') saldo -= mov.valor;
    }

    labels.push(MESES_ABREV[primeiroDia.getMonth()]);
    valores.push(saldo);
  }
  return { labels, valores };
}

/** Total do mês atual agrupado por categoria, do maior para o menor. */
export function totaisDoMesPorCategoria(movs: ComData[], tipo: Tipo, hoje: Date = new Date()) {
  const porCategoria = new Map<string, number>();

  for (const mov of movs) {
    if (mov.categorias.tipo !== tipo) continue;
    const data = isoParaData(mov.data);
    if (data.getFullYear() !== hoje.getFullYear() || data.getMonth() !== hoje.getMonth()) continue;
    porCategoria.set(mov.categorias.nome, (porCategoria.get(mov.categorias.nome) ?? 0) + mov.valor);
  }

  return [...porCategoria.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/** Receitas e despesas de cada um dos últimos `qtd` meses (para o gráfico de barras). */
export function receitasDespesasPorMes(movs: ComData[], qtd = 6, hoje: Date = new Date()) {
  const labels: string[] = [];
  const receitas: number[] = [];
  const despesas: number[] = [];

  for (let atras = qtd - 1; atras >= 0; atras--) {
    const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - atras, 1);
    let totalReceitas = 0;
    let totalDespesas = 0;

    for (const mov of movs) {
      const data = isoParaData(mov.data);
      if (data.getFullYear() !== referencia.getFullYear()) continue;
      if (data.getMonth() !== referencia.getMonth()) continue;

      if (mov.categorias.tipo === 'RECEITA') totalReceitas += mov.valor;
      else if (mov.categorias.tipo === 'DESPESA') totalDespesas += mov.valor;
    }

    labels.push(MESES_ABREV[referencia.getMonth()]);
    receitas.push(totalReceitas);
    despesas.push(totalDespesas);
  }
  return { labels, receitas, despesas };
}

type ComDescricao = ComData & { descricao: string | null; categoria_id: number };

type RecorrenciaBase = {
  categoria_id: number;
  valor: number;
  descricao: string | null;
  dia_do_mes: number;
  inicio: string;
  ativa: boolean;
  categorias: Pick<Categoria, 'tipo'>;
};

/** Categorias que, por natureza, são pagas uma vez por mês. */
const CATEGORIAS_FIXAS = new Set(['aluguel', 'moradia', 'condominio', 'financiamento']);

/** Meses anteriores usados para reconhecer gastos repetidos e calcular o ritmo histórico. */
const MESES_DE_HISTORICO = 3;

const mesmoMes = (data: Date, referencia: Date) =>
  data.getFullYear() === referencia.getFullYear() && data.getMonth() === referencia.getMonth();

const valorParecido = (a: number, b: number) => Math.abs(a - b) <= Math.max(a, b) * 0.1;

/**
 * Despesa fixa = paga uma vez por mês: categoria fixa (aluguel, moradia...),
 * gerada por uma recorrência, ou repetida no mês anterior com a mesma descrição
 * e valor parecido (assinaturas, mensalidades).
 */
export function ehDespesaFixa(
  mov: ComDescricao,
  todas: ComDescricao[],
  recorrencias: RecorrenciaBase[] = [],
): boolean {
  if (mov.categorias.tipo !== 'DESPESA') return false;
  if (CATEGORIAS_FIXAS.has(normalizar(mov.categorias.nome))) return true;

  const descricao = normalizar(mov.descricao?.trim() ?? '');
  const daRecorrencia = recorrencias.some(
    (r) =>
      r.categorias.tipo === 'DESPESA' &&
      r.categoria_id === mov.categoria_id &&
      Math.abs(r.valor - mov.valor) < 0.01 &&
      normalizar(r.descricao?.trim() ?? '') === descricao,
  );
  if (daRecorrencia) return true;
  if (!descricao) return false;

  const data = isoParaData(mov.data);
  const mesAnterior = new Date(data.getFullYear(), data.getMonth() - 1, 1);
  return todas.some(
    (outra) =>
      outra !== mov &&
      outra.categorias.tipo === 'DESPESA' &&
      outra.categoria_id === mov.categoria_id &&
      mesmoMes(isoParaData(outra.data), mesAnterior) &&
      normalizar(outra.descricao?.trim() ?? '') === descricao &&
      valorParecido(outra.valor, mov.valor),
  );
}

/**
 * Insights do mês separando despesas fixas (contam uma vez) de variáveis (projetadas).
 * O ritmo dos gastos variáveis combina este mês com a média dos meses anteriores:
 * no começo do mês pesa mais o histórico, no fim pesa mais o mês atual.
 */
export function insightsDoMes(
  movs: ComDescricao[],
  recorrencias: RecorrenciaBase[] = [],
  hoje: Date = new Date(),
) {
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasPassados = Math.max(1, hoje.getDate());
  const diasRestantes = diasNoMes - hoje.getDate();

  const doMes = movs.filter((mov) => mesmoMes(isoParaData(mov.data), hoje));
  const despesas = doMes.filter((mov) => mov.categorias.tipo === 'DESPESA');
  const fixas = despesas.filter((mov) => ehDespesaFixa(mov, movs, recorrencias));
  const variaveis = despesas.filter((mov) => !fixas.includes(mov));

  const soma = (lista: ComDescricao[]) => lista.reduce((total, mov) => total + mov.valor, 0);
  const receitasMes = soma(doMes.filter((mov) => mov.categorias.tipo === 'RECEITA'));
  const despesasFixas = soma(fixas);
  const despesasVariaveis = soma(variaveis);

  // Ritmo histórico: gastos variáveis dos meses anteriores que tiveram movimentações.
  let variaveisHistorico = 0;
  let diasHistorico = 0;
  for (let atras = 1; atras <= MESES_DE_HISTORICO; atras++) {
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() - atras, 1);
    const doMesAnterior = movs.filter((mov) => mesmoMes(isoParaData(mov.data), mes));
    if (doMesAnterior.length === 0) continue;
    diasHistorico += new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    variaveisHistorico += soma(
      doMesAnterior.filter((mov) => mov.categorias.tipo === 'DESPESA' && !ehDespesaFixa(mov, movs, recorrencias)),
    );
  }

  const ritmoAtual = despesasVariaveis / diasPassados;
  const usouHistorico = diasHistorico > 0;
  const peso = diasPassados / diasNoMes;
  const mediaDiariaVariavel = usouHistorico
    ? peso * ritmoAtual + (1 - peso) * (variaveisHistorico / diasHistorico)
    : ritmoAtual;

  // Recorrências que ainda vão cair neste mês.
  const hojeIso = paraISO(hoje);
  let receitasPendentes = 0;
  let despesasPendentes = 0;
  for (const r of recorrencias) {
    if (!r.ativa || r.categorias.tipo === 'ECONOMIA') continue;
    const dia = Math.min(r.dia_do_mes, diasNoMes);
    const data = paraISO(new Date(hoje.getFullYear(), hoje.getMonth(), dia));
    if (data <= hojeIso || r.inicio > data) continue;
    if (r.categorias.tipo === 'RECEITA') receitasPendentes += r.valor;
    else despesasPendentes += r.valor;
  }

  const despesasPrevistas =
    despesasFixas + despesasPendentes + despesasVariaveis + mediaDiariaVariavel * diasRestantes;
  const receitasPrevistas = receitasMes + receitasPendentes;

  const maiorGasto = (variaveis.length > 0 ? variaveis : despesas).reduce<ComDescricao | null>(
    (maior, mov) => (!maior || mov.valor > maior.valor ? mov : maior),
    null,
  );
  const categoriaTop = totaisDoMesPorCategoria(variaveis, 'DESPESA', hoje)[0] ?? null;

  return {
    temDespesas: despesas.length > 0,
    receitasMes,
    despesasMes: despesasFixas + despesasVariaveis,
    despesasFixas,
    despesasVariaveis,
    despesasPendentes,
    receitasPendentes,
    mediaDiariaVariavel,
    despesasPrevistas,
    saldoProjetado: receitasPrevistas - despesasPrevistas,
    maiorGasto,
    categoriaTop,
    usouHistorico,
  };
}

// --- Orçamentos -----------------------------------------------------

/** Soma das despesas por categoria (id da categoria -> total). */
export function gastosPorCategoria(
  movs: (ComTipo & { categoria_id: number })[],
): Map<number, number> {
  const gastos = new Map<number, number>();
  for (const mov of movs) {
    if (mov.categorias.tipo !== 'DESPESA') continue;
    gastos.set(mov.categoria_id, (gastos.get(mov.categoria_id) ?? 0) + mov.valor);
  }
  return gastos;
}

export type NivelOrcamento = 'ok' | 'atencao' | 'estourado';

export function statusOrcamento(gasto: number, limite: number) {
  const porcentagem = limite > 0 ? (gasto / limite) * 100 : 0;
  const nivel: NivelOrcamento =
    porcentagem >= 100 ? 'estourado' : porcentagem >= 80 ? 'atencao' : 'ok';
  return { porcentagem, nivel };
}

