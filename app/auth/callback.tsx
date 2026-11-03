import { Redirect } from 'expo-router';

/** Destino do retorno do login social; a sessão já foi salva, então só volta ao início. */
export default function RetornoLogin() {
  return <Redirect href="/" />;
}
