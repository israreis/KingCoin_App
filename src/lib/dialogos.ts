import { Alert } from 'react-native';

export function confirmarExclusao(titulo: string, aoConfirmar: () => void | Promise<void>) {
  Alert.alert(titulo, 'Essa ação não pode ser desfeita.', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Excluir',
      style: 'destructive',
      onPress: () => {
        void aoConfirmar();
      },
    },
  ]);
}

export function mostrarErro(erro: unknown, padrao = 'Algo deu errado. Tente novamente.') {
  Alert.alert('Erro', erro instanceof Error ? erro.message : padrao);
}
