import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { mascararMoeda } from '@/lib/format';
import { REGRAS_SENHA } from '@/lib/senha';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useBarraAbas } from '@/lib/barraAbas';
import { useTema } from '@/lib/theme';
import { useId } from 'react';

/** Respiro entre o conteúdo e as bordas da tela. */
const ESPACO_TELA = 20;

/** Fecha o teclado ao arrastar a tela (no iOS, acompanhando o dedo). */
export const MODO_FECHAR_TECLADO = Platform.OS === 'ios' ? 'interactive' : 'on-drag';

/** Teclados sem tecla de confirmar no iOS: ganham uma barra com "OK". */
const TECLADOS_SEM_ENTER = ['number-pad', 'decimal-pad', 'numeric', 'phone-pad', 'numbers-and-punctuation'];

// --- Tela ------------------------------------------------------------------

type TelaProps = {
  titulo?: string;
  children: ReactNode;
  /** Ações exibidas à direita do título. */
  acoes?: ReactNode;
  atualizando?: boolean;
  onAtualizar?: () => void;
  /** Quando false, não envolve o conteúdo em ScrollView (use com FlatList). */
  rolavel?: boolean;
  bordas?: ('top' | 'bottom')[];
  /** Chamado a cada rolagem (além de esconder a barra de abas). */
  onRolar?: (evento: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Elemento fixo sobre o conteúdo (ex.: botão flutuante). */
  flutuante?: ReactNode;
};

export function Tela({
  titulo,
  children,
  acoes,
  atualizando,
  onAtualizar,
  rolavel = true,
  bordas = ['top'],
  onRolar,
  flutuante,
}: TelaProps) {
  const { cores } = useTema();
  const { aoRolar, mostrar } = useBarraAbas();

  // Ao entrar na tela, a barra de abas volta a aparecer.
  useFocusEffect(
    useCallback(() => {
      mostrar();
    }, [mostrar]),
  );

  const cabecalho = titulo ? (
    <View style={estilos.cabecalho}>
      <Text style={[estilos.titulo, { color: cores.texto }]}>{titulo}</Text>
      {acoes}
    </View>
  ) : null;

  return (
    <SafeAreaView style={[estilos.tela, { backgroundColor: cores.fundo }]} edges={bordas}>
      {rolavel ? (
        <ScrollView
          contentContainerStyle={estilos.conteudo}
          onScroll={(evento) => {
            aoRolar(evento);
            onRolar?.(evento);
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={MODO_FECHAR_TECLADO}
          refreshControl={
            onAtualizar ? (
              <RefreshControl
                refreshing={!!atualizando}
                onRefresh={onAtualizar}
                tintColor={cores.primaria}
              />
            ) : undefined
          }
        >
          {cabecalho}
          {children}
        </ScrollView>
      ) : (
        <Pressable style={estilos.conteudoFixo} onPress={Keyboard.dismiss} accessible={false}>
          {cabecalho}
          {children}
        </Pressable>
      )}
      {flutuante}
    </SafeAreaView>
  );
}

/**
 * Tela de formulário: sobe o conteúdo quando o teclado abre e respeita as áreas
 * seguras. Use `margemTopo` em telas sem cabeçalho (login, cadastro).
 */
export function TelaFormulario({
  children,
  margemTopo = false,
}: {
  children: ReactNode;
  margemTopo?: boolean;
}) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cores.fundo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          estilos.conteudo,
          {
            paddingTop: (margemTopo ? insets.top : 0) + ESPACO_TELA,
            paddingBottom: insets.bottom + 40,
          },
          // Telas de entrada no navegador: centralizadas na vertical, com respiro.
          margemTopo && Platform.OS === 'web' ? estilos.entradaWeb : null,
        ]}
        keyboardShouldPersistTaps="handled"
          keyboardDismissMode={MODO_FECHAR_TECLADO}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Cartão ----------------------------------------------------------------

export function Cartao({
  children,
  estilo,
}: {
  children: ReactNode;
  estilo?: StyleProp<ViewStyle>;
}) {
  const { cores } = useTema();
  return (
    <View style={[estilos.cartao, { backgroundColor: cores.card, borderColor: cores.borda }, estilo]}>
      {children}
    </View>
  );
}

export function Secao({ titulo, acao }: { titulo: string; acao?: ReactNode }) {
  const { cores } = useTema();
  return (
    <View style={estilos.secao}>
      <Text style={[estilos.secaoTitulo, { color: cores.texto }]}>{titulo}</Text>
      {acao}
    </View>
  );
}

// --- Botão -----------------------------------------------------------------

type BotaoProps = {
  texto: string;
  onPress: () => void;
  variante?: 'primario' | 'contorno' | 'perigo';
  carregando?: boolean;
  desabilitado?: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
};

export function Botao({
  texto,
  onPress,
  variante = 'primario',
  carregando,
  desabilitado,
  icone,
}: BotaoProps) {
  const { cores } = useTema();
  const inativo = carregando || desabilitado;

  const fundo =
    variante === 'primario' ? cores.primaria : variante === 'perigo' ? cores.perigo : 'transparent';
  const corTexto = variante === 'contorno' ? cores.primaria : '#ffffff';
  const borda = variante === 'contorno' ? cores.primaria : fundo;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, borderColor: borda, opacity: inativo ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={18} color={corTexto} /> : null}
          <Text style={[estilos.botaoTexto, { color: corTexto }]}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
}

// --- Campo de texto --------------------------------------------------------

type CampoProps = TextInputProps & {
  rotulo: string;
  erro?: string | null;
  /** Mensagem positiva exibida em verde embaixo do campo. */
  sucesso?: string | null;
  /** Mostra o asterisco de campo obrigatório. */
  obrigatorio?: boolean;
  /** Elemento à direita, dentro do campo (ex.: botão de olho). */
  sufixo?: ReactNode;
};

export function Campo({ rotulo, erro, sucesso, obrigatorio, sufixo, style, ...resto }: CampoProps) {
  const { cores } = useTema();
  const idBarra = useId();
  const precisaBarra =
    Platform.OS === 'ios' && TECLADOS_SEM_ENTER.includes(String(resto.keyboardType ?? ''));
  return (
    <View style={estilos.campo}>
      <Text style={[estilos.rotulo, { color: cores.suave }]}>
        {rotulo}
        {obrigatorio ? <Text style={{ color: cores.perigo }}> *</Text> : null}
      </Text>
      <View style={estilos.entradaEnvoltorio}>
      <TextInput
        placeholderTextColor={cores.suave}
        autoCapitalize="none"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        inputAccessoryViewID={precisaBarra ? idBarra : undefined}
        {...resto}
        style={[
          estilos.entrada,
          {
            backgroundColor: cores.campo,
            borderColor: erro ? cores.perigo : cores.borda,
            color: cores.texto,
          },
          sufixo ? { paddingRight: 48 } : null,
          style,
        ]}
      />
      {sufixo ? <View style={estilos.sufixo}>{sufixo}</View> : null}
      </View>
      {erro ? <Text style={[estilos.erro, { color: cores.perigo }]}>{erro}</Text> : null}
      {!erro && sucesso ? <Text style={[estilos.erro, { color: cores.primaria }]}>{sucesso}</Text> : null}
      {precisaBarra ? (
        <InputAccessoryView nativeID={idBarra}>
          <View style={[estilos.barraTeclado, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={10}>
              <Text style={{ color: cores.primaria, fontWeight: '700', fontSize: 16 }}>OK</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

/** Campo de senha com botão de olho para mostrar ou esconder o texto. */
export function CampoSenha(props: Omit<CampoProps, 'secureTextEntry' | 'sufixo'>) {
  const { cores } = useTema();
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo
      autoCorrect={false}
      {...props}
      secureTextEntry={!visivel}
      sufixo={
        <Pressable
          onPress={() => setVisivel((v) => !v)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={visivel ? 'Esconder senha' : 'Mostrar senha'}
        >
          <Ionicons name={visivel ? 'eye-off-outline' : 'eye-outline'} size={22} color={cores.suave} />
        </Pressable>
      }
    />
  );
}

/** Lista das regras de senha que vai ficando verde conforme o usuário digita. */
export function RequisitosSenha({ senha }: { senha: string }) {
  const { cores } = useTema();
  return (
    <View style={{ gap: 4 }}>
      {REGRAS_SENHA.map((regra) => {
        const ok = regra.testar(senha);
        return (
          <View
            key={regra.id}
            testID={`regra-${regra.id}-${ok ? 'ok' : 'pendente'}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={ok ? cores.primaria : cores.suave}
            />
            <Text style={{ color: ok ? cores.primaria : cores.suave, fontSize: 13 }}>{regra.texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Campo de valor em reais com máscara (digite só os números). */
export function CampoMoeda({ onChangeText, ...resto }: Omit<CampoProps, 'keyboardType'>) {
  return (
    <Campo
      {...resto}
      keyboardType="number-pad"
      onChangeText={(texto) => onChangeText?.(mascararMoeda(texto))}
    />
  );
}

/** Campo de busca com ícone de lupa e botão para limpar. */
export function CampoBusca({
  value,
  onChangeText,
  placeholder = 'Buscar',
}: {
  value: string;
  onChangeText: (texto: string) => void;
  placeholder?: string;
}) {
  const { cores } = useTema();
  return (
    <View style={[estilos.busca, { backgroundColor: cores.campo, borderColor: cores.borda }]}>
      <Ionicons name="search-outline" size={18} color={cores.suave} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={cores.suave}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[estilos.buscaEntrada, { color: cores.texto }]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Limpar busca">
          <Ionicons name="close-circle" size={18} color={cores.suave} />
        </Pressable>
      ) : null}
    </View>
  );
}

// --- Chips (seleção única) -------------------------------------------------

type OpcaoChip<T extends string | number> = { id: T; texto: string; cor?: string };

const ESPACO_CHIPS = 8;
const ID_MAIS = '__mais__';

/**
 * Seleção única em uma linha. Se as opções não couberem, mostra as primeiras
 * (sempre incluindo a selecionada) e um botão "..." para ver todas.
 */
export function Chips<T extends string | number>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: OpcaoChip<T>[];
  valor: T | null;
  onChange: (id: T) => void;
}) {
  const { cores } = useTema();
  const [expandido, setExpandido] = useState(false);
  const [larguraDisponivel, setLarguraDisponivel] = useState(0);
  const [larguras, setLarguras] = useState<Record<string, number>>({});

  const medir = (chave: string, largura: number) =>
    setLarguras((atuais) => (atuais[chave] === largura ? atuais : { ...atuais, [chave]: largura }));

  const largura = (opcao: OpcaoChip<T>) => larguras[String(opcao.id)] ?? 0;
  const soma = (lista: OpcaoChip<T>[]) =>
    lista.reduce((total, o) => total + largura(o), 0) + ESPACO_CHIPS * Math.max(0, lista.length - 1);

  const medido =
    larguraDisponivel > 0 &&
    larguras[ID_MAIS] !== undefined &&
    opcoes.every((o) => larguras[String(o.id)] !== undefined);

  const cabeTudo = medido && soma(opcoes) <= larguraDisponivel;

  let visiveis = opcoes;
  if (medido && !cabeTudo && !expandido) {
    const limite = larguraDisponivel - larguras[ID_MAIS] - ESPACO_CHIPS;
    const cabem: OpcaoChip<T>[] = [];
    for (const opcao of opcoes) {
      if (soma([...cabem, opcao]) > limite) break;
      cabem.push(opcao);
    }
    // A opção escolhida nunca fica escondida.
    const selecionada = opcoes.find((o) => o.id === valor);
    if (selecionada && !cabem.includes(selecionada)) {
      while (cabem.length > 0 && soma([...cabem, selecionada]) > limite) cabem.pop();
      cabem.push(selecionada);
    }
    visiveis = cabem;
  }

  const chip = (opcao: OpcaoChip<T>, aoMedir?: (largura: number) => void) => {
    const ativo = opcao.id === valor;
    const destaque = opcao.cor ?? cores.primaria;
    return (
      <Pressable
        key={String(opcao.id)}
        onPress={() => onChange(opcao.id)}
        onLayout={aoMedir ? (e) => aoMedir(e.nativeEvent.layout.width) : undefined}
        accessibilityRole="button"
        accessibilityState={{ selected: ativo }}
        style={[
          estilos.chip,
          {
            backgroundColor: ativo ? destaque : 'transparent',
            borderColor: ativo ? destaque : cores.borda,
          },
        ]}
      >
        <Text style={{ color: ativo ? '#ffffff' : cores.texto, fontWeight: '600', fontSize: 13 }}>
          {opcao.texto}
        </Text>
      </Pressable>
    );
  };

  const botaoAlternar = (aoMedir?: (largura: number) => void) => (
    <Pressable
      key={ID_MAIS}
      onPress={() => setExpandido((v) => !v)}
      onLayout={aoMedir ? (e) => aoMedir(e.nativeEvent.layout.width) : undefined}
      accessibilityRole="button"
      accessibilityLabel={expandido ? 'Mostrar menos opções' : 'Mostrar mais opções'}
      style={[estilos.chip, { borderColor: cores.borda }]}
    >
      <Ionicons
        name={expandido ? 'chevron-up' : 'ellipsis-horizontal'}
        size={16}
        color={cores.texto}
      />
    </Pressable>
  );

  return (
    <View testID="chips" onLayout={(e) => setLarguraDisponivel(e.nativeEvent.layout.width)}>
      {/* Camada invisível só para medir a largura natural de cada opção. */}
      <View testID="chips-medida" pointerEvents="none" style={estilos.chipsMedida}>
        {opcoes.map((opcao) => chip(opcao, (l) => medir(String(opcao.id), l)))}
        {botaoAlternar((l) => medir(ID_MAIS, l))}
      </View>

      <View
        testID="chips-linha"
        style={[estilos.chips, { flexWrap: expandido ? 'wrap' : 'nowrap', overflow: 'hidden' }]}
      >
        {visiveis.map((opcao) => chip(opcao))}
        {medido && !cabeTudo ? botaoAlternar() : null}
      </View>
    </View>
  );
}

// --- Estados ---------------------------------------------------------------

export function Carregando() {
  const { cores } = useTema();
  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color={cores.primaria} />
    </View>
  );
}

export function Vazio({ texto }: { texto: string }) {
  const { cores } = useTema();
  return <Text style={[estilos.vazio, { color: cores.suave }]}>{texto}</Text>;
}

export function MensagemErro({ texto }: { texto: string }) {
  const { cores } = useTema();
  return (
    <View style={[estilos.alerta, { borderColor: cores.perigo }]}>
      <Text style={{ color: cores.perigo }}>{texto}</Text>
    </View>
  );
}

export function BotaoIcone({
  icone,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { cores } = useTema();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={estilos.botaoIcone}>
      <Ionicons name={icone} size={24} color={cores.primaria} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  entradaWeb: { flexGrow: 1, justifyContent: 'center', paddingTop: 56, paddingBottom: 56 },
  conteudo: { paddingHorizontal: ESPACO_TELA, paddingTop: ESPACO_TELA, paddingBottom: 130, gap: 16 },
  conteudoFixo: { flex: 1, paddingHorizontal: ESPACO_TELA, paddingTop: ESPACO_TELA, gap: 16 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titulo: { fontSize: 26, fontWeight: '700' },
  cartao: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  secaoTitulo: { fontSize: 17, fontWeight: '700' },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 18,
  },
  botaoTexto: { fontSize: 16, fontWeight: '700' },
  campo: { gap: 6 },
  rotulo: { fontSize: 13, fontWeight: '600' },
  entrada: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  erro: { fontSize: 12 },
  entradaEnvoltorio: { justifyContent: 'center' },
  sufixo: { position: 'absolute', right: 14 },
  barraTeclado: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  buscaEntrada: { flex: 1, fontSize: 15, paddingVertical: 8 },
  chips: { flexDirection: 'row', gap: ESPACO_CHIPS },
  chipsMedida: { position: 'absolute', opacity: 0, flexDirection: 'row', gap: ESPACO_CHIPS, top: 0, left: 0 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  vazio: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  alerta: { borderWidth: 1, borderRadius: 12, padding: 12 },
  botaoIcone: { padding: 4 },
});
