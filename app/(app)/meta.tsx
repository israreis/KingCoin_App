import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Botao, Campo, CampoMoeda, Carregando, MensagemErro, TelaFormulario } from '@/components/ui';
import { buscarMeta, criarMeta, editarMeta, excluirMeta } from '@/lib/api';
import { lerValor, numeroParaCampo } from '@/lib/format';

export default function FormularioMeta() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idMeta = id ? Number(id) : null;

  const [nome, setNome] = useState('');
  const [valorMeta, setValorMeta] = useState('');
  const [valorAtual, setValorAtual] = useState('');

  const [carregando, setCarregando] = useState(!!idMeta);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!idMeta) return;
    let ativo = true;

    buscarMeta(idMeta)
      .then((meta) => {
        if (!ativo) return;
        setNome(meta.nome);
        setValorMeta(numeroParaCampo(meta.valor_meta));
        setValorAtual(numeroParaCampo(meta.valor_atual));
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Não foi possível carregar a meta.'))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [idMeta]);

  async function salvar() {
    const objetivo = lerValor(valorMeta);
    const atual = valorAtual.trim() ? lerValor(valorAtual) : 0;

    if (!nome.trim()) return setErro('Dê um nome para a meta.');
    if (objetivo === null || objetivo <= 0) return setErro('O valor da meta deve ser maior que zero.');
    if (atual === null || atual < 0) return setErro('O valor atual não pode ser negativo.');

    setSalvando(true);
    setErro(null);
    try {
      const dados = { nome: nome.trim(), valor_meta: objetivo, valor_atual: atual };
      if (idMeta) await editarMeta(idMeta, dados);
      else await criarMeta(dados);
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  function excluir() {
    if (!idMeta) return;
    Alert.alert('Excluir meta', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirMeta(idMeta);
            router.back();
          } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }

  if (carregando) return <Carregando />;

  return (
    <TelaFormulario>
      <Stack.Screen options={{ title: idMeta ? 'Editar meta' : 'Nova meta' }} />

      {erro ? <MensagemErro texto={erro} /> : null}

      <Campo
        rotulo="Nome da meta"
        value={nome}
        onChangeText={setNome}
        autoCapitalize="sentences"
        placeholder="Ex.: Viagem"
      />
      <CampoMoeda
        rotulo="Valor da meta (R$)"
        value={valorMeta}
        onChangeText={setValorMeta}
        placeholder="0,00"
      />
      <CampoMoeda
        rotulo="Valor já guardado (R$)"
        value={valorAtual}
        onChangeText={setValorAtual}
        placeholder="0,00"
      />

      <Botao texto={idMeta ? 'Salvar alterações' : 'Criar meta'} onPress={salvar} carregando={salvando} />
      {idMeta ? <Botao texto="Excluir meta" variante="perigo" onPress={excluir} /> : null}
    </TelaFormulario>
  );
}
