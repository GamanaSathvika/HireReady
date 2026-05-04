const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../..", ".env"), override: true });
dotenv.config({ path: path.join(__dirname, "../..", ".env"), override: true });

module.exports = {
  PORT: Number(process.env.PORT || 3001),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "",
  GROQ_API_KEY: (process.env.GROQ_API_KEY || "").trim(),
};
