import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '@/lib/theme';
import { vidro } from './vidro';

/** Botões de editar e excluir lado a lado, dentro do cartão do item. */
export function BotoesAcao({ onEditar, onExcluir }: { onEditar: () => void; onExcluir: () => void }) {
  const { cores } = useTema();

  const botao = (icone: 'create-outline' | 'trash-outline', rotulo: string, cor: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={4}
      onPress={onPress}
      style={(estado) => [
        estilos.acao,
        { backgroundColor: `${cor}14`, opacity: estado.pressed ? 0.7 : 1 },
        vidro(estado),
      ]}
    >
      <Ionicons name={icone} size={17} color={cor} />
    </Pressable>
  );

  return (
    <View style={estilos.linha}>
      {botao('create-outline', 'Editar', cores.primaria, onEditar)}
      {botao('trash-outline', 'Excluir', cores.perigo, onExcluir)}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  acao: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
