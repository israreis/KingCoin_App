import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BotaoIcone, Cartao, Carregando, MensagemErro, Tela, Vazio } from '@/components/ui';
import { listarRecorrencias } from '@/lib/api';
import { moeda } from '@/lib/format';
import { COR_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';

export default function Recorrencias() {
  const { cores } = useTema();
  const router = useRouter();
  const { dados, carregando, atualizando, erro, atualizar } = useDados(listarRecorrencias, []);

  return (
    <Tela titulo="Recorrências" voltar atualizando={atualizando} onAtualizar={atualizar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: cores.suave, flex: 1, paddingRight: 12 }}>
          Salário, aluguel, assinaturas: lançados automaticamente todo mês, no dia escolhido.
        </Text>
        <BotaoIcone icone="add-circle-outline" onPress={() => router.push('/recorrencia')} />
      </View>

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && dados.length === 0 ? (
        <Vazio texto="Nenhuma recorrência ainda. Toque em + para criar a primeira." />
      ) : null}

      {dados?.map((item) => {
        const cor = COR_TIPO[item.categorias.tipo];
        return (
          <Pressable
            key={item.id}
            onPress={() => router.push({ pathname: '/recorrencia', params: { id: String(item.id) } })}
          >
            <Cartao estilo={item.ativa ? undefined : { opacity: 0.55 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {item.descricao?.trim() || item.categorias.nome}
                </Text>
                <Text style={{ color: cor, fontWeight: '700' }}>{moeda(item.valor)}</Text>
              </View>
              <Text style={{ color: cores.suave, fontSize: 13 }}>
                {item.categorias.nome} · todo dia {item.dia_do_mes}
                {item.ativa ? '' : ' · pausada'}
              </Text>
            </Cartao>
          </Pressable>
        );
      })}
    </Tela>
  );
}
