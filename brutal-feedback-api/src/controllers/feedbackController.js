const groqService = require('../services/groqService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateFeedback(req, res) {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        feedback: true
      }
    });

    if (!session) return res.status(404).json({ error: "Session not found" });
    
    // Automatically mark as complete if the user forces feedback generation
    if (!session.isComplete) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { isComplete: true, completedAt: new Date() }
      });
      session.isComplete = true;
    }
    if (session.feedback) return res.status(200).json(session.feedback); // Return existing

    const history = session.messages.map(m => ({ role: m.role, content: m.content }));
    // We pass full history now for accurate evaluation
    const fullHistory = history;

    const report = await groqService.generateFeedbackReport(
      fullHistory,
      session.candidateProfile,
      session.contextSummary
    );

    const savedFeedback = await prisma.feedback.create({
      data: {
        sessionId,
        overallScore: report.overallScore,
        technicalScore: report.technicalScore || 0,
        communicationScore: report.communicationScore || 0,
        problemSolvingScore: report.problemSolvingScore || 0,
        confidenceScore: report.confidenceScore || 0,
        strengths: report.strengths || [],
        weaknesses: report.weaknesses || [],
        missedOpportunities: report.missedOpportunities || [],
        questionEvaluations: report.questionEvaluations || [],
        needsImprovement: report.needsImprovement || []
      }
    });

    return res.status(200).json(savedFeedback);
  } catch (error) {
    console.error("Feedback generation failed:", error);
    return res.status(500).json({ error: error.message || "Failed to generate feedback report." });
  }
}

module.exports = { generateFeedback };
