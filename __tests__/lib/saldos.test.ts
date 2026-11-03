import {
  ehDespesaFixa,
  evolucaoCarteira,
  gastosPorCategoria,
  insightsDoMes,
  progressoMeta,
  receitasDespesasPorMes,
  resumo,
  statusOrcamento,
  totaisDoMesPorCategoria,
  totaisPorTipo,
} from '@/lib/saldos';
import type { Tipo } from '@/types';

type Mov = {
  valor: number;
  data: string;
  descricao: string | null;
  categoria_id: number;
  categorias: { nome: string; tipo: Tipo };
};

let id = 0;
function mov(tipo: Tipo, valor: number, data: string, nome = 'Outros'): Mov {
  id += 1;
  return { valor, data, descricao: `${nome} ${id}`, categoria_id: nome.length, categorias: { nome, tipo } };
}

describe('totaisPorTipo', () => {
  it('soma cada tipo separadamente', () => {
    const movs = [
      mov('RECEITA', 1000, '2026-11-01'),
      mov('RECEITA', 250.5, '2026-11-02'),
      mov('DESPESA', 300, '2026-11-03'),
      mov('ECONOMIA', 200, '2026-11-04'),
    ];
    expect(totaisPorTipo(movs)).toEqual({ receitas: 1250.5, despesas: 300, economia: 200 });
  });

  it('lista vazia dá zero em tudo', () => {
    expect(totaisPorTipo([])).toEqual({ receitas: 0, despesas: 0, economia: 0 });
  });
});

describe('resumo (variação entre períodos)', () => {
  it('calcula variação e porcentagem', () => {
    expect(resumo(150, 100)).toEqual({ valor: 150, variacao: 50, porcentagem: 50 });
    expect(resumo(50, 100)).toEqual({ valor: 50, variacao: -50, porcentagem: -50 });
  });

  it('usa o valor absoluto do anterior quando ele é negativo', () => {
    expect(resumo(50, -100)).toEqual({ valor: 50, variacao: 150, porcentagem: 150 });
  });

  it('trata anterior zero sem dividir por zero', () => {
    expect(resumo(10, 0)).toEqual({ valor: 10, variacao: 10, porcentagem: 100 });
    expect(resumo(-5, 0)).toEqual({ valor: -5, variacao: -5, porcentagem: -100 });
    expect(resumo(0, 0)).toEqual({ valor: 0, variacao: 0, porcentagem: 0 });
  });
});

describe('progressoMeta', () => {
  it('calcula a porcentagem e limita a 100', () => {
    expect(progressoMeta({ valor_meta: 200, valor_atual: 50 })).toBe(25);
    expect(progressoMeta({ valor_meta: 200, valor_atual: 300 })).toBe(100);
  });

  it('meta zerada ou negativa dá 0', () => {
    expect(progressoMeta({ valor_meta: 0, valor_atual: 50 })).toBe(0);
    expect(progressoMeta({ valor_meta: -1, valor_atual: 50 })).toBe(0);
  });
});

describe('evolucaoCarteira', () => {
  const movs = [
    mov('RECEITA', 1000, '2025-10-05'),
    mov('DESPESA', 200, '2025-12-20'),
    mov('ECONOMIA', 500, '2026-01-10'),
    mov('RECEITA', 100, '2026-02-01'),
    mov('RECEITA', 999, '2026-03-01'),
  ];

  it('acumula o saldo no fim de cada mês, atravessando o ano', () => {
    const r = evolucaoCarteira(movs, 6, new Date(2026, 1, 15));
    expect(r.labels).toEqual(['set', 'out', 'nov', 'dez', 'jan', 'fev']);
    expect(r.valores).toEqual([0, 1000, 1000, 800, 800, 900]);
  });

  it('economia não altera o saldo e datas futuras são ignoradas', () => {
    const r = evolucaoCarteira(movs, 1, new Date(2026, 1, 15));
    expect(r.valores).toEqual([900]);
  });
});

describe('totaisDoMesPorCategoria', () => {
  it('agrupa só o tipo e o mês pedidos, do maior para o menor', () => {
    const movs = [
      mov('DESPESA', 50, '2026-11-02', 'Mercado'),
      mov('DESPESA', 30, '2026-11-20', 'Mercado'),
      mov('DESPESA', 100, '2026-11-05', 'Lazer'),
      mov('DESPESA', 999, '2026-10-31', 'Lazer'),
      mov('RECEITA', 5000, '2026-11-01', 'Salário'),
    ];
    expect(totaisDoMesPorCategoria(movs, 'DESPESA', new Date(2026, 10, 25))).toEqual([
      { nome: 'Lazer', valor: 100 },
      { nome: 'Mercado', valor: 80 },
    ]);
  });
});

describe('receitasDespesasPorMes', () => {
  it('separa receitas e despesas por mês e ignora economia', () => {
    const movs = [
      mov('RECEITA', 1000, '2025-11-10'),
      mov('DESPESA', 400, '2025-12-15'),
      mov('ECONOMIA', 700, '2025-12-16'),
      mov('RECEITA', 300, '2026-01-02'),
      mov('DESPESA', 100, '2026-01-03'),
    ];
    expect(receitasDespesasPorMes(movs, 3, new Date(2026, 0, 20))).toEqual({
      labels: ['nov', 'dez', 'jan'],
      receitas: [1000, 0, 300],
      despesas: [0, 400, 100],
    });
  });
});

describe('insightsDoMes', () => {
  const hoje = new Date(2026, 10, 3); // 3 de novembro; novembro tem 30 dias

  it('aluguel conta uma vez só (caso real: salário 6.000 e aluguel 1.850 no dia 3)', () => {
    const movs = [mov('RECEITA', 6000, '2026-11-01', 'Salário'), mov('DESPESA', 1850, '2026-11-01', 'Aluguel')];
    const r = insightsDoMes(movs, [], hoje);

    expect(r.despesasFixas).toBe(1850);
    expect(r.despesasVariaveis).toBe(0);
    expect(r.mediaDiariaVariavel).toBe(0);
    expect(r.despesasPrevistas).toBe(1850);
    expect(r.saldoProjetado).toBe(4150);
  });

  it('projeta só os gastos variáveis pelo ritmo do mês quando não há histórico', () => {
    const dia10 = new Date(2026, 10, 10);
    const movs = [
      mov('RECEITA', 1000, '2026-11-01', 'Salário'),
      mov('DESPESA', 500, '2026-11-01', 'Aluguel'),
      mov('DESPESA', 100, '2026-11-03', 'Lazer'),
      mov('DESPESA', 50, '2026-11-08', 'Mercado'),
    ];
    const r = insightsDoMes(movs, [], dia10);

    expect(r.usouHistorico).toBe(false);
    expect(r.mediaDiariaVariavel).toBeCloseTo(15, 10);
    expect(r.despesasPrevistas).toBeCloseTo(500 + 150 + 15 * 20, 10);
    expect(r.saldoProjetado).toBeCloseTo(1000 - 950, 10);
    expect(r.maiorGasto?.valor).toBe(100);
    expect(r.categoriaTop).toEqual({ nome: 'Lazer', valor: 100 });
  });

  it('combina o ritmo do mês com a média dos meses anteriores', () => {
    const dia10 = new Date(2026, 10, 10);
    const movs = [
      mov('DESPESA', 300, '2026-09-15', 'Mercado'),
      mov('DESPESA', 310, '2026-10-15', 'Mercado'),
      mov('DESPESA', 1850, '2026-10-01', 'Aluguel'),
      mov('DESPESA', 150, '2026-11-05', 'Lazer'),
    ];
    const r = insightsDoMes(movs, [], dia10);
    const ritmoHistorico = 610 / 61; // setembro (30) + outubro (31), sem o aluguel
    const esperado = (10 / 30) * 15 + (20 / 30) * ritmoHistorico;

    expect(r.usouHistorico).toBe(true);
    expect(r.mediaDiariaVariavel).toBeCloseTo(esperado, 10);
    expect(r.despesasPrevistas).toBeCloseTo(150 + esperado * 20, 10);
  });

  it('soma as recorrências que ainda vão cair no mês e ignora as já vencidas ou pausadas', () => {
    const recorrencias = [
      { categoria_id: 1, valor: 6000, descricao: null, dia_do_mes: 5, inicio: '2026-01-01', ativa: true, categorias: { tipo: 'RECEITA' as Tipo } },
      { categoria_id: 2, valor: 90, descricao: 'Internet', dia_do_mes: 20, inicio: '2026-01-01', ativa: true, categorias: { tipo: 'DESPESA' as Tipo } },
      { categoria_id: 3, valor: 999, descricao: null, dia_do_mes: 2, inicio: '2026-01-01', ativa: true, categorias: { tipo: 'DESPESA' as Tipo } },
      { categoria_id: 4, valor: 777, descricao: null, dia_do_mes: 25, inicio: '2026-01-01', ativa: false, categorias: { tipo: 'DESPESA' as Tipo } },
      { categoria_id: 5, valor: 555, descricao: null, dia_do_mes: 25, inicio: '2026-12-01', ativa: true, categorias: { tipo: 'DESPESA' as Tipo } },
    ];
    const r = insightsDoMes([mov('DESPESA', 10, '2026-11-01', 'Mercado')], recorrencias, hoje);

    expect(r.receitasPendentes).toBe(6000);
    expect(r.despesasPendentes).toBe(90);
  });

  it('sem movimentações no mês não quebra', () => {
    const r = insightsDoMes([], [], hoje);
    expect(r).toMatchObject({ temDespesas: false, despesasMes: 0, maiorGasto: null, categoriaTop: null, mediaDiariaVariavel: 0 });
  });

  it('no dia 1 a média usa um dia, sem dividir por zero', () => {
    const r = insightsDoMes([mov('DESPESA', 31, '2026-12-01', 'Mercado')], [], new Date(2026, 11, 1));
    expect(r.mediaDiariaVariavel).toBe(31);
    expect(r.despesasPrevistas).toBe(31 * 31);
  });
});

describe('ehDespesaFixa', () => {
  it('reconhece categorias fixas, mesmo com acento ou maiúsculas', () => {
    expect(ehDespesaFixa(mov('DESPESA', 1, '2026-11-01', 'ALUGUEL'), [])).toBe(true);
    expect(ehDespesaFixa(mov('DESPESA', 1, '2026-11-01', 'Condomínio'), [])).toBe(true);
  });

  it('reconhece a despesa gerada por uma recorrência', () => {
    const netflix = { ...mov('DESPESA', 55.9, '2026-11-10', 'Lazer'), descricao: 'Netflix' };
    const rec = { categoria_id: netflix.categoria_id, valor: 55.9, descricao: 'Netflix', dia_do_mes: 10, inicio: '2026-01-01', ativa: true, categorias: { tipo: 'DESPESA' as Tipo } };
    expect(ehDespesaFixa(netflix, [], [rec])).toBe(true);
  });

  it('reconhece gasto repetido no mês anterior com valor parecido', () => {
    const atual = { ...mov('DESPESA', 99, '2026-11-05', 'Educação'), descricao: 'Academia' };
    const anterior = { ...mov('DESPESA', 95, '2026-10-05', 'Educação'), descricao: 'academia' };
    expect(ehDespesaFixa(atual, [atual, anterior])).toBe(true);
  });

  it('não marca como fixa quando o valor mudou muito ou não houve no mês anterior', () => {
    const atual = { ...mov('DESPESA', 300, '2026-11-05', 'Mercado'), descricao: 'Mercado' };
    const anteriorDiferente = { ...mov('DESPESA', 120, '2026-10-05', 'Mercado'), descricao: 'Mercado' };
    const doisMesesAtras = { ...mov('DESPESA', 300, '2026-09-05', 'Mercado'), descricao: 'Mercado' };
    expect(ehDespesaFixa(atual, [atual, anteriorDiferente, doisMesesAtras])).toBe(false);
  });

  it('receita e despesa sem descrição não são fixas por repetição', () => {
    expect(ehDespesaFixa(mov('RECEITA', 6000, '2026-11-01', 'Aluguel'), [])).toBe(false);
    const semDescricao = { ...mov('DESPESA', 50, '2026-11-05', 'Lazer'), descricao: null };
    expect(ehDespesaFixa(semDescricao, [{ ...semDescricao, data: '2026-10-05' }])).toBe(false);
  });
});

describe('orçamentos', () => {
  it('gastosPorCategoria soma só despesas por categoria', () => {
    const movs = [
      { valor: 10, categoria_id: 1, categorias: { nome: 'A', tipo: 'DESPESA' as Tipo } },
      { valor: 15, categoria_id: 1, categorias: { nome: 'A', tipo: 'DESPESA' as Tipo } },
      { valor: 99, categoria_id: 1, categorias: { nome: 'A', tipo: 'RECEITA' as Tipo } },
      { valor: 5, categoria_id: 2, categorias: { nome: 'B', tipo: 'DESPESA' as Tipo } },
    ];
    const gastos = gastosPorCategoria(movs);
    expect(gastos.get(1)).toBe(25);
    expect(gastos.get(2)).toBe(5);
    expect(gastos.size).toBe(2);
  });

  it.each([
    [0, 100, 'ok'],
    [79.99, 100, 'ok'],
    [80, 100, 'atencao'],
    [99.99, 100, 'atencao'],
    [100, 100, 'estourado'],
    [250, 100, 'estourado'],
  ])('gasto %p de limite %p é %p', (gasto, limite, nivel) => {
    expect(statusOrcamento(gasto, limite).nivel).toBe(nivel);
  });

  it('limite zero não divide por zero', () => {
    expect(statusOrcamento(10, 0)).toEqual({ porcentagem: 0, nivel: 'ok' });
  });
});

