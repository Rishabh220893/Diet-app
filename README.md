# Jeevika - BalanceBite Health Chatbot

A WhatsApp-style single-chat interface for BalanceBite by Dietician Aakriti.

## What is fixed
- WhatsApp-only interface (no left sidebar).
- Report attachment moved beside the chat input.
- Subscription moved to assistant details (info button in header).
- Call mode now opens a WhatsApp-like call screen with **Mute**, **Speaker**, and **Hang up** controls.
- Call flow now requests mic permission once and avoids repeated reconnect spam.
- Chat diet-plan request creates a downloadable PDF directly from chat.
- Diet PDF includes full-day meals: breakfast, mid-morning, lunch, evening snack, dinner, bedtime.

## Important for calling
Use a secure context:
- ✅ `http://localhost:4173` or `http://127.0.0.1:4173`
- ❌ `file://.../index.html` (mic/speech recognition is unreliable and often blocked)

## Quick preview
```bash
python3 -m http.server 4173
```
Open `http://127.0.0.1:4173`.

## Usage examples in chat
- `create diet plan for 14 days for diabetes`
- `create meal plan for 7 days for pcos and replace dinner with soup`

## Notes
- PDF read/generation depends on CDN libs (PDF.js/jsPDF).
- Call mode needs browser SpeechRecognition support (Chrome/Edge preferred).
- Voice picks an Indian female profile when available on the user device/browser.
