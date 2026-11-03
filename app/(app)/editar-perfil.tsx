import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { BotoesFormulario, Campo, Carregando, MensagemErro, TelaFormulario } from '@/components/ui';
import { buscarPerfil, salvarPerfil } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mascararTelefone } from '@/lib/format';

export default function EditarPerfil() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    buscarPerfil(userId)
      .then((perfil) => {
        if (!ativo) return;
        setNome(perfil.nome ?? '');
        setSobrenome(perfil.sobrenome ?? '');
        setTelefone(perfil.telefone ? mascararTelefone(perfil.telefone) : '');
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Não foi possível carregar seus dados.'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [userId]);

  async function salvar() {
    const digitos = telefone.replace(/\D/g, '');
    if (!nome.trim()) return setErro('Informe seu nome.');
    if (digitos && digitos.length < 10) return setErro('Telefone incompleto. Use DDD + número.');

    setSalvando(true);
    setErro(null);
    try {
      await salvarPerfil(userId, {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: digitos,
      });
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <TelaFormulario titulo="Editar dados">
      {erro ? <MensagemErro texto={erro} /> : null}

      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        autoCapitalize="words"
        autoComplete="given-name"
        maxLength={60}
      />
      <Campo
        rotulo="Sobrenome"
        value={sobrenome}
        onChangeText={setSobrenome}
        autoCapitalize="words"
        autoComplete="family-name"
        maxLength={80}
      />
      <Campo
        rotulo="Telefone"
        value={telefone}
        onChangeText={(texto) => setTelefone(mascararTelefone(texto))}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="(11) 98765-4321"
      />

      <BotoesFormulario texto="Salvar" onPress={salvar} carregando={salvando} />
    </TelaFormulario>
  );
}
