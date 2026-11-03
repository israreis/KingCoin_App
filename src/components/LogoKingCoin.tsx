import Svg, { G, Polygon } from 'react-native-svg';

/** Logo do KingCoin (coroa sobre o "K"), em vetor. */
export function LogoKingCoin({ tamanho = 110, cor = '#23b785' }: { tamanho?: number; cor?: string }) {
  return (
    <Svg width={tamanho} height={(tamanho * 923.28) / 809.29} viewBox="0 0 809.29 923.28">
      <G fill={cor}>
        <Polygon points="156.26 669.57 347.34 781.62 347.34 923.28 0 923.28 0 301.67 154.35 391.44 156.26 669.57" />
        <Polygon points="654.93 391.44 809.28 301.67 809.28 923.28 461.94 923.28 461.94 781.62 653.02 669.57 654.93 391.44" />
      </G>
      <Polygon
        fill={cor}
        points="809.29 113.99 809.29 171.76 541.81 323.52 540.32 599.76 404.64 677.58 268.94 599.76 267.48 323.52 0 171.76 0 113.99 113.99 0 227.99 113.99 290.65 113.99 404.64 0 518.64 113.99 581.3 113.99 695.29 0 809.29 113.99"
      />
    </Svg>
  );
}
