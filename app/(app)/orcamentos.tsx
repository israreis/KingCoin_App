import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BarraProgresso } from '@/components/graficos';
import { BotaoIcone, Cartao, Carregando, MensagemErro, Tela, Vazio } from '@/components/ui';
import { listarMovimentacoes, listarOrcamentos } from '@/lib/api';
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

  return (
    <Tela
      atualizando={atualizando}
      onAtualizar={atualizar}
      titulo="Orçamentos"
      voltar
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: cores.suave, flex: 1, paddingRight: 12 }}>
          Defina quanto pode gastar por mês em cada categoria. Avisamos ao chegar em 80% e em 100%.
        </Text>
        <BotaoIcone icone="add-circle-outline" onPress={() => router.push('/orcamento')} />
      </View>

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && dados.length === 0 ? (
        <Vazio texto="Nenhum orçamento ainda. Toque em + para criar o primeiro." />
      ) : null}

      {dados?.map(({ orcamento, gasto }) => {
        const { porcentagem, nivel } = statusOrcamento(gasto, orcamento.valor_limite);
        const restante = orcamento.valor_limite - gasto;
        return (
          <Pressable
            key={orcamento.id}
            onPress={() =>
              router.push({ pathname: '/orcamento', params: { id: String(orcamento.id) } })
            }
          >
            <Cartao>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700' }}>
                  {orcamento.categorias.nome}
                </Text>
                <Text style={{ color: cor(nivel), fontWeight: '700' }}>{Math.round(porcentagem)}%</Text>
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
        );
      })}
    </Tela>
  );
}
