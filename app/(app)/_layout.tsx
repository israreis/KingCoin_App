import { Stack } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { BarraAbasProvider } from '@/lib/barraAbas';
import { TelaBloqueio, useBiometria } from '@/lib/biometria';
import { useOffline } from '@/lib/offline';
import { useTema } from '@/lib/theme';

export default function AppLayout() {
  const { session } = useAuth();
  const { cores } = useTema();
  const { bloqueado } = useBiometria();
  const offline = useOffline();
  const insets = useSafeAreaInsets();

  if (!session) return null;

  return (
    <BarraAbasProvider>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            // Na web cada tela desenha o próprio cabeçalho (logo + título), igual às abas.
            // No celular fica o cabeçalho nativo, com a seta de voltar.
            headerShown: Platform.OS !== 'web',
            headerStyle: { backgroundColor: cores.card },
            headerTintColor: cores.texto,
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: cores.fundo },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="transacao" options={{ title: 'Movimentação' }} />
          <Stack.Screen name="meta" options={{ title: 'Meta' }} />
          <Stack.Screen name="relatorios" options={{ title: 'Relatórios' }} />
          <Stack.Screen name="ajuda" options={{ title: 'Ajuda' }} />
          <Stack.Screen name="orcamentos" options={{ title: 'Orçamentos' }} />
          <Stack.Screen name="orcamento" options={{ title: 'Orçamento' }} />
          <Stack.Screen name="recorrencias" options={{ title: 'Movimentações recorrentes' }} />
          <Stack.Screen name="recorrencia" options={{ title: 'Recorrência' }} />
          <Stack.Screen name="categorias" options={{ title: 'Categorias' }} />
          <Stack.Screen name="metas" options={{ title: 'Metas' }} />
          <Stack.Screen name="editar-perfil" options={{ title: 'Editar dados' }} />
          <Stack.Screen name="alterar-email" options={{ title: 'Alterar e-mail' }} />
          <Stack.Screen name="alterar-senha" options={{ title: 'Alterar senha' }} />
          <Stack.Screen name="excluir-conta" options={{ title: 'Excluir conta' }} />
        </Stack>

        {offline ? (
          <View pointerEvents="none" style={[estilos.aviso, { bottom: insets.bottom + 96 }]}>
            <Text style={estilos.avisoTexto}>Sem conexão · mostrando dados salvos</Text>
          </View>
        ) : null}

        {bloqueado ? <TelaBloqueio /> : null}
      </View>
    </BarraAbasProvider>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  avisoTexto: { color: '#1a1200', fontWeight: '700', fontSize: 13 },
});
