import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { DRIVER_NATIVO } from '@/lib/layout';

/** Mesmas medidas da tela de abertura nativa (app.json), para a troca ser imperceptível. */
export const COR_FUNDO_ABERTURA = '#000805';
const COR_LOGO = '#23b785';
const LARGURA = 120;
const ALTURA = (LARGURA * 923.28) / 809.29;
const VIEWBOX = '0 0 809.29 923.28';

const COROA =
  '809.29 113.99 809.29 171.76 541.81 323.52 540.32 599.76 404.64 677.58 268.94 599.76 267.48 323.52 0 171.76 0 113.99 113.99 0 227.99 113.99 290.65 113.99 404.64 0 518.64 113.99 581.3 113.99 695.29 0 809.29 113.99';
const ESQUERDA = '156.26 669.57 347.34 781.62 347.34 923.28 0 923.28 0 301.67 154.35 391.44 156.26 669.57';
const DIREITA = '654.93 391.44 809.28 301.67 809.28 923.28 461.94 923.28 461.94 781.62 653.02 669.57 654.93 391.44';

/** Tempo mínimo na tela, para a animação não "piscar" quando o app abre muito rápido. */
const TEMPO_MINIMO = 1100;

// Mantém a abertura nativa até a animação estar pronta para assumir.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Peca({ pontos, estilo }: { pontos: string; estilo: object }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
      <Svg width={LARGURA} height={ALTURA} viewBox={VIEWBOX}>
        <Polygon points={pontos} fill={COR_LOGO} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Animação de carregamento: começa exatamente como a abertura nativa (logo parado),
 * depois a coroa "quica" sobre as duas colunas, que respiram em compasso, enquanto o
 * app carrega. Quando fica pronto, o logo cresce e some, revelando o app.
 */
export function TelaAbertura({ pronto, onFim }: { pronto: boolean; onFim: () => void }) {
  const ciclo = useRef(new Animated.Value(0)).current;
  const saida = useRef(new Animated.Value(0)).current;
  const [tempoMinimo, setTempoMinimo] = useState(false);

  useEffect(() => {
    const laco = Animated.loop(
      Animated.sequence([
        Animated.timing(ciclo, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: DRIVER_NATIVO,
        }),
        Animated.timing(ciclo, {
          toValue: 0,
          duration: 520,
          easing: Easing.bounce,
          useNativeDriver: DRIVER_NATIVO,
        }),
        Animated.delay(160),
      ]),
    );
    laco.start();
    const temporizador = setTimeout(() => setTempoMinimo(true), TEMPO_MINIMO);
    return () => {
      laco.stop();
      clearTimeout(temporizador);
    };
  }, [ciclo]);

  useEffect(() => {
    if (!pronto || !tempoMinimo) return;
    Animated.timing(saida, {
      toValue: 1,
      duration: 380,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: DRIVER_NATIVO,
    }).start(() => onFim());
  }, [pronto, tempoMinimo, saida, onFim]);

  const coroa = {
    transform: [
      { translateY: ciclo.interpolate({ inputRange: [0, 1], outputRange: [0, -ALTURA * 0.16] }) },
      { rotate: ciclo.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) },
    ],
  };
  const coluna = (lado: 1 | -1) => ({
    transform: [
      { translateX: ciclo.interpolate({ inputRange: [0, 1], outputRange: [0, lado * LARGURA * 0.04] }) },
      // Encolhe mantendo a base no chão (a escala é feita a partir do centro).
      { translateY: ciclo.interpolate({ inputRange: [0, 1], outputRange: [0, ALTURA * 0.03] }) },
      { scaleY: ciclo.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
    ],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        estilos.fundo,
        { opacity: saida.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
      ]}
      // Esconde a abertura nativa só quando esta tela já está desenhada no mesmo lugar.
      onLayout={() => {
        if (Platform.OS !== 'web') SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Animated.View
        style={{
          width: LARGURA,
          height: ALTURA,
          transform: [{ scale: saida.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
        }}
      >
        <View style={StyleSheet.absoluteFill}>
          <Peca pontos={ESQUERDA} estilo={coluna(-1)} />
          <Peca pontos={DIREITA} estilo={coluna(1)} />
          <Peca pontos={COROA} estilo={coroa} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: COR_FUNDO_ABERTURA,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
