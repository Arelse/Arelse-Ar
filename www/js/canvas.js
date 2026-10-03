// Freehand drawing with undo history.
const canvas = document.getElementById('drawing');
const ctx = canvas.getContext('2d');
const undoStack = [];
const MAX_UNDO = 30;

const brush = { tool: 'pen', color: '#651C32', size: 4 };
let drawing = false;
let last = null;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const snap = canvas.width ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (snap) ctx.putImageData(snap, 0, 0);
}

function pushUndo() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function undo() {
  if (!undoStack.length) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(undoStack.pop(), 0, 0);
  ctx.restore();
}

function clearAll() {
  pushUndo();
  ctx.clearRect(0, 0, innerWidth, innerHeight);
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', e => {
  pushUndo();
  drawing = true;
  last = pointerPos(e);
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  const p = pointerPos(e);
  ctx.globalCompositeOperation = brush.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = brush.color;
  ctx.lineWidth = brush.tool === 'eraser' ? brush.size * 3 : brush.size;
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  last = p;
});

['pointerup', 'pointercancel'].forEach(type =>
  canvas.addEventListener(type, () => { drawing = false; })
);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
