// Starts the rear camera. Requires HTTPS (or localhost) for getUserMedia.
const video = document.getElementById('camera');

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}
