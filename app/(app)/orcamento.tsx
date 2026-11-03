import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Botao, CampoMoeda, Carregando, Chips, MensagemErro, TelaFormulario } from '@/components/ui';
import {
  buscarOrcamento,
  criarOrcamento,
  editarOrcamento,
  excluirOrcamento,
  listarCategorias,
  listarOrcamentos,
} from '@/lib/api';
import { confirmarExclusao } from '@/lib/dialogos';
import { lerValor, numeroParaCampo } from '@/lib/format';
import { COR_TIPO, useTema } from '@/lib/theme';
import type { Categoria } from '@/types';

export default function FormularioOrcamento() {
  const { cores } = useTema();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idOrcamento = id ? Number(id) : null;

  const [disponiveis, setDisponiveis] = useState<Categoria[]>([]);
  const [categoriaEditada, setCategoriaEditada] = useState<Categoria | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [valor, setValor] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        if (idOrcamento) {
          const orcamento = await buscarOrcamento(idOrcamento);
          if (!ativo) return;
          setCategoriaEditada(orcamento.categorias);
          setCategoriaId(orcamento.categoria_id);
          setValor(numeroParaCampo(orcamento.valor_limite));
        } else {
          const [categorias, orcamentos] = await Promise.all([listarCategorias(), listarOrcamentos()]);
          if (!ativo) return;
          const usadas = new Set(orcamentos.map((o) => o.categoria_id));
          setDisponiveis(categorias.filter((c) => c.tipo === 'DESPESA' && !usadas.has(c.id)));
        }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [idOrcamento]);

  async function salvar() {
    const limite = lerValor(valor);
    if (!categoriaId) return setErro('Escolha uma categoria.');
    if (limite === null || limite <= 0) return setErro('Informe um limite maior que zero.');

    setSalvando(true);
    setErro(null);
    try {
      if (idOrcamento) await editarOrcamento(idOrcamento, limite);
      else await criarOrcamento(categoriaId, limite);
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  function excluir() {
    if (!idOrcamento) return;
    confirmarExclusao('Excluir orçamento', async () => {
      try {
        await excluirOrcamento(idOrcamento);
        router.back();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
      }
    });
  }

  if (carregando) return <Carregando />;

  return (
    <TelaFormulario>
      <Stack.Screen options={{ title: idOrcamento ? 'Editar orçamento' : 'Novo orçamento' }} />

      {erro ? <MensagemErro texto={erro} /> : null}

      <Text style={{ color: cores.suave, fontWeight: '600' }}>Categoria de despesa</Text>
      {idOrcamento ? (
        <Text style={{ color: cores.texto, fontSize: 18, fontWeight: '700' }}>
          {categoriaEditada?.nome}
        </Text>
      ) : disponiveis.length === 0 ? (
        <Text style={{ color: cores.suave }}>
          Todas as suas categorias de despesa já têm orçamento. Crie uma categoria nova para continuar.
        </Text>
      ) : (
        <Chips
          opcoes={disponiveis.map((c) => ({ id: c.id, texto: c.nome, cor: COR_TIPO.DESPESA }))}
          valor={categoriaId}
          onChange={setCategoriaId}
        />
      )}

      <CampoMoeda
        rotulo="Limite mensal (R$)"
        value={valor}
        onChangeText={setValor}
        placeholder="0,00"
      />

      <Botao
        texto={idOrcamento ? 'Salvar alterações' : 'Criar orçamento'}
        onPress={salvar}
        carregando={salvando}
        desabilitado={!idOrcamento && disponiveis.length === 0}
      />
      {idOrcamento ? <Botao texto="Excluir orçamento" variante="perigo" onPress={excluir} /> : null}
    </TelaFormulario>
  );
}
