const multer = require("multer");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error("Unsupported file format. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV.");
    err.statusCode = 400;
    cb(err, false);
  }
};

const hasValidMagicBytes = (buffer, mimetype) => {
  if (!buffer || buffer.length < 12) return false;
  if (mimetype === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimetype === "image/gif") {
    return buffer.slice(0, 4).toString("ascii") === "GIF8";
  }
  if (mimetype === "image/webp") {
    return buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP";
  }
  if (mimetype === "video/mp4" || mimetype === "video/quicktime") {
    return buffer.slice(4, 8).toString("ascii") === "ftyp";
  }
  if (mimetype === "video/webm") {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }
  return false;
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit for photos & videos
});

upload.hasValidMagicBytes = hasValidMagicBytes;
module.exports = upload;