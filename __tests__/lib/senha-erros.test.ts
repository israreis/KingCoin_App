import { ehErroDeRede, falhar } from '@/lib/erros';
import { MENSAGEM_SENHA_FRACA, REGRAS_SENHA, senhaForte } from '@/lib/senha';

describe('senhaForte', () => {
  it.each(['Abcdefg!', 'Senha@2026', 'ÁGUA#forte', 'Xy$12345'])('aceita %p', (senha) => {
    expect(senhaForte(senha)).toBe(true);
  });

  it.each([
    ['Ab!', 'curta'],
    ['abcdefg!', 'sem maiúscula'],
    ['Abcdefgh', 'sem especial'],
    ['Abcdefg1', 'dígito não é especial'],
    ['Abcdefg ', 'espaço não é especial'],
    ['', 'vazia'],
  ])('recusa %p (%s)', (senha) => {
    expect(senhaForte(senha)).toBe(false);
  });

  it('tem exatamente as três regras pedidas', () => {
    expect(REGRAS_SENHA.map((r) => r.id)).toEqual(['tamanho', 'maiuscula', 'especial']);
    expect(MENSAGEM_SENHA_FRACA).toMatch(/8 caracteres/);
  });

  it('cada regra avalia independentemente', () => {
    const resultado = Object.fromEntries(REGRAS_SENHA.map((r) => [r.id, r.testar('abcdefgh')]));
    expect(resultado).toEqual({ tamanho: true, maiuscula: false, especial: false });
  });
});

describe('ehErroDeRede', () => {
  it.each([
    new Error('TypeError: Network request failed'),
    new Error('fetch failed'),
    new Error('Request timed out'),
    'Failed to fetch',
    Object.assign(new Error('qualquer'), { rede: true }),
  ])('reconhece %p', (erro) => {
    expect(ehErroDeRede(erro)).toBe(true);
  });

  it.each([new Error('violates foreign key'), null, undefined, 42])('não confunde %p', (erro) => {
    expect(ehErroDeRede(erro)).toBe(false);
  });
});

describe('falhar', () => {
  it('não faz nada sem erro', () => {
    expect(() => falhar(null)).not.toThrow();
  });

  it('erro de rede vira mensagem amigável marcada como rede', () => {
    try {
      falhar({ message: 'TypeError: Network request failed' });
      throw new Error('deveria ter falhado');
    } catch (e) {
      expect((e as Error).message).toBe('Sem conexão com a internet. Tente novamente.');
      expect(ehErroDeRede(e)).toBe(true);
    }
  });

  it('traduz códigos do Postgres', () => {
    expect(() => falhar({ message: 'fk', code: '23503' })).toThrow('Este item está em uso e não pode ser excluído.');
    expect(() => falhar({ message: 'dup', code: '23505' })).toThrow('Já existe um registro com esses dados.');
  });

  it('mantém a mensagem original nos demais casos', () => {
    expect(() => falhar({ message: 'permission denied', code: '42501' })).toThrow('permission denied');
  });
});
