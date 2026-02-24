# Jeevika - BalanceBite Health Chatbot

A WhatsApp-style web app for BalanceBite by Dietician Aakriti.

## Features
- Text chat with casual + health guidance behavior.
- Voice-call style assistant responses using browser speech synthesis (prefers India voices).
- Multilingual support: English, Hindi, Tamil, Bengali.
- Daily check-in notifications with relaxed, friendly nudges.
- Upload health reports (`.pdf` or image) and get report-prioritized responses.
- Generate and download diet plan PDFs by days, condition, and meal modifications.
- Freemium usage model: 20 free messages, then monthly/yearly subscription buttons.
- Razorpay integration placeholder included for future account credentials.

## Quick preview (local)
Run either option from this folder:

```bash
python3 -m http.server 4173
```

or

```bash
npx serve -l 4173
```

Then open:
- `http://localhost:4173`
- `http://127.0.0.1:4173`

## Notes
- PDF reading uses PDF.js CDN and may require internet.
- Voice quality and language availability depend on installed browser voices.
- This demo keeps data in browser localStorage (no backend yet).
