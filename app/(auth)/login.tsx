import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LogoInicio } from '@/components/LogoKingCoin';
import { Botao, Campo, CampoSenha, MensagemErro, TelaFormulario } from '@/components/ui';
import { appleDisponivel, entrarComApple, entrarComGoogle } from '@/lib/oauth';
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
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [social, setSocial] = useState<'google' | 'apple' | null>(null);
  const [apple, setApple] = useState(false);

  useEffect(() => {
    appleDisponivel().then(setApple).catch(() => {});
  }, []);

  async function entrarSocial(provedor: 'google' | 'apple') {
    setSocial(provedor);
    setErro(null);
    try {
      if (provedor === 'google') await entrarComGoogle();
      else await entrarComApple();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setSocial(null);
    }
  }

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

      <Text style={{ color: cores.suave, textAlign: 'center' }}>ou</Text>
      <Botao
        texto="Continuar com Google"
        icone="logo-google"
        variante="contorno"
        onPress={() => entrarSocial('google')}
        carregando={social === 'google'}
      />
      {apple ? (
        <Botao
          texto="Continuar com Apple"
          icone="logo-apple"
          variante="contorno"
          onPress={() => entrarSocial('apple')}
          carregando={social === 'apple'}
        />
      ) : null}

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
