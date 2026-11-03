import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dataBR, moeda } from '@/lib/format';
import { COR_TIPO, useTema } from '@/lib/theme';
import type { ReactNode } from 'react';

import { BotoesAcao } from './BotoesAcao';
import type { Movimentacao, Tipo } from '@/types';

const ICONE_POR_CATEGORIA: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Salário': 'cash-outline',
  Freelance: 'laptop-outline',
  Aluguel: 'home-outline',
  Moradia: 'home-outline',
  Supermercado: 'basket-outline',
  'Alimentação': 'restaurant-outline',
  Restaurante: 'restaurant-outline',
  Transporte: 'bus-outline',
  'Saúde': 'medkit-outline',
  Lazer: 'happy-outline',
  'Educação': 'school-outline',
  'Poupança': 'wallet-outline',
  Investimentos: 'trending-up-outline',
  'Outros Rendimentos': 'cash-outline',
  'Outros gastos': 'receipt-outline',
};

export function iconeDaCategoria(nome: string): keyof typeof Ionicons.glyphMap {
  return ICONE_POR_CATEGORIA[nome] ?? 'receipt-outline';
}

const SINAL: Record<Tipo, string> = { RECEITA: '+', DESPESA: '-', ECONOMIA: '' };

export function TransacaoItem({
  mov,
  onPress,
  acoes,
}: {
  mov: Movimentacao;
  onPress?: () => void;
  /** Botões exibidos à direita, dentro do cartão. */
  acoes?: ReactNode;
}) {
  const { cores } = useTema();
  const cor = COR_TIPO[mov.categorias.tipo];

  return (
    <Pressable
      onPress={onPress}
      style={[estilos.linha, { backgroundColor: cores.card, borderColor: cores.borda }]}
    >
      <View style={[estilos.icone, { backgroundColor: `${cor}26` }]}>
        <Ionicons name={iconeDaCategoria(mov.categorias.nome)} size={22} color={cor} />
      </View>

      <View style={estilos.textos}>
        <Text numberOfLines={1} style={[estilos.descricao, { color: cores.texto }]}>
          {mov.descricao?.trim() || mov.categorias.nome}
        </Text>
        <Text style={{ color: cores.suave, fontSize: 12 }}>
          {mov.categorias.nome} · {dataBR(mov.data)}
        </Text>
      </View>

      <View style={estilos.direita}>
        <Text style={[estilos.valor, { color: cor }]}>
          {SINAL[mov.categorias.tipo]}
          {moeda(mov.valor)}
        </Text>
        {mov.pendente ? (
          <View style={estilos.pendente}>
            <Ionicons name="cloud-offline-outline" size={12} color={cores.suave} />
            <Text style={{ color: cores.suave, fontSize: 11 }}>Aguardando envio</Text>
          </View>
        ) : null}
      </View>
      {acoes ? <View style={[estilos.divisor, { backgroundColor: cores.borda }]} /> : null}
      {acoes}
    </Pressable>
  );
}

/** Item da lista com botões de editar/excluir (itens pendentes não podem ser alterados). */
export function TransacaoDeslizavel({
  mov,
  onEditar,
  onExcluir,
}: {
  mov: Movimentacao;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  if (mov.pendente) return <TransacaoItem mov={mov} />;

  return (
    <TransacaoItem
      mov={mov}
      onPress={onEditar}
      acoes={<BotoesAcao onEditar={onEditar} onExcluir={onExcluir} />}
    />
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  descricao: { fontSize: 15, fontWeight: '600' },
  direita: { alignItems: 'flex-end', gap: 2 },
  pendente: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  valor: { fontSize: 15, fontWeight: '700' },
  divisor: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4 },
});
