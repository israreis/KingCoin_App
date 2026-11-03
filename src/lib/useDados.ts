import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Carrega dados sempre que a tela ganha foco e permite recarregar manualmente
 * (pull-to-refresh). `deps` deve listar tudo o que `carregar` usa.
 */
export function useDados<T>(carregar: () => Promise<T>, deps: readonly unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(carregar, deps);

  const buscar = useCallback(async () => {
    try {
      setErro(null);
      setDados(await executar());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [executar]);

  useFocusEffect(
    useCallback(() => {
      buscar();
    }, [buscar]),
  );

  const atualizar = useCallback(() => {
    setAtualizando(true);
    buscar();
  }, [buscar]);

  return { dados, carregando, atualizando, erro, atualizar };
}
