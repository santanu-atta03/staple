const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const cloudinary = require("../config/cloudinary");

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

// Upload single avatar or multiple post attachments (up to 4)
router.post(
  "/",
  authMiddleware,
  upload.array("files", 4),
  async (req, res, next) => {
    try {
      if (!req.files || !req.files.length) {
        const err = new Error("No files uploaded");
        err.statusCode = 400;
        throw err;
      }

      const uploads = await Promise.all(
        req.files.map((file) =>
          uploadBufferToCloudinary(file.buffer, "staple_uploads")
        )
      );

      const media = uploads.map((u) => ({
        url: u.secure_url,
        publicId: u.public_id,
        type: u.resource_type,
      }));

      res.status(201).json({ success: true, media });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;