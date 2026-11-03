import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DRIVER_NATIVO, useDesktop } from '@/lib/layout';
import { useTema } from '@/lib/theme';

/** Tempo sem rolar até o botão voltar a aparecer. */
const ESPERA_MS = 450;

/** Esconde o botão enquanto a tela rola e mostra de novo quando para. */
export function useBotaoFlutuante() {
  const [visivel, setVisivel] = useState(true);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aoRolar = useCallback(() => {
    setVisivel(false);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setVisivel(true), ESPERA_MS);
  }, []);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  return { visivel, aoRolar };
}

export function BotaoFlutuante({
  visivel,
  onPress,
  rotulo,
  acimaDaBarra = false,
  larguraConteudo,
}: {
  visivel: boolean;
  onPress: () => void;
  rotulo: string;
  /** true nas telas com barra de abas, para o botão ficar acima dela. */
  acimaDaBarra?: boolean;
  /** Na web, alinha o botão à borda direita do conteúdo com esta largura máxima. */
  larguraConteudo?: number;
}) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = useDesktop();
  const web = Platform.OS === 'web';
  const direita =
    web && larguraConteudo && width > larguraConteudo
      ? (width - larguraConteudo) / 2 + (desktop ? 32 : 20)
      : 20;
  const animacao = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(animacao, {
      toValue: visivel ? 1 : 0,
      useNativeDriver: DRIVER_NATIVO,
      damping: 16,
      stiffness: 180,
    }).start();
  }, [visivel, animacao]);

  return (
    <Animated.View
      pointerEvents={visivel ? 'auto' : 'none'}
      style={[
        estilos.envoltorio,
        {
          right: direita,
          bottom: insets.bottom + (acimaDaBarra ? (web ? 104 : 88) : 24),
          opacity: animacao,
          transform: [
            { translateY: animacao.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) },
            { scale: animacao.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        style={({ pressed }) => [
          estilos.botao,
          { backgroundColor: cores.primaria, transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}
      >
        <Ionicons name="add" size={34} color="#ffffff" />
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  envoltorio: { position: 'absolute' },
  botao: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
});
