// Wires the floating toolbar to the camera, canvas, grid and reference image.
const $ = id => document.getElementById(id);
const reference = $('reference');
const grid = $('grid');
const startBtn = $('btn-start');

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';
  try {
    await startCamera();
    startBtn.hidden = true;
  } catch (err) {
    console.error(err);
    startBtn.textContent = 'Camera unavailable';
    startBtn.disabled = false;
  }
});

document.querySelectorAll('.tool[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool[data-tool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    brush.tool = btn.dataset.tool;
  });
});

document.querySelectorAll('.swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    brush.color = sw.dataset.color;
    document.querySelector('.tool[data-tool="pen"]').click();
  });
});

$('size').addEventListener('input', e => { brush.size = Number(e.target.value); });
$('btn-undo').addEventListener('click', undo);
$('btn-clear').addEventListener('click', clearAll);
$('btn-grid').addEventListener('click', () => { grid.hidden = !grid.hidden; });

$('ref-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (reference.src) URL.revokeObjectURL(reference.src);
  reference.src = URL.createObjectURL(file);
  reference.hidden = false;
});
