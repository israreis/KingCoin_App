import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DRIVER_NATIVO } from '@/lib/layout';
import { useTema } from '@/lib/theme';

const LARGURA_ACAO = 72;
const LARGURA_TOTAL = LARGURA_ACAO * 2;

type Props = {
  children: ReactNode;
  onEditar: () => void;
  onExcluir: () => void;
  /** Anima o item uma vez para mostrar que ele pode ser deslizado. */
  dica?: boolean;
  onDicaConcluida?: () => void;
};

/** Deslize o item para a esquerda para revelar os botões de editar e excluir. */
export function ItemDeslizavel({ children, onEditar, onExcluir, dica, onDicaConcluida }: Props) {
  const { cores } = useTema();
  const posicao = useRef(new Animated.Value(0)).current;
  const aberto = useRef(false);

  const animar = (abrir: boolean) => {
    aberto.current = abrir;
    Animated.spring(posicao, {
      toValue: abrir ? -LARGURA_TOTAL : 0,
      useNativeDriver: DRIVER_NATIVO,
      bounciness: 0,
    }).start();
  };

  const gesto = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evento, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_evento, g) => {
        const base = aberto.current ? -LARGURA_TOTAL : 0;
        posicao.setValue(Math.max(-LARGURA_TOTAL - 16, Math.min(0, base + g.dx)));
      },
      onPanResponderRelease: (_evento, g) => {
        const base = aberto.current ? -LARGURA_TOTAL : 0;
        animar(base + g.dx < -LARGURA_ACAO);
      },
      onPanResponderTerminate: () => animar(aberto.current),
    }),
  ).current;

  useEffect(() => {
    if (!dica) return;
    const animacao = Animated.sequence([
      Animated.delay(700),
      Animated.timing(posicao, { toValue: -LARGURA_TOTAL * 0.75, duration: 450, useNativeDriver: DRIVER_NATIVO }),
      Animated.delay(900),
      Animated.timing(posicao, { toValue: 0, duration: 350, useNativeDriver: DRIVER_NATIVO }),
    ]);
    animacao.start(({ finished }) => {
      if (finished) onDicaConcluida?.();
    });
    return () => animacao.stop();
  }, [dica, posicao, onDicaConcluida]);

  // Os botões só aparecem quando o item é deslizado (evita cantos coloridos atrás do cartão).
  const opacidadeAcoes = posicao.interpolate({
    inputRange: [-LARGURA_TOTAL, -8, 0],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={estilos.envoltorio}>
      <Animated.View style={[estilos.acoes, { opacity: opacidadeAcoes }]}>
        <Pressable
          style={[estilos.acao, { backgroundColor: cores.primaria }]}
          onPress={() => {
            animar(false);
            onEditar();
          }}
        >
          <Ionicons name="create-outline" size={22} color="#ffffff" />
        </Pressable>
        <Pressable
          style={[estilos.acao, { backgroundColor: cores.perigo }]}
          onPress={() => {
            animar(false);
            onExcluir();
          }}
        >
          <Ionicons name="trash-outline" size={22} color="#ffffff" />
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX: posicao }] }} {...gesto.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  envoltorio: { borderRadius: 16, overflow: 'hidden' },
  acoes: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: LARGURA_TOTAL,
    flexDirection: 'row',
  },
  acao: { width: LARGURA_ACAO, alignItems: 'center', justifyContent: 'center' },
});

/** Na web os botões de editar/excluir ficam dentro do cartão; no celular, deslize. */
export const ACOES_NO_CARTAO = Platform.OS === 'web';

/** Envolve o cartão com o deslizar só no celular; na web devolve o cartão como está. */
export function DeslizavelNoCelular({ children, ...resto }: Props) {
  if (ACOES_NO_CARTAO) return <>{children}</>;
  return <ItemDeslizavel {...resto}>{children}</ItemDeslizavel>;
}
