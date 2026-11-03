import { Platform, useWindowDimensions } from 'react-native';

/** A partir desta largura, a versão web usa o layout de computador (colunas). */
export const LARGURA_DESKTOP = 1024;

export function useDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= LARGURA_DESKTOP;
}

/** Animações nativas não existem no navegador. */
/** Largura máxima do conteúdo de todas as telas na web (a mesma da Carteira). */
export const LARGURA_CONTEUDO = 1200;

export const DRIVER_NATIVO = Platform.OS !== 'web';
