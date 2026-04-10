const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const statusEl = document.getElementById('train-status');
const badgeEl = document.getElementById('rec-badge');
const cloneCountEl = document.getElementById('count-clone');
const otherCountEl = document.getElementById('count-other');
const confFillEl = document.getElementById('conf-fill');
const confLabelEl = document.getElementById('conf-label');

let samples = { clone_sign: [], not_sign: [] };
let recording = null;
let model = null;
let countdownTimer = null;
let recordTimer = null;

const COUNTDOWN = 3;
const RECORD_TIME = 4;
const SAVED_MODEL_KEY = 'indexeddb://naruto-gesture-model';

function normalize(lm) {
  const wrist = lm[0];
  const mcp = lm[9];
  const scale =
    Math.sqrt(
      (mcp.x - wrist.x) ** 2 + (mcp.y - wrist.y) ** 2 + (mcp.z - wrist.z) ** 2,
    ) || 1;

  const output = [];
  for (let i = 0; i < 21; i++) {
    output.push((lm[i].x - wrist.x) / scale);
    output.push((lm[i].y - wrist.y) / scale);
    output.push((lm[i].z - wrist.z) / scale);
  }
  return output;
}

function extract(right, left) {
  return [...normalize(right), ...normalize(left)];
}

function updateCounts() {
  cloneCountEl.textContent = String(samples.clone_sign.length);
  otherCountEl.textContent = String(samples.not_sign.length);
}

function updateConfidence(probability) {
  const percent = Math.round(probability * 100);
  confFillEl.style.width = `${percent}%`;
  confLabelEl.textContent = `${percent}%`;
}

function cancelRecording() {
  window.clearInterval(countdownTimer);
  window.clearInterval(recordTimer);
  countdownTimer = null;
  recordTimer = null;
  recording = null;
  badgeEl.classList.remove('active');
}

function stopRecording() {
  recording = null;
  window.clearInterval(recordTimer);
  recordTimer = null;
  badgeEl.classList.remove('active');
}

function startRecording(label) {
  recording = label;
  let remaining = RECORD_TIME;
  badgeEl.classList.add('active');
  badgeEl.textContent = `REC ${remaining}s`;
  statusEl.textContent = `Recording ${label === 'clone_sign' ? 'clone sign' : 'other poses'}... hold still.`;

  recordTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      badgeEl.textContent = `REC ${remaining}s`;
      return;
    }

    stopRecording();
    statusEl.textContent = 'Recording complete. Capture more samples or train the model.';
  }, 1000);
}

function startCountdown(label) {
  cancelRecording();
  let remaining = COUNTDOWN;
  badgeEl.classList.add('active');
  badgeEl.textContent = `GET READY ${remaining}`;
  statusEl.textContent = `Recording starts in ${remaining}s. Get both hands into position.`;

  countdownTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      badgeEl.textContent = `GET READY ${remaining}`;
      statusEl.textContent = `Recording starts in ${remaining}s.`;
      return;
    }

    window.clearInterval(countdownTimer);
    countdownTimer = null;
    startRecording(label);
  }, 1000);
}

function captureFrame(right, left) {
  if (!recording || !right || !left) return;
  samples[recording].push(extract(right, left));
  updateCounts();
}

function drawHand(lm) {
  const segments = [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [0, 9, 10, 11, 12],
    [0, 13, 14, 15, 16],
    [0, 17, 18, 19, 20],
  ];

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;

  for (const segment of segments) {
    ctx.beginPath();
    segment.forEach((index, position) => {
      const x = canvas.width - lm[index].x * canvas.width;
      const y = lm[index].y * canvas.height;
      if (position === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  lm.forEach((point) => {
    ctx.beginPath();
    ctx.arc(canvas.width - point.x * canvas.width, point.y * canvas.height, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.fill();
  });
}

async function saveModelToBrowser() {
  if (!model) {
    statusEl.textContent = 'Train a model first.';
    return;
  }

  await model.save(SAVED_MODEL_KEY);
  statusEl.textContent = 'Model saved in this browser. Study Watch can now auto-load it.';
}

async function loadSavedModel() {
  try {
    model = await tf.loadLayersModel(SAVED_MODEL_KEY);
    statusEl.textContent = 'Saved browser model loaded. You can use it now or retrain it.';
  } catch (_error) {
    statusEl.textContent =
      'Record samples, train the model, and it will be saved in this browser automatically.';
  }
}

const holistic = new Holistic({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
});

holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
});

holistic.onResults((result) => {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  if (result.rightHandLandmarks) drawHand(result.rightHandLandmarks);
  if (result.leftHandLandmarks) drawHand(result.leftHandLandmarks);

  captureFrame(result.rightHandLandmarks, result.leftHandLandmarks);

  if (model && result.rightHandLandmarks && result.leftHandLandmarks) {
    const input = tf.tensor2d([extract(result.rightHandLandmarks, result.leftHandLandmarks)]);
    const prediction = model.predict(input);
    const probability = prediction.dataSync()[0];
    input.dispose();
    prediction.dispose?.();
    updateConfidence(probability);
  }
});

const camera = new Camera(video, {
  width: 640,
  height: 480,
  onFrame: async () => {
    await holistic.send({ image: video });
  },
});

async function trainModel() {
  const positives = samples.clone_sign.length;
  const negatives = samples.not_sign.length;

  if (positives < 10 || negatives < 10) {
    statusEl.textContent = 'Need at least 10 samples in each class before training.';
    return;
  }

  const xs = [];
  const ys = [];

  samples.clone_sign.forEach((sample) => {
    xs.push(sample);
    ys.push(1);
  });

  samples.not_sign.forEach((sample) => {
    xs.push(sample);
    ys.push(0);
  });

  for (let i = xs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
    [ys[i], ys[j]] = [ys[j], ys[i]];
  }

  const xTensor = tf.tensor2d(xs);
  const yTensor = tf.tensor1d(ys);

  if (model) model.dispose();

  model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [126], units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  model.compile({
    optimizer: 'adam',
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  document.getElementById('btn-train').disabled = true;
  statusEl.textContent = 'Training...';

  await model.fit(xTensor, yTensor, {
    epochs: 45,
    batchSize: 16,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const accuracy = logs.acc ?? logs.accuracy ?? 0;
        statusEl.textContent = `Epoch ${epoch + 1}/45. Accuracy ${(accuracy * 100).toFixed(1)}%`;
      },
    },
  });

  xTensor.dispose();
  yTensor.dispose();

  document.getElementById('btn-train').disabled = false;
  await saveModelToBrowser();
  statusEl.textContent =
    'Training complete. The model is saved in this browser and ready for the Naruto camera.';
}

document.getElementById('btn-rec-clone').addEventListener('click', () => startCountdown('clone_sign'));
document.getElementById('btn-rec-other').addEventListener('click', () => startCountdown('not_sign'));
document.getElementById('btn-train').addEventListener('click', () => {
  void trainModel();
});
document.getElementById('btn-save-browser').addEventListener('click', () => {
  void saveModelToBrowser();
});
document.getElementById('btn-download-model').addEventListener('click', async () => {
  if (!model) {
    statusEl.textContent = 'Train or load a model first.';
    return;
  }

  await model.save('downloads://naruto-gesture-model');
  statusEl.textContent = 'Model downloaded as JSON + weights files.';
});
document.getElementById('btn-delete-model').addEventListener('click', async () => {
  try {
    await tf.io.removeModel(SAVED_MODEL_KEY);
    model = null;
    updateConfidence(0);
    statusEl.textContent = 'Saved browser model deleted.';
  } catch (_error) {
    statusEl.textContent = 'There was no saved browser model to delete.';
  }
});

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.key === '1') startCountdown('clone_sign');
  if (event.key === '2') startCountdown('not_sign');
});

updateCounts();
updateConfidence(0);
statusEl.textContent = 'Requesting camera access...';

camera
  .start()
  .then(() => loadSavedModel())
  .catch((error) => {
    console.error(error);
    statusEl.textContent = 'Camera access failed. Allow webcam access and refresh the page.';
  });
