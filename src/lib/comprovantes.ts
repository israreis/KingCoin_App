import * as ImagePicker from 'expo-image-picker';

import { falhar } from './erros';
import { supabase } from './supabase';

export type OrigemImagem = 'camera' | 'galeria';

/** Abre a câmera ou a galeria e devolve o endereço local da imagem (ou null se cancelou). */
export async function escolherComprovante(origem: OrigemImagem): Promise<string | null> {
  const permissao =
    origem === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissao.granted) {
    throw new Error(
      origem === 'camera'
        ? 'Permita o acesso à câmera para tirar a foto.'
        : 'Permita o acesso às fotos para escolher uma imagem.',
    );
  }

  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
  const resultado =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);

  if (resultado.canceled || resultado.assets.length === 0) return null;
  return resultado.assets[0].uri;
}

/** Envia a imagem para o bucket privado e devolve o caminho salvo no banco. */
export async function enviarComprovante(uri: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sessão expirada. Entre novamente.');

  const resposta = await fetch(uri);
  const arquivo = await resposta.arrayBuffer();

  const caminho = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('comprovantes')
    .upload(caminho, arquivo, { contentType: 'image/jpeg' });
  falhar(error);

  return caminho;
}

/** Endereço temporário (1 hora) para exibir um comprovante do bucket privado. */
export async function urlComprovante(caminho: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('comprovantes').createSignedUrl(caminho, 3600);
  return error ? null : data.signedUrl;
}

export async function removerComprovante(caminho: string): Promise<void> {
  await supabase.storage.from('comprovantes').remove([caminho]);
}
