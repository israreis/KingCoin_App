import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/lib/alerta';
import { BarraProgresso } from '@/components/graficos';
import { BotoesAcao } from '@/components/BotoesAcao';
import { vidro } from '@/components/vidro';
import { Botao, Cartao, CampoMoeda } from '@/components/ui';
import { aportarMeta, excluirMeta } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { lerValor, moeda } from '@/lib/format';
import { progressoMeta } from '@/lib/saldos';
import { useTema } from '@/lib/theme';
import type { Meta } from '@/types';

const ATALHOS = [50, 100, 500];

/**
 * Cartão de meta com botões de editar/excluir e aportes rápidos
 * (sem abrir o formulário). Usado na Carteira e na tela de Metas.
 */
export function MetaDeslizavel({
  meta,
  onAlterada,
}: {
  meta: Meta;
  onAlterada: () => void;
}) {
  const { cores } = useTema();
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [valor, setValor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const progresso = progressoMeta(meta);
  const editar = () => router.push({ pathname: '/meta', params: { id: String(meta.id) } });

  async function aportar(quantia: number) {
    setEnviando(true);
    try {
      const resultado = await aportarMeta(meta.id, quantia);
      setModalAberto(false);
      setValor('');
      onAlterada();

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

  function excluir() {
    confirmarExclusao('Excluir meta', async () => {
      try {
        await excluirMeta(meta.id);
        onAlterada();
      } catch (e) {
        mostrarErro(e);
      }
    });
  }

  function confirmarOutroValor() {
    const quantia = lerValor(valor);
    if (quantia === null || quantia <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    aportar(quantia);
  }

  return (
    <>
      <Pressable onPress={editar}>
        <Cartao>
          <View style={estilos.topo}>
            <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              {meta.nome}
            </Text>
            <Text style={{ color: cores.primaria, fontWeight: '700' }}>{Math.round(progresso)}%</Text>
            <BotoesAcao onEditar={editar} onExcluir={excluir} />
          </View>
          <BarraProgresso porcentagem={progresso} />
          <Text style={{ color: cores.suave, fontSize: 13 }}>
            {moeda(meta.valor_atual)} de {moeda(meta.valor_meta)}
          </Text>

          <View style={estilos.atalhos}>
            {ATALHOS.map((quantia) => (
              <Pressable
                key={quantia}
                disabled={enviando}
                onPress={() => aportar(quantia)}
                style={(estado) => [
                  estilos.atalho,
                  { borderColor: cores.primaria, opacity: enviando ? 0.5 : 1 },
                  vidro(estado, enviando),
                ]}
              >
                <Text style={{ color: cores.primaria, fontWeight: '700', fontSize: 12 }}>+ R$ {quantia}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setModalAberto(true)}
              style={(estado) => [estilos.atalho, { borderColor: cores.borda }, vidro(estado)]}
            >
              <Text style={{ color: cores.texto, fontWeight: '700', fontSize: 12 }}>Outro valor</Text>
            </Pressable>
          </View>
        </Cartao>
      </Pressable>

      <Modal visible={modalAberto} transparent animationType="fade" onRequestClose={() => setModalAberto(false)}>
        <KeyboardAvoidingView
          style={estilos.fundoModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[estilos.caixaModal, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            <Text style={{ color: cores.texto, fontSize: 18, fontWeight: '700' }}>Aportar em "{meta.nome}"</Text>
            <CampoMoeda rotulo="Valor (R$)" value={valor} onChangeText={setValor} placeholder="0,00" />
            <Botao texto="Guardar" onPress={confirmarOutroValor} carregando={enviando} />
            <Botao
              texto="Cancelar"
              variante="contorno"
              onPress={() => {
                setModalAberto(false);
                setValor('');
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  atalho: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  fundoModal: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  caixaModal: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
});
