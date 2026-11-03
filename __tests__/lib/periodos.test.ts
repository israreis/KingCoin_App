import { PERIODOS, calcularPeriodo, periodoAnterior, textoPeriodo } from '@/lib/periodos';
import type { PeriodoId } from '@/types';

const dia = (ano: number, mes: number, d: number) => new Date(ano, mes - 1, d);

describe('calcularPeriodo', () => {
  it('este mês vai do dia 1 até hoje', () => {
    expect(calcularPeriodo('este_mes', dia(2026, 11, 15))).toEqual({ inicio: '2026-11-01', fim: '2026-11-15' });
  });

  it('último mês em janeiro volta para dezembro do ano anterior', () => {
    expect(calcularPeriodo('ultimo_mes', dia(2026, 1, 10))).toEqual({ inicio: '2025-12-01', fim: '2025-12-31' });
  });

  it('último mês respeita fevereiro bissexto', () => {
    expect(calcularPeriodo('ultimo_mes', dia(2024, 3, 31))).toEqual({ inicio: '2024-02-01', fim: '2024-02-29' });
  });

  it('último mês respeita fevereiro comum', () => {
    expect(calcularPeriodo('ultimo_mes', dia(2026, 3, 1))).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });
  });

  it('últimos 3 meses são os 90 dias anteriores', () => {
    expect(calcularPeriodo('ultimos_3_meses', dia(2026, 3, 1))).toEqual({ inicio: '2025-12-01', fim: '2026-03-01' });
  });

  it('este ano começa em 1º de janeiro', () => {
    expect(calcularPeriodo('este_ano', dia(2026, 7, 4))).toEqual({ inicio: '2026-01-01', fim: '2026-07-04' });
  });

  it('o início nunca é depois do fim, em todos os dias de um ano', () => {
    const ids = PERIODOS.map((p) => p.id);
    for (let d = new Date(2024, 0, 1); d.getFullYear() === 2024; d.setDate(d.getDate() + 1)) {
      for (const id of ids) {
        const { inicio, fim } = calcularPeriodo(id, new Date(d));
        expect(inicio <= fim).toBe(true);
      }
    }
  });
});

describe('periodoAnterior', () => {
  it.each<[PeriodoId, PeriodoId]>([
    ['este_mes', 'ultimo_mes'],
    ['ultimo_mes', 'ultimos_3_meses'],
    ['ultimos_3_meses', 'ultimo_mes'],
    ['este_ano', 'ultimo_mes'],
  ])('%p compara com %p', (atual, anterior) => {
    expect(periodoAnterior(atual)).toBe(anterior);
  });
});

describe('textoPeriodo', () => {
  it('traduz cada período', () => {
    expect(textoPeriodo('este_ano')).toBe('Este ano');
    expect(textoPeriodo('ultimos_3_meses')).toBe('Últimos 3 meses');
  });

  it('usa "Este mês" para um id desconhecido', () => {
    expect(textoPeriodo('qualquer' as PeriodoId)).toBe('Este mês');
  });
});
