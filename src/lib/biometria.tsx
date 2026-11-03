import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Image, Platform, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui';

import { useTema } from './theme';

const CHAVE = 'kingcoin:biometria';
/** Tempo em segundo plano depois do qual o app volta a pedir biometria. */
const TEMPO_BLOQUEIO_MS = 30_000;

type BiometriaContexto = {
  ativada: boolean;
  bloqueado: boolean;
  desbloquear: () => Promise<void>;
  definirAtivada: (valor: boolean) => Promise<void>;
};

const Contexto = createContext<BiometriaContexto>({
  ativada: false,
  bloqueado: false,
  desbloquear: async () => {},
  definirAtivada: async () => {},
});

export function BiometriaProvider({ children }: { children: ReactNode }) {
  const [ativada, setAtivada] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const ativadaRef = useRef(false);
  const saiuEm = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return; // sem biometria no navegador
    AsyncStorage.getItem(CHAVE)
      .then((valor) => {
        if (valor === '1') {
          ativadaRef.current = true;
          setAtivada(true);
          setBloqueado(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') {
        saiuEm.current = Date.now();
      } else if (estado === 'active') {
        const longe = saiuEm.current !== null && Date.now() - saiuEm.current > TEMPO_BLOQUEIO_MS;
        if (ativadaRef.current && longe) setBloqueado(true);
        saiuEm.current = null;
      }
    });
    return () => assinatura.remove();
  }, []);

  const desbloquear = useCallback(async () => {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear o KingCoin',
      cancelLabel: 'Cancelar',
    });
    if (resultado.success) setBloqueado(false);
  }, []);

  const definirAtivada = useCallback(async (valor: boolean) => {
    if (valor) {
      const [temHardware, temCadastro] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!temHardware || !temCadastro) {
        throw new Error('Este aparelho não tem biometria (Face ID ou digital) cadastrada.');
      }
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme para ativar a biometria',
      });
      if (!resultado.success) return;
    }
    await AsyncStorage.setItem(CHAVE, valor ? '1' : '0');
    ativadaRef.current = valor;
    setAtivada(valor);
  }, []);

  const valor = useMemo(
    () => ({ ativada, bloqueado, desbloquear, definirAtivada }),
    [ativada, bloqueado, desbloquear, definirAtivada],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBiometria(): BiometriaContexto {
  return useContext(Contexto);
}

/** Cobre o app até a biometria ser confirmada. */
export function TelaBloqueio() {
  const { cores } = useTema();
  const { desbloquear } = useBiometria();

  useEffect(() => {
    desbloquear().catch(() => {});
  }, [desbloquear]);

  return (
    <View style={[StyleSheet.absoluteFill, estilos.tela, { backgroundColor: cores.fundo }]}>
      <Image source={require('../../assets/icon.png')} style={estilos.logo} resizeMode="contain" />
      <Text style={{ color: cores.texto, fontSize: 20, fontWeight: '700' }}>KingCoin bloqueado</Text>
      <Text style={{ color: cores.suave, textAlign: 'center' }}>
        Use o Face ID ou a digital para continuar.
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <Botao texto="Desbloquear" icone="finger-print-outline" onPress={() => desbloquear().catch(() => {})} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, zIndex: 100 },
  logo: { width: 96, height: 96, marginBottom: 8 },
});
