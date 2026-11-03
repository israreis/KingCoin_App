import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { BotoesFormulario, Campo, Chips, MensagemErro, TelaFormulario } from '@/components/ui';
import { criarCategoria, renomearCategoria } from '@/lib/api';
import { COR_TIPO, TEXTO_TIPO, useTema } from '@/lib/theme';
import type { Tipo } from '@/types';

const TIPOS: Tipo[] = ['RECEITA', 'DESPESA', 'ECONOMIA'];

/** Formulário de categoria do usuário: criar (com tipo) ou renomear. */
export default function FormularioCategoria() {
  const { cores } = useTema();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; nome?: string; tipo?: Tipo }>();
  const idCategoria = params.id ? Number(params.id) : null;

  const [nome, setNome] = useState(params.nome ?? '');
  const [tipo, setTipo] = useState<Tipo>(params.tipo ?? 'DESPESA');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const texto = nome.trim();
    if (!texto) return setErro('Dê um nome para a categoria.');

    setSalvando(true);
    setErro(null);
    try {
      if (idCategoria) await renomearCategoria(idCategoria, texto);
      else await criarCategoria(texto, tipo);
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <TelaFormulario titulo={idCategoria ? 'Editar categoria' : 'Nova categoria'}>
      {erro ? <MensagemErro texto={erro} /> : null}

      <Text style={{ color: cores.suave, fontSize: 13, fontWeight: '600' }}>Tipo</Text>
      {idCategoria ? (
        <Text style={{ color: COR_TIPO[tipo], fontWeight: '700' }}>{TEXTO_TIPO[tipo]}</Text>
      ) : (
        <Chips
          opcoes={TIPOS.map((t) => ({ id: t, texto: TEXTO_TIPO[t], cor: COR_TIPO[t] }))}
          valor={tipo}
          onChange={setTipo}
        />
      )}

      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        autoCapitalize="sentences"
        placeholder="Ex.: Academia"
        maxLength={40}
        obrigatorio
      />

      <BotoesFormulario texto={idCategoria ? 'Salvar' : 'Adicionar'} onPress={salvar} carregando={salvando} />
    </TelaFormulario>
  );
}
