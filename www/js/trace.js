// Trace mode: a reference photo over the live camera, with opacity, size, flip and lock.
const tCam = $('t-cam'), tRef = $('t-ref');
let tDrag = null;

async function startTrace() {
  if (tCam.srcObject) return;
  try {
    tCam.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    await tCam.play();
  } catch (err) {
    console.error(err);
    toast('Camera unavailable');
  }
}

function stopTrace() {
  if (tCam.srcObject) tCam.srcObject.getTracks().forEach(t => t.stop());
  tCam.srcObject = null;
}

function setRef(src) {
  tRef.src = src;
  tRef.hidden = false;
  $('t-empty').hidden = true;
  tRef.style.left = '20%';
  tRef.style.top = '25%';
  tRef.style.width = $('t-scale').value + '%';
  tRef.style.opacity = $('t-op').value / 100;
}

$('t-add').addEventListener('click', () => $('t-file').click());
$('t-photo').addEventListener('click', () => $('t-file').click());
$('t-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => setRef(reader.result);
  reader.readAsDataURL(file);
  e.target.value = '';
});

$('t-op').addEventListener('input', e => { tRef.style.opacity = e.target.value / 100; });
$('t-scale').addEventListener('input', e => { tRef.style.width = e.target.value + '%'; });
$('t-flip').addEventListener('click', () => {
  tRef.style.transform = tRef.style.transform ? '' : 'scaleX(-1)';
});
$('t-lock').addEventListener('click', () => {
  const locked = tRef.style.pointerEvents === 'none';
  tRef.style.pointerEvents = locked ? 'auto' : 'none';
  $('t-lock').classList.toggle('on', !locked);
  toast(locked ? 'Unlocked' : 'Locked in place');
});

tRef.addEventListener('pointerdown', e => {
  tDrag = { sx: e.clientX, sy: e.clientY, l: tRef.offsetLeft, t: tRef.offsetTop };
  tRef.setPointerCapture(e.pointerId);
});
tRef.addEventListener('pointermove', e => {
  if (!tDrag) return;
  tRef.style.left = tDrag.l + e.clientX - tDrag.sx + 'px';
  tRef.style.top = tDrag.t + e.clientY - tDrag.sy + 'px';
});
['pointerup', 'pointercancel'].forEach(t => tRef.addEventListener(t, () => { tDrag = null; }));
