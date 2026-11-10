/* AXIA Dynamics 첫 화면 — 3D 공작물 위를 공구가 지나가는 가공 시뮬레이션 (의존성 없음)
   좌표 = mm · Z 위 · 프로그램 원점 = 공작물 윗면 왼쪽 앞 모서리. HUD 숫자는 이 원점 기준. */
(() => {
  "use strict";

  const canvas = document.getElementById("hero-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const $ = (id) => document.getElementById(id);
  const hud = { x: $("hud-x"), y: $("hud-y"), z: $("hud-z"), g: $("hud-g"), f: $("hud-f"), n: $("hud-n") };

  const COL = {
    blue: "106,141,255",
    cyan: "63,208,222",
    gold: "217,162,27",
    fg: "201,210,224",
    sub: "154,166,184",
  };
  const rgba = (c, a) => `rgba(${c},${a})`;

  /* ── 공작물 ── */
  const BX = 60, BY = 40, BZ = -30; // 120 × 80 × 30
  const OX = -BX, OY = -BY; // 프로그램 원점
  const POCKET = { x0: -46, x1: 10, y0: -22, y1: 22, r: 6, z: -8 };
  const HOLES = [[28, -20], [46, -20], [28, 20], [46, 20]];
  const HOLE_R = 5, HOLE_Z = -24;
  const TOOL_R = 5, SAFE = 5;
  const HOME = [-100, -75, 48];

  const verts = [];
  for (let i = 0; i < 8; i++) {
    verts.push([i & 1 ? BX : -BX, i & 2 ? BY : -BY, i & 4 ? 0 : BZ]);
  }
  // 바깥에서 볼 때 반시계 순서
  const faces = [
    [4, 5, 7, 6], // 윗면
    [0, 2, 3, 1], // 아랫면
    [0, 1, 5, 4], // 앞(-y)
    [3, 2, 6, 7], // 뒤(+y)
    [1, 3, 7, 5], // 오른쪽(+x)
    [2, 0, 4, 6], // 왼쪽(-x)
  ];
  const edges = new Map();
  faces.forEach((f, fi) => {
    for (let k = 0; k < 4; k++) {
      const a = f[k], b = f[(k + 1) % 4];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!edges.has(key)) edges.set(key, { a, b, faces: [] });
      edges.get(key).faces.push(fi);
    }
  });

  /* ── 가공 프로그램 → 시간표 ── */
  const samples = []; // {x,y,z,g,n,t}
  const holeAt = []; // 구멍마다 다 뚫린 시각
  let block = 10, pos = HOME.slice(), clock = 0;
  samples.push({ x: pos[0], y: pos[1], z: pos[2], g: 0, n: block, t: 0 });

  function move(g, x, y, z, keepBlock) {
    if (!keepBlock) block += 10;
    const dx = x - pos[0], dy = y - pos[1], dz = z - pos[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return;
    const plunge = g === 1 && Math.abs(dx) + Math.abs(dy) < 1e-6;
    const speed = g === 0 ? 240 : plunge ? 40 : 72; // mm/s (보기 속도)
    const steps = Math.max(1, Math.ceil(len / (g === 0 ? 4 : 1.4)));
    for (let s = 1; s <= steps; s++) {
      const u = s / steps;
      clock += len / steps / speed;
      samples.push({ x: pos[0] + dx * u, y: pos[1] + dy * u, z: pos[2] + dz * u, g, n: block, t: clock });
    }
    pos = [x, y, z];
  }
  function arc(cx, cy, r, a0, a1, z) {
    block += 10;
    const n = 10;
    for (let s = 1; s <= n; s++) {
      const a = a0 + ((a1 - a0) * s) / n;
      move(1, cx + r * Math.cos(a), cy + r * Math.sin(a), z, true);
    }
  }

  // 1) 포켓 — 지그재그 두 층 + 마무리 윤곽
  const px0 = POCKET.x0 + TOOL_R, px1 = POCKET.x1 - TOOL_R;
  const py0 = POCKET.y0 + TOOL_R, py1 = POCKET.y1 - TOOL_R;
  const rows = 6;
  const ys = Array.from({ length: rows }, (_, i) => py0 + ((py1 - py0) * i) / (rows - 1));
  move(0, px0, py0, SAFE);
  [-4, POCKET.z].forEach((z, layer) => {
    const order = layer === 0 ? ys : ys.slice().reverse();
    move(1, pos[0], pos[1], z);
    order.forEach((y, i) => {
      if (i > 0) move(1, pos[0], y, z);
      move(1, pos[0] === px0 ? px1 : px0, y, z);
    });
  });
  move(1, px0, py0, POCKET.z);
  move(1, px1, py0, POCKET.z);
  move(1, px1, py1, POCKET.z);
  move(1, px0, py1, POCKET.z);
  move(1, px0, py0, POCKET.z);
  move(0, px0, py0, SAFE);

  // 2) 구멍 4
  HOLES.forEach(([hx, hy]) => {
    move(0, hx, hy, SAFE);
    move(1, hx, hy, HOLE_Z);
    holeAt.push(clock);
    move(0, hx, hy, SAFE);
  });

  // 3) 바깥 윤곽 한 바퀴
  const PZ = -12, o = TOOL_R;
  move(0, -BX - 15, -BY - o, SAFE);
  move(0, -BX - 15, -BY - o, PZ);
  move(1, BX, -BY - o, PZ);
  arc(BX, -BY, o, -Math.PI / 2, 0, PZ);
  move(1, BX + o, BY, PZ);
  arc(BX, BY, o, 0, Math.PI / 2, PZ);
  move(1, -BX, BY + o, PZ);
  arc(-BX, BY, o, Math.PI / 2, Math.PI, PZ);
  move(1, -BX - o, -BY - 12, PZ);
  move(0, -BX - o, -BY - 12, SAFE);
  move(0, HOME[0], HOME[1], HOME[2]);

  const T_END = clock, T_HOLD = 2.2, T_FADE = 1.0, T_CYCLE = T_END + T_HOLD + T_FADE;

  /* ── 카메라 ── */
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, pxmm = 3;
  const D = 460; // 카메라 거리(mm)
  let yaw = -0.62, pitch = 0.6, cyaw = 0, cpitch = 0, tyaw = 0, tpitch = 0;
  let cosY = 1, sinY = 0, cosP = 1, sinP = 0;
  function setCam(t) {
    const yw = yaw + 0.16 * Math.sin(t * 0.13) + cyaw;
    const pt = pitch + 0.04 * Math.sin(t * 0.09 + 1) + cpitch;
    cosY = Math.cos(yw); sinY = Math.sin(yw);
    cosP = Math.cos(pt); sinP = Math.sin(pt);
  }
  // [sx, sy, mm→px]
  function P(x, y, z) {
    z += 15; // 공작물 가운데를 회전 중심으로
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;
    const depth = y1 * cosP - z * sinP;
    const up = y1 * sinP + z * cosP;
    const s = (pxmm * D) / (D + depth);
    return [cx + x1 * s, cy - up * s, s];
  }

  function layout() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (W < 760) {
      cx = W * 0.5; cy = H * 0.76;
      pxmm = Math.min((W * 0.92) / 165, (H * 0.34) / 100);
    } else if (W < 1020) {
      cx = W * 0.66; cy = H * 0.56;
      pxmm = Math.min((W * 0.5) / 165, (H * 0.56) / 110);
    } else {
      cx = W * 0.7; cy = H * 0.52;
      pxmm = Math.min((W * 0.44) / 165, (H * 0.6) / 110);
    }
  }

  /* ── 그리기 ── */
  function line(a, b) {
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  function poly3(pts, close) {
    pts.forEach((p, i) => {
      const q = P(p[0], p[1], p[2]);
      if (i === 0) ctx.moveTo(q[0], q[1]);
      else ctx.lineTo(q[0], q[1]);
    });
    if (close) ctx.closePath();
  }
  function circle3(x0, y0, z, r, n = 28) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([x0 + r * Math.cos(a), y0 + r * Math.sin(a), z]);
    }
    poly3(pts, true);
  }
  function roundRect3(x0, y0, x1, y1, r, z) {
    const pts = [];
    const c = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
    c.forEach(([ax, ay, a0]) => {
      for (let i = 0; i <= 5; i++) {
        const a = a0 + (i / 5) * (Math.PI / 2);
        pts.push([ax + r * Math.cos(a), ay + r * Math.sin(a), z]);
      }
    });
    poly3(pts, true);
  }

  function drawGrid() {
    const c = P(0, 0, BZ);
    const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 150 * pxmm);
    g.addColorStop(0, rgba(COL.blue, 0.2));
    g.addColorStop(1, rgba(COL.blue, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const R = 150, step = 15;
    for (let v = -R; v <= R; v += step) {
      line(P(v, -R, BZ), P(v, R, BZ));
      line(P(-R, v, BZ), P(R, v, BZ));
    }
    ctx.stroke();
  }

  function drawBlock() {
    const pv = verts.map((v) => P(v[0], v[1], v[2]));
    const front = faces.map((f) => {
      let a = 0;
      for (let k = 0; k < 4; k++) {
        const p = pv[f[k]], q = pv[f[(k + 1) % 4]];
        a += p[0] * q[1] - q[0] * p[1];
      }
      return a < 0;
    });
    faces.forEach((f, fi) => {
      if (!front[fi]) return;
      ctx.beginPath();
      f.forEach((vi, k) => (k ? ctx.lineTo(pv[vi][0], pv[vi][1]) : ctx.moveTo(pv[vi][0], pv[vi][1])));
      ctx.closePath();
      ctx.fillStyle = fi === 0 ? "rgba(22,36,58,0.72)" : "rgba(12,22,38,0.82)";
      ctx.fill();
    });
    // 숨은 모서리 = 점선
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(COL.sub, 0.22);
    ctx.beginPath();
    edges.forEach((e) => {
      if (!front[e.faces[0]] && !front[e.faces[1]]) line(pv[e.a], pv[e.b]);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = rgba(COL.fg, 0.62);
    ctx.beginPath();
    edges.forEach((e) => {
      if (front[e.faces[0]] || front[e.faces[1]]) line(pv[e.a], pv[e.b]);
    });
    ctx.stroke();
  }

  function drawFeatures(t) {
    // 포켓
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = rgba(COL.fg, 0.5);
    ctx.beginPath();
    roundRect3(POCKET.x0, POCKET.y0, POCKET.x1, POCKET.y1, POCKET.r, 0);
    ctx.stroke();
    ctx.strokeStyle = rgba(COL.fg, 0.22);
    ctx.beginPath();
    roundRect3(POCKET.x0, POCKET.y0, POCKET.x1, POCKET.y1, POCKET.r, POCKET.z);
    ctx.stroke();
    // 구멍
    HOLES.forEach(([hx, hy], i) => {
      const done = t >= holeAt[i];
      ctx.setLineDash(done ? [] : [2.5, 3]);
      ctx.strokeStyle = done ? rgba(COL.cyan, 0.85) : rgba(COL.sub, 0.45);
      ctx.lineWidth = done ? 1.4 : 1;
      ctx.beginPath();
      circle3(hx, hy, 0, HOLE_R);
      ctx.stroke();
      if (done) {
        ctx.fillStyle = "rgba(7,13,24,0.7)";
        ctx.fill();
      }
    });
    ctx.setLineDash([]);
  }

  function drawAxes() {
    const o = P(OX, OY, 0);
    const ax = (x, y, z, col, label) => {
      const e = P(x, y, z);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      line(o, e);
      ctx.stroke();
      const ang = Math.atan2(e[1] - o[1], e[0] - o[0]);
      const h = 8;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(e[0] + Math.cos(ang) * h, e[1] + Math.sin(ang) * h);
      ctx.lineTo(e[0] + Math.cos(ang + 2.4) * h * 0.8, e[1] + Math.sin(ang + 2.4) * h * 0.8);
      ctx.lineTo(e[0] + Math.cos(ang - 2.4) * h * 0.8, e[1] + Math.sin(ang - 2.4) * h * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.font = "500 11px 'IBM Plex Mono', Consolas, monospace";
      ctx.fillText(label, e[0] + Math.cos(ang) * 18 - 4, e[1] + Math.sin(ang) * 18 + 4);
    };
    ax(OX + 38, OY, 0, rgba(COL.blue, 1), "X");
    ax(OX, OY + 26, 0, rgba(COL.sub, 0.85), "Y");
    ax(OX, OY, 26, rgba(COL.sub, 0.85), "Z");
    const g = ctx.createRadialGradient(o[0], o[1], 0, o[0], o[1], 16);
    g.addColorStop(0, rgba(COL.cyan, 0.55));
    g.addColorStop(1, rgba(COL.cyan, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o[0], o[1], 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(COL.cyan, 1);
    ctx.beginPath();
    ctx.arc(o[0], o[1], 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 아직 가지 않은 경로 = 옅은 점선(프로그램 미리보기)
  function drawPlan(k) {
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = rgba(COL.sub, 0.2);
    ctx.beginPath();
    let open = false;
    for (let i = Math.max(1, k); i < samples.length; i++) {
      const s = samples[i];
      if (s.g !== 1) { open = false; continue; }
      const q = P(s.x, s.y, s.z);
      if (!open) {
        const p0 = samples[i - 1], pp = P(p0.x, p0.y, p0.z);
        ctx.moveTo(pp[0], pp[1]);
        open = true;
      }
      ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 지나온 경로 = 빛나는 자취
  function drawTrail(k, tip, alpha) {
    if (alpha <= 0) return;
    const pts = new Array(k + 1);
    for (let i = 0; i <= k; i++) pts[i] = P(samples[i].x, samples[i].y, samples[i].z);
    const run = (g) => {
      ctx.beginPath();
      let open = false;
      for (let i = 1; i <= k; i++) {
        if (samples[i].g !== g) { open = false; continue; }
        if (!open) { ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); open = true; }
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      if (open && tip && tip.g === g) ctx.lineTo(tip.p[0], tip.p[1]);
    };
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // 빠른 이송 = 파란 점선
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(COL.blue, 0.4 * alpha);
    run(0);
    ctx.stroke();
    ctx.setLineDash([]);
    // 절삭 = cyan 빛
    run(1);
    ctx.lineWidth = 7;
    ctx.strokeStyle = rgba(COL.cyan, 0.1 * alpha);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(COL.cyan, 0.22 * alpha);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba("190,245,250", 0.95 * alpha);
    ctx.stroke();
  }

  const sparks = [];
  function drawTool(tip, cutting, dt) {
    const [sx, sy, s] = tip.p;
    const top = P(tip.x, tip.y, tip.z + 52);
    // 공구 몸통
    ctx.lineCap = "butt";
    ctx.lineWidth = Math.max(4, TOOL_R * 2 * s * 0.9);
    const g = ctx.createLinearGradient(sx, sy, top[0], top[1]);
    g.addColorStop(0, rgba(COL.fg, 0.32));
    g.addColorStop(1, rgba(COL.fg, 0.04));
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(top[0], top[1]);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(COL.fg, 0.55);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(top[0], top[1]);
    ctx.stroke();
    // 불꽃(칩)
    if (cutting && dt > 0) {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 30 + Math.random() * 70;
        sparks.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.5 + Math.random() * 0.4, age: 0, gold: Math.random() < 0.35 });
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt;
      if (p.age >= p.life) { sparks.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      const a = 1 - p.age / p.life;
      ctx.fillStyle = rgba(p.gold ? COL.gold : COL.cyan, a * 0.9);
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    if (sparks.length > 80) sparks.splice(0, sparks.length - 80);
    // 공구 끝(TiN Gold — 이 페이지에서 금색은 여기 한 곳)
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18);
    glow.addColorStop(0, rgba(COL.gold, cutting ? 0.65 : 0.4));
    glow.addColorStop(1, rgba(COL.gold, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(COL.gold, 1);
    ctx.beginPath();
    ctx.arc(sx, sy, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── HUD ── */
  let hudTick = 0;
  function setHud(tip) {
    if (!hud.x) return;
    hud.x.textContent = (tip.x - OX).toFixed(3);
    hud.y.textContent = (tip.y - OY).toFixed(3);
    hud.z.textContent = tip.z.toFixed(3);
    hud.g.textContent = tip.g === 0 ? "G00" : "G01";
    hud.f.textContent = tip.g === 0 ? "F —" : "F1200";
    hud.n.textContent = "N" + String(tip.n).padStart(4, "0");
  }

  /* ── 한 장면 ── */
  let k = 0; // 지금 지나는 표본 번호
  function frame(t, camT, dt) {
    setCam(camT);
    ctx.clearRect(0, 0, W, H);
    const tt = Math.min(t, T_END);
    if (tt < samples[k].t) k = 0;
    while (k < samples.length - 2 && samples[k + 1].t <= tt) k++;
    const a = samples[k], b = samples[Math.min(k + 1, samples.length - 1)];
    const u = b.t > a.t ? Math.min(1, (tt - a.t) / (b.t - a.t)) : 0;
    const tip = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u, g: b.g, n: b.n };
    tip.p = P(tip.x, tip.y, tip.z);
    const fade = t > T_END + T_HOLD ? 1 - (t - T_END - T_HOLD) / T_FADE : 1;

    drawGrid();
    drawBlock();
    drawFeatures(t > T_END + T_HOLD ? -1 : tt);
    drawPlan(k);
    drawTrail(k, tip, Math.max(0, fade));
    drawAxes();
    const cutting = tip.g === 1 && t < T_END && tip.z < 0.5;
    drawTool(tip, cutting, dt);
    if (++hudTick % 3 === 0 || dt === 0) setHud(tip);
  }

  /* ── 돌리기 ── */
  let running = false, visible = true, raf = 0, last = 0, simT = 0, camT = 0;
  function loop(now) {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    simT += dt;
    camT += dt;
    if (simT > T_CYCLE) { simT = 0; k = 0; }
    cyaw += (tyaw - cyaw) * 0.04;
    cpitch += (tpitch - cpitch) * 0.04;
    frame(simT, camT, dt);
    raf = requestAnimationFrame(loop);
  }
  function update() {
    const want = visible && !document.hidden && !reduceMQ.matches;
    if (want && !running) {
      running = true;
      last = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    } else if (!want) {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (reduceMQ.matches) still();
    }
  }
  function still() {
    sparks.length = 0;
    k = 0;
    frame(T_END * 0.62, 2.2, 0);
  }

  layout();
  still();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; update(); }, { threshold: 0.02 }).observe(hero);
  }
  document.addEventListener("visibilitychange", update);
  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", update);
  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); if (!running) still(); }, 120);
  });
  if (finePointer) {
    hero.addEventListener("pointermove", (e) => {
      tyaw = (e.clientX / window.innerWidth - 0.5) * 0.28;
      tpitch = (e.clientY / window.innerHeight - 0.5) * 0.08;
    });
    hero.addEventListener("pointerleave", () => { tyaw = 0; tpitch = 0; });
  }
  update();
})();
