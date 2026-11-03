import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { BotaoFlutuante, useBotaoFlutuante } from '@/components/BotaoFlutuante';
import { MetaDeslizavel } from '@/components/MetaCartao';
import { Carregando, MensagemErro, Tela, Vazio } from '@/components/ui';
import { listarMetas } from '@/lib/api';
import { useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';
import { useDica } from '@/lib/dicas';

export default function Metas() {
  const { cores } = useTema();
  const router = useRouter();
  const dica = useDica('metas');
  const { dados, carregando, atualizando, erro, atualizar } = useDados(listarMetas, []);
  const botao = useBotaoFlutuante();
  const temMetas = (dados?.length ?? 0) > 0;

  return (
    <Tela
      titulo="Metas"
      voltar
      atualizando={atualizando}
      onAtualizar={atualizar}
      onRolar={botao.aoRolar}
      flutuante={
        <BotaoFlutuante
          visivel={botao.visivel}
          rotulo="Nova meta"
          onPress={() => router.push('/meta')}
        />
      }
    >
      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && !temMetas ? (
        <Vazio texto="Nenhuma meta ainda. Toque em + para criar a primeira." />
      ) : null}

      {dica.mostrar && temMetas ? (
        <Text style={{ color: cores.suave, fontSize: 13 }}>
          Dica: deslize uma meta para a esquerda para editar ou excluir.
        </Text>
      ) : null}

      <View style={{ gap: 14 }}>
      {dados?.map((meta, indice) => (
        <MetaDeslizavel
          key={meta.id}
          meta={meta}
          onAlterada={atualizar}
          dica={dica.mostrar && indice === 0}
          onDicaConcluida={dica.concluir}
        />
      ))}
      </View>
    </Tela>
  );
}
