import { Alert as AlertNativo, Platform } from 'react-native';
import type { AlertButton } from 'react-native';

type Navegador = { alert: (texto: string) => void; confirm: (texto: string) => boolean };

/**
 * No navegador o Alert do React Native não aparece. Lá usamos alert/confirm:
 * um botão = aviso; uma ação + cancelar = confirmação; várias ações = uma por vez.
 */
function alertaWeb(titulo: string, mensagem?: string, botoes?: AlertButton[]) {
  const navegador = globalThis as unknown as Navegador;
  const texto = [titulo, mensagem].filter(Boolean).join('\n\n');

  if (!botoes || botoes.length <= 1) {
    navegador.alert(texto);
    botoes?.[0]?.onPress?.();
    return;
  }

  const cancelar = botoes.find((b) => b.style === 'cancel');
  const acoes = botoes.filter((b) => b !== cancelar);
  for (const acao of acoes) {
    const pergunta = acoes.length === 1 ? texto : `${texto}\n\n${acao.text}?`;
    if (navegador.confirm(pergunta)) {
      acao.onPress?.();
      return;
    }
  }
  cancelar?.onPress?.();
}

/** Mesmo uso do Alert do React Native, funcionando também na web. */
export const Alert = {
  alert(titulo: string, mensagem?: string, botoes?: AlertButton[]) {
    if (Platform.OS === 'web') alertaWeb(titulo, mensagem, botoes);
    else AlertNativo.alert(titulo, mensagem, botoes);
  },
};
