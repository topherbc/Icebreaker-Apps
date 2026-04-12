'use strict';

const { execFile, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ----------------------------------------------------------------
// Java detection -- called once at startup.
// Returns { ok: true } or { ok: false, message: string }
// ----------------------------------------------------------------
async function checkJava() {
  const check = (cmd, args) => new Promise(resolve => {
    execFile(cmd, args, { timeout: 5000 }, (err) => resolve(!err));
  });

  const [hasJava, hasJavac] = await Promise.all([
    check('java',  ['-version']),
    check('javac', ['-version']),
  ]);

  if (!hasJava || !hasJavac) {
    return {
      ok: false,
      message: 'Java 17 not found. Please ensure Amazon Corretto 17 is installed and on your PATH, then restart the app.',
    };
  }
  return { ok: true };
}

// ----------------------------------------------------------------
// Streaming entry point.
//
// payload: { files: [{ name, content }], mainClass: string }
// callbacks: { onStdout(chunk), onStderr(chunk),
//              onDone({ exitCode, compileError, elapsed, stderr }) }
//
// Returns { sendStdin(text) } so the caller can pipe stdin live.
// ----------------------------------------------------------------
function startJava({ files, mainClass }, { onStdout, onStderr, onDone }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'livecode-'));
  let _child      = null;
  let _childReady = false;
  let _stdinQueue = [];  // buffer keystrokes that arrive during compilation

  (async () => {
    try {
      for (const f of files) {
        fs.writeFileSync(path.join(tmpDir, f.name), f.content, 'utf8');
      }

      const t0 = Date.now();

      // Compile (batch -- stderr contains compile errors)
      const comp = await _exec('javac', ['*.java'], { cwd: tmpDir, shell: true });
      if (comp.exitCode !== 0) {
        const msg = comp.stderr || comp.stdout || 'Compilation failed';
        onStderr(msg);
        onDone({
          exitCode:     comp.exitCode,
          compileError: true,
          elapsed:      ((Date.now() - t0) / 1000).toFixed(2),
          stderr:       msg,
        });
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        return;
      }

      // Run (streaming)
      _child = spawn('java', [mainClass || 'Main'], { cwd: tmpDir, shell: false });
      _childReady = true;

      // Drain any stdin that arrived during compilation
      for (const text of _stdinQueue) {
        if (!_child.stdin.destroyed) _child.stdin.write(text);
      }
      _stdinQueue = [];

      _child.stdout.on('data', d => onStdout(d.toString()));
      _child.stderr.on('data', d => onStderr(d.toString()));

      const timer = setTimeout(() => {
        _child.kill();
        onStderr('\n[Timeout: process killed after 10s]\n');
      }, 10000);

      _child.on('close', code => {
        clearTimeout(timer);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        onDone({ exitCode: code ?? 1, compileError: false, elapsed: ((Date.now() - t0) / 1000).toFixed(2), stderr: '' });
      });

      _child.on('error', err => {
        clearTimeout(timer);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        onStderr(err.message);
        onDone({ exitCode: 1, compileError: false, elapsed: '0.00', stderr: err.message });
      });

    } catch (err) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      onStderr(err.message);
      onDone({ exitCode: 1, compileError: false, elapsed: '0.00', stderr: err.message });
    }
  })();

  return {
    sendStdin(text) {
      if (_childReady && _child && !_child.stdin.destroyed) {
        _child.stdin.write(text);
      } else if (!_childReady) {
        _stdinQueue.push(text);
      }
    },
  };
}

// ----------------------------------------------------------------
// Batch entry point (kept in case it's useful for tooling/tests).
// ----------------------------------------------------------------
async function runJava({ files, mainClass, stdin }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'livecode-'));

  try {
    for (const f of files) {
      fs.writeFileSync(path.join(tmpDir, f.name), f.content, 'utf8');
    }

    const t0 = Date.now();

    const compileResult = await _exec('javac', ['*.java'], { cwd: tmpDir, shell: true });
    if (compileResult.exitCode !== 0) {
      return {
        stdout: '',
        stderr: compileResult.stderr || compileResult.stdout,
        exitCode: compileResult.exitCode,
        compileError: true,
        elapsed: ((Date.now() - t0) / 1000).toFixed(2),
      };
    }

    const runResult = await _run('java', [mainClass || 'Main'], {
      cwd: tmpDir,
      stdin: stdin || '',
      timeoutMs: 10000,
    });

    return {
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      exitCode: runResult.exitCode,
      compileError: false,
      elapsed: ((Date.now() - t0) / 1000).toFixed(2),
    };

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

function _exec(cmd, args, opts) {
  return new Promise(resolve => {
    execFile(cmd, args, { ...opts, timeout: 15000 }, (err, stdout, stderr) => {
      resolve({
        stdout:   stdout || '',
        stderr:   stderr || '',
        exitCode: err ? (err.code || 1) : 0,
      });
    });
  });
}

function _run(cmd, args, { cwd, stdin, timeoutMs }) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { cwd, shell: false });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    const timer = setTimeout(() => {
      child.kill();
      resolve({ stdout, stderr: stderr + '\n[Timeout: process killed after 10s]', exitCode: 1 });
    }, timeoutMs);

    child.on('close', code => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

module.exports = { checkJava, runJava, startJava };
