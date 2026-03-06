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

function getUserLimit(userId, username) {
  const data = getLimitsData();
  const key  = String(userId);
  if (data.limits[key] !== undefined) return data.limits[key];
  if (username === 'superadmin') return SUPERADMIN_DEFAULT_BYTES;
  return DEFAULT_LIMIT_BYTES;
}

function getUserUsage(userId) {
  const data = getLimitsData();
  return data.usage[String(userId)] || 0;
}

function setUserLimit(userId, limitBytes) {
  const data = getLimitsData();
  data.limits[String(userId)] = limitBytes;
  saveLimitsData(data);
}

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

function recordDelete(relativePath) {
  const data     = getLimitsData();
  const fileInfo = data.files[relativePath];
  if (!fileInfo) return;

  const key = String(fileInfo.userId);
  data.usage[key] = Math.max(0, (data.usage[key] || 0) - fileInfo.size);
  delete data.files[relativePath];
  saveLimitsData(data);
}

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
