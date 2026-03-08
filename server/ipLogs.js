const path = require('path');
const fs = require('fs');

const IP_LOGS_PATH = path.join(__dirname, '..', 'data', 'ip-logs.json');
const MAX_ENTRIES = 10000;

function appendIpLog(entry) {
  try {
    let logs = [];
    if (fs.existsSync(IP_LOGS_PATH)) {
      try { logs = JSON.parse(fs.readFileSync(IP_LOGS_PATH, 'utf8')); } catch {}
    }
    logs.push(entry);
    if (logs.length > MAX_ENTRIES) logs.splice(0, logs.length - MAX_ENTRIES);
    fs.writeFileSync(IP_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('IP log write error:', e.message);
  }
}

module.exports = { appendIpLog };
