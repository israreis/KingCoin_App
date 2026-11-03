import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * true quando a chave do .env é a secreta (service_role / sb_secret_), que ignora
 * as regras de segurança do banco e nunca pode ir para dentro do app.
 */
export const chaveSecretaNoApp = (() => {
  if (anonKey.startsWith('sb_secret_')) return true;
  try {
    const payload = anonKey.split('.')[1];
    if (!payload) return false;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json?.role === 'service_role';
  } catch {
    return false;
  }
})();

/** Falso quando o arquivo .env ainda não foi preenchido ou usa a chave errada. */
export const supabaseConfigurado = url.length > 0 && anonKey.length > 0 && !chaveSecretaNoApp;

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Na web o login social volta para a própria página com a sessão na URL.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);
