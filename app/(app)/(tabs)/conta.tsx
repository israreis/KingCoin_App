import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Botao, Cartao, Carregando, Chips, MensagemErro, Secao, Tela } from '@/components/ui';
import { buscarPerfil, escolherEEnviarFoto } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBiometria } from '@/lib/biometria';
import { mostrarErro } from '@/lib/dialogos';
import { mascararTelefone } from '@/lib/format';
import { PREFERENCIAS_PADRAO, aplicarPreferencias, lerPreferencias } from '@/lib/notificacoes';
import type { PreferenciasNotificacao } from '@/lib/notificacoes';
import { limparCache } from '@/lib/offline';
import { supabase } from '@/lib/supabase';
import { useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';

export default function Conta() {
  const { cores, escuro, alternar } = useTema();
  const { session } = useAuth();
  const router = useRouter();
  const usuario = session?.user;
  const userId = usuario?.id ?? '';

  const { dados: perfil, carregando, erro } = useDados(() => buscarPerfil(userId), [userId]);

  const [foto, setFoto] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const biometria = useBiometria();
  const [prefs, setPrefs] = useState<PreferenciasNotificacao>(PREFERENCIAS_PADRAO);

  useEffect(() => {
    lerPreferencias().then(setPrefs).catch(() => {});
  }, []);

  useEffect(() => {
    if (perfil) setFoto(perfil.foto_url);
  }, [perfil]);

  async function mudarNotificacoes(novas: PreferenciasNotificacao) {
    const anteriores = prefs;
    setPrefs(novas);
    try {
      await aplicarPreferencias(novas);
    } catch (e) {
      setPrefs(anteriores);
      mostrarErro(e);
    }
  }

  async function mudarBiometria(valor: boolean) {
    try {
      await biometria.definirAtivada(valor);
    } catch (e) {
      mostrarErro(e);
    }
  }

  async function trocarFoto() {
    setEnviandoFoto(true);
    try {
      const url = await escolherEEnviarFoto(userId);
      if (url) setFoto(url);
    } catch (e) {
      mostrarErro(e, 'Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  function sair() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await limparCache();
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  const nomeCompleto =
    [perfil?.nome, perfil?.sobrenome].filter(Boolean).join(' ') ||
    (usuario?.user_metadata?.nome as string | undefined) ||
    usuario?.email?.split('@')[0] ||
    '';
  const inicial = nomeCompleto.charAt(0).toUpperCase() || '?';

  return (
    <Tela titulo="Minha conta">
      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !perfil ? <Carregando /> : null}

      <View style={estilos.cabecalho}>
        <Pressable onPress={trocarFoto} disabled={enviandoFoto} accessibilityLabel="Trocar foto de perfil">
          {foto ? (
            <Image source={{ uri: foto }} style={estilos.avatar} />
          ) : (
            <View style={[estilos.avatar, estilos.avatarPadrao, { backgroundColor: cores.primaria }]}>
              <Text style={estilos.inicial}>{inicial}</Text>
            </View>
          )}
          <View style={[estilos.camera, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            <Ionicons name="camera-outline" size={16} color={cores.primaria} />
          </View>
        </Pressable>
        <Text style={[estilos.nome, { color: cores.texto }]} numberOfLines={2}>
          {nomeCompleto}
        </Text>
      </View>

      <Secao titulo="Dados pessoais" />
      <Cartao>
        <InfoLinha rotulo="Nome" valor={perfil?.nome} />
        <InfoLinha rotulo="Sobrenome" valor={perfil?.sobrenome} />
        <InfoLinha rotulo="Telefone" valor={perfil?.telefone ? mascararTelefone(perfil.telefone) : null} />
        <InfoLinha rotulo="E-mail" valor={usuario?.email} ultima />
        <Botao
          texto="Editar dados"
          icone="create-outline"
          variante="contorno"
          onPress={() => router.push('/editar-perfil')}
        />
      </Cartao>

      <Secao titulo="Preferências" />
      <Cartao>
        <LinhaSwitch rotulo="Tema escuro" valor={escuro} onChange={alternar} />
        <LinhaSwitch rotulo="Desbloquear com biometria" valor={biometria.ativada} onChange={mudarBiometria} />
        <LinhaSwitch
          rotulo="Lembrete diário"
          valor={prefs.diario}
          onChange={(valor) => mudarNotificacoes({ ...prefs, diario: valor })}
        />
        {prefs.diario ? (
          <Chips
            opcoes={[12, 18, 20, 21].map((hora) => ({ id: hora, texto: `${hora}h` }))}
            valor={prefs.hora}
            onChange={(hora) => mudarNotificacoes({ ...prefs, hora })}
          />
        ) : null}
        <LinhaSwitch
          rotulo="Resumo semanal (domingo, 18h)"
          valor={prefs.semanal}
          onChange={(valor) => mudarNotificacoes({ ...prefs, semanal: valor })}
        />
      </Cartao>

      <Secao titulo="Ajuda" />
      <Cartao>
        <Linha icone="help-circle-outline" texto="Ajuda e tutoriais" onPress={() => router.push('/ajuda')} />
      </Cartao>

      <Secao titulo="Segurança" />
      <Cartao>
        <Linha icone="mail-outline" texto="Alterar e-mail" onPress={() => router.push('/alterar-email')} />
        <Linha icone="key-outline" texto="Alterar senha" onPress={() => router.push('/alterar-senha')} />
        <Linha
          icone="trash-outline"
          texto="Deletar minha conta"
          perigo
          onPress={() => router.push('/excluir-conta')}
        />
      </Cartao>

      <Botao texto="Sair" variante="contorno" icone="log-out-outline" onPress={sair} />
    </Tela>
  );
}

function InfoLinha({
  rotulo,
  valor,
  ultima = false,
}: {
  rotulo: string;
  valor?: string | null;
  ultima?: boolean;
}) {
  const { cores } = useTema();
  return (
    <View
      style={[
        estilos.info,
        ultima ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cores.borda },
      ]}
    >
      <Text style={{ color: cores.suave }}>{rotulo}</Text>
      <Text
        style={{
          color: valor ? cores.texto : cores.suave,
          fontWeight: valor ? '600' : '400',
          fontStyle: valor ? 'normal' : 'italic',
          flexShrink: 1,
          textAlign: 'right',
        }}
        numberOfLines={1}
      >
        {valor || 'Não informado'}
      </Text>
    </View>
  );
}

function LinhaSwitch({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
}) {
  const { cores } = useTema();
  return (
    <View style={estilos.linhaSwitch}>
      <Text style={{ color: cores.texto, fontWeight: '600', flex: 1 }}>{rotulo}</Text>
      <Switch value={valor} onValueChange={onChange} trackColor={{ true: cores.primaria, false: cores.borda }} />
    </View>
  );
}

function Linha({
  icone,
  texto,
  onPress,
  perigo = false,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  texto: string;
  onPress: () => void;
  perigo?: boolean;
}) {
  const { cores } = useTema();
  const cor = perigo ? cores.perigo : cores.primaria;
  return (
    <Pressable onPress={onPress} style={estilos.linhaMenu}>
      <Ionicons name={icone} size={22} color={cor} />
      <Text style={{ color: perigo ? cores.perigo : cores.texto, flex: 1, fontWeight: '600' }}>{texto}</Text>
      <Ionicons name="chevron-forward" size={18} color={cores.suave} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarPadrao: { alignItems: 'center', justifyContent: 'center' },
  inicial: { color: '#ffffff', fontSize: 42, fontWeight: '700' },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10 },
  linhaSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  linhaMenu: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
