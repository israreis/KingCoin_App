import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type BarraAbasContexto = {
  visivel: boolean;
  /** Ligue no onScroll de listas e telas roláveis. */
  aoRolar: (evento: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Mostra a barra de novo (ex.: ao trocar de tela). */
  mostrar: () => void;
};

const Contexto = createContext<BarraAbasContexto>({
  visivel: true,
  aoRolar: () => {},
  mostrar: () => {},
});

/** Distância mínima de rolagem para trocar o estado (evita piscar). */
const SENSIBILIDADE = 6;
/** Perto do topo a barra fica sempre visível. */
const MARGEM_TOPO = 60;

/**
 * Esconde a barra de abas ao rolar para baixo e mostra ao rolar para cima,
 * como no Safari e em apps de banco.
 */
export function BarraAbasProvider({ children }: { children: ReactNode }) {
  const [visivel, setVisivel] = useState(true);
  const atual = useRef(true);
  const ultimoY = useRef(0);

  const definir = useCallback((valor: boolean) => {
    if (atual.current === valor) return;
    atual.current = valor;
    setVisivel(valor);
  }, []);

  const aoRolar = useCallback(
    (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = evento.nativeEvent.contentOffset.y;
      const delta = y - ultimoY.current;
      ultimoY.current = y;

      if (y <= MARGEM_TOPO) definir(true);
      else if (delta > SENSIBILIDADE) definir(false);
      else if (delta < -SENSIBILIDADE) definir(true);
    },
    [definir],
  );

  const mostrar = useCallback(() => {
    ultimoY.current = 0;
    definir(true);
  }, [definir]);

  const valor = useMemo(() => ({ visivel, aoRolar, mostrar }), [visivel, aoRolar, mostrar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBarraAbas(): BarraAbasContexto {
  return useContext(Contexto);
}
