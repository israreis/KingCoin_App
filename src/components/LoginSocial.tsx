import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Botao } from '@/components/ui';
import { appleDisponivel, entrarComApple, entrarComGoogle } from '@/lib/oauth';
import { useTema } from '@/lib/theme';

/** "ou" + botões de Google (todas as plataformas) e Apple (só no iPhone), usados no login e no cadastro. */
export function LoginSocial({ onErro }: { onErro: (mensagem: string | null) => void }) {
  const { cores } = useTema();
  const [social, setSocial] = useState<'google' | 'apple' | null>(null);
  const [apple, setApple] = useState(false);

  useEffect(() => {
    appleDisponivel().then(setApple).catch(() => {});
  }, []);

  async function entrar(provedor: 'google' | 'apple') {
    setSocial(provedor);
    onErro(null);
    try {
      if (provedor === 'google') await entrarComGoogle();
      else await entrarComApple();
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setSocial(null);
    }
  }

  return (
    <>
      <Text style={{ color: cores.suave, textAlign: 'center' }}>ou</Text>
      <Botao
        texto="Continuar com Google"
        icone="logo-google"
        variante="contorno"
        onPress={() => entrar('google')}
        carregando={social === 'google'}
      />
      {apple ? (
        <Botao
          texto="Continuar com Apple"
          icone="logo-apple"
          variante="contorno"
          onPress={() => entrar('apple')}
          carregando={social === 'apple'}
        />
      ) : null}
    </>
  );
}
