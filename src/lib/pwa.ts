import { Platform } from 'react-native';

type Elemento = { setAttribute: (nome: string, valor: string) => void };
type Documento = {
  head: { appendChild: (el: Elemento) => void };
  querySelector: (seletor: string) => Elemento | null;
  createElement: (tag: string) => Elemento;
};
type Navegador = { serviceWorker?: { register: (url: string, opcoes?: { scope: string }) => Promise<unknown> } };

/** Garante uma tag no <head> (cria se não existir) com os atributos dados. */
function garantir(doc: Documento, seletor: string, tag: string, atributos: Record<string, string>) {
  let el = doc.querySelector(seletor);
  if (!el) {
    el = doc.createElement(tag);
    doc.head.appendChild(el);
  }
  for (const [nome, valor] of Object.entries(atributos)) el.setAttribute(nome, valor);
}

/**
 * Transforma a versão web em PWA: liga o manifesto (botão "Instalar app"), as tags que o
 * iPhone usa em "Adicionar à Tela de Início" e registra o service worker (só no build de produção).
 */
export function configurarPwa() {
  if (Platform.OS !== 'web') return;
  const g = globalThis as unknown as { document?: Documento; navigator?: Navegador; addEventListener?: (e: string, f: () => void) => void };
  const doc = g.document;
  if (!doc) return;

  garantir(doc, 'link[rel="manifest"]', 'link', { rel: 'manifest', href: '/manifest.webmanifest' });
  garantir(doc, 'link[rel="apple-touch-icon"]', 'link', { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png' });
  garantir(doc, 'meta[name="apple-mobile-web-app-capable"]', 'meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  garantir(doc, 'meta[name="mobile-web-app-capable"]', 'meta', { name: 'mobile-web-app-capable', content: 'yes' });
  garantir(doc, 'meta[name="apple-mobile-web-app-status-bar-style"]', 'meta', {
    name: 'apple-mobile-web-app-status-bar-style',
    content: 'black',
  });
  garantir(doc, 'meta[name="apple-mobile-web-app-title"]', 'meta', { name: 'apple-mobile-web-app-title', content: 'KingCoin' });

  // Em desenvolvimento o cache atrapalharia o recarregamento do Metro
  if (__DEV__) return;
  const sw = g.navigator?.serviceWorker;
  if (sw) sw.register('/sw.js', { scope: '/' }).catch(() => {});
}

/**
 * Pinta o fundo da página (html e body) e a cor do tema com a cor do app. O Safari do iPhone
 * colore as barras de cima e de baixo com o fundo da página: sem isso elas ficam brancas.
 */
export function aplicarCorDaPagina(cor: string, escuro: boolean) {
  if (Platform.OS !== 'web') return;
  type ComEstilo = { style: Record<string, string> };
  const g = globalThis as unknown as { document?: Documento & { documentElement: ComEstilo; body: ComEstilo | null } };
  const doc = g.document;
  if (!doc) return;
  doc.documentElement.style.backgroundColor = cor;
  doc.documentElement.style.colorScheme = escuro ? 'dark' : 'light';
  if (doc.body) doc.body.style.backgroundColor = cor;
  garantir(doc, 'meta[name="theme-color"]', 'meta', { name: 'theme-color', content: cor });
}
