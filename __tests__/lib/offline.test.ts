import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import {
  adicionarPendencia,
  comCache,
  definirOffline,
  lerPendencias,
  lerSessaoSalva,
  limparCache,
  sincronizarPendencias,
  useOffline,
} from '@/lib/offline';
import type { NovaMovimentacao } from '@/types';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));
const erroDeRede = () => Object.assign(new Error('Sem conexão'), { rede: true });

function nova(valor: number): NovaMovimentacao {
  return { categoria_id: 1, data: '2026-11-03', valor, descricao: `v${valor}`, comprovante_path: null };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  definirOffline(false);
});

describe('comCache', () => {
  it('devolve os dados do servidor e guarda uma cópia', async () => {
    const dados = await comCache('lista', async () => [1, 2, 3]);
    await esperar();
    expect(dados).toEqual([1, 2, 3]);
    expect(JSON.parse((await AsyncStorage.getItem('kingcoin:cache:lista')) ?? 'null')).toEqual([1, 2, 3]);
  });

  it('sem internet devolve a última cópia e liga o modo offline', async () => {
    const { result } = await renderHook(() => useOffline());
    await comCache('lista', async () => ['salvo']);
    await esperar();

    let dados: string[] = [];
    await act(async () => {
      dados = await comCache<string[]>('lista', async () => {
        throw erroDeRede();
      });
    });

    expect(dados).toEqual(['salvo']);
    expect(result.current).toBe(true);

    await act(async () => {
      await comCache('lista', async () => ['novo']);
    });
    expect(result.current).toBe(false);
  });

  it('sem internet e sem cópia repassa o erro', async () => {
    await expect(
      comCache('nunca-salvo', async () => {
        throw erroDeRede();
      }),
    ).rejects.toThrow('Sem conexão');
  });

  it('erro que não é de rede nunca usa o cache', async () => {
    await comCache('lista', async () => ['salvo']);
    await esperar();
    await expect(
      comCache('lista', async () => {
        throw new Error('permission denied');
      }),
    ).rejects.toThrow('permission denied');
  });

  it('chaves diferentes não se misturam', async () => {
    await comCache('usuarioA:movs', async () => ['A']);
    await esperar();
    await expect(
      comCache('usuarioB:movs', async () => {
        throw erroDeRede();
      }),
    ).rejects.toThrow();
  });
});

describe('fila de pendências', () => {
  it('guarda na ordem com ids negativos e únicos, mesmo no mesmo milissegundo', async () => {
    const agora = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    await adicionarPendencia(nova(1));
    await adicionarPendencia(nova(2));
    await adicionarPendencia(nova(3));
    agora.mockRestore();

    const lista = await lerPendencias();
    expect(lista.map((p) => p.dados.valor)).toEqual([1, 2, 3]);
    expect(lista.every((p) => p.localId < 0)).toBe(true);
    expect(new Set(lista.map((p) => p.localId)).size).toBe(3);
  });

  it('sincroniza tudo e esvazia a fila', async () => {
    await adicionarPendencia(nova(1));
    await adicionarPendencia(nova(2));
    const enviar = jest.fn(async (_dados: NovaMovimentacao) => undefined);

    expect(await sincronizarPendencias(enviar)).toBe(2);
    expect(enviar.mock.calls.map(([d]) => d.valor)).toEqual([1, 2]);
    expect(await lerPendencias()).toEqual([]);
  });

  it('para na primeira falha de rede e mantém o restante na ordem', async () => {
    for (const v of [1, 2, 3]) await adicionarPendencia(nova(v));
    const enviar = jest
      .fn(async (_dados: NovaMovimentacao) => undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(erroDeRede());

    expect(await sincronizarPendencias(enviar)).toBe(1);
    expect(enviar).toHaveBeenCalledTimes(2);
    expect((await lerPendencias()).map((p) => p.dados.valor)).toEqual([2, 3]);
  });

  it('descarta item inválido sem travar os próximos', async () => {
    for (const v of [1, 2, 3]) await adicionarPendencia(nova(v));
    const enviar = jest
      .fn(async (_dados: NovaMovimentacao) => undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('violates foreign key constraint'))
      .mockResolvedValueOnce(undefined);

    expect(await sincronizarPendencias(enviar)).toBe(2);
    expect(await lerPendencias()).toEqual([]);
  });

  it('fila vazia não chama o envio', async () => {
    const enviar = jest.fn(async (_dados: NovaMovimentacao) => undefined);
    expect(await sincronizarPendencias(enviar)).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('fila corrompida é tratada como vazia', async () => {
    await AsyncStorage.setItem('kingcoin:pendencias', '{não é json');
    expect(await lerPendencias()).toEqual([]);
  });
});

describe('limparCache', () => {
  it('apaga só o cache e as pendências do KingCoin', async () => {
    await AsyncStorage.multiSet([
      ['kingcoin:cache:a', '1'],
      ['kingcoin:cache:b', '2'],
      ['kingcoin:pendencias', '[]'],
      ['kingcoin:tema', 'claro'],
      ['outro-app', 'x'],
    ]);
    await limparCache();
    const chaves = [...(await AsyncStorage.getAllKeys())].sort();
    expect(chaves).toEqual(['kingcoin:tema', 'outro-app']);
  });
});

describe('lerSessaoSalva', () => {
  it('lê a sessão gravada pelo Supabase', async () => {
    await AsyncStorage.setItem(
      'sb-abcdef-auth-token',
      JSON.stringify({ access_token: 't', refresh_token: 'r', user: { id: 'u1' } }),
    );
    expect((await lerSessaoSalva())?.user.id).toBe('u1');
  });

  it('sem sessão, sessão sem usuário ou JSON inválido dá null', async () => {
    expect(await lerSessaoSalva()).toBeNull();
    await AsyncStorage.setItem('sb-x-auth-token', JSON.stringify({ access_token: 't' }));
    expect(await lerSessaoSalva()).toBeNull();
    await AsyncStorage.setItem('sb-x-auth-token', 'quebrado{');
    expect(await lerSessaoSalva()).toBeNull();
  });
});
