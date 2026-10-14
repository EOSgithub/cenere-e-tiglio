// Cenere e Tiglio · comparse allo scorrimento, barra di navigazione, filtro dei personaggi.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Comparse
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
  }

  // La barra compare quando l'apertura esce dallo schermo
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  if (nav && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => nav.classList.toggle('is-on', !e.isIntersecting), { threshold: 0.08 }).observe(hero);
  } else if (nav) {
    nav.classList.add('is-on');
  }

  // Filtro dei personaggi
  const buttons = document.querySelectorAll('.filter__btn');
  const cards = document.querySelectorAll('.pc');
  const status = document.getElementById('filtro-stato');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const f = btn.dataset.filtro;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    let n = 0;
    cards.forEach(card => {
      const show = f === 'tutti' || card.dataset.gruppo === f;
      card.hidden = !show;
      card.classList.remove('is-entering');
      if (show) {
        n++;
        if (!reduce) { void card.offsetWidth; card.classList.add('is-entering'); }
      }
    });
    if (status) status.textContent = `${n} personaggi`;
  }));
})();
