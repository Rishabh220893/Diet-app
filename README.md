# SceneWatch AI - Multi-camera scene summary app

SceneWatch AI is a browser-based prototype for native phone/desktop camera monitoring and linked CCTV stream review. It can connect multiple cameras at once, run scene analysis every 30 seconds, and summarize people, vehicles, faces, and notable objects.

## Features

- Native phone or desktop camera capture through `getUserMedia`.
- Existing CCTV stream linking through HLS (`.m3u8`), HTTP/MP4/MJPEG gateway URLs, WebRTC embed URLs, or snapshot image URLs.
- Multiple cameras active at the same time, each with an independent 30-second analysis timer.
- People and vehicle detection powered by TensorFlow.js COCO-SSD when the CDN model is available.
- Browser FaceDetector support where available, with face boxes drawn on the camera overlay.
- Face name vault that lets an operator save a selected frame crop with a person's name and note in local browser storage.
- Rolling scene summary cards for each camera plus fleet-level totals.

## Important CCTV notes

Most CCTV/NVR systems expose RTSP streams, but browsers cannot play RTSP directly. To use an existing CCTV camera in this web app, expose it through one of these browser-readable options:

- HLS (`https://.../camera.m3u8`) via your NVR/VMS or an RTSP-to-HLS gateway.
- WebRTC via a camera/VMS web embed URL.
- MJPEG/HTTP video or periodic snapshot URLs with CORS enabled.
- A backend gateway that proxies frames and adds the correct CORS headers.

For real production deployments, keep camera credentials on the server side and protect streams with authentication, HTTPS, audit logging, and retention policies.

## Quick preview

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173` and click **Use phone/desktop camera** or link a camera stream URL.

## Privacy and safety

Face crops are saved only in the current browser's `localStorage` in this prototype. Production face recognition, watchlists, and retention workflows should be reviewed for local privacy, biometric, consent, and security requirements before deployment.
