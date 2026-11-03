import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/theme';

type Props = {
  children: ReactNode;
  onEditar: () => void;
  onExcluir: () => void;
};

/** Item de lista com os botões de editar e excluir sempre visíveis ao lado. */
export function ItemDeslizavel({ children, onEditar, onExcluir }: Props) {
  const { cores } = useTema();

  const botao = (icone: 'create-outline' | 'trash-outline', rotulo: string, cor: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.acao,
        { borderColor: cores.borda, backgroundColor: cores.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icone} size={18} color={cor} />
    </Pressable>
  );

  return (
    <View style={estilos.linha}>
      <View style={estilos.conteudo}>{children}</View>
      <View style={estilos.acoes}>
        {botao('create-outline', 'Editar', cores.primaria, onEditar)}
        {botao('trash-outline', 'Excluir', cores.perigo, onExcluir)}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conteudo: { flex: 1 },
  acoes: { gap: 8 },
  acao: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
