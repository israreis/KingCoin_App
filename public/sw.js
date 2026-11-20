/* Service worker do KingCoin (versão web / PWA).
 * - Páginas: rede primeiro; sem internet, abre o app guardado (index.html) ou a landing.
 * - Arquivos do build (/_expo/static/...) têm hash no nome: cache primeiro.
 * - Demais arquivos do site (ícones, landing): mostra o guardado e atualiza por trás.
 * - Supabase e outros domínios nunca passam pelo cache (dados sempre da rede).
 */
const VERSAO = 'kingcoin-v1';
const ESSENCIAIS = ['/', '/index.html', '/landing/index.html', '/manifest.webmanifest', '/pwa/icon-192.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)).catch(() => {}).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

async function guardar(pedido, resposta) {
  if (resposta && resposta.ok && resposta.type === 'basic') {
    const cache = await caches.open(VERSAO);
    cache.put(pedido, resposta.clone());
  }
  return resposta;
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: rede primeiro, cópia guardada se estiver offline
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((r) => guardar(pedido, r))
        .catch(async () => {
          const cache = await caches.open(VERSAO);
          const alvo = url.pathname.startsWith('/landing') ? '/landing/index.html' : '/index.html';
          return (await cache.match(pedido)) || (await cache.match(alvo)) || (await cache.match('/')) || Response.error();
        }),
    );
    return;
  }

  // Build com hash: nunca muda, cache primeiro
  if (url.pathname.startsWith('/_expo/static/')) {
    evento.respondWith(caches.match(pedido).then((r) => r || fetch(pedido).then((n) => guardar(pedido, n))));
    return;
  }

  // Resto: devolve o guardado na hora e atualiza em segundo plano
  evento.respondWith(
    caches.match(pedido).then((guardado) => {
      const rede = fetch(pedido)
        .then((n) => guardar(pedido, n))
        .catch(() => guardado);
      return guardado || rede;
    }),
  );
});
