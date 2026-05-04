const fs = require("node:fs/promises");
const { GROQ_API_KEY } = require("../config/env");

async function transcribeWithWhisper({ path, mimetype, originalname }) {
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
  const fileBuffer = await fs.readFile(path);
  
  const form = new FormData();
  form.append("file", new Blob([fileBuffer], { type: baseMime }), filename);
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

module.exports = {
  transcribeWithWhisper
};
