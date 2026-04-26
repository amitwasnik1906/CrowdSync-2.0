const fs = require("fs");
const { Readable } = require("stream");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive"];

let driveClient = null;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function getDriveClient() {
  if (driveClient) return driveClient;

  const csPath = process.env.GOOGLE_OAUTH_CLIENT_SECRET_PATH;
  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH;

  if (!csPath || !fs.existsSync(csPath)) {
    const err = new Error(
      "GOOGLE_OAUTH_CLIENT_SECRET_PATH is not set or file is missing"
    );
    err.statusCode = 500;
    throw err;
  }
  if (!tokenPath || !fs.existsSync(tokenPath)) {
    const err = new Error(
      "GOOGLE_OAUTH_TOKEN_PATH is not set or file is missing — run `node scripts/oauth-init.js` first"
    );
    err.statusCode = 500;
    throw err;
  }

  const csRaw = readJson(csPath);
  const cs = csRaw.installed || csRaw.web;
  const tokens = readJson(tokenPath);

  const oauth2 = new google.auth.OAuth2(
    cs.client_id,
    cs.client_secret,
    (cs.redirect_uris && cs.redirect_uris[0]) || "http://localhost"
  );
  oauth2.setCredentials(tokens);

  // googleapis emits a `tokens` event each time the access token is refreshed.
  // Persist back to disk so the new access_token (and any rotated refresh_token)
  // is reused across restarts and by the Python reader.
  oauth2.on("tokens", (newTokens) => {
    try {
      const merged = { ...readJson(tokenPath), ...newTokens };
      fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
    } catch (e) {
      console.error("[driveService] Failed to persist refreshed token:", e.message);
    }
  });

  driveClient = google.drive({ version: "v3", auth: oauth2 });
  return driveClient;
}

function getParentFolderId() {
  const id = process.env.DRIVE_PARENT_FOLDER_ID;
  if (!id) {
    const err = new Error("DRIVE_PARENT_FOLDER_ID is not set");
    err.statusCode = 500;
    throw err;
  }
  return id;
}

async function createPersonFolder(_personName) {
  const drive = getDriveClient();
  const parentId = getParentFolderId();

  // 1. Create the folder with a placeholder name so we can get an ID first.
  const created = await drive.files.create({
    requestBody: {
      name: "pending",
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  const folderId = created.data.id;

  // 2. Rename the folder to its own ID so `folder.name === folder.id ===
  //    Student.faceId`. Looking up by faceId now finds the right folder
  //    purely by name.
  const renamed = await drive.files.update({
    fileId: folderId,
    requestBody: { name: folderId },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return {
    folderId,
    folderName: renamed.data.name,
    folderUrl: renamed.data.webViewLink,
  };
}

async function uploadImage(folderId, buffer, mimeType, filename) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, name",
    supportsAllDrives: true,
  });
  return { fileId: res.data.id, name: res.data.name };
}

async function deleteFolder(folderId) {
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId: folderId, supportsAllDrives: true });
  } catch (err) {
    console.error(`[driveService] best-effort folder delete failed for ${folderId}:`, err.message);
  }
}

module.exports = { createPersonFolder, uploadImage, deleteFolder, SCOPES };
