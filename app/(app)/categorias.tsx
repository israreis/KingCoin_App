import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotaoFlutuante, useBotaoFlutuante } from '@/components/BotaoFlutuante';
import { BotoesAcao } from '@/components/BotoesAcao';
import { ACOES_NO_CARTAO, DeslizavelNoCelular } from '@/components/ItemDeslizavel';
import { iconeDaCategoria } from '@/components/TransacaoItem';
import { Cartao, Carregando, MensagemErro, Secao, Tela, Vazio } from '@/components/ui';
import { excluirCategoria, listarCategorias } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { COR_TIPO, TEXTO_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';
import type { Categoria, Tipo } from '@/types';

const TIPOS: Tipo[] = ['RECEITA', 'DESPESA', 'ECONOMIA'];

/** Só as categorias criadas pelo usuário (as padrão do app não aparecem aqui). */
export default function Categorias() {
  const { cores } = useTema();
  const router = useRouter();
  const botao = useBotaoFlutuante();
  const { dados, carregando, atualizando, erro, atualizar } = useDados(listarCategorias, []);

  const proprias = (dados ?? []).filter((c) => c.user_id !== null);

  const editar = (categoria: Categoria) =>
    router.push({
      pathname: '/categoria',
      params: { id: String(categoria.id), nome: categoria.nome, tipo: categoria.tipo },
    });

  function excluir(categoria: Categoria) {
    confirmarExclusao(`Excluir "${categoria.nome}"`, async () => {
      try {
        await excluirCategoria(categoria.id);
        atualizar();
      } catch (e) {
        mostrarErro(e);
      }
    });
  }

  return (
    <Tela
      titulo="Suas categorias"
      voltar
      atualizando={atualizando}
      onAtualizar={atualizar}
      onRolar={botao.aoRolar}
      flutuante={
        <BotaoFlutuante
          visivel={botao.visivel}
          rotulo="Nova categoria"
          onPress={() => router.push('/categoria')}
        />
      }
    >
      <Text style={{ color: cores.suave }}>
        Crie categorias além das que já vêm no KingCoin. Só é possível excluir uma categoria que não
        tenha movimentações.
      </Text>

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados && proprias.length === 0 ? (
        <Vazio texto="Você ainda não criou categorias. Toque em + para criar a primeira." />
      ) : null}

      {proprias.length > 0
        ? TIPOS.map((tipo) => {
            const doTipo = proprias.filter((c) => c.tipo === tipo);
            if (doTipo.length === 0) return null;
            const cor = COR_TIPO[tipo];
            return (
              <View key={tipo} style={estilos.lista}>
                <Secao titulo={TEXTO_TIPO[tipo]} />
                {doTipo.map((categoria) => (
                  <DeslizavelNoCelular
                    key={categoria.id}
                    onEditar={() => editar(categoria)}
                    onExcluir={() => excluir(categoria)}
                  >
                    <Pressable onPress={() => editar(categoria)}>
                      <Cartao estilo={estilos.linha}>
                        <View style={[estilos.icone, { backgroundColor: `${cor}26` }]}>
                          <Ionicons name={iconeDaCategoria(categoria.nome)} size={22} color={cor} />
                        </View>
                        <Text style={{ color: cores.texto, fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                          {categoria.nome}
                        </Text>
                        {ACOES_NO_CARTAO ? (
                          <BotoesAcao onEditar={() => editar(categoria)} onExcluir={() => excluir(categoria)} />
                        ) : null}
                      </Cartao>
                    </Pressable>
                  </DeslizavelNoCelular>
                ))}
              </View>
            );
          })
        : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
