export type ErroApi = Error & { rede?: boolean };

const PADRAO_REDE = /network request failed|failed to fetch|fetch failed|network error|timed out|timeout/i;

/** Erro de conexão (sem internet, servidor inalcançável). */
export function ehErroDeRede(erro: unknown): boolean {
  if (erro && typeof erro === 'object' && (erro as ErroApi).rede === true) return true;
  const mensagem = erro instanceof Error ? erro.message : String(erro ?? '');
  return PADRAO_REDE.test(mensagem);
}

/** Converte um erro do Supabase em um Error com mensagem amigável. */
export function falhar(erro: { message: string; code?: string } | null): void {
  if (!erro) return;

  if (PADRAO_REDE.test(erro.message)) {
    const e: ErroApi = new Error('Sem conexão com a internet. Tente novamente.');
    e.rede = true;
    throw e;
  }
  if (erro.code === '23503') throw new Error('Este item está em uso e não pode ser excluído.');
  if (erro.code === '23505') throw new Error('Já existe um registro com esses dados.');
  throw new Error(erro.message);
}
