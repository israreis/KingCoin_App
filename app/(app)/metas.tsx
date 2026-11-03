import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { BotaoFlutuante, useBotaoFlutuante } from '@/components/BotaoFlutuante';
import { MetaDeslizavel } from '@/components/MetaCartao';
import { Carregando, Grade, MensagemErro, Tela, Vazio } from '@/components/ui';
import { listarMetas } from '@/lib/api';
import { useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';

export default function Metas() {
  const { cores } = useTema();
  const router = useRouter();
  const { dados, carregando, atualizando, erro, atualizar } = useDados(listarMetas, []);
  const botao = useBotaoFlutuante();
  const temMetas = (dados?.length ?? 0) > 0;

  return (
    <Tela
      bordas={[]}
      atualizando={atualizando}
      onAtualizar={atualizar}
      onRolar={botao.aoRolar}
      flutuante={
        <BotaoFlutuante
          visivel={botao.visivel}
          rotulo="Nova meta"
          larguraConteudo={1200}
          onPress={() => router.push('/meta')}
        />
      }
    >
      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && !temMetas ? (
        <Vazio texto="Nenhuma meta ainda. Toque em + para criar a primeira." />
      ) : null}

      <Grade minimo={340}>
      {dados?.map((meta, indice) => (
        <MetaDeslizavel
          key={meta.id}
          meta={meta}
          onAlterada={atualizar}
        />
      ))}
      </Grade>
    </Tela>
  );
}
