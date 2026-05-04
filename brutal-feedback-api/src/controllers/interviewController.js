const fs = require("node:fs/promises");
const audioService = require("../services/audioService");
const groqService = require("../services/groqService");
const resumeService = require("../services/resumeService");
const crypto = require("crypto");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initSession(req, res) {
  const { role, experienceLevel, jobDescription } = req.body;
  const resumeFile = req.files?.resume?.[0];

  let candidateProfile = null;
  if (resumeFile) {
    try {
      const resumeText = await resumeService.parseResume(resumeFile.path);
      candidateProfile = await groqService.summarizeResume(resumeText);
    } catch (err) {
      console.error("Resume parse error", err);
    } finally {
      await fs.unlink(resumeFile.path).catch(console.error);
    }
  }

  // Combine JD and Resume profile if available
  let finalProfile = candidateProfile || "";
  if (jobDescription) {
    finalProfile += `\nJob Description Context:\n${jobDescription}`;
  }

  try {
    const session = await prisma.session.create({
      data: {
        userId: req.user.id,
        role: role || "Software Engineer",
        experienceLevel: experienceLevel || "Fresher",
        candidateProfile: finalProfile.trim() || null
      }
    });

    res.status(200).json({ sessionId: session.id, message: "Session initialized" });
  } catch (err) {
    console.error("Session init error:", err);
    res.status(500).json({ error: "Failed to initialize session" });
  }
}

async function respondToInterviewStream(req, res) {
  const { sessionId, textMessage } = req.body;
  const audioFile = req.files?.audio?.[0];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendSSE = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
  });

  if (!sessionId) {
    sendSSE("error", { message: "Missing sessionId" });
    return res.end();
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!session) {
      sendSSE("error", { message: "Session not found" });
      return res.end();
    }

    sendSSE("status", { message: "Transcribing audio..." });

    let transcript = "";
    if (textMessage) {
      transcript = textMessage;
    } else if (audioFile) {
      try {
        transcript = await audioService.transcribeWithWhisper({
          path: audioFile.path,
          mimetype: audioFile.mimetype,
          originalname: audioFile.originalname,
        });
      } finally {
        await fs.unlink(audioFile.path).catch(console.error);
      }
    }

    if (!transcript) {
      sendSSE("error", { message: "No speech detected." });
      return res.end();
    }

    sendSSE("transcript", { text: transcript });
    sendSSE("status", { message: "Generating response..." });

    let contextHistory = session.messages.map(m => ({ role: m.role, content: m.content }));
    if (session.contextSummary) {
      contextHistory = session.messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      contextHistory.unshift({ role: "system", content: `PREVIOUS CONTEXT SUMMARY: ${session.contextSummary}` });
    }
    contextHistory.push({ role: "user", content: transcript });

    const stream = await groqService.generateInterviewReplyStream(
      contextHistory,
      session.role,
      session.experienceLevel,
      session.candidateProfile,
      abortController.signal
    );

    let fullReply = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullReply += content;
      if (content) {
        sendSSE("chunk", { content });
      }
    }

    const isComplete = fullReply.includes("[INTERVIEW_COMPLETE]");

    // Write to DB AFTER stream ends
    await prisma.message.createMany({
      data: [
        { sessionId, role: "user", content: transcript },
        { sessionId, role: "assistant", content: fullReply }
      ]
    });

    if (isComplete) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { isComplete: true, completedAt: new Date() }
      });
    } else {
      // Async background summarization
      triggerBackgroundSummarization(sessionId);
    }

    sendSSE("end", {});
    res.end();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log("Client disconnected, stream aborted.");
    } else {
      console.error(err);
      sendSSE("error", { message: "Something went wrong. Please try again." });
      res.end();
    }
  }
}

async function triggerBackgroundSummarization(sessionId) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!session || session.messages.length <= 10) return;

    // Use current messages count as a simple versioning check
    const currentMessageCount = session.messages.length;

    const summary = await groqService.summarizeContextAsync(
      session.messages.map(m => ({ role: m.role, content: m.content }))
    );

    if (summary) {
      // Only update if no new messages have been added while summarizing
      const checkSession = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { _count: { select: { messages: true } } }
      });

      if (checkSession._count.messages === currentMessageCount) {
        await prisma.session.update({
          where: { id: sessionId },
          data: { contextSummary: summary, summaryUpdatedAt: new Date() }
        });
      }
    }
  } catch (err) {
    console.error("Background summarization failed:", err);
  }
}

module.exports = {
  initSession,
  respondToInterviewStream
};
