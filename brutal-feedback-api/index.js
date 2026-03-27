const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";

if (!process.env.OPENAI_API_KEY) {
  console.warn("Missing OPENAI_API_KEY in environment.");
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("Missing ANTHROPIC_API_KEY in environment.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const ok = new Set(["audio/webm", "audio/mp4", "audio/mpeg"]);
    if (!ok.has(file.mimetype)) {
      return cb(
        new Error(
          `Unsupported audio type: ${file.mimetype}. Expected audio/webm, audio/mp4, or audio/mpeg.`
        )
      );
    }
    cb(null, true);
  },
});

const BRUTAL_FEEDBACK_SYSTEM_PROMPT = [
  "You are Brutal Feedback.",
  "Your job: give direct, unfiltered, constructive feedback with no sugarcoating.",
  "Be specific and actionable. If the user is vague, call it out and ask for missing context.",
  "Do not be cruel, discriminatory, or unsafe; be tough but fair.",
  "Output plain text only.",
].join("\n");

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

async function transcribeWithWhisper({ buffer, mimetype, originalname }) {
  const ext =
    mimetype === "audio/webm"
      ? ".webm"
      : mimetype === "audio/mp4"
        ? ".mp4"
        : ".mp3";
  const tmpPath = path.join(
    os.tmpdir(),
    `brutal-feedback-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
  );

  fs.writeFileSync(tmpPath, buffer);
  try {
    const fileStream = fs.createReadStream(tmpPath);
    const res = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: "en",
      // response_format: "text" // default is json with { text }
    });
    const text = (res && res.text ? String(res.text) : "").trim();
    if (!text) throw new Error("Empty transcription returned by Whisper.");
    return text;
  } finally {
    safeUnlink(tmpPath);
  }
}

async function generateBrutalFeedback(transcript) {
  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 700,
    system: BRUTAL_FEEDBACK_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: transcript,
      },
    ],
  });

  const blocks = Array.isArray(msg.content) ? msg.content : [];
  const text = blocks
    .filter((b) => b && b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Empty feedback returned by Claude.");
  return text;
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

app.use((err, req, res, next) => {
  const msg = err && err.message ? err.message : "Internal server error.";
  res.status(500).json({ error: msg });
});

app.listen(PORT, () => {
  console.log(`Brutal Feedback API listening on http://localhost:${PORT}`);
  if (FRONTEND_ORIGIN) console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
  else console.log("CORS dev mode: allowing all origins (set FRONTEND_ORIGIN to restrict).");
});
