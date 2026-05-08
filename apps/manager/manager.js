const { spawn } = require('child_process');
const { createHash } = require('crypto');
const { get: httpGet } = require('http');
const { get: httpsGet } = require('https');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL;
if (!APP_URL) {
  console.error('APP_URL is required');
  process.exit(1);
}

const APP_FILE = path.join(__dirname, 'user-app.js');
const UPDATE_INTERVAL_MS = 60 * 1000;

let subprocess = null;

function download(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? httpsGet : httpGet;
    get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function startApp() {
  if (subprocess) subprocess.kill();

  console.log('[manager] Starting app');
  subprocess = spawn('node', [APP_FILE], { stdio: 'inherit' });

  subprocess.on('exit', (code) => {
    console.log(`[manager] App exited (code ${code}), restarting in 1s`);
    setTimeout(startApp, 1000);
  });
}

async function checkForUpdates() {
  try {
    const latest = await download(`${APP_URL}/index.js`);
    const current = fs.existsSync(APP_FILE) ? fs.readFileSync(APP_FILE, 'utf8') : '';
    if (hash(latest) !== hash(current)) {
      console.log('[manager] Update detected, restarting');
      fs.writeFileSync(APP_FILE, latest);
      startApp();
    }
  } catch (err) {
    console.error('[manager] Update check failed:', err.message);
  }
}

async function main() {
  console.log(`[manager] Starting for ${APP_URL}`);
  const content = await download(`${APP_URL}/index.js`);
  fs.writeFileSync(APP_FILE, content);
  startApp();
  setInterval(checkForUpdates, UPDATE_INTERVAL_MS);
}

main().catch((err) => {
  console.error('[manager] Fatal:', err.message);
  process.exit(1);
});
