import { Redirect } from 'expo-router';
import { Platform, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { traduzirErroSocial } from '@/lib/oauth';
import { useTema } from '@/lib/theme';

/** Erro devolvido pelo Google/Supabase na URL de retorno (só na web). */
function erroNaUrl(): string | null {
  if (Platform.OS !== 'web') return null;
  const loc = (globalThis as unknown as { location?: { hash: string; search: string } }).location;
  if (!loc) return null;
  const valores = new URLSearchParams(loc.hash.replace(/^#/, '') || loc.search.replace(/^\?/, ''));
  const erro = valores.get('error_description') ?? valores.get('error');
  return erro ? traduzirErroSocial(erro.replace(/\+/g, ' ')) : null;
}

/**
 * Destino do retorno do login social. Na web o Supabase lê a sessão da URL; aqui só esperamos
 * terminar e seguimos para o início (logado) ou de volta ao login com a mensagem de erro.
 */
export default function RetornoLogin() {
  const { session, carregando } = useAuth();
  const { cores } = useTema();

  if (carregando) return <View style={{ flex: 1, backgroundColor: cores.fundo }} />;
  if (session) return <Redirect href="/" />;
  const erro = erroNaUrl();
  return erro ? <Redirect href={{ pathname: '/login', params: { erro } }} /> : <Redirect href="/login" />;
}
