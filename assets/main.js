// Cenere e Tiglio · comparse, barra di navigazione, filtro, pattuglia schierata e scheda del personaggio.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Le illustrazioni escono dal buio la prima volta che entrano nello schermo; il testo resta fermo
  const reveals = document.querySelectorAll('.lantern');
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

  // Stessa condizione del CSS: la schiera c'è solo con il mouse
  const desk = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
  const setVerbi = () => document.querySelectorAll('[data-verbo]').forEach(s => {
    const v = desk.matches ? 'cliccate' : 'toccate';
    s.textContent = s.textContent[0] === s.textContent[0].toUpperCase() ? v[0].toUpperCase() + v.slice(1) : v;
  });
  setVerbi();
  desk.addEventListener('change', setVerbi);

  // Filtro: le due definizioni nella frase accendono un gruppo; toccata di nuovo, la stessa lo spegne.
  // Al telefono nasconde le carte, al computer spegne le figure escluse.
  const wrap = document.querySelector('.rank-wrap');
  const buttons = document.querySelectorAll('.inline-filter');
  const cards = document.querySelectorAll('.pc');
  const status = document.getElementById('filtro-stato');
  let filtro = 'tutti';
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    filtro = on ? btn.dataset.filtro : 'tutti';
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn && on)));
    if (wrap) wrap.dataset.filtro = filtro;
    let n = 0;
    cards.forEach(card => {
      const show = filtro === 'tutti' || card.dataset.gruppo === filtro;
      card.hidden = !show;
      card.classList.remove('is-entering');
      if (show) {
        n++;
        if (!reduce) { void card.offsetWidth; card.classList.add('is-entering'); }
      }
    });
    if (status) status.textContent = `${n} personaggi`;
    restCaption = restFor(filtro, n);
    if (!lit) resetCaption();
  }));

  // La pattuglia schierata (solo al computer)
  const figs = [...document.querySelectorAll('.fig')];
  const caption = document.querySelector('.muster__caption');
  const fullCaption = caption ? caption.innerHTML : '';
  const NUMERI = ['', 'Una', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Otto', 'Nove', 'Dieci', 'Undici', 'Dodici', 'Tredici'];
  const GRUPPI = { immediati: 'immediate da giocare', meccaniche: 'con più meccaniche da tenere a mente' };
  // A riposo la didascalia dice quante reclute sono accese
  const restFor = (f, n) => f === 'tutti' ? fullCaption
    : `<span class="fig__name">${NUMERI[n]} ${n === 1 ? 'recluta' : 'reclute'}</span> <span class="fig__class">${GRUPPI[f]}</span>`;
  let restCaption = fullCaption;
  const showCaption = fig => { if (caption) caption.innerHTML = fig.querySelector('.fig__cap').innerHTML; };
  const resetCaption = () => { if (caption) caption.innerHTML = restCaption; };
  figs.forEach(f => {
    f.addEventListener('focus', () => showCaption(f));
    f.addEventListener('blur', resetCaption);
  });

  // Le figure si sovrappongono: il mouse deve prendere solo i pixel visibili.
  // Per ogni ritratto si tiene una maschera ridotta del canale alfa, letta una volta sola.
  const masks = new Map();
  const SCALE = 4;
  function buildMask(fig) {
    const img = fig.querySelector('img');
    const read = () => {
      const w = Math.ceil(img.naturalWidth / SCALE), h = Math.ceil(img.naturalHeight / SCALE);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const alpha = new Uint8Array(w * h);
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
      masks.set(fig, { w, h, alpha });
    };
    if (img.complete && img.naturalWidth) read();
    else img.addEventListener('load', read, { once: true });
  }
  if (wrap && desk.matches) {
    figs.forEach(f => { f.querySelector('img').loading = 'eager'; buildMask(f); });
  }

  // Ordine di pittura, dal più vicino: la fila davanti, poi quella dietro; dentro una fila l'ultima sta sopra
  const front = [...document.querySelectorAll('.rank--front .fig')].reverse();
  const rear = [...document.querySelectorAll('.rank--rear .fig')].reverse();
  let lit = null;

  function figAt(x, y) {
    for (const f of [...front, ...rear]) {
      const m = masks.get(f);
      if (!m) continue;
      const r = f.querySelector('img').getBoundingClientRect();
      if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) continue;
      const mx = Math.floor((x - r.left) / r.width * m.w);
      const my = Math.floor((y - r.top) / r.height * m.h);
      if (m.alpha[my * m.w + mx] > 60) return f;
    }
    return null;
  }

  function light(f) {
    if (f === lit) return;
    if (lit) lit.classList.remove('lit');
    lit = f;
    if (f) { f.classList.add('lit'); showCaption(f); } else resetCaption();
    wrap.classList.toggle('is-lit', !!f);
  }

  if (wrap) {
    // Se la finestra si allarga dopo il caricamento, le maschere si leggono allora
    desk.addEventListener('change', () => {
      if (desk.matches) figs.forEach(f => { if (!masks.has(f)) { f.querySelector('img').loading = 'eager'; buildMask(f); } });
    });
    wrap.addEventListener('pointermove', e => {
      if (!desk.matches || e.pointerType === 'touch') return;
      light(figAt(e.clientX, e.clientY));
    });
    wrap.addEventListener('pointerleave', () => light(null));
    wrap.addEventListener('click', e => {
      if (!desk.matches || e.target.closest('.fig')) return;  // con la tastiera decidono i pulsanti
      const f = figAt(e.clientX, e.clientY);
      if (f) f.click();
    });
  }

  // Scheda del personaggio
  const dlg = document.getElementById('scheda');
  if (!dlg || !window.SCHEDE || typeof dlg.showModal !== 'function') return;
  const body = dlg.querySelector('.sk__body');
  const art = dlg.querySelector('.sk__art img');
  const frame = dlg.querySelector('.sk__frame');
  const openers = [...document.querySelectorAll('.pc__open, .fig')];
  let current = null;
  let opener = null;

  // Ordine del primer (quello delle carte); con il filtro acceso, precedente e successivo restano nel gruppo
  const order = () => [...cards]
    .filter(c => filtro === 'tutti' || c.dataset.gruppo === filtro)
    .map(c => c.querySelector('.pc__open').dataset.scheda);
  const nameOf = slug => {
    const b = document.querySelector(`.pc__open[data-scheda="${slug}"]`);
    return b ? b.textContent.trim() : '';
  };

  function show(slug) {
    if (!window.SCHEDE[slug]) return;
    current = slug;
    body.innerHTML = window.SCHEDE[slug];
    art.src = `assets/img/pregenerati/${slug}.webp`;
    art.alt = nameOf(slug);
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

  openers.forEach(b => b.addEventListener('click', () => open(b.dataset.scheda, b)));

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
    // Torna al pulsante che l'ha aperta se è visibile, altrimenti a quello del personaggio nella vista attuale
    const visible = el => el && el.getClientRects().length > 0;
    const back = visible(opener) ? opener : openers.find(b => b.dataset.scheda === current && visible(b));
    if (back) back.focus({ preventScroll: true });
  });

  // Link diretto a una scheda: #scheda-bran
  const m = location.hash.match(/^#scheda-(\w+)$/);
  if (m && window.SCHEDE[m[1]]) open(m[1]);
})();
