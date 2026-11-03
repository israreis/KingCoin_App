import {
  evolucaoCarteira,
  gastosPorCategoria,
  insightsDoMes,
  progressoMeta,
  receitasDespesasPorMes,
  resumo,
  saldoPorConta,
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
  conta_id: number | null;
  categorias: { nome: string; tipo: Tipo };
};

let id = 0;
function mov(tipo: Tipo, valor: number, data: string, nome = 'Outros', conta_id: number | null = null): Mov {
  id += 1;
  return { valor, data, descricao: `${nome} ${id}`, categoria_id: nome.length, conta_id, categorias: { nome, tipo } };
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
  const hoje = new Date(2026, 10, 10); // novembro tem 30 dias

  it('calcula maior gasto, categoria principal, média e projeção', () => {
    const movs = [
      mov('RECEITA', 1000, '2026-11-01', 'Salário'),
      mov('DESPESA', 100, '2026-11-03', 'Lazer'),
      mov('DESPESA', 30, '2026-11-04', 'Mercado'),
      mov('DESPESA', 20, '2026-11-08', 'Mercado'),
      mov('DESPESA', 5000, '2026-10-30', 'Aluguel'),
    ];
    const r = insightsDoMes(movs, hoje);

    expect(r.temDespesas).toBe(true);
    expect(r.receitasMes).toBe(1000);
    expect(r.despesasMes).toBe(150);
    expect(r.maiorGasto?.valor).toBe(100);
    expect(r.categoriaTop).toEqual({ nome: 'Lazer', valor: 100 });
    expect(r.mediaDiaria).toBeCloseTo(15, 10);
    expect(r.despesasProjetadas).toBeCloseTo(450, 10);
    expect(r.saldoProjetado).toBeCloseTo(550, 10);
  });

  it('sem despesas no mês não quebra', () => {
    const r = insightsDoMes([mov('RECEITA', 100, '2026-11-01')], hoje);
    expect(r).toMatchObject({ temDespesas: false, despesasMes: 0, maiorGasto: null, categoriaTop: null, mediaDiaria: 0 });
  });

  it('no dia 1 a média usa um dia, sem dividir por zero', () => {
    const r = insightsDoMes([mov('DESPESA', 31, '2026-12-01')], new Date(2026, 11, 1));
    expect(r.mediaDiaria).toBe(31);
    expect(r.despesasProjetadas).toBe(31 * 31);
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

describe('saldoPorConta', () => {
  const contas = [
    { id: 1, nome: 'Banco', saldo_inicial: 100 },
    { id: 2, nome: 'Carteira', saldo_inicial: 0 },
  ];

  it('soma saldo inicial, receitas e despesas de cada conta; economia não entra', () => {
    const movs = [
      mov('RECEITA', 50, '2026-11-01', 'X', 1),
      mov('DESPESA', 20, '2026-11-02', 'X', 1),
      mov('ECONOMIA', 999, '2026-11-03', 'X', 1),
      mov('DESPESA', 10, '2026-11-04', 'X', null),
    ];
    const linhas = saldoPorConta(contas, movs);

    expect(linhas.find((l) => l.id === 1)).toMatchObject({ saldo: 130, receitas: 50, despesas: 20 });
    expect(linhas.find((l) => l.id === 2)).toMatchObject({ saldo: 0 });
    expect(linhas.find((l) => l.id === null)).toMatchObject({ nome: 'Sem conta', saldo: -10 });
  });

  it('não mostra "Sem conta" quando todas as movimentações têm conta', () => {
    const linhas = saldoPorConta(contas, [mov('RECEITA', 5, '2026-11-01', 'X', 2)]);
    expect(linhas.map((l) => l.nome)).toEqual(['Banco', 'Carteira']);
  });

  it('movimentação de conta apagada vai para "Sem conta"', () => {
    const linhas = saldoPorConta(contas, [mov('RECEITA', 7, '2026-11-01', 'X', 99)]);
    expect(linhas.find((l) => l.id === null)?.saldo).toBe(7);
  });
});
