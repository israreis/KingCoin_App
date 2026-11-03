import { Link, useRouter } from 'expo-router';

import { LogoInicio } from '@/components/LogoKingCoin';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  Botao,
  Campo,
  CampoSenha,
  MensagemErro,
  RequisitosSenha,
  TelaFormulario,
} from '@/components/ui';
import { Alert } from '@/lib/alerta';
import { MENSAGEM_SENHA_FRACA, senhaForte } from '@/lib/senha';
import { supabase } from '@/lib/supabase';
import { useTema } from '@/lib/theme';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (m.includes('password')) return MENSAGEM_SENHA_FRACA;
  return mensagem;
}

export default function Cadastro() {
  const { cores } = useTema();
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const senhasConferem = confirmar.length > 0 && confirmar === senha;
  const podeEnviar =
    nome.trim().length > 0 &&
    sobrenome.trim().length > 0 &&
    EMAIL_VALIDO.test(email.trim()) &&
    senhaForte(senha) &&
    senhasConferem;

  async function cadastrar() {
    if (!nome.trim() || !sobrenome.trim() || !email.trim() || !senha) {
      return setErro('Preencha todos os campos obrigatórios.');
    }
    if (!EMAIL_VALIDO.test(email.trim())) return setErro('Digite um e-mail válido.');
    if (!senhaForte(senha)) return setErro(MENSAGEM_SENHA_FRACA);
    if (!senhasConferem) return setErro('As senhas não conferem.');

    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { nome: nome.trim(), sobrenome: sobrenome.trim() } },
    });
    setCarregando(false);

    if (error) {
      setErro(traduzirErro(error.message));
      return;
    }

    // Sem sessão = o projeto exige confirmação de e-mail.
    if (!data.session) {
      Alert.alert(
        'Confirme seu e-mail',
        'Enviamos um link de confirmação. Depois de confirmar, volte e faça login.',
      );
      router.replace('/login');
    }
  }

  return (
    <TelaFormulario margemTopo>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <LogoInicio tamanho={64} />
        <Text style={{ color: cores.texto, fontSize: 28, fontWeight: '800', marginTop: 6 }}>Criar conta</Text>
        <Text style={{ color: cores.suave }}>Comece a organizar suas finanças.</Text>
      </View>

      {erro ? <MensagemErro texto={erro} /> : null}

      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        autoCapitalize="words"
        autoComplete="given-name"
        obrigatorio
      />
      <Campo
        rotulo="Sobrenome"
        value={sobrenome}
        onChangeText={setSobrenome}
        autoCapitalize="words"
        autoComplete="family-name"
        obrigatorio
      />
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        obrigatorio
        erro={email.trim() && !EMAIL_VALIDO.test(email.trim()) ? 'E-mail inválido.' : null}
      />
      <CampoSenha
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        autoComplete="new-password"
        textContentType="newPassword"
        obrigatorio
      />
      <RequisitosSenha senha={senha} />
      <CampoSenha
        rotulo="Confirmar senha"
        value={confirmar}
        onChangeText={setConfirmar}
        autoComplete="new-password"
        textContentType="newPassword"
        obrigatorio
        erro={confirmar && !senhasConferem ? 'As senhas não conferem.' : null}
        sucesso={senhasConferem ? 'As senhas conferem.' : null}
      />

      <Text style={{ color: cores.suave, fontSize: 12 }}>
        <Text style={{ color: cores.perigo }}>*</Text> Campos obrigatórios
      </Text>

      <Botao
        texto="Cadastrar"
        onPress={cadastrar}
        carregando={carregando}
        desabilitado={!podeEnviar}
      />

      <Link href="/login" style={{ color: cores.primaria, fontWeight: '600', textAlign: 'center' }}>
        Já tenho conta
      </Link>
    </TelaFormulario>
  );
}
