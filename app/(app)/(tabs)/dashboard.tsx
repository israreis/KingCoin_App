import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { BarraProgresso, GraficoBarras, GraficoLinha, GraficoRosca } from '@/components/graficos';
import { Cartao, Carregando, Grade, MensagemErro, Secao, Tela, Vazio } from '@/components/ui';
import { listarMetas, listarMovimentacoes, listarRecorrencias } from '@/lib/api';
import { moeda } from '@/lib/format';
import {
  evolucaoCarteira,
  insightsDoMes,
  progressoMeta,
  receitasDespesasPorMes,
  resumo,
  totaisDoMesPorCategoria,
} from '@/lib/saldos';
import { COR_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';

function Comparativo({
  rotulo,
  atual,
  anterior,
  altaEhBoa,
}: {
  rotulo: string;
  atual: number;
  anterior: number;
  altaEhBoa: boolean;
}) {
  const { cores } = useTema();
  const dados = resumo(atual, anterior);
  const subiu = dados.variacao >= 0;
  const bom = altaEhBoa ? subiu : !subiu;
  const cor = dados.variacao === 0 ? cores.suave : bom ? COR_TIPO.RECEITA : COR_TIPO.DESPESA;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ color: cores.suave, fontSize: 12 }}>{rotulo}</Text>
        <Text style={{ color: cores.texto, fontWeight: '700', fontSize: 16 }}>{moeda(atual)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={subiu ? 'arrow-up' : 'arrow-down'} size={14} color={cor} />
        <Text style={{ color: cor, fontWeight: '700' }}>{Math.abs(dados.porcentagem).toFixed(1)}%</Text>
        <Text style={{ color: cores.suave, fontSize: 12 }}>vs. mês anterior</Text>
      </View>
    </View>
  );
}

function LinhaInsight({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  const { cores } = useTema();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: cores.suave, flex: 1 }}>{rotulo}</Text>
      <Text style={{ color: cor ?? cores.texto, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>
        {valor}
      </Text>
    </View>
  );
}

export default function Dashboard() {
  const { cores } = useTema();

  const { dados, carregando, atualizando, erro, atualizar } = useDados(async () => {
    const [movs, metas, recorrencias] = await Promise.all([
      listarMovimentacoes(),
      listarMetas(),
      listarRecorrencias().catch(() => []),
    ]);
    return {
      evolucao: evolucaoCarteira(movs),
      mensal: receitasDespesasPorMes(movs),
      insights: insightsDoMes(movs, recorrencias),
      despesas: totaisDoMesPorCategoria(movs, 'DESPESA'),
      receitas: totaisDoMesPorCategoria(movs, 'RECEITA'),
      metas,
    };
  }, []);

  const mensal = dados?.mensal;
  const ultimo = mensal ? mensal.labels.length - 1 : 0;

  return (
    <Tela titulo="Dashboard" atualizando={atualizando} onAtualizar={atualizar}>
      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && mensal ? (
        <>
          <View style={{ gap: 14 }}>
          <Secao titulo="Insights do mês" />
          <Cartao>
            {dados.insights.temDespesas || dados.insights.receitasMes > 0 ? (
              <>
                <LinhaInsight rotulo="Despesas fixas do mês" valor={moeda(dados.insights.despesasFixas)} />
                <LinhaInsight rotulo="Gastos variáveis até agora" valor={moeda(dados.insights.despesasVariaveis)} />
                <LinhaInsight
                  rotulo="Gasto variável médio por dia"
                  valor={moeda(dados.insights.mediaDiariaVariavel)}
                />
                {dados.insights.maiorGasto ? (
                  <LinhaInsight
                    rotulo="Maior gasto"
                    valor={`${dados.insights.maiorGasto.descricao?.trim() || dados.insights.maiorGasto.categorias.nome} · ${moeda(dados.insights.maiorGasto.valor)}`}
                  />
                ) : null}
                {dados.insights.categoriaTop ? (
                  <LinhaInsight
                    rotulo="Categoria variável que mais pesa"
                    valor={`${dados.insights.categoriaTop.nome} · ${moeda(dados.insights.categoriaTop.valor)}`}
                  />
                ) : null}
                {dados.insights.despesasPendentes > 0 ? (
                  <LinhaInsight
                    rotulo="Recorrentes ainda a pagar"
                    valor={moeda(dados.insights.despesasPendentes)}
                  />
                ) : null}
                {dados.insights.receitasPendentes > 0 ? (
                  <LinhaInsight
                    rotulo="Recorrentes ainda a receber"
                    valor={moeda(dados.insights.receitasPendentes)}
                  />
                ) : null}
                <LinhaInsight rotulo="Despesas previstas no mês" valor={moeda(dados.insights.despesasPrevistas)} />
                <LinhaInsight
                  rotulo="Saldo previsto no fim do mês"
                  valor={moeda(dados.insights.saldoProjetado)}
                  cor={dados.insights.saldoProjetado >= 0 ? COR_TIPO.RECEITA : COR_TIPO.DESPESA}
                />
                <Text style={{ color: cores.suave, fontSize: 11, lineHeight: 16 }}>
                  Despesas fixas (aluguel, moradia, recorrentes e gastos que se repetem todo mês) contam
                  uma vez só. A previsão projeta apenas os gastos variáveis
                  {dados.insights.usouHistorico
                    ? ', combinando o ritmo deste mês com a média dos meses anteriores.'
                    : ', pelo ritmo deste mês.'}
                </Text>
              </>
            ) : (
              <Vazio texto="Sem movimentações neste mês para analisar." />
            )}
          </Cartao>
          </View>

          <Grade minimo={420} igualar>
          <View style={{ gap: 14 }}>
          <Secao titulo="Receitas x despesas" />
          <Cartao>
            <GraficoBarras
              labels={mensal.labels}
              receitas={mensal.receitas}
              despesas={mensal.despesas}
            />
            {mensal.labels.length > 1 ? (
              <>
                <Comparativo
                  rotulo="Receitas este mês"
                  atual={mensal.receitas[ultimo]}
                  anterior={mensal.receitas[ultimo - 1]}
                  altaEhBoa
                />
                <Comparativo
                  rotulo="Despesas este mês"
                  atual={mensal.despesas[ultimo]}
                  anterior={mensal.despesas[ultimo - 1]}
                  altaEhBoa={false}
                />
              </>
            ) : null}
          </Cartao>
          </View>

          <View style={{ gap: 14 }}>
          <Secao titulo="Evolução da carteira" />
          <Cartao>
            <Text style={{ color: cores.suave, fontSize: 12 }}>Saldo acumulado nos últimos 6 meses</Text>
            <GraficoLinha labels={dados.evolucao.labels} valores={dados.evolucao.valores} />
          </Cartao>
          </View>

          <View style={{ gap: 14 }}>
          <Secao titulo="Despesas por categoria" />
          <Cartao>
            <GraficoRosca dados={dados.despesas} vazio="Nenhuma despesa neste mês." />
          </Cartao>
          </View>

          <View style={{ gap: 14 }}>
          <Secao titulo="Receitas por categoria" />
          <Cartao>
            <GraficoRosca dados={dados.receitas} vazio="Nenhuma receita neste mês." />
          </Cartao>
          </View>

          </Grade>

          <View style={{ gap: 14 }}>
          <Secao titulo="Progresso das metas" />
          {dados.metas.length === 0 ? (
            <Vazio texto="Crie metas na aba Metas para acompanhar o progresso." />
          ) : (
            <Cartao>
              {dados.metas.map((meta) => (
                <View key={meta.id} style={{ gap: 6, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: cores.texto, fontWeight: '600' }}>{meta.nome}</Text>
                    <Text style={{ color: cores.suave }}>
                      {moeda(meta.valor_atual)} / {moeda(meta.valor_meta)}
                    </Text>
                  </View>
                  <BarraProgresso porcentagem={progressoMeta(meta)} />
                </View>
              ))}
            </Cartao>
          )}
          </View>
        </>
      ) : null}
    </Tela>
  );
}
