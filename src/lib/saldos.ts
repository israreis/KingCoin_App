import type { Categoria, Conta, Meta, Tipo } from '@/types';

import { MESES_ABREV, isoParaData } from './format';

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

type ComDescricao = ComData & { descricao: string | null };

/** Números de apoio do mês atual: maiores gastos, média diária e projeção até o fim do mês. */
export function insightsDoMes(movs: ComDescricao[], hoje: Date = new Date()) {
  const doMes = movs.filter((mov) => {
    const data = isoParaData(mov.data);
    return data.getFullYear() === hoje.getFullYear() && data.getMonth() === hoje.getMonth();
  });

  const despesas = doMes.filter((mov) => mov.categorias.tipo === 'DESPESA');
  const receitasMes = doMes
    .filter((mov) => mov.categorias.tipo === 'RECEITA')
    .reduce((soma, mov) => soma + mov.valor, 0);
  const despesasMes = despesas.reduce((soma, mov) => soma + mov.valor, 0);

  const maiorGasto = despesas.reduce<ComDescricao | null>(
    (maior, mov) => (!maior || mov.valor > maior.valor ? mov : maior),
    null,
  );
  const categoriaTop = totaisDoMesPorCategoria(movs, 'DESPESA', hoje)[0] ?? null;

  const diasPassados = Math.max(1, hoje.getDate());
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const mediaDiaria = despesasMes / diasPassados;
  const despesasProjetadas = mediaDiaria * diasNoMes;

  return {
    temDespesas: despesas.length > 0,
    receitasMes,
    despesasMes,
    maiorGasto,
    categoriaTop,
    mediaDiaria,
    despesasProjetadas,
    saldoProjetado: receitasMes - despesasProjetadas,
  };
}

// --- Orçamentos e contas -----------------------------------------------------

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

/** Saldo de cada conta (saldo inicial + receitas - despesas). `null` = movimentações sem conta. */
export function saldoPorConta(
  contas: Conta[],
  movs: (ComTipo & { conta_id: number | null })[],
) {
  const linhas = contas.map((conta) => ({
    id: conta.id as number | null,
    nome: conta.nome,
    saldoInicial: conta.saldo_inicial,
    receitas: 0,
    despesas: 0,
  }));
  const semConta = { id: null as number | null, nome: 'Sem conta', saldoInicial: 0, receitas: 0, despesas: 0 };

  for (const mov of movs) {
    const linha = linhas.find((l) => l.id === mov.conta_id) ?? semConta;
    if (mov.categorias.tipo === 'RECEITA') linha.receitas += mov.valor;
    else if (mov.categorias.tipo === 'DESPESA') linha.despesas += mov.valor;
  }

  const todas = semConta.receitas + semConta.despesas > 0 ? [...linhas, semConta] : linhas;
  return todas.map((l) => ({ ...l, saldo: l.saldoInicial + l.receitas - l.despesas }));
}
