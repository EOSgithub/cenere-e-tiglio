// Cenere e Tiglio: la pattuglia schierata (filtro e didascalia) e la scheda del personaggio.
(() => {
  const wrap = document.querySelector('.rank-wrap');
  const figs = [...document.querySelectorAll('.fig')];
  const caption = document.querySelector('.muster__caption');
  const restCaption = caption ? caption.innerHTML : '';

  // Didascalia condivisa: segue il personaggio indicato o selezionato con la tastiera
  const showCaption = fig => { if (caption) caption.innerHTML = fig.querySelector('.fig__cap').innerHTML; };
  const resetCaption = () => { if (caption) caption.innerHTML = restCaption; };
  figs.forEach(f => {
    f.addEventListener('mouseenter', () => showCaption(f));
    f.addEventListener('focus', () => showCaption(f));
    f.addEventListener('mouseleave', resetCaption);
    f.addEventListener('blur', resetCaption);
  });

  // Filtro: le due definizioni nella frase accendono un gruppo; toccata di nuovo, la stessa le spegne
  const toggles = document.querySelectorAll('.inline-filter');
  toggles.forEach(t => t.addEventListener('click', () => {
    const on = t.getAttribute('aria-pressed') !== 'true';
    toggles.forEach(o => o.setAttribute('aria-pressed', String(o === t && on)));
    if (wrap) wrap.dataset.filtro = on ? t.dataset.filtro : 'tutti';
  }));

  // Scheda del personaggio
  const dlg = document.getElementById('scheda');
  if (!dlg || !window.SCHEDE || typeof dlg.showModal !== 'function') return;
  const body = dlg.querySelector('.sk__body');
  const art = dlg.querySelector('.sk__art img');
  const frame = dlg.querySelector('.sk__frame');
  let current = null;
  let opener = null;

  // Con il filtro acceso, precedente e successivo restano dentro il gruppo
  const order = () => {
    const f = wrap ? wrap.dataset.filtro : 'tutti';
    return figs.filter(x => f === 'tutti' || x.dataset.gruppo === f).map(x => x.dataset.scheda);
  };

  function show(slug) {
    const fig = figs.find(x => x.dataset.scheda === slug);
    if (!fig || !window.SCHEDE[slug]) return;
    current = slug;
    body.innerHTML = window.SCHEDE[slug];
    art.src = `assets/img/pregenerati/${slug}.webp`;
    art.alt = fig.querySelector('.fig__name').textContent;
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
    const list = order();
    const i = list.indexOf(current);
    show(list[(i + dir + list.length) % list.length]);
  }

  figs.forEach(f => f.addEventListener('click', () => open(f.dataset.scheda, f)));

  dlg.addEventListener('click', e => {
    const a = e.target.closest('[data-sk]');
    if (a) {
      if (a.dataset.sk === 'close') dlg.close();
      else step(a.dataset.sk === 'next' ? 1 : -1);
    } else if (e.target === dlg) {
      dlg.close();  // clic fuori dalla scheda
    }
  });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('has-modal');
    history.replaceState(null, '', location.pathname + location.search);
    const back = opener || figs.find(x => x.dataset.scheda === current);
    if (back) back.focus({ preventScroll: true });
  });

  // Link diretto a una scheda: #scheda-bran
  const m = location.hash.match(/^#scheda-(\w+)$/);
  if (m && window.SCHEDE[m[1]]) open(m[1]);
})();
