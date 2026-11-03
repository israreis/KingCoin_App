import { Platform } from 'react-native';
import type { PressableStateCallbackType, ViewStyle } from 'react-native';

const WEB = Platform.OS === 'web';

/** No navegador o Pressable informa `hovered`; no celular esse campo não existe. */
export function mouseEmCima(estado: PressableStateCallbackType): boolean {
  return (estado as { hovered?: boolean }).hovered === true;
}

// Propriedades só de CSS (transição, sombra, desfoque) não existem nos tipos do RN.
const BASE = {
  cursor: 'pointer',
  transitionProperty: 'transform, box-shadow, background-image, filter',
  transitionDuration: '220ms',
  transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as unknown as ViewStyle;

const SOBRE = {
  transform: [{ translateY: -1 }, { scale: 1.03 }],
  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 55%, rgba(255,255,255,0) 100%)',
  boxShadow: '0 10px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.12)',
  backdropFilter: 'blur(14px) saturate(170%)',
  filter: 'brightness(1.04)',
} as unknown as ViewStyle;

const PRESSIONADO = { transform: [{ scale: 0.97 }] } as ViewStyle;

/**
 * Efeito de vidro (inspirado no Liquid Glass do iOS) ao passar o mouse.
 * Só tem efeito na web; no celular devolve `null`.
 */
export function vidro(estado: PressableStateCallbackType, desativado = false): ViewStyle | null {
  if (!WEB || desativado) return null;
  if (estado.pressed) return { ...BASE, ...SOBRE, ...PRESSIONADO };
  return mouseEmCima(estado) ? { ...BASE, ...SOBRE } : BASE;
}
