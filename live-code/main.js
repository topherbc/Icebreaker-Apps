'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { checkJava, startJava } = require('./runner');

// ----------------------------------------------------------------
// Ably key injected at build time by electron-builder extraMetadata.
// Fallback to env var for local dev (npm start with ABLY_API_KEY set).
// ----------------------------------------------------------------
const ABLY_KEY = app.isPackaged
  ? require('./package.json').ablyKey
  : process.env.ABLY_API_KEY || '';

let mainWindow;

// ----------------------------------------------------------------
// Java check — runs once before the window opens.
// Shows a blocking error dialog and quits if Java isn't found.
// ----------------------------------------------------------------
async function ensureJava() {
  const result = await checkJava();
  if (!result.ok) {
    dialog.showErrorBox('Java Not Found', result.message);
    app.quit();
    return false;
  }
  return true;
}

// ----------------------------------------------------------------
// Window — loads the web app directly.
// preload.js injects IS_ELECTRON and electronAPI into that page.
// ----------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Live Code Classroom',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // required for preload to use contextBridge
    },
  });

  // Load the canonical web app.
  // Packaged: extraResources puts it at Resources/classroom-apps/live-code.html
  // Dev:      sibling folder relative to live-code/
  const htmlPath = app.isPackaged
    ? path.join(process.resourcesPath, 'classroom-apps', 'live-code.html')
    : path.join(__dirname, '..', 'classroom-apps', 'live-code.html');
  mainWindow.loadFile(htmlPath);
}

// ----------------------------------------------------------------
// IPC — streaming Java execution
// ----------------------------------------------------------------

// Map from webContents id → active run handle (has .sendStdin)
const _activeRuns = new Map();

ipcMain.on('run-java-stream', (event, payload) => {
  const id = event.sender.id;

  // Kill any previous run from this renderer before starting a new one
  const prev = _activeRuns.get(id);
  if (prev) prev.kill();

  const handle = startJava(payload, {
    onStdout: (chunk) => {
      if (!event.sender.isDestroyed()) event.sender.send('java-stdout', chunk);
    },
    onStderr: (chunk) => {
      if (!event.sender.isDestroyed()) event.sender.send('java-stderr', chunk);
    },
    onDone: (result) => {
      _activeRuns.delete(id);
      if (!event.sender.isDestroyed()) event.sender.send('java-done', result);
    },
  });

  _activeRuns.set(id, handle);
});

ipcMain.on('java-stdin', (event, text) => {
  const handle = _activeRuns.get(event.sender.id);
  if (handle) handle.sendStdin(text);
});

ipcMain.handle('get-ably-key', () => ABLY_KEY);

// ----------------------------------------------------------------
// App lifecycle
// ----------------------------------------------------------------
app.whenReady().then(async () => {
  const javaOk = await ensureJava();
  if (!javaOk) return;

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  for (const handle of _activeRuns.values()) handle.kill();
  _activeRuns.clear();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
