import { useState } from 'react';
import { Text } from 'react-native';

import { Alert } from '@/lib/alerta';
import { CampoData } from '@/components/CampoData';
import { Botao, Cartao, Chips, MensagemErro, TelaFormulario } from '@/components/ui';
import { listarMovimentacoes } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { exportarExcel, exportarPdf } from '@/lib/exportacao';
import { PERIODOS, calcularPeriodo } from '@/lib/periodos';
import { useTema } from '@/lib/theme';
import type { PeriodoId } from '@/types';

type Formato = 'pdf' | 'excel';

export default function Relatorios() {
  const { cores } = useTema();
  const { session } = useAuth();

  const inicial = calcularPeriodo('este_mes');
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const [periodo, setPeriodo] = useState<PeriodoId | null>('este_mes');
  const [exportando, setExportando] = useState<Formato | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function escolherPeriodo(id: PeriodoId) {
    const { inicio: i, fim: f } = calcularPeriodo(id);
    setPeriodo(id);
    setInicio(i);
    setFim(f);
  }

  async function exportar(formato: Formato) {
    const inicioISO = inicio;
    const fimISO = fim;

    if (!inicioISO || !fimISO) return setErro('Datas inválidas. Use o formato DD/MM/AAAA.');
    if (inicioISO > fimISO) return setErro('A data inicial não pode ser maior que a final.');

    setErro(null);
    setExportando(formato);
    try {
      const movimentacoes = await listarMovimentacoes({ inicio: inicioISO, fim: fimISO });
      const usuario =
        (session?.user.user_metadata?.nome as string | undefined) ?? session?.user.email ?? 'usuário';
      const parametros = { movimentacoes, inicio: inicioISO, fim: fimISO, usuario };

      if (formato === 'pdf') await exportarPdf(parametros);
      else await exportarExcel(parametros);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível gerar o relatório.');
    } finally {
      setExportando(null);
    }
  }

  return (
    <TelaFormulario>
      <Text style={{ color: cores.suave }}>
        Escolha o período e exporte as suas movimentações em PDF ou Excel.
      </Text>

      {erro ? <MensagemErro texto={erro} /> : null}

      <Chips
        opcoes={PERIODOS.map((p) => ({ id: p.id, texto: p.texto }))}
        valor={periodo}
        onChange={escolherPeriodo}
      />

      <Cartao>
        <CampoData
          rotulo="Data inicial"
          value={inicio}
          onChange={(iso) => {
            setInicio(iso);
            setPeriodo(null);
          }}
        />
        <CampoData
          rotulo="Data final"
          value={fim}
          onChange={(iso) => {
            setFim(iso);
            setPeriodo(null);
          }}
        />
      </Cartao>

      <Botao
        texto="Exportar PDF"
        icone="document-text-outline"
        onPress={() => exportar('pdf')}
        carregando={exportando === 'pdf'}
        desabilitado={exportando !== null}
      />
      <Botao
        texto="Exportar Excel"
        icone="grid-outline"
        variante="contorno"
        onPress={() => exportar('excel')}
        carregando={exportando === 'excel'}
        desabilitado={exportando !== null}
      />
    </TelaFormulario>
  );
}
