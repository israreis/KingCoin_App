import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { BotaoFlutuante, useBotaoFlutuante } from '@/components/BotaoFlutuante';
import { TransacaoDeslizavel } from '@/components/TransacaoItem';
import { BotaoIcone, CampoBusca, MODO_FECHAR_TECLADO, Carregando, Chips, MensagemErro, Tela, Vazio } from '@/components/ui';
import { excluirMovimentacao, listarMovimentacoes } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { useBarraAbas } from '@/lib/barraAbas';
import { normalizar } from '@/lib/format';
import { PERIODOS, PERIODO_PADRAO, calcularPeriodo } from '@/lib/periodos';
import { COR_TIPO, TEXTO_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';
import type { PeriodoId, Tipo } from '@/types';

type FiltroTipo = Tipo | 'TODOS';

const OPCOES_TIPO: { id: FiltroTipo; texto: string; cor?: string }[] = [
  { id: 'TODOS', texto: 'Todas' },
  { id: 'RECEITA', texto: TEXTO_TIPO.RECEITA, cor: COR_TIPO.RECEITA },
  { id: 'DESPESA', texto: TEXTO_TIPO.DESPESA, cor: COR_TIPO.DESPESA },
  { id: 'ECONOMIA', texto: TEXTO_TIPO.ECONOMIA, cor: COR_TIPO.ECONOMIA },
];

export default function Transacoes() {
  const { cores } = useTema();
  const router = useRouter();
  const [periodo, setPeriodo] = useState<PeriodoId>(PERIODO_PADRAO);
  const [tipo, setTipo] = useState<FiltroTipo>('TODOS');
  const [busca, setBusca] = useState('');
  const { aoRolar } = useBarraAbas();
  const botao = useBotaoFlutuante();

  const { dados, carregando, atualizando, erro, atualizar } = useDados(() => {
    const { inicio, fim } = calcularPeriodo(periodo);
    return listarMovimentacoes({ inicio, fim });
  }, [periodo]);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    return (dados ?? []).filter((mov) => {
      if (tipo !== 'TODOS' && mov.categorias.tipo !== tipo) return false;
      if (!termo) return true;
      return normalizar(`${mov.descricao ?? ''} ${mov.categorias.nome}`).includes(termo);
    });
  }, [dados, tipo, busca]);

  const editar = (id: number) => router.push({ pathname: '/transacao', params: { id: String(id) } });

  const excluir = (id: number) =>
    confirmarExclusao('Excluir movimentação', async () => {
      try {
        await excluirMovimentacao(id);
        atualizar();
      } catch (e) {
        mostrarErro(e);
      }
    });

  return (
    <Tela
      titulo="Movimentações"
      rolavel={false}
      larguraMaxima={960}
      acoes={<BotaoIcone icone="download-outline" onPress={() => router.push('/relatorios')} />}
      flutuante={
        <BotaoFlutuante
          visivel={botao.visivel}
          rotulo="Nova movimentação"
          acimaDaBarra
          larguraConteudo={960}
          onPress={() => router.push('/transacao')}
        />
      }
    >
      <Chips
        opcoes={PERIODOS.map((p) => ({ id: p.id, texto: p.texto }))}
        valor={periodo}
        onChange={setPeriodo}
      />
      <Chips opcoes={OPCOES_TIPO} valor={tipo} onChange={setTipo} />
      <CampoBusca
        value={busca}
        onChangeText={setBusca}
        placeholder="Buscar por descrição ou categoria"
      />

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? (
        <Carregando />
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(mov) => String(mov.id)}
          renderItem={({ item, index }) => (
            <TransacaoDeslizavel
              mov={item}
              onEditar={() => editar(item.id)}
              onExcluir={() => excluir(item.id)}
            />
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={MODO_FECHAR_TECLADO}
          onScroll={(evento) => {
            aoRolar(evento);
            botao.aoRolar();
          }}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Vazio texto={busca ? 'Nada encontrado para essa busca.' : 'Nenhuma movimentação encontrada.'} />
          }
          contentContainerStyle={{ paddingBottom: 130 }}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizar}
              tintColor={cores.primaria}
            />
          }
        />
      )}
    </Tela>
  );
}
