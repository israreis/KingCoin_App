import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LoginSocial } from '@/components/LoginSocial';
import { LogoInicio } from '@/components/LogoKingCoin';
import { Botao, Campo, CampoSenha, MensagemErro, TelaFormulario } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useTema } from '@/lib/theme';

function traduzirErro(mensagem: string): string {
  if (mensagem.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (mensagem.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  return mensagem;
}

export default function Login() {
  const { cores } = useTema();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // Erro vindo do retorno do login com Google (/auth/callback)
  const { erro: erroRetorno } = useLocalSearchParams<{ erro?: string }>();
  const [erro, setErro] = useState<string | null>(typeof erroRetorno === 'string' ? erroRetorno : null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) setErro(traduzirErro(error.message));
    setCarregando(false);
  }

  return (
    <TelaFormulario margemTopo>
      <View style={estilos.topo}>
        <LogoInicio tamanho={96} />
        <Text style={[estilos.titulo, { color: cores.texto }]}>KingCoin</Text>
        <Text style={{ color: cores.suave }}>Suas finanças, sob controle.</Text>
      </View>

      {erro ? <MensagemErro texto={erro} /> : null}

      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="voce@email.com"
      />
      <CampoSenha
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        autoComplete="password"
        placeholder="Sua senha"
      />

      <Botao texto="Entrar" onPress={entrar} carregando={carregando} />

      <LoginSocial onErro={setErro} />

      <View style={estilos.links}>
        <Link href="/forgot-password" style={{ color: cores.primaria, fontWeight: '600' }}>
          Esqueci minha senha
        </Link>
        <Link href="/register" style={{ color: cores.primaria, fontWeight: '600' }}>
          Criar conta
        </Link>
      </View>
    </TelaFormulario>
  );
}

const estilos = StyleSheet.create({
  topo: { alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 12 },
  titulo: { fontSize: 30, fontWeight: '800' },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
