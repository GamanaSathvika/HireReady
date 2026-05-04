const Groq = require("groq-sdk");
const { GROQ_API_KEY } = require("../config/env");

let groqClient = null;
function getGroq() {
  if (!GROQ_API_KEY) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: GROQ_API_KEY });
  return groqClient;
}

async function summarizeResume(resumeText) {
  const groq = getGroq();
  if (!groq) return null;
  if (!resumeText) return null;

  try {
    const msg = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Summarize this candidate's resume into a 300-500 word Candidate Profile highlighting key skills and experience." },
        { role: "user", content: resumeText }
      ]
    });
    return msg.choices[0]?.message?.content || null;
  } catch (err) {
    console.error("Failed to summarize resume:", err);
    return null;
  }
}

async function summarizeContextAsync(history) {
  const groq = getGroq();
  if (!groq) return null;

  const transcript = history.map(m => `${m.role}: ${m.content}`).join("\\n");
  
  try {
    const msg = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Summarize the key points of this interview conversation so far. Keep it concise." },
        { role: "user", content: transcript }
      ]
    });
    return msg.choices[0]?.message?.content || null;
  } catch (err) {
    console.error("Failed to summarize context:", err);
    return null;
  }
}

async function generateInterviewReplyStream(messages, role, experienceLevel, candidateProfile, signal) {
  const groq = getGroq();
  if (!groq) throw new Error("Missing GROQ_API_KEY.");

  const safeRole = (role || "Software Engineer").toString().trim();
  const safeLevel = (experienceLevel || "Fresher").toString().trim();
  const profile = candidateProfile || "Not provided";

  const system = `You are a professional, rigorous interviewer conducting a mock technical interview for a ${safeRole} position (${safeLevel} level).

CANDIDATE PROFILE:
${profile}

Follow these strict rules for Interview Flow Intelligence:
1. Greet the candidate and reference their profile if available.
2. Ask one question at a time. Wait for a full answer.
3. DO NOT over-explain concepts or teach the candidate. If their answer is shallow or incorrect, do not correct them with a monologue. Instead, ask a probing follow-up or challenge their assumption.
4. Project-Based Questioning: If the candidate mentions a project, you MUST ask follow-up questions about architecture, trade-offs, and implementation details to verify depth of understanding.
5. Probe for depth: Detect shallow responses and dynamically shift to deeper technical questions rather than moving on.
6. If the interview is naturally over or the timer has expired, you MUST say exactly: [INTERVIEW_COMPLETE]

Do not return JSON. Respond with the exact conversational text you want to say to the candidate. Keep it concise, engaging, and professional.`;

  return await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    messages: [{ role: "system", content: system }, ...messages],
    stream: true,
  }, { signal });
}

async function generateFeedbackReport(history, candidateProfile, contextSummary) {
  const groq = getGroq();
  if (!groq) throw new Error("Missing GROQ_API_KEY.");

  const transcript = history.map(m => `${m.role}: ${m.content}`).join("\\n");
  const summary = contextSummary || "None";
  const profile = candidateProfile || "None";

  const system = `You are a strict, senior technical engineering evaluator. Generate a highly detailed feedback report based on the full interview transcript.
  
Follow these evaluation rules:
1. Aggregate insights across the entire session, not just the last question.
2. For every interviewer question, capture the expected answer structure, compare it against the actual response, and detail coverage, gaps, and misconceptions.
3. Replace generic scoring with rubric-based evaluation (1-10 scale). Ensure scores correlate with answer quality, not length.
4. Needs Improvement must reference a specific mistake or gap from the transcript and suggest a concrete way to improve it.
5. Strengths and Weaknesses must be specific and evidence-based.

YOU MUST RETURN STRICT JSON IN THIS EXACT FORMAT:
{
  "overallScore": 8,
  "technicalScore": 7,
  "communicationScore": 8,
  "problemSolvingScore": 6,
  "confidenceScore": 7,
  "strengths": ["Demonstrated strong understanding of X based on Y", "Clear communication of Z"],
  "weaknesses": ["Missed edge cases in Q", "Struggled with the depth of W"],
  "missedOpportunities": ["Could have elaborated on architecture trade-offs when discussing project V"],
  "questionEvaluations": [
    {
      "question": "What happens when you type a URL into the browser?",
      "expectedStructure": "DNS resolution, TCP handshake, HTTP request, Server response, DOM rendering",
      "actualResponse": "The browser sends a request to the server and gets HTML.",
      "coverage": "HTTP request, Server response",
      "gaps": "Missed DNS resolution, TCP handshake, and rendering pipeline",
      "misconceptions": "None, but extremely shallow"
    }
  ],
  "needsImprovement": [
    {
      "mistake": "Failed to explain the event loop when asked about Node.js concurrency",
      "recommendation": "Review the phases of the Node.js event loop and how microtasks are prioritized over macrotasks."
    }
  ]
}`;

  const msg = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096, // Increased to support detailed evaluations
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Profile: ${profile}\nSummary: ${summary}\nFull Transcript:\n${transcript}` }
    ],
    response_format: { type: "json_object" }
  });

  const parsed = JSON.parse(msg?.choices?.[0]?.message?.content?.trim() || "{}");
  if (!parsed.overallScore || !parsed.questionEvaluations) throw new Error("Invalid feedback format from AI.");
  return parsed;
}

module.exports = {
  summarizeResume,
  summarizeContextAsync,
  generateInterviewReplyStream,
  generateFeedbackReport
};
