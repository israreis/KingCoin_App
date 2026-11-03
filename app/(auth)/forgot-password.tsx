import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Alert } from '@/lib/alerta';
import { Botao, Campo, CampoSenha, MensagemErro, RequisitosSenha, TelaFormulario } from '@/components/ui';
import { MENSAGEM_SENHA_FRACA, senhaForte } from '@/lib/senha';
import { supabase } from '@/lib/supabase';
import { useTema } from '@/lib/theme';

/**
 * Recuperação de senha por código: o Supabase envia um e-mail com um código de
 * 6 dígitos (veja o README para ajustar o template do e-mail).
 */
export default function EsqueciSenha() {
  const { cores } = useTema();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviarCodigo() {
    if (!email.trim()) {
      setErro('Informe o e-mail da conta.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setCarregando(false);

    if (error) setErro(error.message);
    else setCodigoEnviado(true);
  }

  async function redefinir() {
    if (!codigo.trim()) {
      setErro('Informe o código recebido por e-mail.');
      return;
    }
    if (!senhaForte(novaSenha)) {
      setErro(MENSAGEM_SENHA_FRACA);
      return;
    }
    setCarregando(true);
    setErro(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codigo.trim(),
      type: 'recovery',
    });
    if (error) {
      setCarregando(false);
      setErro('Código inválido ou expirado.');
      return;
    }

    // O código validado já abriu uma sessão; basta trocar a senha.
    const { error: erroSenha } = await supabase.auth.updateUser({ password: novaSenha });
    setCarregando(false);

    if (erroSenha) setErro(erroSenha.message);
    else Alert.alert('Pronto!', 'Sua senha foi alterada.');
  }

  return (
    <TelaFormulario margemTopo>
      <View style={{ marginTop: 8, marginBottom: 8, gap: 4 }}>
        <Text style={{ color: cores.texto, fontSize: 28, fontWeight: '800' }}>Recuperar senha</Text>
        <Text style={{ color: cores.suave }}>
          {codigoEnviado
            ? 'Digite o código que enviamos para o seu e-mail e escolha uma nova senha.'
            : 'Enviaremos um código de verificação para o seu e-mail.'}
        </Text>
      </View>

      {erro ? <MensagemErro texto={erro} /> : null}

      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        editable={!codigoEnviado}
      />

      {codigoEnviado ? (
        <>
          <Campo
            rotulo="Código"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={8}
          />
          <CampoSenha rotulo="Nova senha" value={novaSenha} onChangeText={setNovaSenha} obrigatorio />
          <RequisitosSenha senha={novaSenha} />
          <Botao texto="Redefinir senha" onPress={redefinir} carregando={carregando} />
          <Botao texto="Reenviar código" variante="contorno" onPress={enviarCodigo} desabilitado={carregando} />
        </>
      ) : (
        <Botao texto="Enviar código" onPress={enviarCodigo} carregando={carregando} />
      )}

      <Link href="/login" style={{ color: cores.primaria, fontWeight: '600', textAlign: 'center' }}>
        Voltar ao login
      </Link>
    </TelaFormulario>
  );
}
