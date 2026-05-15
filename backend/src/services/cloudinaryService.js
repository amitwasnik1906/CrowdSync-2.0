const cloudinary = require("cloudinary").v2;

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const err = new Error(
      "Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    );
    err.statusCode = 500;
    throw err;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function uploadDriverPhoto(buffer, _mimeType, { busId, date }) {
  ensureConfigured();
  const dateStr =
    date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
  const folder = `crowdsync/drivers/bus_${busId}/${dateStr}`;
  const result = await uploadBuffer(buffer, {
    folder,
    resource_type: "image",
    public_id: String(Date.now()),
    overwrite: false,
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function deletePhoto(publicId) {
  if (!publicId) return;
  try {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error(
      `[cloudinaryService] best-effort destroy failed for ${publicId}:`,
      err.message
    );
  }
}

module.exports = { uploadDriverPhoto, deletePhoto };
