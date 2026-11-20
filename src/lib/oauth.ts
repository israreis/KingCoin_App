import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Traduz os erros mais comuns do login social. */
export function traduzirErroSocial(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return 'O login com Google ainda não foi ativado no servidor. Use e-mail e senha por enquanto.';
  }
  if (m.includes('access_denied') || m.includes('access denied')) return 'Login cancelado.';
  if (m.includes('redirect')) return 'Endereço de retorno não autorizado no Supabase. Avise o suporte.';
  return mensagem;
}

/** Lê access_token e refresh_token devolvidos pelo Supabase na URL de retorno. */
async function salvarSessaoDaUrl(url: string) {
  const parametros = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const valores = new URLSearchParams(parametros);

  const erro = valores.get('error_description');
  if (erro) throw new Error(traduzirErroSocial(erro));

  const accessToken = valores.get('access_token');
  const refreshToken = valores.get('refresh_token');
  if (!accessToken || !refreshToken) throw new Error('O login não foi concluído. Tente novamente.');

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error(error.message);
}

export async function entrarComGoogle(): Promise<void> {
  if (Platform.OS === 'web') {
    // Volta para /auth/callback, que espera a sessão (ou mostra o erro) antes de seguir
    const origem = (globalThis as unknown as { location?: { origin: string } }).location?.origin ?? '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origem}/auth/callback`, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw new Error(traduzirErroSocial(error.message));
    return;
  }

  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) throw new Error(traduzirErroSocial(error?.message ?? 'Não foi possível abrir o login do Google.'));

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (resultado.type === 'success') await salvarSessaoDaUrl(resultado.url);
}

export async function appleDisponivel(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function entrarComApple(): Promise<void> {
  try {
    const credencial = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credencial.identityToken) throw new Error('A Apple não devolveu a identificação.');

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credencial.identityToken,
    });
    if (error) throw new Error(error.message);

    // A Apple só envia o nome no primeiro login: guarda no perfil.
    const nome = [credencial.fullName?.givenName, credencial.fullName?.familyName]
      .filter(Boolean)
      .join(' ');
    if (nome) await supabase.auth.updateUser({ data: { nome } });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
    throw e;
  }
}
