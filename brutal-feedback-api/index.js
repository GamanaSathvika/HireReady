const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Groq = require("groq-sdk");

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";
const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
console.log("Key loaded:", !!GROQ_API_KEY);

if (!GROQ_API_KEY) {
  console.warn("Missing GROQ_API_KEY in environment.");
}

let groqClient = null;
function getGroq() {
  if (!GROQ_API_KEY) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: GROQ_API_KEY });
  return groqClient;
}

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!FRONTEND_ORIGIN) return cb(null, true);
      if (origin === FRONTEND_ORIGIN) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"), false);
    },
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const baseMime = String(file.mimetype || "").split(";")[0].trim();
    const ok = new Set([
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "video/webm",
      "video/mp4",
    ]);
    if (!ok.has(baseMime)) {
      return cb(
        new Error(
          `Unsupported audio type: ${file.mimetype}. Expected audio/webm, audio/mp4, audio/mpeg, video/webm, or video/mp4.`
        )
      );
    }
    cb(null, true);
  },
});

const BRUTAL_FEEDBACK_SYSTEM_PROMPT = `You are a brutal but fair technical interviewer.
The candidate has just answered an interview question.
Evaluate their answer directly — no sugarcoating.
Call out vague language, missing specifics, and weak structure.
If they used filler words or hedged too much, name them explicitly.
If they gave a strong answer, acknowledge what worked and still push them to go deeper.
End with the single most important thing they must fix.
Keep it under 120 words.`;

async function transcribeWithWhisper({ buffer, mimetype, originalname }) {
  if (!GROQ_API_KEY) {
    throw new Error(
      "Server misconfigured: missing GROQ_API_KEY (required for Whisper transcription)."
    );
  }

  const baseMime = String(mimetype || "").split(";")[0].trim();

  const ext =
    baseMime === "audio/webm" || baseMime === "video/webm"
      ? ".webm"
      : baseMime === "audio/mp4" || baseMime === "video/mp4"
        ? ".mp4"
        : ".mp3";

  const filename = originalname || `recording${ext}`;
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: baseMime }), filename);
  form.append("model", "whisper-large-v3");
  form.append("language", "en");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: form,
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const snippet = bodyText ? `: ${bodyText.slice(0, 300)}` : "";
    throw new Error(
      `Whisper transcription failed (${res.status} ${res.statusText})${snippet}`
    );
  }

  const data = await res.json();
  const text = (data && (data.text || data?.transcription || "")).toString().trim();
  if (!text) throw new Error("Empty transcription returned by Whisper.");
  return text;
}

async function generateBrutalFeedback(transcript) {
  const groq = getGroq();
  if (!groq) {
    throw new Error(
      "Server misconfigured: missing GROQ_API_KEY (required for Groq feedback generation)."
    );
  }

  const msg = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 700,
    messages: [
      { role: "system", content: BRUTAL_FEEDBACK_SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ],
  });

  const text = msg?.choices?.[0]?.message?.content?.toString().trim() || "";
  if (!text) throw new Error("Empty feedback returned by Groq.");
  return text;
}

function parseHistory(jsonString) {
  if (typeof jsonString !== "string" || jsonString.trim() === "") return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .map((m) => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

async function generateInterviewReply(history, role, experienceLevel) {
  const groq = getGroq();
  if (!groq) {
    throw new Error(
      "Server misconfigured: missing GROQ_API_KEY (required for Groq interview replies)."
    );
  }

  const safeRole = (role || "Software Engineer").toString().trim();
  const safeLevel = (experienceLevel || "Fresher").toString().trim();

  const system = `You are a professional interviewer conducting a mock technical interview for a ${safeRole} position (${safeLevel} level).

Follow this exact flow:
1. Greet the candidate and ask them to introduce themselves.
2. Ask them to describe their projects.
3. Ask 3-5 technical questions specific to the projects they mentioned AND relevant to the ${safeRole} role — for example if they apply for Frontend Developer ask about DOM, rendering, state management; for Data Analyst ask about SQL, data cleaning, visualization choices; tailor every question to the role.
4. Ask one question at a time. Do not proceed until you have a full answer.
5. If an answer is vague, ask one specific follow-up.
6. Stay in interviewer character. No feedback mid-interview.
7. When all questions are done, say exactly: INTERVIEW COMPLETE

On INTERVIEW COMPLETE generate a feedback report with these exact headings:
- Overall Score (out of 10)
- Communication: filler word count by word, clarity, pace
- Structure: did answers follow situation -> action -> result
- Technical Depth: how well they explained decisions relevant to ${safeRole}
- Confidence: hedging, incomplete sentences, self-corrections
- Question-by-Question Breakdown
- Top 3 Things to Fix: specific and actionable`;

  const messages = [{ role: "system", content: system }, ...history];

  let msg;
  try {
    msg = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      messages,
      stream: false,
    });
  } catch (err) {
    console.error("Groq interview API call failed:", err);
    throw err;
  }

  const reply = msg?.choices?.[0]?.message?.content?.toString().trim() || "";
  if (!reply) throw new Error("Empty interview reply returned by Groq.");
  return reply;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (req, res) => {
  res.json({ ok: true, groqConfigured: Boolean(GROQ_API_KEY) });
});

app.post("/feedback", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing required form field: audio" });
  }

  let transcript = "";
  try {
    transcript = await transcribeWithWhisper({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });
  } catch (err) {
    const msg = err && err.message ? err.message : "Whisper transcription failed.";
    return res.status(500).json({ error: msg });
  }

  if (typeof transcript !== "string" || transcript.trim() === "") {
    return res
      .status(200)
      .json({ transcript: "", feedback: "No speech detected. Please try again." });
  }

  try {
    const feedback = await generateBrutalFeedback(transcript);
    return res.status(200).json({ transcript, feedback });
  } catch (err) {
    const msg = err && err.message ? err.message : "Groq feedback generation failed.";
    return res.status(200).json({ transcript, feedback: `ERROR: ${msg}` });
  }
});

app.post(
  "/interview",
  upload.fields([{ name: "audio", maxCount: 1 }]),
  async (req, res) => {
    const audioFile = req?.files?.audio?.[0];
    const role = (req?.body?.role || "").toString();
    const experienceLevel = (req?.body?.experienceLevel || "").toString();
    const incomingMessage = (req?.body?.message || "").toString().trim();
    const timerExpired =
      String(req?.body?.timerExpired || "false").toLowerCase() === "true";

    let transcript = "";

    if (audioFile) {
      // Normal path — audio blob uploaded
      try {
        transcript = await transcribeWithWhisper({
          buffer: audioFile.buffer,
          mimetype: audioFile.mimetype,
          originalname: audioFile.originalname,
        });
      } catch (err) {
        const msg =
          err && err.message ? err.message : "Whisper transcription failed.";
        return res.status(500).json({ error: msg });
      }
    } else if (timerExpired && incomingMessage) {
      // Timer expired — use the last typed/sent message as the transcript
      transcript = incomingMessage;
    } else if (timerExpired && !incomingMessage) {
      // Timer expired but nothing to process — end the interview gracefully
      return res.status(200).json({
        transcript: "",
        reply: "INTERVIEW COMPLETE",
        message: "INTERVIEW COMPLETE",
        history: parseHistory(req?.body?.history),
        interviewDone: true,
        done: true,
      });
    } else {
      // No audio and not a timer expiry — real missing field error
      return res.status(400).json({
        error: "Missing required form field: audio",
      });
    }

    let history = parseHistory(req?.body?.history);

    if (typeof transcript !== "string" || transcript.trim() === "") {
      return res.status(200).json({
        transcript: "",
        reply: "No speech detected. Please try again.",
        message: "No speech detected. Please try again.",
        history,
        interviewDone: false,
        done: false,
      });
    }

    const exchangeCount = history.filter((m) => m.role === "user").length;
    history = [...history, { role: "user", content: transcript }];

    try {
      const reply = await generateInterviewReply(history, role, experienceLevel);
      history = [...history, { role: "assistant", content: reply }];

      const interviewDone = timerExpired || reply.includes("INTERVIEW COMPLETE");
      const hitSoftTurnCap = exchangeCount >= 20;
      const done = interviewDone || hitSoftTurnCap;

      return res.status(200).json({
        transcript,
        message: reply,
        reply,
        history,
        interviewDone,
        done,
      });
    } catch (err) {
      const msg =
        err && err.message ? err.message : "Groq interview reply failed.";
      const reply = `ERROR: ${msg}`;
      history = [...history, { role: "assistant", content: reply }];

      return res.status(200).json({
        transcript,
        message: reply,
        reply,
        history,
        interviewDone: false,
        done: false,
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  const msg = err && err.message ? err.message : "Internal server error.";
  res.status(500).json({ error: msg });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`Brutal Feedback API listening on http://localhost:${PORT}`);
  if (FRONTEND_ORIGIN)
    console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
  else
    console.log(
      "CORS dev mode: allowing all origins (set FRONTEND_ORIGIN to restrict)."
    );
  console.log(
    "Leave this terminal open while you use the app (closing it stops the API)."
  );
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process using it, or set PORT in .env to a free port.`
    );
  } else {
    console.error("Server failed to start:", err);
  }
  process.exit(1);
});