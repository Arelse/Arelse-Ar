// Custom color picker: saturation/brightness square, hue slider, hex input and recent colors.
const CE = Engine.E;
const picker = { h: 0, s: 1, v: 1 };
const sv = $('sv'), svx = sv.getContext('2d');
let recent = [];
try { recent = JSON.parse(localStorage.getItem('ars-recent')) || []; } catch (e) {}

function hsvToHex(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function drawSV() {
  const w = sv.width, h = sv.height;
  svx.fillStyle = hsvToHex(picker.h, 1, 1);
  svx.fillRect(0, 0, w, h);
  const gw = svx.createLinearGradient(0, 0, w, 0);
  gw.addColorStop(0, '#FFFFFF');
  gw.addColorStop(1, 'rgba(255,255,255,0)');
  svx.fillStyle = gw;
  svx.fillRect(0, 0, w, h);
  const gb = svx.createLinearGradient(0, 0, 0, h);
  gb.addColorStop(0, 'rgba(0,0,0,0)');
  gb.addColorStop(1, '#000000');
  svx.fillStyle = gb;
  svx.fillRect(0, 0, w, h);
  svx.beginPath();
  svx.arc(picker.s * w, (1 - picker.v) * h, 7, 0, Math.PI * 2);
  svx.lineWidth = 3;
  svx.strokeStyle = '#FFFFFF';
  svx.stroke();
}

function applyColor(hex) {
  CE.color = hex;
  $('hex').value = hex;
  $('cur-col').style.background = hex;
}

function renderRecent() {
  const box = $('recent');
  box.innerHTML = '';
  recent.forEach(c => {
    const b = document.createElement('button');
    b.className = 'rc';
    b.style.background = c;
    b.setAttribute('aria-label', 'Recent ' + c);
    b.addEventListener('click', () => { setFromHex(c); });
    box.appendChild(b);
  });
}
function addRecent(hex) {
  recent = [hex, ...recent.filter(x => x !== hex)].slice(0, 8);
  try { localStorage.setItem('ars-recent', JSON.stringify(recent)); } catch (e) {}
  renderRecent();
}
function setFromHex(hex) {
  const hsv = hexToHsv(hex);
  picker.h = hsv.h; picker.s = hsv.s; picker.v = hsv.v;
  $('hue').value = Math.round(hsv.h);
  applyColor(hex.toUpperCase());
  drawSV();
}

$('open-picker').addEventListener('click', () => {
  setFromHex(CE.color);
  renderRecent();
  $('picker').hidden = false;
});
$('pick-ok').addEventListener('click', () => {
  addRecent(CE.color);
  $('picker').hidden = true;
});

let svDrag = false;
function svSet(e) {
  const r = sv.getBoundingClientRect();
  picker.s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  picker.v = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
  applyColor(hsvToHex(picker.h, picker.s, picker.v));
  drawSV();
}
sv.addEventListener('pointerdown', e => { svDrag = true; sv.setPointerCapture(e.pointerId); svSet(e); });
sv.addEventListener('pointermove', e => { if (svDrag) svSet(e); });
['pointerup', 'pointercancel'].forEach(t => sv.addEventListener(t, () => { svDrag = false; }));

$('hue').addEventListener('input', e => {
  picker.h = Number(e.target.value);
  applyColor(hsvToHex(picker.h, picker.s, picker.v));
  drawSV();
});
$('hex').addEventListener('change', e => {
  const v = e.target.value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) setFromHex(v);
  else { toast('Use a hex color like #651C32'); e.target.value = CE.color; }
});

applyColor(CE.color);
renderRecent();
