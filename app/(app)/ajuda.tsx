import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Cartao, TelaFormulario } from '@/components/ui';
import { useTema } from '@/lib/theme';

const TUTORIAIS: { icone: keyof typeof Ionicons.glyphMap; titulo: string; texto: string }[] = [
  {
    icone: 'add-circle-outline',
    titulo: 'Registrar uma movimentação',
    texto:
      'Na aba Carteira ou Movimentações, toque em "Nova movimentação". Escolha o tipo (receita, despesa ou economia), a categoria, o valor e a data.',
  },
  {
    icone: 'create-outline',
    titulo: 'Editar ou excluir',
    texto:
      'Toque em qualquer movimentação da lista para editar os dados ou excluí-la. O mesmo vale para as metas.',
  },
  {
    icone: 'flag-outline',
    titulo: 'Criar metas',
    texto:
      'Na aba Metas, toque em + e informe o nome, o valor que quer alcançar e quanto já guardou. Atualize o valor guardado sempre que avançar.',
  },
  {
    icone: 'stats-chart-outline',
    titulo: 'Entender o dashboard',
    texto:
      'O dashboard mostra a evolução do seu saldo nos últimos 6 meses, os gastos e ganhos do mês por categoria e o progresso das metas.',
  },
  {
    icone: 'document-text-outline',
    titulo: 'Exportar relatórios',
    texto:
      'Em Organização > Relatórios (ou no ícone de download em Movimentações), escolha o período e exporte em PDF ou Excel para compartilhar ou salvar.',
  },
  {
    icone: 'moon-outline',
    titulo: 'Tema claro e escuro',
    texto: 'Em Conta > Preferências você alterna entre o tema escuro e o claro.',
  },
];

export default function Ajuda() {
  const { cores } = useTema();
  return (
    <TelaFormulario titulo="Ajuda" voltar>
      {TUTORIAIS.map((item) => (
        <Cartao key={item.titulo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={item.icone} size={22} color={cores.primaria} />
            <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700', flex: 1 }}>
              {item.titulo}
            </Text>
          </View>
          <Text style={{ color: cores.suave, lineHeight: 21 }}>{item.texto}</Text>
        </Cartao>
      ))}
    </TelaFormulario>
  );
}
