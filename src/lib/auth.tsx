import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { lerSessaoSalva } from './offline';
import { supabase } from './supabase';

type AuthContexto = {
  session: Session | null;
  carregando: boolean;
};

const Contexto = createContext<AuthContexto>({ session: null, carregando: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  // true quando a sessão veio do aparelho porque não foi possível renová-la (sem internet).
  const sessaoOffline = useRef(false);

  async function carregarSessao() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        sessaoOffline.current = false;
        setSession(data.session);
      } else if (error) {
        const salva = await lerSessaoSalva();
        sessaoOffline.current = salva !== null;
        setSession(salva);
      } else {
        setSession(null);
      }
    } catch {
      const salva = await lerSessaoSalva();
      sessaoOffline.current = salva !== null;
      setSession(salva);
    }
  }

  useEffect(() => {
    carregarSessao().finally(() => setCarregando(false));

    const { data } = supabase.auth.onAuthStateChange((evento, novaSession) => {
      // A sessão inicial é tratada por carregarSessao (que sabe lidar com o modo offline).
      if (evento === 'INITIAL_SESSION') return;
      sessaoOffline.current = false;
      setSession(novaSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Mantém o token renovado e tenta recuperar a sessão ao voltar para o app.
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        supabase.auth.startAutoRefresh();
        if (sessaoOffline.current) carregarSessao();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => assinatura.remove();
  }, []);

  return <Contexto.Provider value={{ session, carregando }}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthContexto {
  return useContext(Contexto);
}
