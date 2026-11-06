import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DRIVER_NATIVO, useDesktop, LARGURA_CONTEUDO } from '@/lib/layout';
import { vidro } from './vidro';
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
  larguraConteudo = LARGURA_CONTEUDO,
  secundario,
}: {
  visivel: boolean;
  onPress: () => void;
  rotulo: string;
  /** Botão menor exibido logo abaixo do principal (ex.: relatórios). */
  secundario?: { icone: keyof typeof Ionicons.glyphMap; rotulo: string; onPress: () => void };
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
  // Web: a barra de navegação aparece em todas as telas.
  // iOS: a barra de abas flutua por cima do conteúdo, então o botão sobe acima dela.
  // Android: a barra de abas fica abaixo da tela (já ocupa a área do sistema), então o
  // botão fica na mesma distância das telas sem abas (ex.: Orçamentos).
  const distanciaDoFundo = web
    ? insets.bottom + 104
    : acimaDaBarra
      ? Platform.OS === 'android'
        ? 24
        : insets.bottom + 88
      : insets.bottom + 24;
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
          bottom: distanciaDoFundo,
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
        style={(estado) => [
          estilos.botao,
          { backgroundColor: cores.primaria, transform: [{ scale: estado.pressed ? 0.92 : 1 }] },
          vidro(estado),
        ]}
      >
        <Ionicons name="add" size={34} color="#ffffff" />
      </Pressable>
      {secundario ? (
        <Pressable
          onPress={secundario.onPress}
          accessibilityRole="button"
          accessibilityLabel={secundario.rotulo}
          style={(estado) => [
            estilos.secundario,
            {
              backgroundColor: cores.card,
              borderColor: cores.borda,
              transform: [{ scale: estado.pressed ? 0.92 : 1 }],
            },
            vidro(estado),
          ]}
        >
          <Ionicons name={secundario.icone} size={22} color={cores.primaria} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  envoltorio: { position: 'absolute', alignItems: 'center', gap: 12 },
  secundario: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
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
