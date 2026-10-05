// Studio screen: layers, brushes, colors, photo layers, camera and saving.
const stage = $('stage'), cv = $('draw'), cam = $('cam'), S = Engine.E;
Engine.attach(cv);
const pe = e => (e.pressure > 0 ? e.pressure : 0.5);
function pos(e) {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function fitCanvas() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  Engine.resize(w, h);
  renderLayers();
  syncLayerProps();
}
window.addEventListener('resize', fitCanvas);

cv.addEventListener('pointerdown', e => {
  if (S.tool === 'select') return;
  const p = pos(e);
  if (S.tool === 'fill') { if (!Engine.fill(p.x, p.y)) toast('This layer is locked'); return; }
  cv.setPointerCapture(e.pointerId);
  if (!Engine.begin(p.x, p.y, pe(e))) toast('This layer is locked');
  updateSel();
});
cv.addEventListener('pointermove', e => { const p = pos(e); Engine.move(p.x, p.y, pe(e)); updateSel(); });
['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { Engine.end(); updateSel(); }));

// Selection overlay
function updateSel() {
  const b = $('selbox');
  if (!S.sel) { b.hidden = true; return; }
  b.hidden = false;
  b.style.left = S.sel.x + 'px';
  b.style.top = S.sel.y + 'px';
  b.style.width = S.sel.w + 'px';
  b.style.height = S.sel.h + 'px';
}
$('sel-del').addEventListener('click', () => { Engine.deleteSel(); updateSel(); });

// Tools and brushes
function setTool(t) {
  S.tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  cv.style.pointerEvents = t === 'select' ? 'none' : 'auto';
  if (t !== 'select') select(null);
}
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

Object.entries(Engine.BRUSHES).forEach(([k, b]) => {
  const btn = document.createElement('button');
  btn.className = 'bpill' + (k === S.brush ? ' on' : '');
  btn.textContent = b.label;
  btn.addEventListener('click', () => {
    S.brush = k;
    setTool('brush');
    document.querySelectorAll('.bpill').forEach(x => x.classList.toggle('on', x === btn));
  });
  $('brushes').appendChild(btn);
});

// Colors: 100 generated swatches, burgundy first
const HUES = [0, 30, 55, 95, 150, 190, 225, 265, 305, 340];
const TONES = [92, 82, 72, 62, 52, 42, 32, 24, 16, 10];
function hslToHex(h, sat, light) {
  const s = sat / 100, l = light / 100;
  const a = s * Math.min(l, 1 - l);
  const k = n => (n + h / 30) % 12;
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const PALETTE = [];
HUES.forEach(h => TONES.forEach(l => PALETTE.push(hslToHex(h, 55, l))));
PALETTE[0] = '#651C32';
PALETTE.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'sw' + (i === 0 ? ' on' : '');
  b.style.background = c;
  b.setAttribute('aria-label', 'Color ' + c);
  b.addEventListener('click', () => {
    S.color = c;
    document.querySelectorAll('.sw').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  });
  $('swatches').appendChild(b);
});

$('size').addEventListener('input', e => { S.size = Number(e.target.value); });
$('op').addEventListener('input', e => { S.opacity = Number(e.target.value) / 100; });

// Layers
function renderLayers() {
  const box = $('layers');
  box.innerHTML = '';
  S.layers.slice().reverse().forEach(L => {
    const chip = document.createElement('button');
    chip.className = 'lchip' + (L === S.active ? ' on' : '');
    const name = document.createElement('span');
    name.textContent = L.name;
    const eye = document.createElement('span');
    eye.textContent = L.visible ? '●' : '○';
    eye.addEventListener('click', e => { e.stopPropagation(); L.visible = !L.visible; Engine.render(); renderLayers(); });
    chip.append(name, eye);
    chip.addEventListener('click', () => { Engine.setActive(L.id); renderLayers(); syncLayerProps(); });
    box.appendChild(chip);
  });
  updateSel();
}
function syncLayerProps() {
  if (!S.active) return;
  $('blend').value = S.active.blend;
  $('lop').value = Math.round(S.active.opacity * 100);
}
$('layer-add').addEventListener('click', () => { Engine.addLayer(); renderLayers(); syncLayerProps(); });
$('layer-dup').addEventListener('click', () => { Engine.duplicateLayer(); renderLayers(); syncLayerProps(); });
$('layer-del').addEventListener('click', () => {
  if (Engine.deleteLayer()) { renderLayers(); syncLayerProps(); }
  else toast('Keep at least one layer');
});
$('blend').addEventListener('change', e => Engine.setProp('blend', e.target.value));
$('lop').addEventListener('input', e => Engine.setProp('opacity', Number(e.target.value) / 100));
$('clear-btn').addEventListener('click', () => Engine.clearActive());
$('undo-btn').addEventListener('click', () => { Engine.undo(); renderLayers(); });
$('redo-btn').addEventListener('click', () => { Engine.redo(); renderLayers(); });
$('grid-btn').addEventListener('click', () => stage.classList.toggle('grid'));
$('save-btn').addEventListener('click', saveDrawing);
$('cam-btn').addEventListener('click', () => toggleCam());

// Photo layers (drawn beneath the drawing layers)
$('photo-btn').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => addPicture(reader.result);
  reader.readAsDataURL(file);
  e.target.value = '';
});
function addPicture(src) {
  const img = document.createElement('img');
  img.className = 'pic';
  img.src = src;
  img.draggable = false;
  img.style.left = '18%';
  img.style.top = '28%';
  img.style.width = '40%';
  img.style.opacity = 1;
  stage.appendChild(img);
  select(img);
  setTool('select');
}
function select(img) {
  if (sel) sel.classList.remove('sel');
  sel = img;
  if (img) img.classList.add('sel');
  $('props').hidden = !!img;
  $('pic-props').hidden = !img;
  if (img) {
    $('pic-scale').value = Math.round(img.offsetWidth / stage.clientWidth * 100);
    $('pic-op').value = Math.round(parseFloat(img.style.opacity) * 100);
  }
}
let sel = null, drag = null;
stage.addEventListener('pointerdown', e => {
  if (S.tool !== 'select') return;
  const img = e.target.closest('.pic');
  select(img);
  if (!img) return;
  drag = { img, sx: e.clientX, sy: e.clientY, l: img.offsetLeft, t: img.offsetTop };
  img.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!drag) return;
  drag.img.style.left = drag.l + e.clientX - drag.sx + 'px';
  drag.img.style.top = drag.t + e.clientY - drag.sy + 'px';
});
['pointerup', 'pointercancel'].forEach(t => stage.addEventListener(t, () => { drag = null; }));
$('pic-scale').addEventListener('input', e => {
  if (sel) sel.style.width = (Number(e.target.value) / 100 * stage.clientWidth) + 'px';
});
$('pic-op').addEventListener('input', e => {
  if (sel) sel.style.opacity = Number(e.target.value) / 100;
});
$('pic-del').addEventListener('click', () => {
  if (!sel) return;
  sel.remove();
  select(null);
});

// Camera
async function toggleCam(on) {
  const running = !!cam.srcObject;
  if (on === undefined) on = !running;
  if (!on) return stopCam();
  if (running) return;
  try {
    cam.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    cam.hidden = false;
    await cam.play();
    $('cam-btn').classList.add('on');
  } catch (err) {
    console.error(err);
    toast('Camera unavailable');
  }
}
function stopCam() {
  if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop());
  cam.srcObject = null;
  cam.hidden = true;
  $('cam-btn').classList.remove('on');
}

// Export: photos, then all visible layers (camera feed is not included)
function compose() {
  const w = stage.clientWidth, h = stage.clientHeight, sc = Math.min(1, 960 / w);
  const out = document.createElement('canvas');
  out.width = Math.round(w * sc);
  out.height = Math.round(h * sc);
  const o = out.getContext('2d');
  o.fillStyle = '#FBF8F3';
  o.fillRect(0, 0, out.width, out.height);
  stage.querySelectorAll('.pic').forEach(img => {
    o.globalAlpha = parseFloat(img.style.opacity || 1);
    o.drawImage(img, img.offsetLeft * sc, img.offsetTop * sc, img.offsetWidth * sc, img.offsetHeight * sc);
  });
  Engine.composite(o, sc);
  return out.toDataURL('image/jpeg', 0.85);
}
function saveDrawing() {
  const list = getGallery();
  list.unshift({ id: Date.now(), src: compose() });
  if (saveGallery(list)) toast('Saved to gallery');
}

// Tool setup
setTool('brush');
