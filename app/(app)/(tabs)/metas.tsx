import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BarraProgresso } from '@/components/graficos';
import { ItemDeslizavel } from '@/components/ItemDeslizavel';
import {
  Botao,
  BotaoIcone,
  Cartao,
  CampoMoeda,
  Carregando,
  MensagemErro,
  Tela,
  Vazio,
} from '@/components/ui';
import { aportarMeta, excluirMeta, listarMetas } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { lerValor, moeda } from '@/lib/format';
import { progressoMeta } from '@/lib/saldos';
import { useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';
import type { Meta } from '@/types';

const ATALHOS = [50, 100, 500];

export default function Metas() {
  const { cores } = useTema();
  const router = useRouter();
  const { dados, carregando, atualizando, erro, atualizar } = useDados(listarMetas, []);

  const [metaAporte, setMetaAporte] = useState<Meta | null>(null);
  const [valorAporte, setValorAporte] = useState('');
  const [enviando, setEnviando] = useState(false);

  const editar = (id: number) => router.push({ pathname: '/meta', params: { id: String(id) } });

  async function aportar(meta: Meta, valor: number) {
    setEnviando(true);
    try {
      const resultado = await aportarMeta(meta.id, valor);
      setMetaAporte(null);
      setValorAporte('');
      atualizar();

      const alvo = resultado.meta.valor_meta;
      if (resultado.antes < alvo && resultado.depois >= alvo) {
        Alert.alert('Meta atingida!', `Você alcançou a meta "${meta.nome}". Parabéns!`);
      }
    } catch (e) {
      mostrarErro(e);
    } finally {
      setEnviando(false);
    }
  }

  function confirmarAporte() {
    const valor = lerValor(valorAporte);
    if (!metaAporte || valor === null || valor <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    aportar(metaAporte, valor);
  }

  return (
    <Tela
      titulo="Metas"
      atualizando={atualizando}
      onAtualizar={atualizar}
      acoes={<BotaoIcone icone="add-circle-outline" onPress={() => router.push('/meta')} />}
    >
      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && dados.length === 0 ? (
        <Vazio texto="Nenhuma meta ainda. Toque em + para criar a primeira." />
      ) : null}

      {dados?.map((meta) => {
        const progresso = progressoMeta(meta);
        return (
          <ItemDeslizavel
            key={meta.id}
            onEditar={() => editar(meta.id)}
            onExcluir={() =>
              confirmarExclusao('Excluir meta', async () => {
                try {
                  await excluirMeta(meta.id);
                  atualizar();
                } catch (e) {
                  mostrarErro(e);
                }
              })
            }
          >
            <Pressable onPress={() => editar(meta.id)}>
              <Cartao>
                <View style={estilos.topo}>
                  <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700' }}>{meta.nome}</Text>
                  <Text style={{ color: cores.primaria, fontWeight: '700' }}>{Math.round(progresso)}%</Text>
                </View>
                <BarraProgresso porcentagem={progresso} />
                <Text style={{ color: cores.suave, fontSize: 13 }}>
                  {moeda(meta.valor_atual)} de {moeda(meta.valor_meta)}
                </Text>

                <View style={estilos.atalhos}>
                  {ATALHOS.map((valor) => (
                    <Pressable
                      key={valor}
                      onPress={() => aportar(meta, valor)}
                      style={[estilos.atalho, { borderColor: cores.primaria }]}
                    >
                      <Text style={{ color: cores.primaria, fontWeight: '700', fontSize: 12 }}>
                        + R$ {valor}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setMetaAporte(meta)}
                    style={[estilos.atalho, { borderColor: cores.borda }]}
                  >
                    <Text style={{ color: cores.texto, fontWeight: '700', fontSize: 12 }}>Outro valor</Text>
                  </Pressable>
                </View>
              </Cartao>
            </Pressable>
          </ItemDeslizavel>
        );
      })}

      <Modal
        visible={metaAporte !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMetaAporte(null)}
      >
        <KeyboardAvoidingView
          style={estilos.fundoModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[estilos.caixaModal, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            <Text style={{ color: cores.texto, fontSize: 18, fontWeight: '700' }}>
              Aportar em "{metaAporte?.nome}"
            </Text>
            <CampoMoeda
              rotulo="Valor (R$)"
              value={valorAporte}
              onChangeText={setValorAporte}
              placeholder="0,00"
            />
            <Botao texto="Guardar" onPress={confirmarAporte} carregando={enviando} />
            <Botao
              texto="Cancelar"
              variante="contorno"
              onPress={() => {
                setMetaAporte(null);
                setValorAporte('');
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  topo: { flexDirection: 'row', justifyContent: 'space-between' },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  atalho: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  fundoModal: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  caixaModal: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
});
