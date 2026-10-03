// Navigation, home widgets, gallery storage and viewer.
const $ = id => document.getElementById(id);
const KEY = 'ars-gallery';
const MAX_SAVED = 12;
const QUOTES = [
  'Every line is a decision.',
  'Draw what you see, then what you feel.',
  'Small strokes, big ideas.',
  'Start messy. Refine later.'
];

function go(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === name));
  document.querySelectorAll('.dock [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === name));
  if (name === 'home') renderHome();
  if (name === 'gallery') renderGallery();
  if (name === 'studio') setTimeout(fitCanvas, 40);
  if (name === 'trace') startTrace(); else stopTrace();
}

document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => {
  go('studio');
  if (b.dataset.action === 'photo') $('file').click();
  if (b.dataset.action === 'camera') toggleCam(true);
}));

// Clock widget
function tick() {
  const d = new Date();
  $('clock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}
setInterval(tick, 1000);
tick();
$('quote').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

// Gallery storage (localStorage)
function getGallery() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
}
function saveGallery(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
    return true;
  } catch (e) {
    toast('Storage full. Delete some drawings.');
    return false;
  }
}

function renderHome() {
  const list = getGallery();
  $('count').textContent = list.length;
  $('last-w').hidden = !list.length;
  if (list.length) $('last-img').src = list[0].src;
}

function renderGallery() {
  const list = getGallery();
  const gal = $('gal');
  gal.innerHTML = '';
  if (!list.length) {
    gal.innerHTML = '<p class="muted empty">No drawings yet. Tap Studio to start.</p>';
    return;
  }
  list.forEach(item => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.innerHTML = `<img src="${item.src}" alt="Saved drawing">`;
    b.addEventListener('click', () => openViewer(item.id));
    gal.appendChild(b);
  });
}

function openViewer(id) {
  const item = getGallery().find(x => x.id === id);
  if (!item) return;
  const v = $('viewer');
  v.querySelector('img').src = item.src;
  $('v-dl').href = item.src;
  v.dataset.id = id;
  v.hidden = false;
}

$('v-close').addEventListener('click', () => { $('viewer').hidden = true; });
$('v-del').addEventListener('click', () => {
  const id = Number($('viewer').dataset.id);
  saveGallery(getGallery().filter(x => x.id !== id));
  $('viewer').hidden = true;
  renderGallery();
  toast('Deleted');
});

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1800);
}

renderHome();
