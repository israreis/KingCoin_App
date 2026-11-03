import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Tipo } from '@/types';

export type Cores = {
  fundo: string;
  card: string;
  borda: string;
  texto: string;
  suave: string;
  primaria: string;
  perigo: string;
  campo: string;
};

const escuro: Cores = {
  fundo: '#000805',
  card: '#0e1a15',
  borda: '#1d3a2e',
  texto: '#f1f5f3',
  suave: '#8fa89d',
  primaria: '#23b785',
  perigo: '#ff6b6b',
  campo: '#0a1410',
};

const claro: Cores = {
  fundo: '#f3f7f5',
  card: '#ffffff',
  borda: '#d5e3dc',
  texto: '#0c1a14',
  suave: '#5d7468',
  primaria: '#1a9a70',
  perigo: '#e04848',
  campo: '#f8fbf9',
};

export const COR_TIPO: Record<Tipo, string> = {
  RECEITA: '#23b785',
  DESPESA: '#ff6b6b',
  ECONOMIA: '#9b59b6',
};

export const TEXTO_TIPO: Record<Tipo, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
  ECONOMIA: 'Economia',
};

type TemaContexto = {
  cores: Cores;
  escuro: boolean;
  alternar: () => void;
};

const Contexto = createContext<TemaContexto>({
  cores: escuro,
  escuro: true,
  alternar: () => {},
});

const CHAVE = 'kingcoin:tema';

export function TemaProvider({ children }: { children: ReactNode }) {
  const [modoEscuro, setModoEscuro] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((valor) => {
        if (valor === 'claro') setModoEscuro(false);
      })
      .catch(() => {});
  }, []);

  const alternar = useCallback(() => {
    setModoEscuro((atual) => {
      AsyncStorage.setItem(CHAVE, atual ? 'claro' : 'escuro').catch(() => {});
      return !atual;
    });
  }, []);

  const valor = useMemo(
    () => ({ cores: modoEscuro ? escuro : claro, escuro: modoEscuro, alternar }),
    [modoEscuro, alternar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): TemaContexto {
  return useContext(Contexto);
}
