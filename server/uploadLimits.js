* Upload quota management — limits stored in data/upload-limits.json
 * No database changes required.
 *
 * JSON structure:
 * {
 *   "limits": { "<userId>": <bytes> },
 *   "usage":  { "<userId>": <bytes> },
 *   "files":  { "<relativePath>": { "userId": <id>, "size": <bytes> } }
 * }
 *
 * Default limits (when no explicit entry exists):
 *   superadmin user → SUPERADMIN_DEFAULT (500 MB)
 *   all other users → DEFAULT_LIMIT (100 MB)
 */

const fs   = require('fs');
const path = require('path');

const LIMITS_FILE          = path.join(__dirname, '..', 'data', 'upload-limits.json');
const DEFAULT_LIMIT_BYTES  = 100 * 1024 * 1024;
const SUPERADMIN_DEFAULT_BYTES = 500 * 1024 * 1024;

function getLimitsData() {
  if (!fs.existsSync(LIMITS_FILE)) return { limits: {}, usage: {}, files: {} };
  try {
    return JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf8'));
  } catch {
    return { limits: {}, usage: {}, files: {} };
  }
}

function saveLimitsData(data) {
  fs.writeFileSync(LIMITS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

 * Returns the quota limit in bytes for a given user.
 * Falls back to SUPERADMIN_DEFAULT for username === 'superadmin',
 * or DEFAULT_LIMIT for everyone else.
 */
function getUserLimit(userId, username) {
  const data = getLimitsData();
  const key  = String(userId);
  if (data.limits[key] !== undefined) return data.limits[key];
  if (username === 'superadmin') return SUPERADMIN_DEFAULT_BYTES;
  return DEFAULT_LIMIT_BYTES;
}

Returns current cumulative upload usage in bytes for a user. */
function getUserUsage(userId) {
  const data = getLimitsData();
  return data.usage[String(userId)] || 0;
}

Sets an explicit quota limit (bytes) for a user. */
function setUserLimit(userId, limitBytes) {
  const data = getLimitsData();
  data.limits[String(userId)] = limitBytes;
  saveLimitsData(data);
}

 * Records a newly uploaded file and updates usage.
 *
 * @param {number|string} userId
 * @param {string}        relativePath  e.g. "/uploads/gallery/gallery-uuid.jpg"
 * @param {number}        fileSize      bytes
 * @returns {{ allowed: boolean, limit: number, usage: number, remaining: number }}
 *          Result BEFORE the upload is counted. If !allowed, caller must delete the file.
 */
function checkAndRecordUpload(userId, relativePath, fileSize, username) {
  const data      = getLimitsData();
  const key       = String(userId);
  const limit     = data.limits[key] !== undefined
    ? data.limits[key]
    : (username === 'superadmin' ? SUPERADMIN_DEFAULT_BYTES : DEFAULT_LIMIT_BYTES);
  const usage     = data.usage[key] || 0;
  const remaining = Math.max(0, limit - usage);

  if (usage + fileSize > limit) {
    return { allowed: false, limit, usage, remaining };
  }

  data.usage[key]          = usage + fileSize;
  data.files[relativePath] = { userId: Number(userId), size: fileSize };
  saveLimitsData(data);

  return { allowed: true, limit, usage: data.usage[key], remaining: remaining - fileSize };
}

 * Releases quota occupied by a file that is being deleted.
 * Looks up owner and size from the JSON "files" map.
 *
 * @param {string} relativePath  e.g. "/uploads/gallery/gallery-uuid.jpg"
 */
function recordDelete(relativePath) {
  const data     = getLimitsData();
  const fileInfo = data.files[relativePath];
  if (!fileInfo) return;

  const key = String(fileInfo.userId);
  data.usage[key] = Math.max(0, (data.usage[key] || 0) - fileInfo.size);
  delete data.files[relativePath];
  saveLimitsData(data);
}

Human-readable size string. */
function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  if (bytes >= 1024 * 1024)        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024)               return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

module.exports = {
  getLimitsData,
  getUserLimit,
  getUserUsage,
  setUserLimit,
  checkAndRecordUpload,
  recordDelete,
  formatBytes,
  DEFAULT_LIMIT_BYTES,
  SUPERADMIN_DEFAULT_BYTES,
};
