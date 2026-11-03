const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => entrada.target.classList.toggle('visible', entrada.isIntersecting));
  },
  { threshold: 0.2 },
);
document.querySelectorAll('.scrollFade').forEach((elemento) => observador.observe(elemento));

function configurarMenuMobile() {
  const botao = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  const iconeAbrir = document.getElementById('icon-open');
  const iconeFechar = document.getElementById('icon-close');
  if (!botao || !menu) return;

  botao.addEventListener('click', () => {
    const estavaEscondido = menu.classList.contains('menu-hidden');
    menu.classList.toggle('menu-hidden', !estavaEscondido);
    iconeAbrir?.classList.toggle('hidden', estavaEscondido);
    iconeFechar?.classList.toggle('hidden', !estavaEscondido);
  });
}

configurarMenuMobile();
