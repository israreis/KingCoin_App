import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotaoFlutuante, useBotaoFlutuante } from '@/components/BotaoFlutuante';
import { BotoesAcao } from '@/components/BotoesAcao';
import { BarraProgresso } from '@/components/graficos';
import { ACOES_NO_CARTAO, DeslizavelNoCelular } from '@/components/ItemDeslizavel';
import { Cartao, Carregando, MensagemErro, Tela, Vazio } from '@/components/ui';
import { excluirOrcamento, listarMovimentacoes, listarOrcamentos } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { moeda } from '@/lib/format';
import { calcularPeriodo } from '@/lib/periodos';
import { gastosPorCategoria, statusOrcamento } from '@/lib/saldos';
import type { NivelOrcamento } from '@/lib/saldos';
import { COR_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';

const COR_ATENCAO = '#f59e0b';

export default function Orcamentos() {
  const { cores } = useTema();
  const router = useRouter();
  const botao = useBotaoFlutuante();

  const { dados, carregando, atualizando, erro, atualizar } = useDados(async () => {
    const { inicio, fim } = calcularPeriodo('este_mes');
    const [orcamentos, movs] = await Promise.all([
      listarOrcamentos(),
      listarMovimentacoes({ inicio, fim }),
    ]);
    const gastos = gastosPorCategoria(movs);
    return orcamentos.map((orcamento) => ({
      orcamento,
      gasto: gastos.get(orcamento.categoria_id) ?? 0,
    }));
  }, []);

  const cor = (nivel: NivelOrcamento) =>
    nivel === 'estourado' ? COR_TIPO.DESPESA : nivel === 'atencao' ? COR_ATENCAO : cores.primaria;

  const editar = (id: number) => router.push({ pathname: '/orcamento', params: { id: String(id) } });

  function excluir(id: number) {
    confirmarExclusao('Excluir orçamento', async () => {
      try {
        await excluirOrcamento(id);
        atualizar();
      } catch (e) {
        mostrarErro(e);
      }
    });
  }

  return (
    <Tela
      titulo="Orçamentos"
      voltar
      atualizando={atualizando}
      onAtualizar={atualizar}
      onRolar={botao.aoRolar}
      flutuante={
        <BotaoFlutuante
          visivel={botao.visivel}
          rotulo="Novo orçamento"
          onPress={() => router.push('/orcamento')}
        />
      }
    >
      <Text style={{ color: cores.suave }}>
        Defina quanto pode gastar por mês em cada categoria. Avisamos ao chegar em 80% e em 100%.
      </Text>

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && dados.length === 0 ? (
        <Vazio texto="Nenhum orçamento ainda. Toque em + para criar o primeiro." />
      ) : null}

      <View style={estilos.lista}>
        {dados?.map(({ orcamento, gasto }) => {
          const { porcentagem, nivel } = statusOrcamento(gasto, orcamento.valor_limite);
          const restante = orcamento.valor_limite - gasto;
          return (
            <DeslizavelNoCelular
              key={orcamento.id}
              onEditar={() => editar(orcamento.id)}
              onExcluir={() => excluir(orcamento.id)}
            >
              <Pressable onPress={() => editar(orcamento.id)}>
                <Cartao>
                  <View style={estilos.topo}>
                    <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {orcamento.categorias.nome}
                    </Text>
                    <Text style={{ color: cor(nivel), fontWeight: '700' }}>{Math.round(porcentagem)}%</Text>
                    {ACOES_NO_CARTAO ? (
                      <BotoesAcao onEditar={() => editar(orcamento.id)} onExcluir={() => excluir(orcamento.id)} />
                    ) : null}
                  </View>
                  <BarraProgresso porcentagem={porcentagem} cor={cor(nivel)} />
                  <Text style={{ color: cores.suave, fontSize: 13 }}>
                    {moeda(gasto)} de {moeda(orcamento.valor_limite)}
                  </Text>
                  <Text style={{ color: nivel === 'ok' ? cores.suave : cor(nivel), fontSize: 13, fontWeight: '600' }}>
                    {nivel === 'estourado'
                      ? `Limite ultrapassado em ${moeda(Math.abs(restante))}`
                      : nivel === 'atencao'
                        ? `Atenção: restam ${moeda(restante)}`
                        : `Restam ${moeda(restante)}`}
                  </Text>
                </Cartao>
              </Pressable>
            </DeslizavelNoCelular>
          );
        })}
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 14 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
