import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { BarraProgresso, GraficoBarras, GraficoLinha, GraficoRosca } from '@/components/graficos';
import { Cartao, Carregando, MensagemErro, Secao, Tela, Vazio } from '@/components/ui';
import { listarMetas, listarMovimentacoes } from '@/lib/api';
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
    const [movs, metas] = await Promise.all([listarMovimentacoes(), listarMetas()]);
    return {
      evolucao: evolucaoCarteira(movs),
      mensal: receitasDespesasPorMes(movs),
      insights: insightsDoMes(movs),
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
          <Secao titulo="Insights do mês" />
          <Cartao>
            {dados.insights.temDespesas ? (
              <>
                <LinhaInsight
                  rotulo="Maior gasto"
                  valor={`${dados.insights.maiorGasto?.descricao?.trim() || dados.insights.maiorGasto?.categorias.nome} · ${moeda(dados.insights.maiorGasto?.valor ?? 0)}`}
                />
                {dados.insights.categoriaTop ? (
                  <LinhaInsight
                    rotulo="Categoria que mais pesa"
                    valor={`${dados.insights.categoriaTop.nome} · ${moeda(dados.insights.categoriaTop.valor)}`}
                  />
                ) : null}
                <LinhaInsight rotulo="Gasto médio por dia" valor={moeda(dados.insights.mediaDiaria)} />
                <LinhaInsight
                  rotulo="Despesas previstas no mês"
                  valor={moeda(dados.insights.despesasProjetadas)}
                />
                <LinhaInsight
                  rotulo="Saldo previsto no fim do mês"
                  valor={moeda(dados.insights.saldoProjetado)}
                  cor={dados.insights.saldoProjetado >= 0 ? COR_TIPO.RECEITA : COR_TIPO.DESPESA}
                />
                <Text style={{ color: cores.suave, fontSize: 11 }}>
                  A previsão assume que você continuará gastando no mesmo ritmo.
                </Text>
              </>
            ) : (
              <Vazio texto="Sem despesas neste mês para analisar." />
            )}
          </Cartao>

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

          <Secao titulo="Evolução da carteira" />
          <Cartao>
            <Text style={{ color: cores.suave, fontSize: 12 }}>Saldo acumulado nos últimos 6 meses</Text>
            <GraficoLinha labels={dados.evolucao.labels} valores={dados.evolucao.valores} />
          </Cartao>

          <Secao titulo="Despesas por categoria" />
          <Cartao>
            <GraficoRosca dados={dados.despesas} vazio="Nenhuma despesa neste mês." />
          </Cartao>

          <Secao titulo="Receitas por categoria" />
          <Cartao>
            <GraficoRosca dados={dados.receitas} vazio="Nenhuma receita neste mês." />
          </Cartao>

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
        </>
      ) : null}
    </Tela>
  );
}
