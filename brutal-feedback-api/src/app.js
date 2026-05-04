const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { FRONTEND_ORIGIN } = require("./config/env");

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rateLimit = require("express-rate-limit");
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});

app.use(globalLimiter);

app.use("/", routes);

// Global error handler
app.use((err, req, res, next) => {
  const msg = err && err.message ? err.message : "Internal server error.";
  res.status(500).json({ error: msg });
});

module.exports = app;
