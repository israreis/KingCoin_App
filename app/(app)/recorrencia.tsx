import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import {
  Botao,
  BotoesFormulario,
  Campo,
  CampoMoeda,
  Carregando,
  Chips,
  MensagemErro,
  TelaFormulario,
} from '@/components/ui';
import {
  buscarRecorrencia,
  criarRecorrencia,
  editarRecorrencia,
  excluirRecorrencia,
  listarCategorias,
} from '@/lib/api';
import { confirmarExclusao } from '@/lib/dialogos';
import { lerValor, numeroParaCampo } from '@/lib/format';
import { COR_TIPO, TEXTO_TIPO, useTema } from '@/lib/theme';
import type { Categoria, Tipo } from '@/types';

const TIPOS: Tipo[] = ['RECEITA', 'DESPESA', 'ECONOMIA'];

export default function FormularioRecorrencia() {
  const { cores } = useTema();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idRecorrencia = id ? Number(id) : null;

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tipo, setTipo] = useState<Tipo>('DESPESA');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dia, setDia] = useState('1');
  const [ativa, setAtiva] = useState(true);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const listaCategorias = await listarCategorias();
        if (!ativo) return;
        setCategorias(listaCategorias);

        if (idRecorrencia) {
          const item = await buscarRecorrencia(idRecorrencia);
          if (!ativo) return;
          setTipo(item.categorias.tipo);
          setCategoriaId(item.categoria_id);
          setValor(numeroParaCampo(item.valor));
          setDescricao(item.descricao ?? '');
          setDia(String(item.dia_do_mes));
          setAtiva(item.ativa);
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
  }, [idRecorrencia]);

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo],
  );

  function escolherTipo(novo: Tipo) {
    setTipo(novo);
    if (!categorias.some((c) => c.id === categoriaId && c.tipo === novo)) setCategoriaId(null);
  }

  async function salvar() {
    const valorNumero = lerValor(valor);
    const diaNumero = Number(dia);

    if (!categoriaId) return setErro('Escolha uma categoria.');
    if (valorNumero === null || valorNumero <= 0) return setErro('Informe um valor maior que zero.');
    if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > 31) {
      return setErro('O dia do mês deve estar entre 1 e 31.');
    }

    setSalvando(true);
    setErro(null);
    try {
      const dados = {
        categoria_id: categoriaId,
        valor: valorNumero,
        descricao: descricao.trim() || null,
        dia_do_mes: diaNumero,
        ativa,
      };
      if (idRecorrencia) await editarRecorrencia(idRecorrencia, dados);
      else await criarRecorrencia(dados);
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  function excluir() {
    if (!idRecorrencia) return;
    confirmarExclusao('Excluir recorrência', async () => {
      try {
        await excluirRecorrencia(idRecorrencia);
        router.back();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
      }
    });
  }

  if (carregando) return <Carregando />;

  return (
    <TelaFormulario titulo={idRecorrencia ? 'Editar recorrência' : 'Nova recorrência'}>

      {erro ? <MensagemErro texto={erro} /> : null}

      <Text style={{ color: cores.suave, fontWeight: '600' }}>Tipo</Text>
      <Chips
        opcoes={TIPOS.map((t) => ({ id: t, texto: TEXTO_TIPO[t], cor: COR_TIPO[t] }))}
        valor={tipo}
        onChange={escolherTipo}
      />

      <Text style={{ color: cores.suave, fontWeight: '600' }}>Categoria</Text>
      <Chips
        opcoes={categoriasDoTipo.map((c) => ({ id: c.id, texto: c.nome, cor: COR_TIPO[tipo] }))}
        valor={categoriaId}
        onChange={setCategoriaId}
      />

      <CampoMoeda rotulo="Valor (R$)" value={valor} onChangeText={setValor} placeholder="0,00" />

      <Campo
        rotulo="Dia do mês (1 a 31)"
        value={dia}
        onChangeText={(texto) => setDia(texto.replace(/\D/g, '').slice(0, 2))}
        keyboardType="number-pad"
      />
      <Text style={{ color: cores.suave, fontSize: 12 }}>
        Em meses mais curtos, o lançamento acontece no último dia do mês.
      </Text>

      <Campo
        rotulo="Descrição (opcional)"
        value={descricao}
        onChangeText={setDescricao}
        autoCapitalize="sentences"
        placeholder="Ex.: Aluguel"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: cores.texto, fontWeight: '600' }}>Ativa</Text>
        <Switch
          value={ativa}
          onValueChange={setAtiva}
          trackColor={{ true: cores.primaria, false: cores.borda }}
        />
      </View>

      <Text style={{ color: cores.suave, fontSize: 12 }}>
        As movimentações são lançadas automaticamente quando você abre o app, a partir de hoje.
      </Text>

      <BotoesFormulario
        texto={idRecorrencia ? 'Salvar' : 'Adicionar'}
        onPress={salvar}
        carregando={salvando}
      />
      {idRecorrencia ? <Botao texto="Excluir recorrência" variante="perigo" onPress={excluir} /> : null}
    </TelaFormulario>
  );
}
