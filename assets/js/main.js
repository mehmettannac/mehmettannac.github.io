/* Mehmet Annac — site etkileşimleri (saf JavaScript, kütüphane yok) */
(() => {
  const root = document.documentElement;
  const body = document.body;

  /* ---------- Dil (TR / EN) ---------- */
  const meta = document.querySelector('meta[name="description"]');
  const t = {
    tr: { title: body.dataset.titleTr, desc: body.dataset.descTr },
    en: { title: body.dataset.titleEn, desc: body.dataset.descEn },
  };
  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    if (t[lang].title) document.title = t[lang].title;
    if (meta && t[lang].desc) meta.content = t[lang].desc;
    document.querySelectorAll('[data-ph-tr]').forEach(el => {
      el.placeholder = el.dataset['ph' + (lang === 'tr' ? 'Tr' : 'En')];
    });
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  let saved = 'tr';
  try { saved = localStorage.getItem('lang') || 'tr'; } catch (e) {}
  setLang(saved);
  document.querySelectorAll('.lang-toggle').forEach(b =>
    b.addEventListener('click', () => setLang(root.dataset.lang === 'tr' ? 'en' : 'tr')));

  /* ---------- Yükleme ekranı ---------- */
  const done = () => body.classList.add('loaded');
  if (sessionStorage.getItem('seen')) { done(); }
  else { window.addEventListener('load', () => setTimeout(done, 900)); setTimeout(done, 2500); }
  try { sessionStorage.setItem('seen', '1'); } catch (e) {}

  /* ---------- Menü ---------- */
  const menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const open = body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => body.classList.remove('menu-open')));
  }

  /* ---------- Scroll: nav, ilerleme çubuğu, parallax ---------- */
  const nav = document.querySelector('.nav');
  const bar = document.querySelector('.progress');
  const para = [...document.querySelectorAll('[data-speed]')];
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    nav && nav.classList.toggle('scrolled', y > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    para.forEach(el => { el.style.transform = `translate3d(0, ${y * parseFloat(el.dataset.speed)}px, 0)`; });
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Görününce canlan ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal, .stagger, .skills').forEach(el => io.observe(el));

  /* ---------- Kartlarda ışık + hafif 3B eğim ---------- */
  const fine = matchMedia('(pointer: fine)').matches;
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      if (fine) card.style.transform = `perspective(900px) rotateX(${(y / r.height - .5) * -6}deg) rotateY(${(x / r.width - .5) * 6}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  /* ---------- Yazı makinesi efekti ---------- */
  const typer = document.querySelector('[data-typing]');
  if (typer) {
    const words = () => JSON.parse(typer.dataset['words' + (root.dataset.lang === 'tr' ? 'Tr' : 'En')]);
    let i = 0, j = 0, del = false;
    (function tick() {
      const list = words(); const w = list[i % list.length];
      typer.textContent = w.slice(0, j);
      if (!del && j++ === w.length) { del = true; return setTimeout(tick, 1400); }
      if (del && j-- === 0) { del = false; i++; }
      setTimeout(tick, del ? 35 : 70);
    })();
  }

  /* ---------- Galeri: büyütme ---------- */
  const lb = document.querySelector('.lightbox');
  if (lb) {
    const img = lb.querySelector('img'), cap = lb.querySelector('p');
    document.querySelectorAll('.g-item').forEach(f => f.addEventListener('click', () => {
      const i = f.querySelector('img');
      img.src = i.src; img.alt = i.alt;
      cap.textContent = f.querySelector('figcaption [lang="' + root.dataset.lang + '"]')?.textContent || '';
      lb.classList.add('open');
    }));
    const close = () => lb.classList.remove('open');
    lb.addEventListener('click', e => { if (e.target !== img) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* ---------- İletişim formu ---------- */
  const form = document.querySelector('form.contact');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const note = form.querySelector('.form-note');
      const tr = root.dataset.lang === 'tr';
      const d = Object.fromEntries(new FormData(form));
      if (!d.name || !d.email || !d.message || !/^\S+@\S+\.\S+$/.test(d.email)) {
        note.className = 'form-note err';
        note.textContent = tr ? 'Lütfen ad, geçerli bir e-posta ve mesaj girin.' : 'Please enter your name, a valid e-mail and a message.';
        return;
      }
      const subject = encodeURIComponent(`[${d.topic || 'Site'}] ${d.name}`);
      const text = encodeURIComponent(`${d.message}\n\n— ${d.name} (${d.email})`);
      location.href = `mailto:${form.dataset.to}?subject=${subject}&body=${text}`;
      note.className = 'form-note ok';
      note.textContent = tr ? 'E-posta uygulamanız açılıyor, gönder demeniz yeterli. Teşekkürler!' : 'Your mail app is opening — just hit send. Thanks!';
      form.reset();
    });
  }

  /* ---------- Yıl ---------- */
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
