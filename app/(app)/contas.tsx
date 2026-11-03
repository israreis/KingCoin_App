import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Botao, Campo, CampoMoeda, Cartao, Carregando, MensagemErro, Secao, Tela, Vazio } from '@/components/ui';
import { criarConta, editarConta, excluirConta, listarContas, listarMovimentacoes } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { lerValor, moeda, numeroParaCampo } from '@/lib/format';
import { saldoPorConta } from '@/lib/saldos';
import { COR_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';

export default function Contas() {
  const { cores } = useTema();

  const { dados, carregando, atualizando, erro, atualizar } = useDados(async () => {
    const [contas, movs] = await Promise.all([listarContas(), listarMovimentacoes()]);
    return { contas, saldos: saldoPorConta(contas, movs) };
  }, []);

  const [nome, setNome] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  function limpar() {
    setNome('');
    setSaldoInicial('');
    setEditandoId(null);
  }

  async function salvar() {
    const texto = nome.trim();
    if (!texto) return mostrarErro(new Error('Dê um nome para a conta bancária.'));

    setSalvando(true);
    try {
      const dados = { nome: texto, saldo_inicial: saldoInicial ? (lerValor(saldoInicial) ?? 0) : 0 };
      if (editandoId) await editarConta(editandoId, dados);
      else await criarConta(dados);
      limpar();
      atualizar();
    } catch (e) {
      mostrarErro(e);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Tela atualizando={atualizando} onAtualizar={atualizar} bordas={[]}>
      <Cartao>
        <Text style={{ color: cores.texto, fontWeight: '700', fontSize: 16 }}>
          {editandoId ? 'Editar conta bancária' : 'Nova conta bancária'}
        </Text>
        <Campo
          rotulo="Nome"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
          placeholder="Ex.: Nubank, Dinheiro, Poupança"
          maxLength={40}
        />
        <CampoMoeda
          rotulo="Saldo inicial (R$)"
          value={saldoInicial}
          onChangeText={setSaldoInicial}
          placeholder="0,00"
        />
        <Botao texto={editandoId ? 'Salvar conta bancária' : 'Adicionar conta bancária'} onPress={salvar} carregando={salvando} />
        {editandoId ? <Botao texto="Cancelar" variante="contorno" onPress={limpar} /> : null}
      </Cartao>

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados ? (
        <>
          <Secao titulo="Saldo por conta" />
          {dados.saldos.length === 0 ? (
            <Vazio texto="Nenhuma conta bancária ainda. Crie uma acima e escolha-a ao lançar movimentações." />
          ) : null}

          {dados.saldos.map((linha) => (
            <Cartao key={linha.id ?? 'sem-conta'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700', flex: 1 }}>
                  {linha.nome}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: linha.saldo >= 0 ? COR_TIPO.RECEITA : COR_TIPO.DESPESA,
                  }}
                >
                  {moeda(linha.saldo)}
                </Text>
              </View>
              <Text style={{ color: cores.suave, fontSize: 12 }}>
                Inicial {moeda(linha.saldoInicial)} · receitas {moeda(linha.receitas)} · despesas{' '}
                {moeda(linha.despesas)}
              </Text>

              {linha.id !== null ? (
                <View style={{ flexDirection: 'row', gap: 18, marginTop: 4 }}>
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => {
                      setEditandoId(linha.id);
                      setNome(linha.nome);
                      setSaldoInicial(linha.saldoInicial ? numeroParaCampo(linha.saldoInicial) : '');
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color={cores.primaria} />
                    <Text style={{ color: cores.primaria, fontWeight: '600' }}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() =>
                      confirmarExclusao(`Excluir "${linha.nome}"`, async () => {
                        try {
                          await excluirConta(linha.id as number);
                          if (editandoId === linha.id) limpar();
                          atualizar();
                        } catch (e) {
                          mostrarErro(e);
                        }
                      })
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color={cores.perigo} />
                    <Text style={{ color: cores.perigo, fontWeight: '600' }}>Excluir</Text>
                  </Pressable>
                </View>
              ) : null}
            </Cartao>
          ))}

          <Text style={{ color: cores.suave, fontSize: 12 }}>
            O saldo considera saldo inicial + receitas - despesas. Ao excluir uma conta, as
            movimentações dela continuam existindo, só ficam sem conta.
          </Text>
        </>
      ) : null}
    </Tela>
  );
}
