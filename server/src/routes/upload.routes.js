const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const upload = require("../middleware/upload.middleware");
const cloudinary = require("../config/cloudinary");
const authenticate = require("../middleware/auth.middleware");

// Helper to check if real Cloudinary credentials are provided
const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return (
    name &&
    name !== "your_cloud_name" &&
    key &&
    key !== "your_api_key" &&
    secret &&
    secret !== "your_api_secret"
  );
};

// Cloudinary Stream Upload
const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// Save locally as reliable fallback
const saveBufferLocally = (file, userId) => {
  const uploadDir = path.join(__dirname, "../../../client/public/uploads", userId);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.originalname) || (file.mimetype.includes("video") ? ".mp4" : ".jpg");
  const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, file.buffer);

  return {
    url: `/uploads/${userId}/${fileName}`,
    publicId: fileName,
    type: file.mimetype.startsWith("video/") ? "video" : "image",
  };
};

// Upload multiple files or single file
router.post(
  "/",
  authenticate,
  upload.array("files", 10),
  async (req, res, next) => {
    try {
      if (!req.files || !req.files.length) {
        return res.status(400).json({ success: false, message: "No files uploaded" });
      }

      const media = [];

      for (const file of req.files) {
        if (isCloudinaryConfigured()) {
          try {
            const result = await uploadBufferToCloudinary(
              file.buffer,
              `staple_uploads/${req.user.id}`
            );
            media.push({
              url: result.secure_url,
              publicId: result.public_id,
              type: result.resource_type === "video" ? "video" : "image",
              width: result.width,
              height: result.height,
              format: result.format,
            });
            continue;
          } catch (cloudErr) {
            console.warn("Cloudinary upload failed, falling back to local storage:", cloudErr.message);
          }
        }

        // Fallback or default local save
        const localResult = saveBufferLocally(file, req.user.id);
        media.push(localResult);
      }

      res.status(201).json({ success: true, media });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to upload file" });
    }
  }
);

module.exports = router;
