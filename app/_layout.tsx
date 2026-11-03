import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Carregando } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { BiometriaProvider } from '@/lib/biometria';
import '@/lib/notificacoes';
import { supabaseConfigurado } from '@/lib/supabase';
import { TemaProvider, useTema } from '@/lib/theme';

function Guarda() {
  const { session, carregando } = useAuth();
  const { cores, escuro } = useTema();
  const segmentos = useSegments();
  const caminho = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (carregando || !supabaseConfigurado) return;

    const emAutenticacao = segmentos[0] === '(auth)';

    // No navegador, quem abre o site sem login vê primeiro a landing page.
    if (Platform.OS === 'web' && !session && caminho === '/') {
      (globalThis as unknown as { location: { replace: (url: string) => void } }).location.replace(
        '/landing/index.html',
      );
      return;
    }
    if (!session && !emAutenticacao) router.replace('/login');
    else if (session && emAutenticacao) router.replace('/');
  }, [session, carregando, segmentos, caminho, router]);

  if (!supabaseConfigurado) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: cores.texto, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
          Supabase não configurado
        </Text>
        <Text style={{ color: cores.suave, lineHeight: 22 }}>
          Copie o arquivo .env.example para .env, preencha EXPO_PUBLIC_SUPABASE_URL e
          EXPO_PUBLIC_SUPABASE_ANON_KEY e reinicie com `npx expo start -c`.
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      {carregando ? (
        <View style={{ flex: 1, backgroundColor: cores.fundo }}>
          <Carregando />
        </View>
      ) : (
        <Slot />
      )}
    </>
  );
}

/** No navegador, centraliza o app com largura de celular. */
function MolduraWeb({ children }: { children: ReactNode }) {
  const { cores } = useTema();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 560 }}>{children}</View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <MolduraWeb>
        <AuthProvider>
          <BiometriaProvider>
            <Guarda />
          </BiometriaProvider>
        </AuthProvider>
        </MolduraWeb>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
