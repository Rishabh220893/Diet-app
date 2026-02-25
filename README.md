# Jeevika - BalanceBite Health Chatbot

A WhatsApp-style single-chat interface for BalanceBite by Dietician Aakriti.

## What is fixed
- WhatsApp-only interface (no left sidebar).
- Report attachment moved beside the chat input.
- Subscription moved to assistant details (info button in header).
- Call mode now supports back-and-forth voice conversation (speech recognition + spoken replies).
- Chat diet-plan request now creates a downloadable PDF directly from chat.
- Diet PDF includes full-day meals: breakfast, mid-morning, lunch, evening snack, dinner, bedtime.

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
- Voice picked with preference for Indian female voice when available on the device/browser.
