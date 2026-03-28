# HireReady

Voice-first tools to help candidates **practice interviews** and **get blunt, actionable feedback**—without scheduling a human coach for every run.

---

## Problem statement

- **Interview anxiety and unpreparedness** — Many candidates struggle to articulate answers under time pressure, especially for role-specific technical and behavioral questions.
- **Expensive or scarce mock interviews** — Real mock panels are hard to book; generic advice does not map cleanly to a chosen role or experience level.
- **Weak pitch feedback** — Short pitches (e.g. startup or product ideas) often lack honest, structured critique on clarity, market, and differentiation.
- **Friction in practice loops** — If recording, transcribing, and analyzing answers is slow or clunky, people practice less.

HireReady targets a tight loop: **speak naturally in the browser → accurate transcript → AI interviewer or investor-style feedback** so users can iterate quickly.

---

## Solution

| Capability | What it does |
|------------|----------------|
| **AI mock interview** | Timed session: user picks **role** (curated job titles), **experience level**, and **session length**. The app records voice turns, sends audio to the API, and plays the interviewer’s reply with **text-to-speech**. Conversation history is kept server-side in the request/response cycle. When the interview completes (or time runs out), a structured **feedback report** is shown (scores, breakdown, top fixes). |
| **Live closed captions (client-only)** | While recording, the browser’s **Web Speech API** (`SpeechRecognition`) shows **live captions** in parallel with `MediaRecorder`. Captions are **display-only**; the official transcript for the UI still comes from **Whisper** on the server. |
| **Brutal feedback (pitch)** | Separate flow: upload a short voice recording; the API transcribes it and returns **tough but fair** investor-style written feedback (`POST /feedback`). |

The **product frontend** is the **React** app in **`frontend/`** (Vite, screens for landing, interview, feedback, auth-style flows, voice UI). The **`brutal-feedback-web/`** folder is an optional **static HTML** prototype (single `index.html`) you can open or serve without a build step—useful for quick API checks, not the main UI.

---

## Tech stack

### Backend — `brutal-feedback-api/`

| Layer | Choice |
|--------|--------|
| Runtime | **Node.js** |
| HTTP | **Express 5** |
| Uploads | **Multer** (in-memory, audio size cap) |
| AI / speech | **Groq** — **Whisper** (`whisper-large-v3`) for transcription; **Llama 3.3 70B** (`llama-3.3-70b-versatile`) for chat completions |
| SDK | **groq-sdk** |
| Config | **dotenv** (loads root `.env` then `brutal-feedback-api/.env`) |
| CORS | **cors** (optional lock-down via `FRONTEND_ORIGIN`) |

**Key routes**

- `GET /health` — liveness + whether `GROQ_API_KEY` is set  
- `POST /interview` — multipart: `audio`, `history`, `role`, `experienceLevel`, `message`, `timerExpired` → transcript + interviewer reply + updated history  
- `POST /feedback` — multipart: `audio` → transcript + brutal pitch feedback  

### Frontend — `frontend/` (primary)

| Layer | Choice |
|--------|--------|
| Framework | **React 19** |
| Build / dev | **Vite 8** |
| Styling | **Tailwind CSS 4** |
| Motion | **Framer Motion** |
| Voice / audio | **MediaRecorder** + **getUserMedia** (e.g. `useMediaRecorder`), timers, API client in `src/utils/api.js` |
| Structure | Screen-based app: landing, interview, processing, feedback, login/signup shells (`src/screens/`, `src/components/`) |

Point the app at the API with **`VITE_API_BASE`** (see [Environment variables](#environment-variables)).

### Static prototype — `brutal-feedback-web/` (optional)

| Layer | Choice |
|--------|--------|
| UI | Single-file **HTML/CSS/JS** (no bundler)—reference or smoke-test against the API |
| Audio / speech | **MediaRecorder**, optional **Web Speech** captions + **speechSynthesis** (features may differ from the React app) |
| API | Hard-coded or editable `API_BASE` toward `brutal-feedback-api` |

### Repository layout

```
HireReady/
├── .env.example              # Copy to root `.env` or `brutal-feedback-api/.env`
├── README.md                 # This file
├── brutal-feedback-api/      # Express API (Groq Whisper + chat)
├── frontend/                 # React + Vite — main frontend
└── brutal-feedback-web/      # Optional static HTML prototype (index.html)
```

---

## Prerequisites

- **Node.js** (LTS recommended) and npm  
- A **Groq API key** ([Groq Console](https://console.groq.com/keys)) for Whisper + Llama  

---

## Environment variables

Copy `.env.example` to the repo root as `.env` and/or create `brutal-feedback-api/.env`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | Yes | Whisper transcription + Groq chat |
| `PORT` | No | API port (default **3001**) |
| `FRONTEND_ORIGIN` | No | If set, CORS allows only this origin (otherwise dev allows all) |
| `VITE_API_BASE` | No | Used by `frontend/` when pointing the UI at the API |

---

## Run locally

### 1. API

```bash
cd brutal-feedback-api
npm install
npm run start
```

Server: **http://localhost:3001** (verify with `GET /health`).

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**). Set **`VITE_API_BASE`** in `frontend/.env` if the API is not at the default (e.g. `http://localhost:3001`). For CORS in production-like setups, set **`FRONTEND_ORIGIN`** on the API to match your Vite origin.

### 3. Static prototype (optional)

To run the legacy single-page demo without Node for the UI, open or serve **`brutal-feedback-web/index.html`** and align **`API_BASE`** inside the file with your API. Prefer **Chrome or Edge** if you rely on advanced mic / speech APIs there.

If you open the file as `file://`, some browsers restrict the microphone or CORS; a simple static server avoids that.

---

## Security and limitations notes

- **API key** must stay on the server; never embed `GROQ_API_KEY` in front-end code.  
- **Live captions** (where implemented, e.g. static prototype) use the browser’s speech engine (often cloud-backed); they are **not** sent to your backend and can differ from Whisper.  
- **Groq** usage is subject to their quotas and terms.  

---

## License

See package metadata in `brutal-feedback-api/package.json` and `frontend/package.json` if you add a project-wide license file later.
