import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MetaDeslizavel } from '@/components/MetaCartao';
import { TransacaoDeslizavel } from '@/components/TransacaoItem';
import { Botao, Cartao, Carregando, Chips, Grade, MensagemErro, Secao, Tela, Vazio } from '@/components/ui';
import {
  excluirMovimentacao,
  gerarRecorrencias,
  listarMetas,
  listarMovimentacoes,
  listarOrcamentos,
} from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { useAuth } from '@/lib/auth';
import { moeda, paraISO } from '@/lib/format';
import { PERIODOS, PERIODO_PADRAO, calcularPeriodo, periodoAnterior, textoPeriodo } from '@/lib/periodos';
import { gastosPorCategoria, resumo, statusOrcamento, totaisPorTipo } from '@/lib/saldos';
import type { Resumo } from '@/lib/saldos';
import { COR_TIPO, useTema } from '@/lib/theme';
import { useDesktop } from '@/lib/layout';
import { useDados } from '@/lib/useDados';
import type { PeriodoId } from '@/types';

const TRANSACOES_DO_PERIODO = 10;
const ULTIMAS_TRANSACOES = 5;
const DIAS_ULTIMAS = 30;

function Variacao({ dados, rotulo }: { dados: Resumo; rotulo: string }) {
  const { cores } = useTema();
  const positivo = dados.variacao >= 0;
  const cor = positivo ? COR_TIPO.RECEITA : COR_TIPO.DESPESA;
  return (
    <View style={estilos.variacao}>
      <Ionicons name={positivo ? 'arrow-up' : 'arrow-down'} size={13} color={cor} />
      <Text style={{ color: cor, fontSize: 12, fontWeight: '700' }}>
        {Math.abs(dados.porcentagem).toFixed(1)}%
      </Text>
      <Text style={{ color: cores.suave, fontSize: 12 }}>{rotulo}</Text>
    </View>
  );
}

export default function Carteira() {
  const { cores } = useTema();
  const { session } = useAuth();
  const router = useRouter();
  const desktop = useDesktop();
  const [periodo, setPeriodo] = useState<PeriodoId>(PERIODO_PADRAO);

  const { dados, carregando, atualizando, erro, atualizar } = useDados(async () => {
    // Lança as movimentações recorrentes vencidas antes de carregar os números.
    await gerarRecorrencias().catch(() => 0);

    const atual = calcularPeriodo(periodo);
    const anterior = calcularPeriodo(periodoAnterior(periodo));
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_ULTIMAS);

    const [doPeriodo, doAnterior, ultimas, metas, orcamentos] = await Promise.all([
      listarMovimentacoes({ inicio: atual.inicio, fim: atual.fim }),
      listarMovimentacoes({ inicio: anterior.inicio, fim: anterior.fim }),
      listarMovimentacoes({ inicio: paraISO(limite), limite: ULTIMAS_TRANSACOES }),
      listarMetas(),
      listarOrcamentos(),
    ]);

    const mes = calcularPeriodo('este_mes');
    const movsMes =
      periodo === 'este_mes'
        ? doPeriodo
        : await listarMovimentacoes({ inicio: mes.inicio, fim: mes.fim });
    const gastos = gastosPorCategoria(movsMes);
    const alertasOrcamento = orcamentos
      .map((o) => ({
        nome: o.categorias.nome,
        ...statusOrcamento(gastos.get(o.categoria_id) ?? 0, o.valor_limite),
      }))
      .filter((o) => o.nivel !== 'ok');

    const totaisAtual = totaisPorTipo(doPeriodo);
    const totaisAnterior = totaisPorTipo(doAnterior);

    return {
      doPeriodo: doPeriodo.slice(0, TRANSACOES_DO_PERIODO),
      alertasOrcamento,
      ultimas,
      metas,
      totais: totaisAtual,
      saldo: resumo(
        totaisAtual.receitas - totaisAtual.despesas,
        totaisAnterior.receitas - totaisAnterior.despesas,
      ),
      investimentos: resumo(totaisAtual.economia, totaisAnterior.economia),
    };
  }, [periodo]);

  const nome = (session?.user.user_metadata?.nome as string | undefined)?.split(' ')[0];
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
      titulo={nome ? `Olá, ${nome}` : 'Minha carteira'}
      atualizando={atualizando}
      onAtualizar={atualizar}
    >
      <Chips
        opcoes={PERIODOS.map((p) => ({ id: p.id, texto: p.texto }))}
        valor={periodo}
        onChange={setPeriodo}
      />

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados ? (
        <>
          <Grade minimo={220} igualar>
          <Cartao estilo={desktop ? estilos.resumo : undefined}>
            <Text style={{ color: cores.suave, fontWeight: '600' }}>Saldo · {textoPeriodo(periodo)}</Text>
            <Text style={[estilos.valorGrande, { color: cores.texto }]}>{moeda(dados.saldo.valor)}</Text>
            <Variacao dados={dados.saldo} rotulo="vs. período anterior" />
          </Cartao>

          {desktop ? (
            <Cartao estilo={estilos.resumo}>
              <Text style={{ color: cores.suave, fontSize: 12, fontWeight: '600' }}>Receitas</Text>
              <Text style={{ color: COR_TIPO.RECEITA, fontSize: 17, fontWeight: '700' }}>
                {moeda(dados.totais.receitas)}
              </Text>
            </Cartao>
          ) : (
            <View style={estilos.linha}>
              <Cartao estilo={estilos.metade}>
                <Text style={{ color: cores.suave, fontSize: 12, fontWeight: '600' }}>Receitas</Text>
                <Text style={{ color: COR_TIPO.RECEITA, fontSize: 17, fontWeight: '700' }}>
                  {moeda(dados.totais.receitas)}
                </Text>
              </Cartao>
              <Cartao estilo={estilos.metade}>
                <Text style={{ color: cores.suave, fontSize: 12, fontWeight: '600' }}>Despesas</Text>
                <Text style={{ color: COR_TIPO.DESPESA, fontSize: 17, fontWeight: '700' }}>
                  {moeda(dados.totais.despesas)}
                </Text>
              </Cartao>
            </View>
          )}
          {desktop ? (
            <Cartao estilo={estilos.resumo}>
              <Text style={{ color: cores.suave, fontSize: 12, fontWeight: '600' }}>Despesas</Text>
              <Text style={{ color: COR_TIPO.DESPESA, fontSize: 17, fontWeight: '700' }}>
                {moeda(dados.totais.despesas)}
              </Text>
            </Cartao>
          ) : null}

          <Cartao estilo={desktop ? estilos.resumo : undefined}>
            <Text style={{ color: cores.suave, fontWeight: '600' }}>Investimentos e economia</Text>
            <Text style={[estilos.valorMedio, { color: COR_TIPO.ECONOMIA }]}>
              {moeda(dados.investimentos.valor)}
            </Text>
            <Variacao dados={dados.investimentos} rotulo="vs. período anterior" />
          </Cartao>
          </Grade>

          {dados.alertasOrcamento.length > 0 ? (
            <Pressable onPress={() => router.push('/orcamentos')}>
              <Cartao estilo={{ borderColor: '#f59e0b' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                  <Text style={{ color: cores.texto, fontWeight: '700' }}>Orçamentos em atenção</Text>
                </View>
                {dados.alertasOrcamento.slice(0, 3).map((alerta) => (
                  <Text key={alerta.nome} style={{ color: cores.suave }}>
                    {alerta.nome}: {Math.round(alerta.porcentagem)}% do limite
                  </Text>
                ))}
              </Cartao>
            </Pressable>
          ) : null}

          <View style={[estilos.botao, desktop ? estilos.botaoDesktop : null]}>
            <Botao
              texto="Nova movimentação"
              icone="add-circle-outline"
              onPress={() => router.push('/transacao')}
            />
          </View>

          <View style={estilos.coluna}>
          <Secao titulo="Últimas movimentações" />
          {dados.ultimas.length === 0 ? (
            <Vazio texto="Nenhuma movimentação nos últimos 30 dias." />
          ) : (
            <>
              {dados.ultimas.map((mov, indice) => (
                <TransacaoDeslizavel
                  key={mov.id}
                  mov={mov}
                  onEditar={() => editar(mov.id)}
                  onExcluir={() => excluir(mov.id)}
                />
              ))}
            </>
          )}

          </View>
          <View style={estilos.coluna}>
          <Secao titulo={`Movimentações · ${textoPeriodo(periodo)}`} />
          {dados.doPeriodo.length === 0 ? (
            <Vazio texto="Nenhuma movimentação neste período." />
          ) : (
            dados.doPeriodo.map((mov) => (
              <TransacaoDeslizavel
                key={mov.id}
                mov={mov}
                onEditar={() => editar(mov.id)}
                onExcluir={() => excluir(mov.id)}
              />
            ))
          )}

          </View>
          <View style={estilos.coluna}>
          <Secao
            titulo="Metas"
            acao={
              <Pressable onPress={() => router.push('/metas')}>
                <Text style={{ color: cores.primaria, fontWeight: '600' }}>Ver todas</Text>
              </Pressable>
            }
          />
          {dados.metas.length === 0 ? (
            <Vazio texto="Você ainda não criou metas." />
          ) : (
            dados.metas.slice(0, 3).map((meta, indice) => (
              <MetaDeslizavel
                key={meta.id}
                meta={meta}
                onAlterada={atualizar}
              />
            ))
          )}
          </View>
        </>
      ) : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  valorGrande: { fontSize: 32, fontWeight: '800' },
  valorMedio: { fontSize: 24, fontWeight: '800' },
  variacao: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linha: { flexDirection: 'row', gap: 12 },
  metade: { flex: 1 },
  coluna: { gap: 14 },
  resumo: { flex: 1 },
  botao: { marginTop: 10, marginBottom: 10 },
  botaoDesktop: { width: '50%', alignSelf: 'center' },
});
