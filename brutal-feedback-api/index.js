const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dotenv = require("dotenv");

// Load root .env first, then API .env. Use override so file values win over the OS
// environment (e.g. empty GROQ_API_KEY set in Windows would otherwise block dotenv).
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

const groq = new Groq({ apiKey: GROQ_API_KEY });

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server / curl (no Origin header)
      if (!origin) return cb(null, true);
      // In dev, allow all origins unless FRONTEND_ORIGIN is set
      if (!FRONTEND_ORIGIN) return cb(null, true);
      if (origin === FRONTEND_ORIGIN) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"), false);
    },
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB safety cap
  },
  fileFilter: (req, file, cb) => {
    const baseMime = String(file.mimetype || "").split(";")[0].trim();
    const ok = new Set(["audio/webm", "audio/mp4", "audio/mpeg"]);
    if (!ok.has(baseMime)) {
      return cb(
        new Error(
          `Unsupported audio type: ${file.mimetype}. Expected audio/webm, audio/mp4, or audio/mpeg.`
        )
      );
    }
    cb(null, true);
  },
});

const BRUTAL_FEEDBACK_SYSTEM_PROMPT =
  "You are a tough but fair startup investor doing a 60-second pitch evaluation. The person has just finished their pitch — treat whatever they said as their complete pitch, do not ask for more information. Evaluate it as-is. Be direct and specific: what is weak, what is missing, what would make an investor walk away. If they were vague, tell them vagueness kills deals. If they didn't mention the problem, market size, or differentiation, call each one out by name. End with the single most important thing they must fix. Keep it under 120 words.";

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

async function transcribeWithWhisper({ buffer, mimetype, originalname }) {
  if (!GROQ_API_KEY) {
    throw new Error(
      "Server misconfigured: missing GROQ_API_KEY (required for Whisper transcription)."
    );
  }

  const baseMime = String(mimetype || "").split(";")[0].trim();

  const ext =
    baseMime === "audio/webm"
      ? ".webm"
      : baseMime === "audio/mp4"
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
    throw new Error(`Whisper transcription failed (${res.status} ${res.statusText})${snippet}`);
  }

  const data = await res.json();
  const text = (data && (data.text || data?.transcription || "")).toString().trim();
  if (!text) throw new Error("Empty transcription returned by Whisper.");
  return text;
}

async function generateBrutalFeedback(transcript) {
  if (!GROQ_API_KEY) {
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
  if (!text) throw new Error("Empty feedback returned by Claude.");
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
  if (!GROQ_API_KEY) {
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
3. Ask 3-5 technical questions specific to the projects they mentioned AND relevant to the ${safeRole} role - for example if they apply for Frontend Developer ask about DOM, rendering, state management; for Data Analyst ask about SQL, data cleaning, visualization choices; tailor every question to the role.
4. Ask one question at a time. Do not proceed until you have a full answer.
5. If an answer is vague, ask one specific follow-up.
6. Stay in interviewer character. No feedback mid-interview.
7. When all questions are done, say exactly: INTERVIEW COMPLETE

On INTERVIEW COMPLETE generate a feedback report with:
- Overall Score (out of 10)
- Communication: filler word count by word, clarity, pace
- Structure: did answers follow situation -> action -> result
- Technical Depth: how well they explained decisions relevant to ${safeRole}
- Confidence: hedging, incomplete sentences, self-corrections
- Question-by-Question Breakdown
- Top 3 Things to Fix: specific and actionable`;

  const messages = [{ role: "system", content: system }, ...history];
  console.log("Messages sent:", JSON.stringify(messages));
  let msg;
  try {
    msg = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 250,
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

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/feedback", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(500).json({ error: "Missing required form field: audio" });
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
    const msg = err && err.message ? err.message : "Claude feedback generation failed.";
    return res
      .status(200)
      .json({ transcript, feedback: `ERROR: ${msg}` });
  }
});

app.post("/interview", upload.fields([{ name: "audio", maxCount: 1 }]), async (req, res) => {
  const audioFile = req?.files?.audio?.[0];
  const role = (req?.body?.role || "").toString();
  const experienceLevel = (req?.body?.experienceLevel || "").toString();
  const incomingMessage = (req?.body?.message || "").toString();
  const timerExpired = String(req?.body?.timerExpired || "false").toLowerCase() === "true";

  let transcript = "";
  if (audioFile) {
    try {
      transcript = await transcribeWithWhisper({
        buffer: audioFile.buffer,
        mimetype: audioFile.mimetype,
        originalname: audioFile.originalname,
      });
      console.log("Transcribed:", transcript);
    } catch (err) {
      const msg = err && err.message ? err.message : "Whisper transcription failed.";
      return res.status(500).json({ error: msg });
    }
  } else if (timerExpired && incomingMessage.trim()) {
    transcript = incomingMessage.trim();
  } else {
    return res.status(500).json({ error: "Missing required form field: audio" });
  }

  let history = parseHistory(req?.body?.history);

  if (typeof transcript !== "string" || transcript.trim() === "") {
    return res.status(200).json({
      transcript: "",
      reply: "No speech detected. Please try again.",
      history,
      done: false,
    });
  }

  const exchangeCount = history.filter((m) => m.role === "user").length;
  history = [...history, { role: "user", content: transcript }];

  try {
    const reply = await generateInterviewReply(history, role, experienceLevel);
    history = [...history, { role: "assistant", content: reply }];
    const interviewDone = timerExpired || reply.includes("INTERVIEW COMPLETE");
    // Allow longer sessions (~10+ min voice); cap avoids runaway loops only.
    const hitSoftTurnCap = exchangeCount >= 30;
    const done = interviewDone || hitSoftTurnCap;

    const response = {
      transcript,
      message: reply,
      reply,
      history,
      interviewDone,
      done,
    };
    console.log("API raw response:", response);
    return res.status(200).json(response);
  } catch (err) {
    const msg = err && err.message ? err.message : "Groq interview reply failed.";
    const reply = `ERROR: ${msg}`;
    history = [...history, { role: "assistant", content: reply }];
    const response = {
      transcript,
      message: reply,
      reply,
      history,
      interviewDone: false,
      done: false,
    };
    console.log("API raw response:", response);
    return res.status(200).json(response);
  }
});

app.use((err, req, res, next) => {
  const msg = err && err.message ? err.message : "Internal server error.";
  res.status(500).json({ error: msg });
});

const server = app.listen(PORT, () => {
  console.log(`Brutal Feedback API listening on http://localhost:${PORT}`);
  if (FRONTEND_ORIGIN) console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
  else console.log("CORS dev mode: allowing all origins (set FRONTEND_ORIGIN to restrict).");
  console.log("Leave this terminal open while you use the app (closing it stops the API).");
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
