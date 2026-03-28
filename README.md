# HireReady

Voice-first tools to help candidates **practice interviews** and **get blunt, actionable feedback** — without scheduling a human coach for every session.

---

## Problem Statement

- **Interview anxiety and unpreparedness** — Many candidates struggle to articulate answers under time pressure, especially for role-specific technical and behavioral questions.
- **Expensive or scarce mock interviews** — Real mock panels are hard to book, and generic advice doesn't map cleanly to a chosen role or experience level.
- **Weak pitch feedback** — Short pitches (e.g. startup or product ideas) often lack honest, structured critique on clarity, market, and differentiation.
- **Friction in practice loops** — If recording, transcribing, and analyzing answers is slow or clunky, people practice less.

HireReady targets a tight loop: **speak naturally in the browser → accurate transcript → AI interviewer or investor-style feedback** — so users can iterate quickly.

---

## What It Does

| Capability | Description |
|---|---|
| **AI Mock Interview** | Timed session where the user picks a role, experience level, and session length. The app records voice turns, sends audio to the API, and plays the interviewer's reply with text-to-speech. Conversation history is maintained across turns. When the interview ends, a structured feedback report is shown with scores, breakdown, and top fixes. |
| **Live Closed Captions** | While recording, the browser's Web Speech API shows live captions in parallel with MediaRecorder. Captions are display-only — the official transcript still comes from Whisper on the server. |
| **Brutal Pitch Feedback** | Separate flow: record a short voice pitch, the API transcribes it and returns tough but fair investor-style written feedback via `POST /feedback`. |

> The **primary frontend** is the React app in `frontend/`. The `brutal-feedback-web/` folder is an optional static HTML prototype useful for quick API checks — not the main UI.

---

## Tech Stack

### Backend — `brutal-feedback-api/`

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| HTTP Framework | Express 5 |
| File Uploads | Multer (in-memory, with audio size cap) |
| Speech-to-Text | Groq — Whisper `whisper-large-v3` |
| AI Interviewer | Groq — Llama 3.3 70B `llama-3.3-70b-versatile` |
| SDK | groq-sdk |
| Config | dotenv |
| CORS | cors middleware (optional lock-down via `FRONTEND_ORIGIN`) |

**API Routes**

| Route | Purpose |
|---|---|
| `GET /health` | Liveness check + confirms `GROQ_API_KEY` is set |
| `POST /interview` | Multipart: `audio`, `history`, `role`, `experienceLevel` → transcript + interviewer reply + updated history |
| `POST /feedback` | Multipart: `audio` → transcript + brutal pitch feedback |

---

### Frontend — `frontend/` (Primary)

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Voice / Audio | MediaRecorder + getUserMedia (`useMediaRecorder` hook) |
| API Client | `src/utils/api.js` |

**Screens**

| Screen | Purpose |
|---|---|
| `LandingScreen` | Role picker, difficulty, focus area, strictness, duration |
| `InterviewScreen` | Live interview — mic button, waveform, AI speaking state |
| `ProcessingScreen` | Loading state while waiting for backend response |
| `FeedbackScreen` | Results — scores, transcript with filler word highlights, brutal feedback, tips |
| `LoginScreen` / `SignupScreen` | Auth shells (built, ready to connect) |

---

### Static Prototype — `brutal-feedback-web/` (Optional)

A single `index.html` file — no bundler needed. Useful for smoke testing the API without running the full React app. Open in Chrome or Edge for best mic and speech API support.

---

## Repository Layout

```
HireReady/
├── .env.example                  # Copy to root .env or brutal-feedback-api/.env
├── README.md
├── brutal-feedback-api/          # Express API (Groq Whisper + Llama)
├── frontend/                     # React + Vite — main frontend
└── brutal-feedback-web/          # Optional static HTML prototype
```

---

## Prerequisites

- **Node.js** (LTS recommended) and npm
- A **Groq API key** from [console.groq.com/keys](https://console.groq.com/keys) — used for both Whisper transcription and Llama chat completions

---

## Environment Variables

Copy `.env.example` to the repo root or to `brutal-feedback-api/.env`:

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Yes | Whisper transcription + Llama chat |
| `PORT` | No | API port (default: `3001`) |
| `FRONTEND_ORIGIN` | No | If set, CORS only allows this origin — leave unset for dev |
| `VITE_API_BASE` | No | Points the React app at the API (e.g. `http://localhost:3001`) |

---

## Running Locally

### 1. Start the API

```bash
cd brutal-feedback-api
npm install
npm start
```

Server runs at **http://localhost:3001** — verify with `GET /health`.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**). Set `VITE_API_BASE` in `frontend/.env` if the API is on a different port.

### 3. Static Prototype (Optional)

Open `brutal-feedback-web/index.html` directly in Chrome or Edge. Align `API_BASE` inside the file with your running API. Use a simple static server instead of `file://` to avoid browser mic and CORS restrictions.

---

## Security Notes

- **Never expose `GROQ_API_KEY` in frontend code** — it must stay on the server only.
- **Audio is never written to disk** — Multer uses in-memory storage; audio is transcribed and discarded.
- **Live captions** use the browser's built-in speech engine (often cloud-backed) and are display-only — they never reach your backend.
- **Groq usage** is subject to their free tier quotas and terms of service.
