const multer = require("multer");

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;

function imageOnlyFilter(_req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: imageOnlyFilter,
});

module.exports = upload;
