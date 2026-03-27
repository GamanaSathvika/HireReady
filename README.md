# HireReady

## Brutal Feedback (v1)

A voice-powered feedback tool: record audio in the browser → Whisper transcription (Groq) → “Brutal Feedback” (Groq).

### Backend (API)

- **Location**: `brutal-feedback-api/`
- **Endpoint**: `POST /feedback` (multipart/form-data: `audio`)
- **Response 200**:

```json
{ "transcript": "string", "feedback": "string" }
```

- **Response 500**:

```json
{ "error": "string" }
```

### Run locally

1) Create `brutal-feedback-api/.env` (copy from `.env.example`) and set:

- `GROQ_API_KEY`

2) Start the API:

```bash
cd brutal-feedback-api
npm install
npm run start
```

API listens on `http://localhost:3001`.

### Frontend (no-build demo)

- **Location**: `brutal-feedback-web/index.html`
- Open the file in a browser, record audio, and submit.
- If you run into CORS issues, set `FRONTEND_ORIGIN` in `brutal-feedback-api/.env` to your frontend origin.