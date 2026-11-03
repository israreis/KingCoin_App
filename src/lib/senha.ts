/** Regras de senha forte usadas no cadastro, na recuperação e na troca de senha. */
export const REGRAS_SENHA: { id: string; texto: string; testar: (senha: string) => boolean }[] = [
  { id: 'tamanho', texto: 'Pelo menos 8 caracteres', testar: (s) => s.length >= 8 },
  { id: 'maiuscula', texto: 'Pelo menos 1 letra maiúscula', testar: (s) => /[A-ZÀ-Ý]/.test(s) },
  { id: 'especial', texto: 'Pelo menos 1 caractere especial (!@#$...)', testar: (s) => /[^A-Za-z0-9À-ÿ\s]/.test(s) },
];

export function senhaForte(senha: string): boolean {
  return REGRAS_SENHA.every((regra) => regra.testar(senha));
}

export const MENSAGEM_SENHA_FRACA =
  'A senha precisa ter pelo menos 8 caracteres, 1 letra maiúscula e 1 caractere especial.';
