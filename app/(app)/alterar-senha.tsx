import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Alert } from '@/lib/alerta';
import { Botao, BotoesFormulario, Campo, CampoSenha, MensagemErro, RequisitosSenha, TelaFormulario } from '@/components/ui';
import { MENSAGEM_SENHA_FRACA, senhaForte } from '@/lib/senha';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTema } from '@/lib/theme';

function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('nonce') || m.includes('expired') || m.includes('invalid')) {
    return 'Código inválido ou expirado. Peça um novo código.';
  }
  if (m.includes('different')) return 'A nova senha precisa ser diferente da atual.';
  if (m.includes('password')) return MENSAGEM_SENHA_FRACA;
  return mensagem;
}

/**
 * Troca de senha com confirmação por e-mail: o Supabase envia um código para o
 * e-mail da conta e só aceita a nova senha junto com esse código.
 */
export default function AlterarSenha() {
  const { cores } = useTema();
  const router = useRouter();
  const { session } = useAuth();
  const email = session?.user.email ?? '';

  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarCodigo() {
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.reauthenticate();
    setCarregando(false);
    if (error) setErro(traduzir(error.message));
    else setCodigoEnviado(true);
  }

  async function salvar() {
    if (!codigo.trim()) return setErro('Digite o código recebido por e-mail.');
    if (!senhaForte(senha)) return setErro(MENSAGEM_SENHA_FRACA);
    if (senha !== confirmar) return setErro('A confirmação não confere com a nova senha.');

    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.updateUser({ password: senha, nonce: codigo.trim() });
    setCarregando(false);

    if (error) {
      setErro(traduzir(error.message));
      return;
    }
    Alert.alert('Pronto', 'Sua senha foi alterada.', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <TelaFormulario titulo="Alterar senha">
      <Text style={{ color: cores.suave, lineHeight: 21 }}>
        {codigoEnviado
          ? `Enviamos um código para ${email}. Digite-o abaixo junto com a nova senha.`
          : `Por segurança, vamos enviar um código de confirmação para ${email} antes de trocar a senha.`}
      </Text>

      {erro ? <MensagemErro texto={erro} /> : null}

      {codigoEnviado ? (
        <>
          <Campo
            rotulo="Código de confirmação"
            obrigatorio
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={8}
            autoComplete="one-time-code"
          />
          <CampoSenha rotulo="Nova senha" value={senha} onChangeText={setSenha} obrigatorio />
          <RequisitosSenha senha={senha} />
          <CampoSenha
            rotulo="Confirmar nova senha"
            value={confirmar}
            onChangeText={setConfirmar}
            obrigatorio
            erro={confirmar && confirmar !== senha ? 'As senhas não conferem.' : null}
            sucesso={confirmar && confirmar === senha ? 'As senhas conferem.' : null}
          />
          <BotoesFormulario texto="Salvar" onPress={salvar} carregando={carregando} />
          <Botao
            texto="Reenviar código"
            variante="contorno"
            onPress={enviarCodigo}
            desabilitado={carregando}
          />
        </>
      ) : (
        <BotoesFormulario texto="Enviar código" icone="mail-outline" onPress={enviarCodigo} carregando={carregando} />
      )}
    </TelaFormulario>
  );
}
