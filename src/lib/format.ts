/** Formata um número como moeda brasileira, ex.: R$ 1.234,56 */
export function moeda(valor: number): string {
  const negativo = valor < 0;
  const [inteiro, centavos] = Math.abs(valor).toFixed(2).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${comMilhar},${centavos}`;
}

/** Converte texto digitado pelo usuário ("1.234,56", "12,5", "12.50") em número. */
export function lerValor(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,]/g, '');
  if (!limpo) return null;

  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

const dois = (n: number) => String(n).padStart(2, '0');

/** Date -> AAAA-MM-DD usando o fuso local. */
export function paraISO(data: Date): string {
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

export function hojeISO(): string {
  return paraISO(new Date());
}

/** AAAA-MM-DD -> DD/MM/AAAA */
export function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** DD/MM/AAAA -> AAAA-MM-DD, ou null se a data for inválida. */
export function lerDataBR(texto: string): string | null {
  const partes = texto.trim().split('/');
  if (partes.length !== 3) return null;

  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano || ano < 1900 || ano > 2200) return null;

  const data = new Date(ano, mes - 1, dia);
  const valida =
    data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return valida ? paraISO(data) : null;
}

/** AAAA-MM-DD -> Date no fuso local (evita o deslocamento de um dia do UTC). */
export function isoParaData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export const MESES_ABREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/**
 * Máscara de moeda para campos de valor: cada dígito digitado entra pelos
 * centavos ("1" -> "0,01", "12345" -> "123,45", "123456789" -> "1.234.567,89").
 */
export function mascararMoeda(texto: string): string {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
  if (!digitos) return '';

  const centavos = digitos.padStart(3, '0');
  const inteiro = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${centavos.slice(-2)}`;
}

/** Número vindo do banco -> texto já mascarado para preencher um campo. */
export function numeroParaCampo(valor: number): string {
  return mascararMoeda(String(Math.round(valor * 100)));
}

/** Formata telefone brasileiro: (11) 98765-4321 ou (11) 3456-7890. */
export function mascararTelefone(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Remove acentos e maiúsculas, para buscas. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
