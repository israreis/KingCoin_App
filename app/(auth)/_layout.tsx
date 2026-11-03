import { Stack } from 'expo-router';

import { useTema } from '@/lib/theme';

export default function AuthLayout() {
  const { cores } = useTema();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: cores.fundo },
      }}
    />
  );
}
