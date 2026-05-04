const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const app = require("./src/app");

// Clean up orphaned temp files
function cleanupTempFiles() {
  try {
    const tmpDir = os.tmpdir();
    const files = fs.readdirSync(tmpDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    let deletedCount = 0;
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.webm' || ext === '.mp4' || ext === '.pdf') {
        const filePath = path.join(tmpDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    });
    if (deletedCount > 0) console.log(`Cleaned up ${deletedCount} orphaned temp files.`);
  } catch (err) {
    console.error("Failed to clean up temp files:", err);
  }
}

// Run cleanup on startup and every 24h
cleanupTempFiles();
setInterval(cleanupTempFiles, 24 * 60 * 60 * 1000);
const { PORT, FRONTEND_ORIGIN } = require("./src/config/env");

const server = app.listen(PORT, () => {
  console.log(`HireReady API listening on http://localhost:${PORT}`);
  if (FRONTEND_ORIGIN)
    console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
  else
    console.log(
      "CORS dev mode: allowing all origins (set FRONTEND_ORIGIN to restrict)."
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