import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { dataBR, isoParaData, paraISO } from '@/lib/format';
import { useTema } from '@/lib/theme';

import { Botao } from './ui';

/** Campo de data com o seletor nativo do sistema. `value` e `onChange` usam AAAA-MM-DD. */
export function CampoData({
  rotulo,
  value,
  onChange,
}: {
  rotulo: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const { cores, escuro } = useTema();
  const [aberto, setAberto] = useState(false);
  const [temporaria, setTemporaria] = useState(() => isoParaData(value));

  function abrir() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: isoParaData(value),
        mode: 'date',
        onChange: (evento, data) => {
          if (evento.type === 'set' && data) onChange(paraISO(data));
        },
      });
      return;
    }
    setTemporaria(isoParaData(value));
    setAberto(true);
  }

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: cores.suave, fontSize: 13, fontWeight: '600' }}>{rotulo}</Text>
      <Pressable
        onPress={abrir}
        style={[estilos.campo, { backgroundColor: cores.campo, borderColor: cores.borda }]}
      >
        <Ionicons name="calendar-outline" size={18} color={cores.primaria} />
        <Text style={{ color: cores.texto, fontSize: 16 }}>{dataBR(value)}</Text>
      </Pressable>

      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={estilos.fundo}>
          <View style={[estilos.caixa, { backgroundColor: cores.card }]}>
            <DateTimePicker
              value={temporaria}
              mode="date"
              display="inline"
              locale="pt-BR"
              themeVariant={escuro ? 'dark' : 'light'}
              accentColor={cores.primaria}
              onChange={(_evento, data) => {
                if (data) setTemporaria(data);
              }}
            />
            <Botao
              texto="Confirmar"
              onPress={() => {
                onChange(paraISO(temporaria));
                setAberto(false);
              }}
            />
            <Botao texto="Cancelar" variante="contorno" onPress={() => setAberto(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  caixa: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
});
