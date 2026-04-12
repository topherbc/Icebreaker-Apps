# Live Code Classroom — Requirements & Bug Fixes

> This document captures known bugs (§17–19) and the Electron build target (§20).
> Sections §1–16 exist in the upstream design spec and cover: room/role flow, editor, tabs, problems JSON, execution (Judge0 CE), output panel, Ably sync, presence, session lock, reference panel, theming, accessibility, key injection, and CI/CD.

---

## §17  Late-Joining Students

**Problem:** When a student joins a room where the instructor has already written code, the student's editor is empty until the instructor types again.

**Required behavior:**

1. When any student enters presence on `room:{code}:instructor`, the instructor client detects the presence enter event and immediately re-publishes their full current editor state to that channel (all tabs — name + content + active tab index).
2. On join, the student client also publishes a control message of type `state-request` to a shared control channel (e.g. `room:{code}:control`). The instructor listens on that channel and responds to `state-request` by re-publishing the full editor state.
3. Both mechanisms should fire — the presence hook covers the case where the instructor is watching and the control message covers race conditions.

**Implementation notes:**
- Instructor presence listener: `channel.presence.subscribe('enter', handler)`
- Student emits on join: `controlChannel.publish('control', { type: 'state-request', student: clientId })`
- Instructor handles: `controlChannel.subscribe('control', msg => { if (msg.data.type === 'state-request') publishState(); })`
- `publishState()` should publish the same payload already sent on every keypress — no new format needed.

---

## §18  Duplicate Class Body Bug

**Problem:** On some condition (typically re-selecting a problem or re-joining), the instructor editor duplicates the boilerplate class body below the original content.

**Root cause:** `javaBoilerplate()` (or equivalent auto-population logic) fires after content already exists in the tab.

**Required fix:**

- Add an `initialized` flag per tab (e.g. `tab.initialized = true`) set when the boilerplate is first written.
- The boilerplate function must check: **if the tab is already initialized OR if the current editor content is non-empty, do not overwrite.**
- This flag must survive problem switches — switching to a new problem tab resets the flag for that tab only if the tab is freshly created, not if it already has content.
- Rule: **never overwrite a tab that has been touched by the instructor or pre-populated by a prior boilerplate call.**

---

## §19  Reference Panel — Collapsible Sections

**Problem:** All reference panel content is visible at once, making it overwhelming and hard to navigate on smaller screens.

**Required behavior:**

- Every section in the student reference panel renders as a **clickable header only** by default.
- Clicking the header toggles the code block and description beneath it.
- **Default state: all collapsed.**
- Sections covered (each gets its own collapsible block):
  - Variables
  - Output
  - If/Else
  - Loops
  - Arrays
  - ArrayList
  - String Methods
  - Class / Constructor
  - Inheritance
  - Interface
  - Abstract Class
  - Scanner Input
  - Try/Catch

**Implementation:** Use the same collapsible pattern already present in the app (CSS `max-height` transition or `details`/`summary` — whichever is already in use). Do not introduce a new pattern.

---

## §20  Electron Build (Primary Target — All Weeks)

The app is built as an Electron application from the start, not a browser-hosted HTML file. This is the primary build target. The Judge0 API fallback described in §9 is not used.

### 20.1  Why Electron

All students already have Java 17 (Amazon Corretto) installed and on their PATH as a bootcamp prerequisite. IntelliJ is also installed on every machine. Given this, local execution via `javac`/`java` shell calls is more reliable, faster, supports file I/O, and has no external dependencies or rate limits.

### 20.2  Architecture

Electron provides two processes:

**Main process (Node.js)** — handles:
- Window creation
- All Java execution (shell out to `javac` + `java`)
- File system access (save/load `.java` files)
- IPC bridge to renderer

**Renderer process (Chromium)** — the existing HTML/JS app, unchanged except execution calls route to the main process via `ipcRenderer` instead of Judge0.

### 20.3  Runner Module

All execution logic lives in a single isolated Runner module in the main process (`runner.js`). The renderer never calls Judge0 or any external API directly.

**Execution flow:**

1. Renderer sends all tab contents + active file name via `ipcRenderer.invoke('run-java', payload)`
2. Main process writes files to a temp directory
3. Main process runs `javac *.java` in that directory
4. On compile success, runs `java {MainClassName}`
5. Captures stdout, stderr, exit code
6. Returns result object to renderer via IPC promise resolution
7. Temp directory cleaned up after each run

```javascript
// IPC payload (renderer -> main)
{
  files: [{ name: 'Main.java', content: '...' }],
  mainClass: 'Main'
}

// IPC result (main -> renderer)
{
  stdout: '...',
  stderr: '...',
  exitCode: 0,
  compileError: false,
  elapsed: 1.24
}
```

### 20.4  Java Detection

On app launch, main process runs `java -version` and `javac -version`. If either fails, a blocking error screen is shown:

> Java 17 not found. Please ensure Amazon Corretto 17 is installed and on your PATH, then restart the app.

This check runs once at startup, not on every execution.

### 20.5  stdin Support

The output panel includes a stdin input field — a single-line text input that appears when the Run button is clicked and the previous run used Scanner. If stdin is provided, it is piped to the Java process. This makes Week 3 Scanner exercises fully functional.

For simplicity in v1: the instructor can toggle a "this program needs input" flag when loading a problem, which causes the stdin field to appear automatically for students.

### 20.6  File I/O

File I/O works fully in Electron. The sandbox limitation note from §9.3 does not apply and must not appear in the Electron build. Week 3 FileReader/BufferedWriter exercises work without modification.

Temp directory for execution is created fresh per run and deleted after. Students do not need to manage file paths — the working directory is set to the temp dir automatically.

### 20.7  Distribution

Built with `electron-builder`. Two targets:

- **Windows:** `.exe` installer (NSIS)
- **macOS:** `.dmg`

Hosted on GitHub Releases in the `topherbc/Icebreaker-Apps` repo or a dedicated repo. Students download once at bootcamp start. The download link is shared the same way room codes are shared — a URL.

Auto-update via `electron-updater` is optional for v1 but the package should be included so it can be enabled later.

### 20.8  Ably Still Required

The Electron build still uses Ably for all real-time sync. Execution is local; collaboration is networked. These are independent concerns. The Ably key injection pattern from §15 applies — GitHub Actions injects the key at build time into the packaged app.

### 20.9  Single Codebase

The HTML/JS app is identical between a browser build and the Electron build. The only difference is the execution path — a feature flag `window.IS_ELECTRON` (set by the main process via a preload script) switches the Runner from Judge0 to IPC. This keeps the codebase unified and means a browser fallback is always available if needed.
