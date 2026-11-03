import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Alert } from '@/lib/alerta';
import { CampoData } from '@/components/CampoData';
import {
  Botao,
  Campo,
  CampoMoeda,
  Carregando,
  Chips,
  MensagemErro,
  TelaFormulario,
} from '@/components/ui';
import {
  avisoDeOrcamento,
  criarRecorrencia,
  buscarMovimentacao,
  criarMovimentacao,
  editarMovimentacao,
  excluirMovimentacao,
  listarCategorias,
} from '@/lib/api';
import {
  enviarComprovante,
  escolherComprovante,
  removerComprovante,
  urlComprovante,
} from '@/lib/comprovantes';
import type { OrigemImagem } from '@/lib/comprovantes';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { hojeISO, lerValor, numeroParaCampo, paraISO } from '@/lib/format';
import { COR_TIPO, TEXTO_TIPO, useTema } from '@/lib/theme';
import type { Categoria, Tipo } from '@/types';

const TIPOS: Tipo[] = ['RECEITA', 'DESPESA', 'ECONOMIA'];

export default function FormularioTransacao() {
  const { cores } = useTema();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idMovimentacao = id ? Number(id) : null;

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tipo, setTipo] = useState<Tipo>('DESPESA');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeISO());
  const [descricao, setDescricao] = useState('');

  // Recorrência (só ao cadastrar): desligada por padrão.
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState('');
  const [diaDigitado, setDiaDigitado] = useState('');
  const [modalRecorrencia, setModalRecorrencia] = useState(false);

  // Comprovante: o que já está salvo e o que o usuário acabou de escolher.
  const [comprovanteOriginal, setComprovanteOriginal] = useState<string | null>(null);
  const [comprovantePath, setComprovantePath] = useState<string | null>(null);
  const [comprovanteLocal, setComprovanteLocal] = useState<string | null>(null);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [verComprovante, setVerComprovante] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const listaCategorias = await listarCategorias();
        if (!ativo) return;
        setCategorias(listaCategorias);

        if (idMovimentacao) {
          const mov = await buscarMovimentacao(idMovimentacao);
          if (!ativo) return;
          setTipo(mov.categorias.tipo);
          setCategoriaId(mov.categoria_id);
          setValor(numeroParaCampo(mov.valor));
          setData(mov.data);
          setDescricao(mov.descricao ?? '');

          if (mov.comprovante_path) {
            setComprovanteOriginal(mov.comprovante_path);
            setComprovantePath(mov.comprovante_path);
            const url = await urlComprovante(mov.comprovante_path);
            if (ativo) setComprovanteUrl(url);
          }
        }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [idMovimentacao]);

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo],
  );

  function escolherTipo(novo: Tipo) {
    setTipo(novo);
    const continuaValida = categorias.some((c) => c.id === categoriaId && c.tipo === novo);
    if (!continuaValida) setCategoriaId(null);
  }

  function atalhoData(diasAtras: number) {
    const dia = new Date();
    dia.setDate(dia.getDate() - diasAtras);
    setData(paraISO(dia));
  }

  async function anexar(origem: OrigemImagem) {
    try {
      const uri = await escolherComprovante(origem);
      if (uri) {
        setComprovanteLocal(uri);
        setComprovanteUrl(null);
      }
    } catch (e) {
      mostrarErro(e);
    }
  }

  function escolherOrigem() {
    if (Platform.OS === 'web') {
      anexar('galeria');
      return;
    }
    Alert.alert('Comprovante', 'De onde vem a imagem?', [
      { text: 'Tirar foto', onPress: () => anexar('camera') },
      { text: 'Escolher da galeria', onPress: () => anexar('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function removerAnexo() {
    setComprovanteLocal(null);
    setComprovantePath(null);
    setComprovanteUrl(null);
  }

  function abrirRecorrencia() {
    setDiaDigitado(diaRecorrencia || String(Number(data.split('-')[2])));
    setModalRecorrencia(true);
  }

  function alternarRecorrente(valor: boolean) {
    if (valor) abrirRecorrencia();
    else {
      setRecorrente(false);
      setDiaRecorrencia('');
    }
  }

  function confirmarRecorrencia() {
    const dia = Number(diaDigitado);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      Alert.alert('Dia inválido', 'Escolha um dia entre 1 e 31.');
      return;
    }
    setDiaRecorrencia(String(dia));
    setRecorrente(true);
    setModalRecorrencia(false);
  }

  function cancelarRecorrencia() {
    setModalRecorrencia(false);
    if (!diaRecorrencia) setRecorrente(false);
  }

  async function salvar() {
    const valorNumero = lerValor(valor);
    const dataISO = data;

    if (!categoriaId) return setErro('Escolha uma categoria.');
    if (valorNumero === null || valorNumero <= 0) return setErro('Informe um valor maior que zero.');
    if (!dataISO) return setErro('Data inválida. Use o formato DD/MM/AAAA.');

    setSalvando(true);
    setErro(null);
    try {
      let caminho = comprovantePath;
      if (comprovanteLocal) caminho = await enviarComprovante(comprovanteLocal);

      const dados = {
        categoria_id: categoriaId,
        valor: valorNumero,
        data: dataISO,
        descricao: descricao.trim() || null,
        comprovante_path: caminho,
      };

      let pendente = false;
      if (idMovimentacao) await editarMovimentacao(idMovimentacao, dados);
      else pendente = (await criarMovimentacao(dados)).pendente;

      // Comprovante antigo substituído ou removido: apaga o arquivo que sobrou.
      if (comprovanteOriginal && comprovanteOriginal !== caminho) {
        await removerComprovante(comprovanteOriginal).catch(() => undefined);
      }

      // A recorrência começa no mês seguinte: este mês já é a movimentação salva agora.
      if (recorrente && !idMovimentacao && !pendente) {
        const [ano, mes] = dataISO.split('-').map(Number);
        try {
          await criarRecorrencia({
            categoria_id: categoriaId,
            valor: valorNumero,
            descricao: descricao.trim() || null,
            dia_do_mes: Number(diaRecorrencia),
            ativa: true,
            inicio: paraISO(new Date(ano, mes, 1)),
          });
        } catch (e) {
          Alert.alert(
            'Recorrência não criada',
            `A movimentação foi salva, mas a recorrência não: ${e instanceof Error ? e.message : 'erro desconhecido'}`,
          );
        }
      }

      if (pendente) {
        Alert.alert(
          'Sem conexão',
          recorrente
            ? 'A movimentação foi salva no aparelho e será enviada quando houver internet. A recorrência precisa de internet: crie-a depois em Organização.'
            : 'A movimentação foi salva no aparelho e será enviada quando houver internet.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }

      // Aviso de orçamento só ao lançar uma nova despesa.
      let aviso: string | null = null;
      if (!idMovimentacao && tipo === 'DESPESA') {
        aviso = await avisoDeOrcamento(categoriaId, dataISO, valorNumero).catch(() => null);
      }

      if (aviso) Alert.alert('Orçamento', aviso, [{ text: 'OK', onPress: () => router.back() }]);
      else router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  function excluir() {
    if (!idMovimentacao) return;
    confirmarExclusao('Excluir movimentação', async () => {
      try {
        await excluirMovimentacao(idMovimentacao);
        router.back();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
      }
    });
  }

  if (carregando) return <Carregando />;

  const imagemAnexada = comprovanteLocal ?? comprovanteUrl;

  return (
    <TelaFormulario>
      <Stack.Screen options={{ title: idMovimentacao ? 'Editar movimentação' : 'Nova movimentação' }} />

      {erro ? <MensagemErro texto={erro} /> : null}

      <Text style={{ color: cores.suave, fontWeight: '600' }}>Tipo</Text>
      <Chips
        opcoes={TIPOS.map((t) => ({ id: t, texto: TEXTO_TIPO[t], cor: COR_TIPO[t] }))}
        valor={tipo}
        onChange={escolherTipo}
      />

      <Text style={{ color: cores.suave, fontWeight: '600' }}>Categoria</Text>
      <Chips
        opcoes={categoriasDoTipo.map((c) => ({ id: c.id, texto: c.nome, cor: COR_TIPO[tipo] }))}
        valor={categoriaId}
        onChange={setCategoriaId}
      />
      <Pressable onPress={() => router.push('/categorias')}>
        <Text style={{ color: cores.primaria, fontWeight: '600', fontSize: 13 }}>
          + Criar ou gerenciar categorias
        </Text>
      </Pressable>

      <CampoMoeda
        rotulo="Valor (R$)"
        value={valor}
        onChangeText={setValor}
        placeholder="0,00"
      />

      <CampoData rotulo="Data" value={data} onChange={setData} />
      <Chips
        opcoes={[
          { id: 0, texto: 'Hoje' },
          { id: 1, texto: 'Ontem' },
        ]}
        valor={null}
        onChange={atalhoData}
      />

      <Campo
        rotulo="Descrição (opcional)"
        value={descricao}
        onChangeText={setDescricao}
        autoCapitalize="sentences"
        placeholder="Ex.: Mercado da semana"
      />

      {!idMovimentacao ? (
        <View style={[estilos.recorrente, { borderColor: cores.borda, backgroundColor: cores.card }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: cores.texto, fontWeight: '600' }}>Repetir todo mês</Text>
            {recorrente ? (
              <Pressable onPress={abrirRecorrencia} hitSlop={8}>
                <Text style={{ color: cores.primaria, fontSize: 13 }}>
                  Todo dia {diaRecorrencia}, a partir do próximo mês · alterar
                </Text>
              </Pressable>
            ) : (
              <Text style={{ color: cores.suave, fontSize: 13 }}>Lançar automaticamente nos próximos meses</Text>
            )}
          </View>
          <Switch
            value={recorrente}
            onValueChange={alternarRecorrente}
            trackColor={{ true: cores.primaria, false: cores.borda }}
          />
        </View>
      ) : null}

      <Text style={{ color: cores.suave, fontWeight: '600' }}>Comprovante (opcional)</Text>
      {imagemAnexada || comprovantePath ? (
        <View style={{ gap: 10 }}>
          {imagemAnexada ? (
            <Pressable onPress={() => setVerComprovante(true)}>
              <Image
                source={{ uri: imagemAnexada }}
                style={[estilos.miniatura, { borderColor: cores.borda }]}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <Text style={{ color: cores.suave }}>Carregando imagem...</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Botao texto="Trocar" variante="contorno" onPress={escolherOrigem} />
            </View>
            <View style={{ flex: 1 }}>
              <Botao texto="Remover" variante="perigo" onPress={removerAnexo} />
            </View>
          </View>
        </View>
      ) : (
        <Botao
          texto="Anexar comprovante"
          icone="camera-outline"
          variante="contorno"
          onPress={escolherOrigem}
        />
      )}

      <Botao
        texto={idMovimentacao ? 'Salvar alterações' : 'Adicionar'}
        onPress={salvar}
        carregando={salvando}
      />
      {idMovimentacao ? <Botao texto="Excluir movimentação" variante="perigo" onPress={excluir} /> : null}

      <Modal
        visible={modalRecorrencia}
        transparent
        animationType="fade"
        onRequestClose={cancelarRecorrencia}
      >
        <KeyboardAvoidingView
          style={estilos.fundoModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[estilos.caixaModal, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            <Text style={{ color: cores.texto, fontSize: 18, fontWeight: '700' }}>Movimentação recorrente</Text>
            <Text style={{ color: cores.suave, lineHeight: 20 }}>
              Esta movimentação será lançada automaticamente todo mês, com a mesma categoria, valor e
              descrição, a partir do próximo mês.
            </Text>
            <Campo
              rotulo="Dia do mês"
              value={diaDigitado}
              onChangeText={(texto) => setDiaDigitado(texto.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              obrigatorio
            />
            <Text style={{ color: cores.suave, fontSize: 12 }}>
              Em meses mais curtos, o lançamento acontece no último dia do mês.
            </Text>
            <Botao texto="Confirmar" onPress={confirmarRecorrencia} />
            <Botao texto="Cancelar" variante="contorno" onPress={cancelarRecorrencia} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={verComprovante}
        transparent
        animationType="fade"
        onRequestClose={() => setVerComprovante(false)}
      >
        <Pressable style={estilos.fundoImagem} onPress={() => setVerComprovante(false)}>
          {imagemAnexada ? (
            <Image source={{ uri: imagemAnexada }} style={estilos.imagemGrande} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </TelaFormulario>
  );
}

const estilos = StyleSheet.create({
  miniatura: { width: '100%', height: 180, borderRadius: 14, borderWidth: 1 },
  recorrente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  fundoModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  caixaModal: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
  fundoImagem: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  imagemGrande: { width: '100%', height: '90%' },
});
