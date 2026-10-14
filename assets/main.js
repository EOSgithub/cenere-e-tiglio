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

  // Scheda del personaggio
  const dlg = document.getElementById('scheda');
  if (!dlg || !window.SCHEDE || typeof dlg.showModal !== 'function') return;
  const body = dlg.querySelector('.sk__body');
  const art = dlg.querySelector('.sk__art img');
  const frame = dlg.querySelector('.sk__frame');
  let current = null;
  let opener = null;

  const visibleSlugs = () => [...document.querySelectorAll('.pc:not([hidden]) .pc__open')].map(b => b.dataset.scheda);

  function show(slug) {
    const btn = document.querySelector(`.pc__open[data-scheda="${slug}"]`);
    if (!btn || !window.SCHEDE[slug]) return;
    current = slug;
    body.innerHTML = window.SCHEDE[slug];
    const img = btn.closest('.pc').querySelector('img');
    art.src = img.currentSrc || img.src;
    art.alt = img.alt;
    art.width = img.width; art.height = img.height;
    body.scrollTop = 0; frame.scrollTop = 0;
    history.replaceState(null, '', `#scheda-${slug}`);
  }

  function open(slug, from) {
    opener = from || null;
    show(slug);
    if (!dlg.open) {
      document.documentElement.classList.add('has-modal');
      dlg.showModal();
    }
    dlg.querySelector('[data-sk="close"]').focus({ preventScroll: true });
  }

  function step(dir) {
    const list = visibleSlugs();
    if (!list.length) return;
    const i = list.indexOf(current);
    show(list[(i + dir + list.length) % list.length]);
  }

  document.querySelectorAll('.pc__open').forEach(b =>
    b.addEventListener('click', () => open(b.dataset.scheda, b)));

  dlg.addEventListener('click', e => {
    const a = e.target.closest('[data-sk]');
    if (a) {
      if (a.dataset.sk === 'close') dlg.close();
      else step(a.dataset.sk === 'next' ? 1 : -1);
    } else if (e.target === dlg) {
      dlg.close();  // clic sullo sfondo
    }
  });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('has-modal');
    history.replaceState(null, '', location.pathname + location.search);
    const back = opener || document.querySelector(`.pc__open[data-scheda="${current}"]`);
    if (back) back.focus({ preventScroll: true });
  });

  // Link diretto a una scheda: #scheda-bran
  const m = location.hash.match(/^#scheda-(\w+)$/);
  if (m && window.SCHEDE[m[1]]) open(m[1]);
})();
