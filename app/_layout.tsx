import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TelaAbertura } from '@/components/TelaAbertura';
import { AuthProvider, useAuth } from '@/lib/auth';
import { BiometriaProvider } from '@/lib/biometria';
import '@/lib/notificacoes';
import { chaveSecretaNoApp, supabaseConfigurado } from '@/lib/supabase';
import { TemaProvider, useTema } from '@/lib/theme';

function Guarda() {
  const { session, carregando } = useAuth();
  const { cores, escuro } = useTema();
  const segmentos = useSegments();
  const caminho = usePathname();
  const router = useRouter();
  const [aberturaConcluida, setAberturaConcluida] = useState(false);
  const concluirAbertura = useCallback(() => setAberturaConcluida(true), []);

  // Animação de carregamento por cima de tudo até o app estar pronto.
  const abertura = aberturaConcluida ? null : (
    <TelaAbertura pronto={!carregando || !supabaseConfigurado} onFim={concluirAbertura} />
  );

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
          {chaveSecretaNoApp ? 'Chave do Supabase incorreta' : 'Supabase não configurado'}
        </Text>
        <Text style={{ color: cores.suave, lineHeight: 22 }}>
          {chaveSecretaNoApp
            ? 'O .env está com a chave secreta (service_role / sb_secret_). Ela dá acesso total ao banco e não pode ficar no app. Troque EXPO_PUBLIC_SUPABASE_ANON_KEY pela chave anon / publishable e reinicie com `npx expo start -c`.'
            : 'Copie o arquivo .env.example para .env, preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY e reinicie com `npx expo start -c`.'}
        </Text>
        {abertura}
      </View>
    );
  }

  return (
    <>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      {carregando ? <View style={{ flex: 1, backgroundColor: cores.fundo }} /> : <Slot />}
      {abertura}
    </>
  );
}

/** No navegador, ocupa a tela toda com o fundo do tema (cada tela limita a própria largura). */
function MolduraWeb({ children }: { children: ReactNode }) {
  const { cores } = useTema();

  // Mesmo ícone da landing em todas as telas do app web.
  useEffect(() => {
    type Elemento = { remove: () => void; setAttribute: (nome: string, valor: string) => void };
    const doc = (globalThis as unknown as {
      document?: {
        head: { appendChild: (el: Elemento) => void };
        querySelectorAll: (seletor: string) => { forEach: (fn: (el: Elemento) => void) => void };
        createElement: (tag: string) => Elemento;
      };
    }).document;
    if (Platform.OS !== 'web' || !doc) return;
    doc.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"]').forEach((el) => el.remove());
    const link = doc.createElement('link');
    link.setAttribute('rel', 'icon');
    link.setAttribute('type', 'image/svg+xml');
    link.setAttribute('href', '/landing/img/favicon.svg');
    doc.head.appendChild(link);
  }, []);

  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>{children}</View>
  );
}

/**
 * Se uma tela der erro, mostra a mensagem em vez de fechar o app (em produção um erro
 * não tratado encerra o app sem aviso). Ajuda a descobrir o problema no APK.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000805', justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700' }}>Algo deu errado</Text>
      <Text style={{ color: '#9fb5ab', lineHeight: 22 }} selectable>
        {error.name}: {error.message}
      </Text>
      <Text style={{ color: '#5d7468', fontSize: 11 }} selectable numberOfLines={12}>
        {error.stack ?? ''}
      </Text>
      <Text
        onPress={() => {
          retry().catch(() => {});
        }}
        style={{ color: '#23b785', fontWeight: '700', fontSize: 16, paddingVertical: 12 }}
      >
        Tentar novamente
      </Text>
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
