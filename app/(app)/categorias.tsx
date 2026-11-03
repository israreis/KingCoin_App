import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Botao, Campo, Cartao, Carregando, Chips, MensagemErro, Secao, Tela } from '@/components/ui';
import { criarCategoria, excluirCategoria, listarCategorias, renomearCategoria } from '@/lib/api';
import { confirmarExclusao, mostrarErro } from '@/lib/dialogos';
import { COR_TIPO, TEXTO_TIPO, useTema } from '@/lib/theme';
import { useDados } from '@/lib/useDados';
import type { Categoria, Tipo } from '@/types';

const TIPOS: Tipo[] = ['RECEITA', 'DESPESA', 'ECONOMIA'];

export default function Categorias() {
  const { cores } = useTema();
  const { dados, carregando, atualizando, erro, atualizar } = useDados(listarCategorias, []);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<Tipo>('DESPESA');
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [salvando, setSalvando] = useState(false);

  function limpar() {
    setNome('');
    setEditando(null);
  }

  async function salvar() {
    const texto = nome.trim();
    if (!texto) return mostrarErro(new Error('Dê um nome para a categoria.'));

    setSalvando(true);
    try {
      if (editando) await renomearCategoria(editando.id, texto);
      else await criarCategoria(texto, tipo);
      limpar();
      atualizar();
    } catch (e) {
      mostrarErro(e);
    } finally {
      setSalvando(false);
    }
  }

  function excluir(categoria: Categoria) {
    confirmarExclusao(`Excluir "${categoria.nome}"`, async () => {
      try {
        await excluirCategoria(categoria.id);
        if (editando?.id === categoria.id) limpar();
        atualizar();
      } catch (e) {
        mostrarErro(e);
      }
    });
  }

  return (
    <Tela titulo="Categorias" voltar atualizando={atualizando} onAtualizar={atualizar}>
      <Cartao>
        <Text style={{ color: cores.texto, fontWeight: '700', fontSize: 16 }}>
          {editando ? 'Renomear categoria' : 'Nova categoria'}
        </Text>
        {editando ? null : <Chips
          opcoes={TIPOS.map((t) => ({ id: t, texto: TEXTO_TIPO[t], cor: COR_TIPO[t] }))}
          valor={tipo}
          onChange={setTipo}
        />}
        <Campo
          rotulo="Nome"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="sentences"
          placeholder="Ex.: Academia"
          maxLength={40}
        />
        <Botao texto={editando ? 'Salvar nome' : 'Adicionar categoria'} onPress={salvar} carregando={salvando} />
        {editando ? <Botao texto="Cancelar" variante="contorno" onPress={limpar} /> : null}
      </Cartao>

      {erro ? <MensagemErro texto={erro} /> : null}
      {carregando && !dados ? <Carregando /> : null}

      {dados
        ? TIPOS.map((t) => {
            const doTipo = dados.filter((c) => c.tipo === t);
            return (
              <View key={t} style={{ gap: 10 }}>
                <Secao titulo={TEXTO_TIPO[t]} />
                <Cartao>
                  {doTipo.map((categoria) => {
                    const propria = categoria.user_id !== null;
                    return (
                      <View
                        key={categoria.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
                      >
                        <View
                          style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COR_TIPO[t] }}
                        />
                        <Text style={{ color: cores.texto, flex: 1 }}>{categoria.nome}</Text>
                        {propria ? (
                          <>
                            <Pressable
                              hitSlop={8}
                              onPress={() => {
                                setEditando(categoria);
                                setNome(categoria.nome);
                              }}
                            >
                              <Ionicons name="create-outline" size={20} color={cores.primaria} />
                            </Pressable>
                            <Pressable hitSlop={8} onPress={() => excluir(categoria)}>
                              <Ionicons name="trash-outline" size={20} color={cores.perigo} />
                            </Pressable>
                          </>
                        ) : (
                          <Ionicons name="lock-closed-outline" size={16} color={cores.suave} />
                        )}
                      </View>
                    );
                  })}
                </Cartao>
              </View>
            );
          })
        : null}

      <Text style={{ color: cores.suave, fontSize: 12 }}>
        As categorias com cadeado são padrão do KingCoin. Só é possível excluir categorias sem
        movimentações.
      </Text>
    </Tela>
  );
}
