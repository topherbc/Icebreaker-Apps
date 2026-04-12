'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, typed API to the renderer.
// Nothing from Node/Electron leaks beyond this surface.
contextBridge.exposeInMainWorld('IS_ELECTRON', true);

contextBridge.exposeInMainWorld('electronAPI', {
  // ---- Streaming Java execution ----
  // Start a run; output arrives via onStdout/onStderr/onDone.
  startRun:  (payload) => ipcRenderer.send('run-java-stream', payload),
  onStdout:  (cb) => ipcRenderer.on('java-stdout', (_, chunk) => cb(chunk)),
  onStderr:  (cb) => ipcRenderer.on('java-stderr', (_, chunk) => cb(chunk)),
  onDone:    (cb) => ipcRenderer.on('java-done',   (_, result) => cb(result)),
  // Send a keystroke (or pasted text) to the running process's stdin.
  sendStdin: (text) => ipcRenderer.send('java-stdin', text),
  // Remove all stream listeners between runs to avoid double-firing.
  offAll: () => {
    ipcRenderer.removeAllListeners('java-stdout');
    ipcRenderer.removeAllListeners('java-stderr');
    ipcRenderer.removeAllListeners('java-done');
  },

  // ---- Ably API key injected at build time ----
  ablyKey: () => ipcRenderer.invoke('get-ably-key'),
});
