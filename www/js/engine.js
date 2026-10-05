// Layered drawing engine: layers, blend modes, brushes, pressure, stabilizer and per-layer undo.
const BRUSHES = {
  pencil:   { label: 'Pencil',   size: 3,  alpha: 0.85, pressure: true },
  pen:      { label: 'Pen',      size: 6,  alpha: 1,    pressure: true },
  marker:   { label: 'Marker',   size: 14, alpha: 0.55, pressure: false },
  airbrush: { label: 'Airbrush', size: 28, alpha: 0.9,  pressure: true, dots: true },
  chalk:    { label: 'Chalk',    size: 10, alpha: 0.8,  pressure: true, grain: true },
  eraser:   { label: 'Eraser',   size: 16, alpha: 1,    pressure: true, erase: true }
};

const Engine = (() => {
  const E = { W: 0, H: 0, dpr: 1, layers: [], active: null, tool: 'brush', brush: 'pen', color: '#651C32', size: 6, opacity: 1 };
  const clamp = v => Math.max(0, Math.min(1, v));
  const undoS = [], redoS = [];
  let display, dctx, live, lctx, nid = 1, drawing = false, last = null, start = null, base = null;

  function mkCanvas() {
    const c = document.createElement('canvas');
    c.width = Math.round(E.W * E.dpr);
    c.height = Math.round(E.H * E.dpr);
    const x = c.getContext('2d');
    x.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
    return { c, x };
  }
  function mkLayer(name) {
    const { c, x } = mkCanvas();
    return { id: nid++, name, canvas: c, ctx: x, visible: true, locked: false, opacity: 1, blend: 'source-over' };
  }
  const find = id => E.layers.find(l => l.id === id);
  const snap = L => L.ctx.getImageData(0, 0, L.canvas.width, L.canvas.height);
  const put = (L, img) => L.ctx.putImageData(img, 0, 0);

  function attach(canvas) {
    display = canvas;
    dctx = canvas.getContext('2d');
    live = document.createElement('canvas');
    lctx = live.getContext('2d');
  }

  function resize(w, h) {
    const dpr = window.devicePixelRatio || 1;
    if (w === E.W && h === E.H && dpr === E.dpr) return;
    E.W = w; E.H = h; E.dpr = dpr;
    E.layers.forEach(L => {
      const old = L.canvas, n = mkCanvas();
      n.x.save(); n.x.setTransform(1, 0, 0, 1, 0, 0); n.x.drawImage(old, 0, 0); n.x.restore();
      L.canvas = n.c; L.ctx = n.x;
    });
    undoS.length = 0; redoS.length = 0;
    display.width = Math.round(w * dpr); display.height = Math.round(h * dpr);
    display.style.width = w + 'px'; display.style.height = h + 'px';
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    live.width = display.width; live.height = display.height;
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!E.layers.length) addLayer('Layer 1');
    render();
  }

  function addLayer(name) {
    const L = mkLayer(name || 'Layer ' + (E.layers.length + 1));
    E.layers.push(L);
    E.active = L;
    render();
    return L;
  }
  function duplicateLayer() {
    const src = E.active;
    if (!src) return;
    const L = mkLayer(src.name + ' copy');
    L.ctx.drawImage(src.canvas, 0, 0, E.W, E.H);
    L.opacity = src.opacity; L.blend = src.blend;
    E.layers.splice(E.layers.indexOf(src) + 1, 0, L);
    E.active = L;
    render();
  }
  function deleteLayer() {
    if (E.layers.length <= 1) return false;
    const i = E.layers.indexOf(E.active);
    E.layers.splice(i, 1);
    E.active = E.layers[Math.max(0, i - 1)];
    render();
    return true;
  }
  function setActive(id) { E.active = find(id); render(); }
  function setProp(key, value) { if (E.active) { E.active[key] = value; render(); } }

  // Undo / redo, stored per layer
  function pushUndo() {
    undoS.push({ id: E.active.id, img: snap(E.active) });
    if (undoS.length > 25) undoS.shift();
    redoS.length = 0;
  }
  function undo() {
    const s = undoS.pop(); if (!s) return;
    const L = find(s.id); if (!L) return;
    redoS.push({ id: s.id, img: snap(L) });
    put(L, s.img); render();
  }
  function redo() {
    const s = redoS.pop(); if (!s) return;
    const L = find(s.id); if (!L) return;
    undoS.push({ id: s.id, img: snap(L) });
    put(L, s.img); render();
  }
  function clearActive() {
    if (!E.active || E.active.locked) return;
    pushUndo();
    E.active.ctx.clearRect(0, 0, E.W, E.H);
    render();
  }

  // Strokes
  function begin(x, y, pe) {
    if (!E.active || E.active.locked) return false;
    pushUndo();
    drawing = true;
    start = last = { x, y };
    base = snap(E.active);
    lctx.clearRect(0, 0, E.W, E.H);
    return true;
  }
  function move(x, y, pe) {
    if (!drawing) return;
    const raw = { x, y };
    if (E.tool === 'brush') {
      const p = { x: last.x + (raw.x - last.x) * 0.6, y: last.y + (raw.y - last.y) * 0.6 }; // stabilizer
      segment(last, p, pe);
      last = p;
    } else {
      put(E.active, base);
      shape(start, raw);
    }
    render();
  }
  function end() {
    if (!drawing) return;
    drawing = false;
    if (E.tool === 'brush' && !BRUSHES[E.brush].erase) {
      const B = BRUSHES[E.brush], L = E.active;
      L.ctx.save();
      L.ctx.globalAlpha = clamp(E.opacity * B.alpha);
      L.ctx.drawImage(live, 0, 0, E.W, E.H);
      L.ctx.restore();
      lctx.clearRect(0, 0, E.W, E.H);
    }
    render();
  }
  function segment(a, b, pe) {
    const B = BRUSHES[E.brush];
    const ctx = B.erase ? E.active.ctx : lctx;
    const w = E.size * (B.pressure ? 0.35 + pe * 0.9 : 1);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = B.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = ctx.fillStyle = E.color;
    if (B.dots) {
      const r = w / 2, n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, r * 0.3)));
      for (let i = 1; i <= n; i++) {
        const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, E.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (B.grain) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(b.x + (Math.random() - 0.5) * w, b.y + (Math.random() - 0.5) * w, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  function shape(a, b) {
    const ctx = E.active.ctx;
    ctx.save();
    ctx.globalAlpha = clamp(E.opacity);
    ctx.strokeStyle = E.color;
    ctx.lineWidth = E.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (E.tool === 'rect') ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    else if (E.tool === 'ellipse') ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    else { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    ctx.restore();
  }

  // Display and export
  function render() {
    if (!dctx) return;
    dctx.save();
    dctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
    dctx.clearRect(0, 0, E.W, E.H);
    E.layers.forEach(L => {
      if (!L.visible) return;
      dctx.globalCompositeOperation = L.blend;
      dctx.globalAlpha = L.opacity;
      dctx.drawImage(L.canvas, 0, 0, E.W, E.H);
      if (drawing && E.tool === 'brush' && L === E.active && !BRUSHES[E.brush].erase) {
        dctx.globalCompositeOperation = 'source-over';
        dctx.globalAlpha = L.opacity * clamp(E.opacity * BRUSHES[E.brush].alpha);
        dctx.drawImage(live, 0, 0, E.W, E.H);
      }
    });
    dctx.restore();
  }
  function composite(ctx, s = 1) {
    E.layers.forEach(L => {
      if (!L.visible) return;
      ctx.globalCompositeOperation = L.blend;
      ctx.globalAlpha = L.opacity;
      ctx.drawImage(L.canvas, 0, 0, E.W * s, E.H * s);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  return { E, BRUSHES, attach, resize, addLayer, duplicateLayer, deleteLayer, setActive, setProp,
           undo, redo, clearActive, begin, move, end, render, composite };
})();
