const ANALYSIS_INTERVAL_MS = 30_000;
const VEHICLE_CLASSES = new Set([
  "car",
  "truck",
  "bus",
  "motorcycle",
  "bicycle",
  "train",
]);
const FACE_STORE_KEY = "scenewatchKnownFaces";
const CAMERA_STORE_KEY = "scenewatchLinkedCameras";

const state = {
  cameras: [],
  detector: null,
  selectedFace: null,
  knownFaces: loadJson(FACE_STORE_KEY, []),
};

const cameraGrid = document.querySelector("#cameraGrid");
const cameraForm = document.querySelector("#cameraForm");
const cameraName = document.querySelector("#cameraName");
const cameraUrl = document.querySelector("#cameraUrl");
const cameraType = document.querySelector("#cameraType");
const addNativeCamera = document.querySelector("#addNativeCamera");
const runAllNow = document.querySelector("#runAllNow");
const modelStatus = document.querySelector("#modelStatus");
const cameraCount = document.querySelector("#cameraCount");
const peopleTotal = document.querySelector("#peopleTotal");
const vehicleTotal = document.querySelector("#vehicleTotal");
const faceTotal = document.querySelector("#faceTotal");
const lastUpdate = document.querySelector("#lastUpdate");
const faceForm = document.querySelector("#faceForm");
const faceName = document.querySelector("#faceName");
const faceNote = document.querySelector("#faceNote");
const selectedFace = document.querySelector("#selectedFace");
const faceList = document.querySelector("#faceList");

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function escapeHtml(value = "") {
  return value.replace(
    /[&<>"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[char],
  );
}

function persistedCameras() {
  return state.cameras
    .filter((camera) => camera.kind !== "native")
    .map(({ id, name, type, url }) => ({ id, name, type, url }));
}

async function loadDetector() {
  modelStatus.textContent = "Loading COCO-SSD detector…";
  const started = Date.now();
  while (!window.cocoSsd && Date.now() - started < 15_000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!window.cocoSsd) {
    modelStatus.textContent =
      "Detector unavailable • basic scene summaries active";
    return;
  }

  try {
    state.detector = await window.cocoSsd.load({ base: "lite_mobilenet_v2" });
    modelStatus.textContent = "Detector ready • people, vehicles, objects";
  } catch (error) {
    console.warn("Unable to load object detector", error);
    modelStatus.textContent = "Detector failed • basic scene summaries active";
  }
}

function createCameraRecord({
  name,
  type,
  url = "",
  kind = "cctv",
  stream = null,
}) {
  return {
    id: uid("cam"),
    name:
      name ||
      (kind === "native" ? "Native device camera" : "Linked CCTV camera"),
    type,
    url,
    kind,
    stream,
    timer: null,
    elements: {},
    last: {
      people: 0,
      vehicles: 0,
      faces: 0,
      objects: [],
      summary: "Waiting for first scan.",
    },
  };
}

function renderEmptyState() {
  if (state.cameras.length) return;
  cameraGrid.innerHTML = `
    <div class="camera-empty">
      <h2>No cameras linked yet</h2>
      <p>Add your phone/desktop camera or connect CCTV streams from NVR/VMS gateways. Each camera can be analyzed independently every 30 seconds.</p>
    </div>
  `;
}

function makeVideo(camera) {
  const video = document.createElement("video");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  if (camera.stream) {
    video.srcObject = camera.stream;
  } else if (camera.type === "hls" && window.Hls?.isSupported()) {
    const hls = new window.Hls();
    hls.loadSource(camera.url);
    hls.attachMedia(video);
    camera.hls = hls;
  } else {
    video.src = camera.url;
  }

  video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
  return video;
}

function makeSnapshotImage(camera) {
  const image = document.createElement("img");
  image.crossOrigin = "anonymous";
  image.alt = `${camera.name} snapshot`;
  image.src = withCacheBust(camera.url);
  return image;
}

function makeWebRtcEmbed(camera) {
  const iframe = document.createElement("iframe");
  iframe.title = `${camera.name} WebRTC stream`;
  iframe.allow = "camera; microphone; autoplay; fullscreen";
  iframe.src = camera.url;
  return iframe;
}

function withCacheBust(url) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_sw=${Date.now()}`;
}

function renderCamera(camera) {
  const card = document.createElement("article");
  card.className = "camera-card";
  card.dataset.cameraId = camera.id;
  card.innerHTML = `
    <div class="camera-head">
      <div>
        <h3 class="camera-title"></h3>
        <p class="camera-meta"></p>
      </div>
      <div class="camera-actions">
        <button class="analyze-btn" type="button">Analyze now</button>
        <button class="snapshot-btn" type="button">Select face crop</button>
        <button class="remove-btn" type="button">Remove</button>
      </div>
    </div>
    <div class="video-wrap">
      <canvas class="overlay-canvas"></canvas>
    </div>
    <div class="detection-panel">
      <div class="detection-row">
        <span class="badge people">People: <b>0</b></span>
        <span class="badge vehicle">Vehicles: <b>0</b></span>
        <span class="badge face">Faces: <b>0</b></span>
      </div>
      <div class="scene-summary">
        <strong>Scene summary</strong>
        <p class="summary-text">Waiting for first scan.</p>
      </div>
    </div>
  `;

  card.querySelector(".camera-title").textContent = camera.name;
  card.querySelector(".camera-meta").textContent =
    `${camera.kind === "native" ? "Native" : "CCTV"} • ${camera.type.toUpperCase()} • updates every 30s`;

  const wrap = card.querySelector(".video-wrap");
  let source;
  if (camera.type === "snapshot") source = makeSnapshotImage(camera);
  else if (camera.type === "webrtc") source = makeWebRtcEmbed(camera);
  else source = makeVideo(camera);

  wrap.prepend(source);
  camera.elements = {
    card,
    source,
    overlay: card.querySelector(".overlay-canvas"),
    peopleBadge: card.querySelector(".badge.people b"),
    vehicleBadge: card.querySelector(".badge.vehicle b"),
    faceBadge: card.querySelector(".badge.face b"),
    summary: card.querySelector(".summary-text"),
  };

  card
    .querySelector(".analyze-btn")
    .addEventListener("click", () => analyzeCamera(camera));
  card
    .querySelector(".snapshot-btn")
    .addEventListener("click", () => selectFaceCrop(camera));
  card
    .querySelector(".remove-btn")
    .addEventListener("click", () => removeCamera(camera.id));

  cameraGrid.appendChild(card);
  setTimeout(() => analyzeCamera(camera), 900);
  camera.timer = setInterval(() => analyzeCamera(camera), ANALYSIS_INTERVAL_MS);
}

function addCamera(camera, persist = true) {
  if (!state.cameras.length) cameraGrid.innerHTML = "";
  state.cameras.push(camera);
  renderCamera(camera);
  updateTotals();
  if (persist) saveJson(CAMERA_STORE_KEY, persistedCameras());
}

async function addNativeDeviceCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert(
      "This browser does not expose a native camera API. Try Chrome, Edge, Safari, or Firefox on HTTPS/localhost.",
    );
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false,
  });
  addCamera(
    createCameraRecord({
      name: "Phone / desktop camera",
      type: "native",
      kind: "native",
      stream,
    }),
    false,
  );
}

function removeCamera(id) {
  const index = state.cameras.findIndex((camera) => camera.id === id);
  if (index === -1) return;
  const [camera] = state.cameras.splice(index, 1);
  clearInterval(camera.timer);
  camera.hls?.destroy?.();
  camera.stream?.getTracks?.().forEach((track) => track.stop());
  camera.elements.card.remove();
  saveJson(CAMERA_STORE_KEY, persistedCameras());
  updateTotals();
  renderEmptyState();
}

function canReadSource(camera) {
  const source = camera.elements.source;
  if (camera.type === "webrtc") return false;
  if (source instanceof HTMLVideoElement) return source.readyState >= 2;
  if (source instanceof HTMLImageElement)
    return source.complete && source.naturalWidth > 0;
  return false;
}

function drawSourceToCanvas(camera) {
  if (!canReadSource(camera)) return null;
  const source = camera.elements.source;
  const width = source.videoWidth || source.naturalWidth || 640;
  const height = source.videoHeight || source.naturalHeight || 360;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  try {
    ctx.drawImage(source, 0, 0, width, height);
    ctx.getImageData(0, 0, 1, 1);
    return canvas;
  } catch (error) {
    console.warn(
      "Unable to read camera frame. Check CORS or gateway settings.",
      error,
    );
    return null;
  }
}

async function detectFaces(canvas) {
  if (!canvas || !("FaceDetector" in window)) return [];
  try {
    const detector = new window.FaceDetector({
      fastMode: true,
      maxDetectedFaces: 20,
    });
    return await detector.detect(canvas);
  } catch (error) {
    console.warn("Face detection unavailable", error);
    return [];
  }
}

function summarizeObjects(predictions, faceCount, readable) {
  if (!readable)
    return "Stream preview is linked. For browser security, analysis requires a readable frame from native camera, same-origin video, CORS-enabled CCTV, HLS, or a backend gateway.";
  const people = predictions.filter((p) => p.class === "person").length;
  const vehicles = predictions.filter((p) =>
    VEHICLE_CLASSES.has(p.class),
  ).length;
  const otherObjects = predictions
    .filter((p) => p.class !== "person" && !VEHICLE_CLASSES.has(p.class))
    .slice(0, 5)
    .map((p) => p.class);

  const parts = [];
  parts.push(
    people
      ? `${people} ${people === 1 ? "person" : "people"} visible`
      : "No people detected",
  );
  parts.push(
    vehicles
      ? `${vehicles} vehicle${vehicles === 1 ? "" : "s"} present`
      : "no vehicles detected",
  );
  parts.push(
    faceCount
      ? `${faceCount} face${faceCount === 1 ? "" : "s"} found`
      : "no faces found by the browser face detector",
  );
  if (otherObjects.length)
    parts.push(`notable objects: ${[...new Set(otherObjects)].join(", ")}`);
  return `${parts.join("; ")}. Updated ${timeLabel()}.`;
}

function drawOverlay(camera, predictions, faces) {
  const overlay = camera.elements.overlay;
  const source = camera.elements.source;
  const width =
    source.videoWidth || source.naturalWidth || overlay.clientWidth || 640;
  const height =
    source.videoHeight || source.naturalHeight || overlay.clientHeight || 360;
  overlay.width = width;
  overlay.height = height;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = Math.max(2, width / 320);
  ctx.font = `${Math.max(14, width / 42)}px Segoe UI`;

  predictions.forEach((prediction) => {
    const [x, y, w, h] = prediction.bbox;
    const isVehicle = VEHICLE_CLASSES.has(prediction.class);
    ctx.strokeStyle =
      prediction.class === "person"
        ? "#43d9ad"
        : isVehicle
          ? "#ffd166"
          : "#65a9ff";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.strokeRect(x, y, w, h);
    ctx.fillText(
      `${prediction.class} ${Math.round(prediction.score * 100)}%`,
      x + 6,
      Math.max(18, y + 20),
    );
  });

  faces.forEach((face) => {
    const { x, y, width: w, height: h } = face.boundingBox;
    ctx.strokeStyle = "#ffb3c6";
    ctx.fillStyle = "#ffb3c6";
    ctx.strokeRect(x, y, w, h);
    ctx.fillText("face", x + 6, Math.max(18, y + 20));
  });
}

async function analyzeCamera(camera) {
  if (camera.type === "snapshot")
    camera.elements.source.src = withCacheBust(camera.url);

  const canvas = drawSourceToCanvas(camera);
  const readable = Boolean(canvas);
  let predictions = [];
  let faces = [];

  if (canvas && state.detector) {
    try {
      predictions = await state.detector.detect(canvas);
    } catch (error) {
      console.warn("Object detection failed", error);
    }
  }

  faces = await detectFaces(canvas);
  const people = predictions.filter(
    (prediction) => prediction.class === "person",
  ).length;
  const vehicles = predictions.filter((prediction) =>
    VEHICLE_CLASSES.has(prediction.class),
  ).length;
  const summary = summarizeObjects(predictions, faces.length, readable);

  camera.last = {
    people,
    vehicles,
    faces: faces.length,
    objects: predictions,
    summary,
  };
  camera.elements.peopleBadge.textContent = people;
  camera.elements.vehicleBadge.textContent = vehicles;
  camera.elements.faceBadge.textContent = faces.length;
  camera.elements.summary.textContent = summary;
  drawOverlay(camera, predictions, faces);
  updateTotals();
}

function updateTotals() {
  const totals = state.cameras.reduce(
    (acc, camera) => {
      acc.people += camera.last.people;
      acc.vehicles += camera.last.vehicles;
      acc.faces += camera.last.faces;
      return acc;
    },
    { people: 0, vehicles: 0, faces: 0 },
  );
  cameraCount.textContent = `${state.cameras.length} camera${state.cameras.length === 1 ? "" : "s"}`;
  peopleTotal.textContent = totals.people;
  vehicleTotal.textContent = totals.vehicles;
  faceTotal.textContent = totals.faces;
  lastUpdate.textContent = state.cameras.length ? timeLabel() : "Never";
}

async function selectFaceCrop(camera) {
  const canvas = drawSourceToCanvas(camera);
  if (!canvas) {
    selectedFace.textContent =
      "No readable frame is available yet. Use a native camera or CORS-enabled CCTV stream.";
    return;
  }

  const [firstFace] = await detectFaces(canvas);
  const crop = document.createElement("canvas");
  const fallbackSize = Math.min(canvas.width, canvas.height) * 0.42;
  const box = firstFace?.boundingBox || {
    x: (canvas.width - fallbackSize) / 2,
    y: (canvas.height - fallbackSize) / 2,
    width: fallbackSize,
    height: fallbackSize,
  };
  const padding = Math.max(box.width, box.height) * 0.28;
  const sx = Math.max(0, box.x - padding);
  const sy = Math.max(0, box.y - padding);
  const sw = Math.min(canvas.width - sx, box.width + padding * 2);
  const sh = Math.min(canvas.height - sy, box.height + padding * 2);
  crop.width = Math.round(sw);
  crop.height = Math.round(sh);
  const ctx = crop.getContext("2d");
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
  const dataUrl = crop.toDataURL("image/jpeg", 0.82);
  state.selectedFace = {
    dataUrl,
    cameraName: camera.name,
    capturedAt: new Date().toISOString(),
  };
  selectedFace.innerHTML = `<img src="${dataUrl}" alt="Selected face crop"><small>Selected from ${escapeHtml(camera.name)}. Enter a name and save.</small>`;
}

function renderFaces() {
  if (!state.knownFaces.length) {
    faceList.innerHTML = '<p class="camera-meta">No named faces saved yet.</p>';
    return;
  }

  faceList.innerHTML = state.knownFaces
    .map(
      (face) => `
        <article class="face-card">
          <img src="${face.dataUrl}" alt="${escapeHtml(face.name)}">
          <strong>${escapeHtml(face.name)}</strong>
          <small>${escapeHtml(face.note || "No note")}</small>
        </article>
      `,
    )
    .join("");
}

cameraForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = cameraUrl.value.trim();
  if (!url) return;
  const camera = createCameraRecord({
    name: cameraName.value.trim() || undefined,
    type: cameraType.value,
    url,
  });
  addCamera(camera);
  cameraForm.reset();
});

addNativeCamera.addEventListener("click", async () => {
  try {
    await addNativeDeviceCamera();
  } catch (error) {
    console.warn("Unable to open native camera", error);
    alert(
      "Could not open the native camera. Check browser permissions and HTTPS/localhost.",
    );
  }
});

runAllNow.addEventListener("click", () =>
  state.cameras.forEach((camera) => analyzeCamera(camera)),
);

faceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.selectedFace) {
    selectedFace.textContent = "Select a face crop from a camera first.";
    return;
  }

  state.knownFaces.unshift({
    id: uid("face"),
    name: faceName.value.trim(),
    note: faceNote.value.trim(),
    dataUrl: state.selectedFace.dataUrl,
    cameraName: state.selectedFace.cameraName,
    capturedAt: state.selectedFace.capturedAt,
  });
  saveJson(FACE_STORE_KEY, state.knownFaces);
  faceForm.reset();
  state.selectedFace = null;
  selectedFace.textContent =
    "Saved. Select another detected face crop when ready.";
  renderFaces();
});

function restoreCameras() {
  const saved = loadJson(CAMERA_STORE_KEY, []);
  saved.forEach((camera) => {
    addCamera(createCameraRecord(camera), false);
  });
  renderEmptyState();
}

renderFaces();
restoreCameras();
loadDetector();
