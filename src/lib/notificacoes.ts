import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Mostra as notificações também com o app aberto (não existe no navegador).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const CHAVE = 'kingcoin:notificacoes';
const ID_DIARIO = 'kingcoin-lembrete-diario';
const ID_SEMANAL = 'kingcoin-resumo-semanal';
const CANAL = 'lembretes';

export type PreferenciasNotificacao = {
  diario: boolean;
  hora: number;
  semanal: boolean;
};

export const PREFERENCIAS_PADRAO: PreferenciasNotificacao = { diario: false, hora: 20, semanal: false };

export async function lerPreferencias(): Promise<PreferenciasNotificacao> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    return bruto ? { ...PREFERENCIAS_PADRAO, ...JSON.parse(bruto) } : PREFERENCIAS_PADRAO;
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

async function pedirPermissao(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/** Agenda ou cancela os lembretes conforme as preferências e as salva. */
export async function aplicarPreferencias(prefs: PreferenciasNotificacao): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Lembretes só funcionam no app do celular.');
  if ((prefs.diario || prefs.semanal) && !(await pedirPermissao())) {
    throw new Error('Permita as notificações do KingCoin nas configurações do aparelho.');
  }

  await Notifications.cancelScheduledNotificationAsync(ID_DIARIO).catch(() => undefined);
  await Notifications.cancelScheduledNotificationAsync(ID_SEMANAL).catch(() => undefined);

  if (prefs.diario) {
    await Notifications.scheduleNotificationAsync({
      identifier: ID_DIARIO,
      content: {
        title: 'KingCoin',
        body: 'Já lançou os gastos de hoje? Leva menos de um minuto.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.hora,
        minute: 0,
        channelId: CANAL,
      },
    });
  }

  if (prefs.semanal) {
    await Notifications.scheduleNotificationAsync({
      identifier: ID_SEMANAL,
      content: {
        title: 'Resumo da semana',
        body: 'Veja no dashboard como foram suas receitas e despesas nesta semana.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // domingo
        hour: 18,
        minute: 0,
        channelId: CANAL,
      },
    });
  }

  await AsyncStorage.setItem(CHAVE, JSON.stringify(prefs));
}
