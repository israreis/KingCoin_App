import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Botao, Campo, Cartao, MensagemErro, TelaFormulario } from '@/components/ui';
import { excluirMinhaConta } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mostrarErro } from '@/lib/dialogos';
import { limparCache } from '@/lib/offline';
import { supabase } from '@/lib/supabase';
import { COR_TIPO, useTema } from '@/lib/theme';

export default function ExcluirConta() {
  const { cores } = useTema();
  const { session } = useAuth();
  const usuario = session?.user;
  const email = usuario?.email ?? '';

  // Contas criadas com Google/Apple não têm senha: nesse caso, confirma com o e-mail.
  const provedor = usuario?.app_metadata?.provider as string | undefined;
  const temSenha = !provedor || provedor === 'email';

  const [confirmacao, setConfirmacao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluirDefinitivamente() {
    setCarregando(true);
    try {
      await excluirMinhaConta(usuario?.id ?? '');
      await limparCache();
    } catch (e) {
      mostrarErro(e);
      setCarregando(false);
    }
  }

  async function confirmar() {
    setErro(null);

    if (temSenha) {
      if (!confirmacao) return setErro('Digite sua senha.');
      setCarregando(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password: confirmacao });
      setCarregando(false);
      if (error) return setErro('Senha incorreta.');
    } else if (confirmacao.trim().toLowerCase() !== email.toLowerCase()) {
      return setErro('Digite o seu e-mail exatamente como aparece acima.');
    }

    Alert.alert(
      'Última confirmação',
      'Sua conta e todos os dados serão apagados para sempre. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir tudo', style: 'destructive', onPress: excluirDefinitivamente },
      ],
    );
  }

  return (
    <TelaFormulario>
      <Cartao estilo={{ borderColor: COR_TIPO.DESPESA }}>
        <Text style={{ color: cores.texto, fontWeight: '700', fontSize: 16 }}>
          O que será apagado
        </Text>
        <Text style={{ color: cores.suave, lineHeight: 21 }}>
          Movimentações, metas, orçamentos, recorrências, categorias, contas, foto de perfil e
          comprovantes da conta {email}. Não é possível recuperar depois.
        </Text>
      </Cartao>

      {erro ? <MensagemErro texto={erro} /> : null}

      {temSenha ? (
        <Campo
          rotulo="Digite sua senha para confirmar"
          value={confirmacao}
          onChangeText={setConfirmacao}
          secureTextEntry
          autoComplete="password"
        />
      ) : (
        <Campo
          rotulo="Digite seu e-mail para confirmar"
          value={confirmacao}
          onChangeText={setConfirmacao}
          keyboardType="email-address"
        />
      )}

      <Botao texto="Excluir minha conta" variante="perigo" onPress={confirmar} carregando={carregando} />
    </TelaFormulario>
  );
}
