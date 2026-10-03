// Drawing tools, photo layers, camera and saving for the Studio screen.
const stage = $('stage'), cv = $('draw'), ctx = cv.getContext('2d'), cam = $('cam');
const S = { tool: 'pen', color: '#651C32', size: 6, opacity: 1 };
const undoS = [], redoS = [];
let down = null, base = null, lastP = null, sel = null, drag = null;

// Canvas sizing
function fitCanvas() {
  const w = stage.clientWidth, h = stage.clientHeight, dpr = window.devicePixelRatio || 1;
  if (!w || !h) return;
  const snap = cv.width ? snapshot() : null;
  cv.width = w * dpr;
  cv.height = h * dpr;
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (snap) restore(snap);
}
window.addEventListener('resize', fitCanvas);

// Undo / redo
const snapshot = () => ctx.getImageData(0, 0, cv.width, cv.height);
function restore(img) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(img, 0, 0);
  ctx.restore();
}
function commit() {
  undoS.push(snapshot());
  if (undoS.length > 40) undoS.shift();
  redoS.length = 0;
}
function undo() {
  if (!undoS.length) return;
  redoS.push(snapshot());
  restore(undoS.pop());
}
function redo() {
  if (!redoS.length) return;
  undoS.push(snapshot());
  restore(redoS.pop());
}
function clearDrawing() {
  commit();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.restore();
}

// Drawing
function pos(e) {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function paint(a, b) {
  ctx.save();
  ctx.globalAlpha = S.opacity;
  ctx.globalCompositeOperation = S.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = S.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = S.tool === 'eraser' ? S.size * 3 : S.size;
  ctx.beginPath();
  if (S.tool === 'rect') ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
  else if (S.tool === 'ellipse') ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
  else { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
  ctx.restore();
}

cv.addEventListener('pointerdown', e => {
  commit();
  cv.setPointerCapture(e.pointerId);
  down = lastP = pos(e);
  base = snapshot();
});
cv.addEventListener('pointermove', e => {
  if (!down) return;
  const p = pos(e);
  if (S.tool === 'pen' || S.tool === 'eraser') {
    paint(lastP, p);
    lastP = p;
  } else {
    restore(base);
    paint(down, p);
  }
});
['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { down = null; }));

// Tools
function setTool(t) {
  S.tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  cv.style.pointerEvents = t === 'select' ? 'none' : 'auto';
  if (t !== 'select') select(null);
}
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

// Color swatches
const COLORS = ['#651C32', '#3D0F1D', '#FBF8F3', '#FFFFFF', '#C9A96E', '#111111'];
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'sw' + (i === 0 ? ' on' : '');
  b.style.background = c;
  b.addEventListener('click', () => {
    S.color = c;
    document.querySelectorAll('.sw').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  });
  $('swatches').appendChild(b);
});

$('size').addEventListener('input', e => { S.size = Number(e.target.value); });
$('op').addEventListener('input', e => { S.opacity = Number(e.target.value) / 100; });
$('clear-btn').addEventListener('click', clearDrawing);
$('undo-btn').addEventListener('click', undo);
$('redo-btn').addEventListener('click', redo);
$('grid-btn').addEventListener('click', () => stage.classList.toggle('grid'));
$('save-btn').addEventListener('click', saveDrawing);
$('cam-btn').addEventListener('click', () => toggleCam());

// Photo layers
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

// Export: photos and drawing (camera feed is not included)
function compose() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const sc = Math.min(1, 960 / w);
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
  o.globalAlpha = 1;
  o.drawImage(cv, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.85);
}

function saveDrawing() {
  const list = getGallery();
  list.unshift({ id: Date.now(), src: compose() });
  if (saveGallery(list)) toast('Saved to gallery');
    }
