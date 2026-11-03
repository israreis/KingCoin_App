import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotaoFlutuante, useBotaoFlutuante } from '@/components/BotaoFlutuante';
import { BotoesAcao } from '@/components/BotoesAcao';
import { ACOES_NO_CARTAO, DeslizavelNoCelular } from '@/components/ItemDeslizavel';
import { iconeDaCategoria } from '@/components/TransacaoItem';
import { Cartao, Carregando, MensagemErro, Tela, Vazio } from '@/components/ui';
import { excluirRecorrencia, listarRecorrencias } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { moeda } from '@/lib/format';
import { COR_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';
import { Ionicons } from '@expo/vector-icons';

export default function Recorrencias() {
  const { cores } = useTema();
  const router = useRouter();
  const botao = useBotaoFlutuante();
  const { dados, carregando, atualizando, erro, atualizar } = useDados(listarRecorrencias, []);

  const editar = (id: number) => router.push({ pathname: '/recorrencia', params: { id: String(id) } });

  function excluir(id: number) {
    confirmarExclusao('Excluir recorrência', async () => {
      try {
        await excluirRecorrencia(id);
        atualizar();
      } catch (e) {
        mostrarErro(e);
      }
    });
  }

  return (
    <Tela
      titulo="Recorrências"
      voltar
      atualizando={atualizando}
      onAtualizar={atualizar}
      onRolar={botao.aoRolar}
      flutuante={
        <BotaoFlutuante
          visivel={botao.visivel}
          rotulo="Nova recorrência"
          onPress={() => router.push('/recorrencia')}
        />
      }
    >
      <Text style={{ color: cores.suave }}>
        Salário, aluguel, assinaturas: lançados automaticamente todo mês, no dia escolhido.
      </Text>

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && dados.length === 0 ? (
        <Vazio texto="Nenhuma recorrência ainda. Toque em + para criar a primeira." />
      ) : null}

      <View style={estilos.lista}>
        {dados?.map((item) => {
          const cor = COR_TIPO[item.categorias.tipo];
          return (
            <DeslizavelNoCelular key={item.id} onEditar={() => editar(item.id)} onExcluir={() => excluir(item.id)}>
              <Pressable onPress={() => editar(item.id)}>
                <Cartao estilo={[estilos.linha, item.ativa ? null : { opacity: 0.55 }]}>
                  <View style={[estilos.icone, { backgroundColor: `${cor}26` }]}>
                    <Ionicons name={iconeDaCategoria(item.categorias.nome)} size={22} color={cor} />
                  </View>
                  <View style={estilos.textos}>
                    <Text style={{ color: cores.texto, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                      {item.descricao?.trim() || item.categorias.nome}
                    </Text>
                    <Text style={{ color: cores.suave, fontSize: 12 }}>
                      {item.categorias.nome} · todo dia {item.dia_do_mes}
                      {item.ativa ? '' : ' · pausada'}
                    </Text>
                  </View>
                  <Text style={{ color: cor, fontSize: 15, fontWeight: '700' }}>{moeda(item.valor)}</Text>
                  {ACOES_NO_CARTAO ? (
                    <>
                      <View style={[estilos.divisor, { backgroundColor: cores.borda }]} />
                      <BotoesAcao onEditar={() => editar(item.id)} onExcluir={() => excluir(item.id)} />
                    </>
                  ) : null}
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
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  divisor: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4 },
});
