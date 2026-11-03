import type { PeriodoId } from '@/types';

import { paraISO } from './format';

export const PERIODO_PADRAO: PeriodoId = 'este_mes';

export const PERIODOS: { id: PeriodoId; texto: string }[] = [
  { id: 'este_mes', texto: 'Este mês' },
  { id: 'ultimo_mes', texto: 'Último mês' },
  { id: 'ultimos_3_meses', texto: 'Últimos 3 meses' },
  { id: 'este_ano', texto: 'Este ano' },
];

export function textoPeriodo(periodo: PeriodoId): string {
  return PERIODOS.find((p) => p.id === periodo)?.texto ?? PERIODOS[0].texto;
}

/** Mesma regra do KingCoin web para comparar com o período anterior. */
export function periodoAnterior(periodo: PeriodoId): PeriodoId {
  if (periodo === 'este_mes') return 'ultimo_mes';
  if (periodo === 'ultimo_mes') return 'ultimos_3_meses';
  return 'ultimo_mes';
}

/** Retorna `{ inicio, fim }` em AAAA-MM-DD. */
export function calcularPeriodo(
  periodo: PeriodoId,
  hoje: Date = new Date(),
): { inicio: string; fim: string } {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  if (periodo === 'ultimo_mes') {
    return {
      inicio: paraISO(new Date(ano, mes - 1, 1)),
      fim: paraISO(new Date(ano, mes, 0)),
    };
  }
  if (periodo === 'ultimos_3_meses') {
    return {
      inicio: paraISO(new Date(ano, mes, hoje.getDate() - 90)),
      fim: paraISO(hoje),
    };
  }
  if (periodo === 'este_ano') {
    return { inicio: paraISO(new Date(ano, 0, 1)), fim: paraISO(hoje) };
  }
  return { inicio: paraISO(new Date(ano, mes, 1)), fim: paraISO(hoje) };
}
