import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Botao, BotoesFormulario, Campo, Cartao, MensagemErro, TelaFormulario } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTema } from '@/lib/theme';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('already') || m.includes('registered')) return 'Este e-mail já está em uso por outra conta.';
  if (m.includes('security purposes') || m.includes('rate')) {
    return 'Aguarde alguns segundos antes de tentar de novo.';
  }
  if (m.includes('invalid')) return 'E-mail inválido.';
  return mensagem;
}

/**
 * Troca de e-mail: o Supabase envia um link de confirmação ao novo endereço
 * (e ao atual, se "Secure email change" estiver ativo). A troca só vale depois disso.
 */
export default function AlterarEmail() {
  const { cores } = useTema();
  const router = useRouter();
  const { session } = useAuth();
  const emailAtual = session?.user.email ?? '';

  const [novo, setNovo] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    const email = novo.trim().toLowerCase();
    if (!EMAIL_VALIDO.test(email)) return setErro('Digite um e-mail válido.');
    if (email !== confirmar.trim().toLowerCase()) return setErro('Os e-mails não coincidem.');
    if (email === emailAtual.toLowerCase()) return setErro('Esse já é o seu e-mail atual.');

    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: Linking.createURL('auth/callback') },
    );
    setCarregando(false);

    if (error) setErro(traduzir(error.message));
    else setEnviado(true);
  }

  if (enviado) {
    return (
      <TelaFormulario titulo="Alterar e-mail">
        <Cartao>
          <Text style={{ color: cores.texto, fontSize: 17, fontWeight: '700' }}>Confirme o novo e-mail</Text>
          <Text style={{ color: cores.suave, lineHeight: 21 }}>
            Enviamos um link de confirmação para {novo.trim()}. Se a confirmação dupla estiver ativa,
            você também receberá um link em {emailAtual}. O e-mail da conta só muda depois de
            confirmar.
          </Text>
        </Cartao>
        <Botao texto="Entendi" onPress={() => router.back()} />
      </TelaFormulario>
    );
  }

  return (
    <TelaFormulario titulo="Alterar e-mail">
      <Text style={{ color: cores.suave, lineHeight: 21 }}>
        E-mail atual: <Text style={{ color: cores.texto, fontWeight: '600' }}>{emailAtual}</Text>
      </Text>

      {erro ? <MensagemErro texto={erro} /> : null}

      <Campo
        rotulo="Novo e-mail"
        value={novo}
        onChangeText={setNovo}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo
        rotulo="Confirmar novo e-mail"
        value={confirmar}
        onChangeText={setConfirmar}
        keyboardType="email-address"
      />

      <BotoesFormulario texto="Enviar" icone="mail-outline" onPress={enviar} carregando={carregando} />
    </TelaFormulario>
  );
}
