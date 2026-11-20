import { useState } from 'react';
import { Text } from 'react-native';

import { Alert } from '@/lib/alerta';
import { Botao, BotoesFormulario, Campo, Cartao, MensagemErro, TelaFormulario } from '@/components/ui';
import { excluirMinhaConta } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mostrarErro } from '@/lib/dialogos';
import { limparCache } from '@/lib/offline';
import { supabase } from '@/lib/supabase';
import { COR_TIPO, useTema } from '@/lib/theme';

/**
 * Exclusão da conta confirmada por um código enviado ao e-mail. Funciona igual para quem
 * entrou com senha, Google ou Apple (contas sociais não têm senha para conferir).
 */
export default function ExcluirConta() {
  const { cores } = useTema();
  const { session } = useAuth();
  const usuario = session?.user;
  const email = usuario?.email ?? '';

  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarCodigo() {
    if (!email) return setErro('Sua conta não tem e-mail cadastrado.');
    setErro(null);
    setCarregando(true);
    // shouldCreateUser: false — só envia para a conta que já existe
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setCarregando(false);
    if (error) {
      const m = error.message.toLowerCase();
      return setErro(
        m.includes('rate') || m.includes('seconds')
          ? 'Muitos envios seguidos. Espere um pouco e tente de novo.'
          : 'Não foi possível enviar o código. Tente novamente.',
      );
    }
    setCodigoEnviado(true);
  }

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
    if (!codigo.trim()) return setErro('Digite o código recebido por e-mail.');

    setCarregando(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo.trim(), type: 'email' });
    setCarregando(false);
    if (error) return setErro('Código inválido ou expirado.');

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
    <TelaFormulario titulo="Excluir conta">
      <Cartao estilo={{ borderColor: COR_TIPO.DESPESA }}>
        <Text style={{ color: cores.texto, fontWeight: '700', fontSize: 16 }}>
          O que será apagado
        </Text>
        <Text style={{ color: cores.suave, lineHeight: 21 }}>
          Movimentações, metas, orçamentos, recorrências, categorias, foto de perfil e
          comprovantes da conta {email}. Não é possível recuperar depois.
        </Text>
      </Cartao>

      {erro ? <MensagemErro texto={erro} /> : null}

      {codigoEnviado ? (
        <>
          <Text style={{ color: cores.suave, lineHeight: 21 }}>
            Enviamos um código para {email}. Digite-o abaixo para confirmar a exclusão.
          </Text>
          <Campo
            rotulo="Código recebido por e-mail"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
          />
          <BotoesFormulario texto="Excluir" variante="perigo" onPress={confirmar} carregando={carregando} />
          <Botao texto="Reenviar código" variante="contorno" onPress={enviarCodigo} desabilitado={carregando} />
        </>
      ) : (
        <>
          <Text style={{ color: cores.suave, lineHeight: 21 }}>
            Para sua segurança, vamos enviar um código de confirmação para {email}.
          </Text>
          <Botao texto="Enviar código" variante="perigo" onPress={enviarCodigo} carregando={carregando} />
        </>
      )}
    </TelaFormulario>
  );
}
