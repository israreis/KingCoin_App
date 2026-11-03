import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/theme';

const LARGURA_ACAO = 72;
const LARGURA_TOTAL = LARGURA_ACAO * 2;

type Props = {
  children: ReactNode;
  onEditar: () => void;
  onExcluir: () => void;
};

/** Deslize o item para a esquerda para revelar os botões de editar e excluir. */
export function ItemDeslizavel({ children, onEditar, onExcluir }: Props) {
  const { cores } = useTema();
  const posicao = useRef(new Animated.Value(0)).current;
  const aberto = useRef(false);

  const animar = (abrir: boolean) => {
    aberto.current = abrir;
    Animated.spring(posicao, {
      toValue: abrir ? -LARGURA_TOTAL : 0,
      useNativeDriver: true,
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
