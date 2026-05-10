const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL;
if (!APP_URL) {
  console.error('[manager] APP_URL is required');
  process.exit(1);
}

const CODE_DIR = path.join('/workspace', 'code');

let subprocess = null;

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', ...options });
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

function startApp() {
  if (subprocess) subprocess.kill();

  console.log('[manager] Starting app');
  subprocess = spawn('npm', ['start'], { cwd: CODE_DIR, stdio: 'inherit' });

  subprocess.on('exit', (code) => {
    console.log(`[manager] App exited (code ${code}), restarting in 1s`);
    setTimeout(startApp, 1000);
  });
}

async function main() {
  if (fs.existsSync(CODE_DIR)) {
    console.log('[manager] Workspace exists, skipping clone');
  } else {
    console.log(`[manager] Cloning ${APP_URL}`);
    await run('git', ['clone', APP_URL, CODE_DIR]);
  }

  console.log('[manager] Installing dependencies');
  await run('npm', ['install'], { cwd: CODE_DIR });

  startApp();
}

main().catch((err) => {
  console.error('[manager] Fatal:', err.message);
  process.exit(1);
});
