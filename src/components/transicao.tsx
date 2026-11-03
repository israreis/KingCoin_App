import { useFocusEffect } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

const WEB = Platform.OS === 'web';
const DURACAO = 320;

/** Respeita a preferência do sistema de reduzir animações. */
function reduzirMovimento(): boolean {
  const janela = (globalThis as unknown as {
    matchMedia?: (consulta: string) => { matches: boolean };
  }).matchMedia;
  return typeof janela === 'function' && janela('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Entrada suave da tela na web: aparece com fade e sobe alguns pixels sempre que
 * a tela ganha foco (troca de aba, abrir um formulário, voltar). No celular não faz
 * nada, pois a navegação nativa já tem as próprias transições.
 */
export function EntradaTela({ children }: { children: ReactNode }) {
  const progresso = useRef(new Animated.Value(WEB ? 0 : 1)).current;

  useFocusEffect(
    useCallback(() => {
      if (!WEB) return;
      if (reduzirMovimento()) {
        progresso.setValue(1);
        return;
      }
      progresso.setValue(0);
      const animacao = Animated.timing(progresso, {
        toValue: 1,
        duration: DURACAO,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      animacao.start();
      return () => animacao.stop();
    }, [progresso]),
  );

  if (!WEB) return <>{children}</>;

  return (
    <Animated.View
      style={[
        estilos.envoltorio,
        {
          opacity: progresso,
          transform: [
            { translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { scale: progresso.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  envoltorio: { flex: 1 },
});
