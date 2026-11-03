import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { DockAbas } from '@/components/DockWeb';
import type { PropsDockWeb } from '@/components/DockWeb';

import { useBarraAbas } from '@/lib/barraAbas';
import { useTema } from '@/lib/theme';

/**
 * Barra de abas nativa: no iOS 26+ usa o Liquid Glass do sistema; no Android, a
 * barra Material. Some por completo ao rolar para baixo e volta ao rolar para cima.
 */
export default function TabsLayout() {
  const { cores } = useTema();
  const { visivel } = useBarraAbas();

  // No navegador a barra nativa fica no topo; lá usamos uma barra própria embaixo.
  if (Platform.OS === 'web') {
    return (
      <Tabs
        tabBar={(props) => <DockAbas {...(props as unknown as PropsDockWeb)} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Carteira' }} />
        <Tabs.Screen name="transacoes" options={{ title: 'Movimentações' }} />
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="organizacao" options={{ title: 'Organização' }} />
        <Tabs.Screen name="conta" options={{ title: 'Perfil' }} />
      </Tabs>
    );
  }

  return (
    <NativeTabs tintColor={cores.primaria} minimizeBehavior="never" hidden={!visivel}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="creditcard" md="wallet" />
        <NativeTabs.Trigger.Label>Carteira</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transacoes">
        <NativeTabs.Trigger.Icon sf="arrow.up.arrow.down" md="swap_vert" />
        <NativeTabs.Trigger.Label>Movimentações</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="organizacao">
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="apps" />
        <NativeTabs.Trigger.Label>Organização</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="conta">
        <NativeTabs.Trigger.Icon sf="person" md="person" />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
