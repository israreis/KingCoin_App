import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createElement } from 'react';
import { Pressable, Text, useWindowDimensions } from 'react-native';

import { useBarraAbas } from '@/lib/barraAbas';
import { useTema } from '@/lib/theme';

type Icone = keyof typeof Ionicons.glyphMap;

const ABAS: Record<string, { icone: Icone; iconeAtivo: Icone; titulo: string; rota: string }> = {
  index: { icone: 'wallet-outline', iconeAtivo: 'wallet', titulo: 'Carteira', rota: '/' },
  transacoes: { icone: 'swap-vertical-outline', iconeAtivo: 'swap-vertical', titulo: 'Movimentações', rota: '/transacoes' },
  dashboard: { icone: 'stats-chart-outline', iconeAtivo: 'stats-chart', titulo: 'Dashboard', rota: '/dashboard' },
  organizacao: { icone: 'grid-outline', iconeAtivo: 'grid', titulo: 'Organização', rota: '/organizacao' },
  conta: { icone: 'person-outline', iconeAtivo: 'person', titulo: 'Conta', rota: '/conta' },
};

export type PropsDockWeb = {
  state: { index: number; routes: { key: string; name: string }[] };
};

/**
 * Barra de navegação da versão web: pílula de vidro líquido fixa embaixo,
 * no mesmo estilo da barra do app. Some ao rolar para baixo e volta ao subir.
 */
export function DockWeb({ state }: PropsDockWeb) {
  const { cores, escuro } = useTema();
  const router = useRouter();
  const { visivel } = useBarraAbas();
  const { width } = useWindowDimensions();
  const comRotulo = width >= 640;

  const vidro = escuro
    ? { fundo: 'linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.065))', borda: 'rgba(255,255,255,0.16)', brilho: 'rgba(255,255,255,0.22)', pilula: 'rgba(255,255,255,0.16)', inativo: '#92a6b0' }
    : { fundo: 'linear-gradient(145deg, rgba(255,255,255,0.78), rgba(255,255,255,0.55))', borda: 'rgba(255,255,255,0.9)', brilho: 'rgba(255,255,255,1)', pilula: 'rgba(255,255,255,0.95)', inativo: '#52666f' };

  return createElement(
    'nav',
    {
      'aria-label': 'Navegação principal',
      style: {
        position: 'fixed',
        left: '50%',
        bottom: 20,
        zIndex: 50,
        display: 'flex',
        gap: 4,
        padding: 6,
        maxWidth: 'calc(100vw - 24px)',
        borderRadius: 999,
        background: vidro.fundo,
        border: `1px solid ${vidro.borda}`,
        backdropFilter: 'blur(26px) saturate(190%)',
        WebkitBackdropFilter: 'blur(26px) saturate(190%)',
        boxShadow: `inset 0 1px 0 ${vidro.brilho}, 0 24px 60px -24px rgba(0,0,0,0.55)`,
        transform: `translateX(-50%) translateY(${visivel ? '0' : '160%'})`,
        opacity: visivel ? 1 : 0,
        transition: 'transform 0.5s cubic-bezier(0.22, 1.18, 0.36, 1), opacity 0.3s ease',
      },
    },
    state.routes.map((rota, indice) => {
      const aba = ABAS[rota.name];
      if (!aba) return null;
      const ativa = indice === state.index;
      return (
        <Pressable
          key={rota.key}
          accessibilityRole="tab"
          accessibilityLabel={aba.titulo}
          accessibilityState={{ selected: ativa }}
          onPress={() => {
            if (!ativa) router.navigate(aba.rota as never);
          }}
          style={(estado) => {
            const sobre = (estado as { hovered?: boolean }).hovered;
            return {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 11,
              paddingHorizontal: comRotulo ? 16 : 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: ativa ? vidro.borda : 'transparent',
              backgroundColor: ativa ? vidro.pilula : sobre ? 'rgba(255,255,255,0.08)' : 'transparent',
              transform: [{ scale: estado.pressed ? 0.94 : 1 }],
            };
          }}
        >
          <Ionicons name={ativa ? aba.iconeAtivo : aba.icone} size={20} color={ativa ? cores.primaria : vidro.inativo} />
          {comRotulo ? (
            <Text style={{ color: ativa ? cores.texto : vidro.inativo, fontWeight: '600', fontSize: 14 }}>{aba.titulo}</Text>
          ) : null}
        </Pressable>
      );
    }),
  );
}
