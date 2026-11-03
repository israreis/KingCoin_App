import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const PREFIXO = 'kingcoin:dica:';

/** Dica exibida só na primeira vez que o usuário vê uma tela. */
export function useDica(chave: string) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    // Na web não há deslizar: os botões ficam visíveis no cartão.
    if (Platform.OS === 'web') return;
    let ativo = true;
    AsyncStorage.getItem(PREFIXO + chave)
      .then((visto) => {
        if (ativo && visto !== '1') setMostrar(true);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [chave]);

  const concluir = useCallback(() => {
    setMostrar(false);
    AsyncStorage.setItem(PREFIXO + chave, '1').catch(() => {});
  }, [chave]);

  return { mostrar, concluir };
}
