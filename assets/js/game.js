/* =========================================================
   BUG RUNNER — Chrome'un dinozor oyunundan esinlenen,
   yazılımcılar için gece temalı bir koşu oyunu.
   Kurye motoruyla bug'ların ve hata bloklarının üzerinden atla.
   ========================================================= */
(() => {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  const tr = () => root.dataset.lang !== 'en';

  /* ---------- Ortak sıralama tablosu ----------
     Herkesin skorunu görmek için Firebase Realtime Database adresini buraya yaz
     (ör. "https://proje-adi-default-rtdb.europe-west1.firebasedatabase.app").
     Boş kalırsa sıralama bu cihazda (localStorage) tutulur. */
  const FIREBASE_DB_URL = "";

  // Dar ekranlarda sahneyi daraltıyoruz ki telefonda her şey daha büyük görünsün
  const W = canvas.parentElement.clientWidth < 700 ? 600 : 960, H = 300, GROUND = 250;
  canvas.width = W; canvas.height = H;

  const C = { cyan: '#4cc9f0', neon: '#ff2e63', orange: '#ff7a1a', text: '#e9eefb', muted: '#8b97b8', grid: 'rgba(76,201,240,.12)' };
  const OBST = [
    { label: 'bug', w: 34, h: 26 },
    { label: '404', w: 44, h: 40 },
    { label: '{ }', w: 30, h: 54 },
    { label: 'NaN', w: 52, h: 32 },
  ];

  let state = 'idle', speed, dist, score, best, obstacles, flyers, nextGap, player, frame, last, shake;
  try { best = +localStorage.getItem('br-best') || 0; } catch (e) { best = 0; }

  function reset() {
    speed = 6; dist = 0; score = 0; obstacles = []; flyers = []; nextGap = 60; frame = 0; shake = 0;
    player = { x: 90, y: GROUND, vy: 0, w: 58, h: 34, onGround: true, duck: false };
  }
  reset();

  /* ---------- Kontroller ---------- */
  function jump() {
    if (state !== 'run') { start(); return; }
    if (player.onGround) { player.vy = -13.2; player.onGround = false; }
  }
  function start() {
    if (state === 'over' && document.activeElement === nameInput) return;
    reset(); state = 'run'; panel.classList.remove('show'); last = performance.now(); requestAnimationFrame(loop);
  }
  const inView = () => { const r = canvas.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  addEventListener('keydown', e => {
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (!inView()) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); player.duck = true; }
  });
  addEventListener('keyup', e => { if (e.code === 'ArrowDown' || e.code === 'KeyS') player.duck = false; });
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });

  /* ---------- Oyun döngüsü ---------- */
  function spawn() {
    if (score > 400 && Math.random() < 0.22) {
      flyers.push({ x: W + 20, y: GROUND - 62 - Math.random() * 14, w: 46, h: 20, t: 0 });
    } else {
      const o = OBST[Math.floor(Math.random() * OBST.length)];
      obstacles.push({ x: W + 20, ...o });
    }
    nextGap = 55 + Math.random() * 70 - Math.min(speed * 2, 25);
  }
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function update(dt) {
    frame++;
    speed = Math.min(6 + dist / 900, 16);
    dist += speed * dt;
    score = Math.floor(dist / 6);
    player.vy += 0.68 * dt;
    player.y += player.vy * dt;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.onGround = true; }
    player.h = player.duck && player.onGround ? 22 : 34;
    nextGap -= dt; if (nextGap <= 0) spawn();
    obstacles.forEach(o => o.x -= speed * dt);
    flyers.forEach(f => { f.x -= (speed + 2) * dt; f.t += dt; });
    obstacles = obstacles.filter(o => o.x > -80); flyers = flyers.filter(f => f.x > -80);
    const pb = { x: player.x + 8, y: player.y - player.h + 4, w: player.w - 16, h: player.h - 6 };
    for (const o of obstacles) if (hit(pb, { x: o.x + 3, y: GROUND - o.h + 3, w: o.w - 6, h: o.h - 3 })) return gameOver();
    for (const f of flyers) if (hit(pb, { x: f.x, y: f.y, w: f.w, h: f.h })) return gameOver();
  }

  /* ---------- Çizim ---------- */
  function drawBg() {
    ctx.fillStyle = '#070a14'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    const off = -(dist % 40);
    for (let x = off; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // şehir silueti (parallax)
    ctx.fillStyle = 'rgba(76,201,240,.08)';
    for (let i = 0; i < 14; i++) {
      const bx = ((i * 97 - dist * 0.25) % (W + 120) + W + 120) % (W + 120) - 60;
      const bh = 40 + (i * 37) % 70;
      ctx.fillRect(bx, GROUND - bh, 50, bh);
    }
    // köprü ışıkları
    ctx.strokeStyle = 'rgba(255,46,99,.35)'; ctx.beginPath();
    const bx = ((600 - dist * 0.12) % (W + 400) + W + 400) % (W + 400) - 200;
    ctx.moveTo(bx, 120); ctx.quadraticCurveTo(bx + 150, 175, bx + 300, 120); ctx.stroke();
    // zemin
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND + 1); ctx.lineTo(W, GROUND + 1); ctx.stroke();
    ctx.fillStyle = 'rgba(76,201,240,.5)';
    for (let x = -(dist % 60); x < W; x += 60) ctx.fillRect(x, GROUND + 10, 18, 2);
  }
  function drawPlayer() {
    const { x } = player, y = player.y, d = player.duck && player.onGround;
    ctx.save(); ctx.translate(x, y);
    // hız çizgileri
    ctx.strokeStyle = 'rgba(255,46,99,.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 - i * 6, -10 - i * 7); ctx.lineTo(-30 - i * 12 - (frame % 6), -10 - i * 7); ctx.stroke(); }
    // tekerlekler
    const wheel = (cx) => { ctx.beginPath(); ctx.arc(cx, -9, 9, 0, Math.PI * 2); ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(cx, -9); ctx.rotate(dist / 9); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.restore(); };
    wheel(10); wheel(48);
    // gövde
    ctx.fillStyle = C.neon; ctx.shadowColor = C.neon; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(52, -14); ctx.lineTo(44, -24); ctx.lineTo(18, -24); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // sürücü
    ctx.fillStyle = C.text;
    if (d) { ctx.fillRect(20, -32, 22, 8); ctx.beginPath(); ctx.arc(44, -30, 7, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillRect(22, -44, 12, 20); ctx.beginPath(); ctx.arc(30, -50, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.orange; ctx.fillRect(14, -42, 9, 12); } // kurye çantası
    // far
    ctx.fillStyle = 'rgba(255,230,150,.9)'; ctx.fillRect(52, -20, 5, 4);
    ctx.restore();
  }
  function drawObstacles() {
    ctx.font = 'bold 13px "JetBrains Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    obstacles.forEach(o => {
      const y = GROUND - o.h;
      if (o.label === 'bug') {
        ctx.fillStyle = C.orange; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, y + o.h / 2 + 3, o.w / 2, o.h / 2 - 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.orange; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(o.x + 8 + i * 9, y + o.h - 2); ctx.lineTo(o.x + 4 + i * 10, GROUND); ctx.stroke(); }
        ctx.fillStyle = '#070a14'; ctx.fillText('bug', o.x + o.w / 2, y + o.h / 2 + 3);
      } else {
        ctx.strokeStyle = C.neon; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(255,46,99,.15)';
        ctx.fillRect(o.x, y, o.w, o.h); ctx.strokeRect(o.x, y, o.w, o.h);
        ctx.fillStyle = C.text; ctx.fillText(o.label, o.x + o.w / 2, y + o.h / 2);
      }
    });
    flyers.forEach(f => {
      const flap = Math.sin(f.t / 3) * 6;
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(f.x, f.y + 10 + flap); ctx.lineTo(f.x + f.w / 2, f.y + 10); ctx.lineTo(f.x + f.w, f.y + 10 + flap); ctx.stroke();
      ctx.fillStyle = C.cyan; ctx.font = 'bold 11px "JetBrains Mono", Consolas, monospace'; ctx.fillText('null', f.x + f.w / 2, f.y);
    });
  }
  function drawHud() {
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = 'bold 18px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = C.muted; ctx.fillText('HI ' + String(best).padStart(5, '0'), W - 140, 18);
    ctx.fillStyle = C.text; ctx.fillText(String(score).padStart(5, '0'), W - 24, 18);
  }
  function drawMessage(big, small) {
    ctx.fillStyle = 'rgba(6,8,15,.55)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.text; ctx.font = 'bold 34px "Space Grotesk", "Segoe UI", sans-serif'; ctx.fillText(big, W / 2, H / 2 - 22);
    ctx.fillStyle = C.cyan; ctx.font = '15px "JetBrains Mono", Consolas, monospace'; ctx.fillText(small, W / 2, H / 2 + 18);
  }
  function render() {
    ctx.save();
    if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .85; }
    drawBg(); drawObstacles(); drawPlayer(); drawHud();
    ctx.restore();
    if (state === 'idle') drawMessage('BUG RUNNER', tr() ? 'Başlamak için SPACE / ↑ ya da dokun' : 'Press SPACE / ↑ or tap to start');
    if (state === 'over') drawMessage('GAME OVER', tr() ? 'Tekrar için SPACE ya da dokun' : 'Press SPACE or tap to retry');
  }
  function loop(now) {
    if (state !== 'run') return;
    const dt = Math.min((now - last) / 16.67, 2.5); last = now;
    update(dt); render();
    if (state === 'run') requestAnimationFrame(loop);
  }

  /* ---------- Oyun bitti + skor kaydı ---------- */
  const panel = document.querySelector('.game-over');
  const nameInput = document.getElementById('player-name');
  const finalScore = document.getElementById('final-score');
  const saveBtn = document.getElementById('save-score');
  const note = document.querySelector('.save-note');
  try { nameInput.value = localStorage.getItem('br-name') || ''; } catch (e) {}

  function gameOver() {
    state = 'over'; shake = 14;
    if (score > best) { best = score; try { localStorage.setItem('br-best', best); } catch (e) {} }
    render();
    finalScore.textContent = score; note.textContent = '';
    saveBtn.disabled = score <= 0; panel.classList.add('show');
  }

  const clean = s => s.replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  saveBtn.addEventListener('click', async () => {
    const name = clean(nameInput.value);
    if (!name) { note.textContent = tr() ? 'Önce bir isim yaz.' : 'Enter a name first.'; nameInput.focus(); return; }
    try { localStorage.setItem('br-name', name); } catch (e) {}
    saveBtn.disabled = true;
    await board.add({ name, score, t: Date.now() });
    note.textContent = tr() ? 'Kaydedildi! Sıralamaya bak →' : 'Saved! Check the leaderboard →';
    renderBoard();
  });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
  document.getElementById('retry').addEventListener('click', start);

  /* ---------- Sıralama tablosu (Firebase ya da yerel) ---------- */
  const board = FIREBASE_DB_URL ? {
    async add(entry) {
      await fetch(`${FIREBASE_DB_URL}/scores.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    },
    async top() {
      const r = await fetch(`${FIREBASE_DB_URL}/scores.json?orderBy=%22score%22&limitToLast=10`);
      const d = await r.json() || {};
      return Object.values(d);
    },
    shared: true,
  } : {
    async add(entry) {
      let all = []; try { all = JSON.parse(localStorage.getItem('br-board') || '[]'); } catch (e) {}
      all.push(entry); all.sort((a, b) => b.score - a.score);
      try { localStorage.setItem('br-board', JSON.stringify(all.slice(0, 10))); } catch (e) {}
    },
    async top() { try { return JSON.parse(localStorage.getItem('br-board') || '[]'); } catch (e) { return []; } },
    shared: false,
  };
  const list = document.getElementById('leaderboard');
  async function renderBoard() {
    let rows = [];
    try { rows = (await board.top()).filter(r => r && typeof r.score === 'number' && r.name); } catch (e) {}
    rows.sort((a, b) => b.score - a.score);
    list.innerHTML = '';
    if (!rows.length) {
      const li = document.createElement('li'); li.className = 'empty';
      li.textContent = tr() ? 'Henüz skor yok. İlk sen ol!' : 'No scores yet. Be the first!';
      list.appendChild(li);
    }
    rows.slice(0, 10).forEach((r, i) => {
      const li = document.createElement('li');
      const n = document.createElement('span'); n.className = 'rank'; n.textContent = String(i + 1).padStart(2, '0');
      const nm = document.createElement('span'); nm.className = 'who'; nm.textContent = clean(String(r.name)); // textContent: XSS'e karşı güvenli
      const sc = document.createElement('b'); sc.textContent = Math.floor(r.score);
      li.append(n, nm, sc); list.appendChild(li);
    });
    document.querySelector('.board-mode').textContent = board.shared
      ? (tr() ? 'ORTAK SIRALAMA · TÜM ZİYARETÇİLER' : 'GLOBAL · ALL VISITORS')
      : (tr() ? 'BU CİHAZDAKİ SKORLAR' : 'SCORES ON THIS DEVICE');
  }
  renderBoard();
  document.querySelectorAll('.lang-toggle').forEach(b => b.addEventListener('click', () => { renderBoard(); if (state !== 'run') render(); }));
  render();
})();
