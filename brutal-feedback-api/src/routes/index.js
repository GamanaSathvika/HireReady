const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const interviewController = require("../controllers/interviewController");
const feedbackController = require("../controllers/feedbackController");
const { requireAuth } = require("../middleware/authMiddleware");
const authRouter = require("./auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();
router.use("/api/auth", authRouter);

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  message: { error: "Feedback generation limit exceeded. Try again later." }
});

router.get("/health", (req, res) => {
  const { GROQ_API_KEY } = require("../config/env");
  res.json({ ok: true, groqConfigured: Boolean(GROQ_API_KEY) });
});

router.post("/api/sessions/init", requireAuth, interviewController.initSession);
router.post("/api/interview/respond-stream", upload.fields([{ name: "audio", maxCount: 1 }]), interviewController.respondToInterviewStream);
router.post("/api/interview/generate-feedback", requireAuth, feedbackLimiter, feedbackController.generateFeedback);

module.exports = router;
