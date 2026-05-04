const multer = require("multer");
const os = require("os");

const upload = multer({
  dest: os.tmpdir(), // Use disk storage in the OS temp directory to prevent memory leaks
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter: (req, file, cb) => {
    const baseMime = String(file.mimetype || "").split(";")[0].trim();
    const ok = new Set([
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "video/webm",
      "video/mp4",
    ]);
    if (!ok.has(baseMime)) {
      return cb(
        new Error(
          `Unsupported audio type: ${file.mimetype}. Expected audio/webm, audio/mp4, audio/mpeg, video/webm, or video/mp4.`
        )
      );
    }
    cb(null, true);
  },
});

module.exports = upload;
