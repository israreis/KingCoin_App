import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cartao, Grade, Tela } from '@/components/ui';
import { useTema } from '@/lib/theme';

const ITENS: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  rota: string;
}[] = [
  { icone: 'pie-chart-outline', titulo: 'Orçamentos', descricao: 'Limite mensal de gastos por categoria', rota: '/orcamentos' },
  { icone: 'repeat-outline', titulo: 'Movimentações recorrentes', descricao: 'Salário, aluguel e assinaturas', rota: '/recorrencias' },
  { icone: 'pricetags-outline', titulo: 'Categorias', descricao: 'Crie e organize suas categorias', rota: '/categorias' },
  { icone: 'document-text-outline', titulo: 'Relatórios', descricao: 'Exporte suas movimentações em PDF ou Excel', rota: '/relatorios' },
];

export default function Organizacao() {
  const { cores } = useTema();
  const router = useRouter();

  return (
    <Tela titulo="Organização">
      <Grade minimo={340}>
      {ITENS.map((item) => (
        <Pressable key={item.rota} onPress={() => router.push(item.rota as never)}>
          <Cartao estilo={estilos.linha}>
            <View style={[estilos.icone, { backgroundColor: `${cores.primaria}22` }]}>
              <Ionicons name={item.icone} size={24} color={cores.primaria} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: cores.texto, fontSize: 16, fontWeight: '700' }}>{item.titulo}</Text>
              <Text style={{ color: cores.suave, fontSize: 13 }}>{item.descricao}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={cores.suave} />
          </Cartao>
        </Pressable>
      ))}
      </Grade>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icone: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
