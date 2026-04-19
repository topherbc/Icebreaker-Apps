# Trace App Specification

> **How to use this document**
> Hand this file to any Claude instance along with a Java program concept
> (e.g. "write a trace app about method overloading"). Claude should be able
> to produce a complete, correct, accessible trace app from scratch using
> only this spec and the reference template `trace-template.html`.

---

## 1. What Is a Trace App?

A Trace App is a single-page HTML exercise where students debug a small Java
program. The workflow:

1. Student reads Java code in the **left panel** (code panel)
2. Student answers guided trace questions in the **right panel** (question panel)
3. As questions are answered, bug lines become **editable inputs** in the code
4. Student types the corrected line; the app validates and marks the bug fixed
5. Student **exports** their full session as a Markdown file

Designed for classroom desktop use. Target viewport: **1080px wide**.
Optionally used in **live-share mode** where questions are split across a study group.

---

## 2. File Naming

```
{week}-{day}-trace-{scenario_name}.html
```

Examples:
- `4-thur-trace-trail_conditions.html`
- `4-thur-trace-island_logic.html`
- `2-tues-trace-character_engine.html`

Rules:
- Day abbreviations: `mon`, `tues`, `wed`, `thur`, `fri`
- Scenario name: lowercase, underscore-separated, describes the Java topic
- No theme or RPG names in the file name -- use the Java topic

---

## 3. HTML Document Structure

```
<head>
  <link rel="icon" ...>          inline SVG favicon (see §8)
  <script>                       FOUC-prevention theme script (always first)
  <link rel="preconnect" ...>    Google Fonts
  <style>                        All CSS: variables, layout, components,
                                  dark/light overrides
</head>
<body>
  <!-- Topbar -->
  <!-- Bug tracker bar -->
  <!-- #layout wrapper -->
    <!-- #code-panel  (left 60%, or 50% for multi-tab) -->
    <!-- #question-panel (right, flex:1) -->
  <!-- <script> block: DATA -> LOGIC -> TRACE_ADAPTER -> init calls -->
</body>
```

The FOUC-prevention script reads `localStorage` and sets `data-theme` on
`<html>` before the first paint. **Light mode is the default** -- dark mode
is available via toggle but must never be the default, because dark backgrounds
are hard to read over video share in a classroom setting:

```html
<script>(function(){
  var t = localStorage.getItem('trace-theme') ||
    (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
})();</script>
```

**IMPORTANT: Override the media query fallback to always default light:**

```html
<script>(function(){
  var t = localStorage.getItem('trace-theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
})();</script>
```

Use the second version. The `prefers-color-scheme` fallback can default to dark
on student machines, which causes contrast problems over video share.

---

## 4. Theme System

### 4.1 CSS Custom Properties

Every theme is defined entirely through `:root` variables. Change these, and
the whole app repaints. Nothing else should need editing for a retheme.

```css
:root {
  /* -- Page surfaces ----------------------------------------- */
  --bg:              #...;   /* page/question-panel background          */
  --surface:         #...;   /* card background                         */
  --surface-2:       #...;   /* input fields, secondary surfaces        */
  --code-bg:         #...;   /* code panel background (usually very dark)*/
  --code-text:       #...;   /* default code text                       */
  --line-num:        #...;   /* line number color                       */

  /* -- Typography colors -------------------------------------- */
  --text:            #...;   /* primary body text                       */
  --text-mid:        #...;   /* secondary / label text                  */
  --text-dim:        #...;   /* muted / placeholder text                */

  /* -- Accent colors ------------------------------------------ */
  --accent-1:        #...;   /* primary: topbar bg, q-number badges     */
  --accent-1-dark:   #...;   /* darker shade of accent-1 for hovers     */
  --accent-2:        #...;   /* secondary: export button                */
  --accent-3:        #...;   /* danger: reset button, bug-found state   */
  --accent-3-dark:   #...;   /* darker shade of accent-3                */

  /* -- Borders ------------------------------------------------ */
  --border:          #...;   /* default border / rule color             */
  --border-strong:   #...;   /* emphasized border (code panel divider)  */

  /* -- Bug system colors -------------------------------------- */
  --bug-dot-idle:    #...;   /* dot: not yet identified                 */
  --bug-dot-found:   #...;   /* dot: identified but not fixed           */
  --bug-dot-fixed:   #...;   /* dot: correct fix entered                */
  --fix-row-bg:      #...;   /* highlighted row background for bug line */
  --fix-correct-bg:  #...;   /* correct-answer input background         */
  --fix-correct-text:#...;   /* correct-answer input text               */

  /* -- Syntax token colors (dark code bg) --------------------- */
  --syn-kw:          #...;   /* keywords: if else return void class...  */
  --syn-ty:          #...;   /* types: int String boolean System...     */
  --syn-str:         #...;   /* string literals "..."                   */
  --syn-num:         #...;   /* numeric literals                        */
  --syn-cm:          #...;   /* comments // ...                         */
  --syn-mth:         #...;   /* method calls                            */

  /* -- Shape / shadow ----------------------------------------- */
  --radius-card:     Xpx;    /* 0 = angular, 10-12 = rounded            */
  --radius-btn:      Xpx;    /* 0-6px                                   */
  --shadow:          ...;    /* see shadow mood table §4.4              */
}
```

### 4.2 Typography

Every trace app uses exactly **four font roles**:

| Role    | Purpose                            | Options                                                  |
| ------- | ---------------------------------- | -------------------------------------------------------- |
| Display | Logo, headings, q-number badges    | Barlow Condensed, Press Start 2P, Share Tech Mono, Anton |
| Body    | Question text, labels, UI copy     | **Always DM Sans** (consistency across apps)             |
| Code    | Code panel, inline `<code>` blocks | Fira Code, JetBrains Mono                                |
| Mono-UI | Filename, anchor labels            | Same as Code, or Share Tech Mono                         |

Rules:
- Body is **always DM Sans** -- it is never replaced
- Never import more than two display/code font families in one app
- Press Start 2P is only appropriate for retro/cyberpunk/pixel themes; do not
  use it for natural or organic themes
- **Press Start 2P must never be used for body text or question text** -- it is
  only permitted at header/label sizes (24px+). At small sizes it fails
  readability at 1080p over video. Restrict it to display headers only.

### 4.3 Shape Language

| Feel    | `--radius-card` | `--radius-btn` | When to use                      |
| ------- | --------------- | -------------- | -------------------------------- |
| Angular | `0px`           | `0px`          | Terminal, pixel, military themes |
| Mid     | `4px`           | `3-4px`        | Most themes (neutral/versatile)  |
| Rounded | `10-12px`       | `6px`          | Natural, warm, organic themes    |

The bug line left accent is always `3px solid var(--bug-dot-found)` -- it makes
editable lines visually pop without being decorative.

### 4.4 Shadow Moods

| Mood     | Value                                            | Used in           |
| -------- | ------------------------------------------------ | ----------------- |
| Flat     | `none`                                           | Terminal, minimal |
| Subtle   | `0 2px 8px rgba(0,0,0,0.12)`                     | Island, Alpine    |
| Dramatic | `0 4px 24px rgba(0,0,0,0.4)`                     | Hero HQ           |
| Glow     | `0 0 12px rgba(ACCENT_R,ACCENT_G,ACCENT_B,0.35)` | Neon, Pixel Forge |

### 4.5 Theme Catalog (Existing Apps)

| Theme        | Week  | Display Font     | --accent-1 | --code-bg | Radius | Shadow   |
| ------------ | ----- | ---------------- | ---------- | --------- | ------ | -------- |
| Alpine       | 1     | Barlow Condensed | #1a4f7a    | #0d1117   | 0px    | subtle   |
| Hero HQ      | 3     | Anton            | #e8334a    | #0d0f1a   | 4px    | dramatic |
| Island Logic | 5     | Barlow Condensed | #1e5f74    | #0f2a1e   | 10px   | subtle   |
| Neon Bytes   | 6 Tue | Press Start 2P   | #00ff88    | #060810   | 3px    | glow     |
| Pixel Forge  | 6 Thu | Press Start 2P   | #00ff99    | #0a0a1a   | 0px    | glow     |
| Terminal     | 7     | Share Tech Mono  | #00dd77    | #0b0b14   | 0px    | flat     |

To create a **new theme**: pick a name, choose a metaphor, select one display
font, build a 3-4 color palette, verify all contrast pairs (§11), and drop the
values into `:root`.

---

## 5. Layout

```
+---- topbar -- 56px fixed --------------------------------------------+
+---- bug tracker bar -- 48px fixed -----------------------------------+
|                                                                       |
|   +---- code panel ----------------+  +---- question panel --------+ |
|   |  [code header / tabs]          |  |  [q-panel header]          | |
|   |  [code body / table]           |  |  [section dividers]        | |
|   |                                |  |  [question cards]          | |
|   +--------------------------------+  +----------------------------+ |
+-----------------------------------------------------------------------+
```

- `<meta name="viewport" content="width=1080">` -- **required on every trace
  app**. Fixed width, desktop only. This is not optional -- omitting it causes
  the layout to collapse on smaller screens and breaks the 1080p video share
  target.
- `#layout`: `display: flex; height: 100vh; padding-top: 104px`
  (56 topbar + 48 bug bar)
- Code panel: `width: 60%` (single file) or `width: 50%` (multi-tab)
- Question panel: `flex: 1; overflow-y: auto`
- Both panels scroll independently

---

## 6. Code Panel

### 6.1 Single-File Mode (table-driven)

The code is rendered into an HTML `<table class="code-table">` by `buildCode()`.
The data source is a `CODE` array:

```javascript
const CODE = [
  { t: 'int score = 95;' },                  // plain line

  { t: '' },                                  // blank line

  { t: 'if (score > 100) {',                 // BUG LINE
    bugId: 'b1',                              //   links to BUG_META entry
    dotId: 'dot-1',                           //   links to #dot-1 in bug bar
    fixes: [                                  //   all accepted correct answers
      'if (score >= 100) {',
      'if (score >= 100) { ',
    ]
  },
];
```

**Critical: each bug line must appear exactly once in the CODE array.**
Do not add a plain `{ t: '...' }` entry AND a bug entry for the same line.
The bug entry IS the line -- adding both causes the line to render twice.

`buildCode()` iterates `CODE`:
- Plain line -> `<tr><td class="ln">{n}</td><td class="code">{hi(t)}</td></tr>`
- Bug line -> same but `<tr class="bug-row" id="brow-b1-{idx}">` and
  `<td class="code" id="bcell-b1-{idx}">` with `dataset.lineIdx`
  When activated: the `<td class="code">` content is replaced with
  `<input class="bug-input">` pre-filled with the buggy text.

A fix is accepted when `input.value.trim()` matches any `fixes` entry (trimmed).

### 6.2 Multi-Tab Mode (HTML-driven)

When the Java program spans multiple classes, use file tabs. The code panes are
written as static HTML, not generated from an array.

**Tab bar:**
```html
<div class="file-tabs" role="tablist" aria-label="Java source files">
  <button class="file-tab active" id="tab-{key}" role="tab"
    aria-selected="true" aria-controls="pane-{key}"
    onclick="switchTab('{key}')">
    <span class="tab-bug-pip no-bug" id="tabpip-{key}" aria-hidden="true"></span>
    FileName.java
  </button>
  <!-- additional tabs -->
</div>
```

**Code pane:**
```html
<div class="code-pane active" id="pane-{key}"
  role="tabpanel" aria-labelledby="tab-{key}">
  <div class="code-block">
    <div class="code-line">
      <span class="line-num">1</span>
      <span class="line-content"><span class="kw">public class</span> ...</span>
    </div>
    <!-- bug line: -->
    <div class="code-line editable" id="cl-{filename}-bug{n}" data-bug-index="{n}">
      <span class="line-num">{line}</span>
      <input class="line-edit" id="edit-{filename}-bug{n}" type="text"
        value="{buggy code}"
        aria-label="Editable code line {line} in {Filename}.java -- fix the bug"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        oninput="handleBugEdit({n})" />
      <span class="bug-callout" aria-hidden="true">Fix line {line}</span>
    </div>
  </div>
</div>
```

**Tab pip states** (on `.tab-bug-pip`):
- `.no-bug` -- file has no bugs (opacity: 0, invisible)
- default -- file has unfixed bugs (neutral gray)
- `.has-identified` -- at least one bug found (accent red / warning color)
- `.all-fixed` -- all bugs in this file are fixed (accent green)

**`switchTab(key)`** adds `.active` to the selected tab button and pane,
removes it from all others, and updates `aria-selected`.

**Multi-tab guidelines:**

- **Tab ceiling: 5 tabs maximum.** At 1080p the tab bar starts to feel cramped
  beyond 5 files. If a program genuinely requires more than 5 classes, consider
  whether some can be collapsed or whether the program is too complex for a
  single trace session.
- **Zero-bug tabs still need a pip.** Every tab button must include a
  `.tab-bug-pip` span. For files with no bugs, add the `.no-bug` class so the
  pip is invisible but the HTML structure stays consistent. Omitting the pip
  element entirely breaks the pip state logic.
- **Syntax is hand-authored in multi-tab mode.** There is no `buildCode()` or
  `hi()` equivalent -- every `<div class="code-line">` with its syntax spans is
  written directly in HTML. This is intentional (gives precise control) but is
  tedious for files longer than 30 lines. Keep individual tab files short.
- **Bug indexing is global, not per-tab.** `data-bug-index` values must be
  unique across all tabs combined -- not just within a single tab. If Tab 1
  has bugs 0 and 1, Tab 2 starts at bug index 2.

### 6.3 Syntax Highlighter

The `hi()` function is used in single-file mode only. It takes a raw Java string
and returns an HTML string with `<span class="kw">`, `<span class="ty">`, etc.

**Critical: comments must be extracted first to prevent `class="cm"` from
appearing as visible text.** The string regex `/"([^"]*)"/` would match the
`"cm"` inside `class="cm"` if the comment span is already inserted.

```javascript
function hi(raw) {
  // 1. Escape HTML entities
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 2. Extract comments into placeholders BEFORE string processing
  const cmSlots = [];
  s = s.replace(/(\/\/[^\n]*)$/gm, (m) => {
    cmSlots.push(m);
    return `\x00CM${cmSlots.length - 1}\x00`;
  });
  // 3. String literals
  s = s.replace(/"([^"]*)"/g, '<span class="str">"$1"</span>');
  // 4. Numeric literals
  s = s.replace(/\b(\d+)\b(?![^<]*<\/span>)/g, '<span class="num">$1</span>');
  // 5. Keywords
  for (const kw of ['public','static','void','class','if','else','return',
      'new','boolean','this','true','false','extends','implements',
      'abstract','interface','super','for','while','int','double','char']) {
    s = s.replace(new RegExp(`\\b${kw}\\b(?![^<]*<\\/span>)`, 'g'),
      `<span class="kw">${kw}</span>`);
  }
  // 6. Types
  for (const ty of ['String','System','ArrayList','HashMap','Scanner',
      'Object','Integer','Double','List','Map']) {
    s = s.replace(new RegExp(`\\b${ty}\\b(?![^<]*<\\/span>)`, 'g'),
      `<span class="ty">${ty}</span>`);
  }
  // 7. Method calls (lowercase identifier followed by open paren)
  s = s.replace(/\b([a-z][a-zA-Z0-9_]*)(?=\()(?![^<]*<\/span>)/g,
    '<span class="mth">$1</span>');
  // 8. Restore comments
  s = s.replace(/\x00CM(\d+)\x00/g, (_, i) =>
    `<span class="cm">${cmSlots[i]}</span>`);
  return s;
}
```

In multi-tab mode, syntax spans are written by hand in the HTML -- no `hi()` needed.

---

## 7. Question System

### 7.1 Q_META

```javascript
const Q_META = [
  { id: 'q1', anchor: 'Lines 1-4', label: 'Variable values'       },
  { id: 'q2', anchor: 'Line 6',    label: 'Condition evaluation'   },
  { id: 'q3', anchor: 'Line 14',   label: 'Program output'         },
  { id: 'q4', anchor: 'Line 6',    label: 'Score check'            },
  { id: 'q5', anchor: 'Line 10',   label: 'Output format'          },
];
```

- `id` matches the `<textarea id="q{n}">` in the HTML
- `anchor` is the line reference shown in export
- `label` is neutral -- never describes the bug (see §10 Anti-Spoiler Rules)

### 7.2 Question Card HTML

```html
<div class="q-card" id="card-q{n}">
  <div class="q-card-header">
    <div class="q-number">{n}</div>
    <div class="q-meta">
      <div class="q-anchor">{Line X or Lines X-Y}</div>
      <div class="q-text">{question text -- see writing rules §7.3}</div>
    </div>
  </div>
  <textarea class="q-input" id="q{n}"
    placeholder="{linguistic placeholder -- see §7.3}"
    aria-label="Question {n} answer"></textarea>
  <!-- Include fix-prompt only for bug-hunting questions: -->
  <div class="fix-prompt" id="fix-{bugN}">
    <div class="fix-prompt-label">Found it? Fix the code on line X in the code panel.</div>
  </div>
</div>
```

### 7.3 Question Writing Rules

**Rule 1 -- Trace before hunt.**
The first 2-3 questions are pure trace: what values, what branch runs, what
prints. Bug-hunt questions come AFTER the student has traced execution.

**Rule 2 -- Anchor to lines.**
Every question names specific line(s): "On line 6...", "Trace lines 10-12..."

**Rule 3 -- No spoilers.** See §10 (Anti-Spoiler Rules) in full. Summary:
never name the fix, never show the corrected operator, never frame = vs ==.

**Rule 4 -- Placeholder as linguistic form.**
Replace generic "Enter your answer here" with a description of what KIND of
answer is expected:

| Bad placeholder                 | Good placeholder                                                 |
| ------------------------------- | ---------------------------------------------------------------- |
| Enter your answer here          | Trace each variable and write its value...                       |
| What operator should replace >? | Describe what the condition does vs. what the program intends... |
| What does = do vs ==?           | Describe what you observe and what should change...              |

**Rule 5 -- Question count.**
5-8 questions per app. Fewer than 5 is too shallow. More than 8 is fatiguing.
The Week 5 Island Logic (7 questions, 3 bugs) is the reference standard.

**Rule 6 -- Question structure pattern.**
```
Q1: What are the variable values on lines X-Y?
Q2: Trace [condition/loop/call] on line Z. What does it evaluate to?
Q3: What output does the program produce? Which branch/path runs?
Q4: Bug Hunt -- [behavioral description without naming the fix]
Q5: Bug Hunt -- [second bug, behavioral description]
Q6 (optional): If both bugs are fixed, trace the correct execution
Q7 (optional): Predict -- what would change if [variable/value] were different?
```

### 7.4 Q-to-Bug Mapping

```javascript
// Maps question id -> bug id (which bug does answering this question unlock?)
const Q_TO_BUG = { q4: 'b1', q5: 'b2' };

// Maps bug id -> fix-prompt div id (which prompt to show?)
const BUG_TO_FIX_DIV = { b1: 'fix-1', b2: 'fix-2' };
```

An answer is long enough to unlock the bug line when `value.trim().length >= 10`.

### 7.5 Section Dividers

Dividers break the question panel into labeled regions.

```html
<div class="section-divider">
  <span class="sdlabel">Variables</span>
</div>
```

Rules:
- Never name a bug in a divider label (e.g., "Gear check (Bug 1)" is WRONG)
- Use structural/programmatic labels: "Variables", "Condition check",
  "Program output", "Line 10", "Second condition", "Loop body"
- Keep labels 1-4 words maximum

---

## 8. Favicon

The favicon is an **inline SVG** `data:` URI:

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg ...>">
```

Requirements:
- `viewBox="0 0 32 32"`
- Rounded rect background: `<rect width="32" height="32" rx="4" fill="{accent}"/>`
- 2-5 simple paths that read at 16px (browser tab icon size)
- Theme-relevant symbol

Reference icons:
- Mountain: `<polygon points="16,4 28,26 4,26">` (triangle peak)
- Palm tree: trunk curve + two frond curves + sand ellipse
- Terminal: `>_` text element in monospace
- Grid: 3x3 rect grid in accent color
- Equalizer: 7 vertical rects of different heights

---

## 9. Bug System

### 9.1 Structural Bugs Only

**This is the most important pedagogical rule in the spec.**

All bugs must be **structural** -- wrong regardless of any input or the
developer's intent. A structural bug is broken by definition, independent of
what the program is supposed to do.

**Structural bugs (always use these):**
- `==` used for assignment where `=` is needed (or vice versa)
- `>` where `>=` is required for the condition to be logically consistent
- `super()` called after field assignment in a constructor (must be first)
- `@Override` with wrong method signature
- Abstract method with a body
- Raw type `ArrayList` instead of `ArrayList<String>`
- Calling `.get()` on a HashMap with a key that does not match what was put
  (casing mismatch, not a business logic decision)
- Loop variable declared as `Object` when generic type is already known

**Business logic bugs (never use these):**
- A threshold value that is "wrong" only because of the program's intent
  (e.g., `threshold = 80` when the spec says it should be 75)
- A string that is "wrong" only because the story requires a different one
- Any bug that is only a bug if you know what the program is "supposed to do"

The distinction: if a senior Java developer with no context would look at the
code and say "that is incorrect Java" -- it is a structural bug. If they would
need to ask "what is this program supposed to do?" to know it is wrong -- it is
a business logic bug. Use only the former.

### 9.2 BUG_META

```javascript
const BUG_META = [
  { bugId: 'b1', line: 6,  label: 'Bug 1', original: 'if (score > 100) {' },
  { bugId: 'b2', line: 10, label: 'Bug 2', original: 'if (y = z) { '      },
];
```

Rules:
- `label`: always `'Bug 1'`, `'Bug 2'`, etc. -- never "Logic bug", "Syntax bug",
  "Assignment vs comparison", etc.
- `original`: the buggy line exactly as in the CODE array
- **NO `fix` field** -- do not store the correct answer anywhere in metadata

### 9.3 Bug Tracker Bar HTML

```html
<div class="bug-bar" role="region" aria-label="Bug tracker">
  <span class="bug-bar-label">Bug Tracker</span>
  <div class="bug-dots" role="list">
    <div class="bug-dot-wrap" role="listitem">
      <div class="bug-dot" id="dot-1"
        aria-label="Bug 1 status: not yet identified"></div>
      <span class="bug-dot-label">Bug 1</span>
    </div>
    <div class="bug-dot-wrap" role="listitem">
      <div class="bug-dot" id="dot-2"
        aria-label="Bug 2 status: not yet identified"></div>
      <span class="bug-dot-label">Bug 2</span>
    </div>
  </div>
</div>
```

Bug dot labels should use only `Bug 1`, `Bug 2`, etc. -- or a topic-area label
that does NOT reveal the bug type (e.g., "Gear check" is acceptable if it
describes the code section, not the fix).

### 9.4 Bug Count Guidelines

| Java topic                    | Recommended bug count |
| ----------------------------- | --------------------- |
| Basic operators, if/else      | 2-3                   |
| Arrays, loops                 | 3-4                   |
| Classes, constructors, fields | 3-5                   |
| Inheritance, super, @Override | 4-6                   |
| Interfaces, abstract classes  | 5-8                   |
| Complex multi-file programs   | 6-10                  |

### 9.5 Bug Type Bank

Common, pedagogically appropriate structural bugs by topic:

| Topic        | Bug examples                                                     |
| ------------ | ---------------------------------------------------------------- |
| Operators    | `>` vs `>=`, `=` (assign) vs `==` (compare), `&&` vs `           |  | ` |
| Types        | Wrong return type (`String` vs `void`), incompatible cast        |
| Constructors | Wrong `super()` call order, missing `super()` call               |
| Inheritance  | Missing `@Override`, wrong method signature, `super.field` ref   |
| Interfaces   | Incomplete implementation, wrong return type in interface method |
| Scope        | Variable declared inside block, used outside                     |
| Loops        | Off-by-one in condition, wrong loop variable                     |
| Collections  | Missing generic type `ArrayList` vs `ArrayList<String>`          |

---

## 10. Anti-Spoiler Rules

The following content must **never** appear anywhere a student can see:

| Forbidden content               | Where it's commonly misplaced            |
| ------------------------------- | ---------------------------------------- |
| The correct operator or keyword | Q4/Q5 text ("change > to >=")            |
| The corrected code              | Q placeholder, fix-prompt text           |
| Bug type classification         | Bug dot labels, section dividers, Q_META |
| Operator comparison framing     | Q placeholder ("= vs ==?")               |
| The `fix` field in BUG_META     | The metadata object itself               |
| "Bug 1" or "Bug 2" in dividers  | Section divider labels                   |
| "Bug X fix" in Q_META labels    | Q_META label field                       |

**Anti-spoiler checklist** -- before shipping, search the file for:
- `>= `, `== `, `<= ` (correct operators that should not be in visible text)
- `Bug 1`, `Bug 2` in dividers (should only be in bug bar labels and Q_META)
- `fix` in Q_META labels (e.g., "Bug 2 fix" is a violation)
- Any fix description: "operator fix", "assignment vs comparison", "should be"

---

## 11. Copy Rules

**No em dashes anywhere in copy.** This applies to question text, placeholder
text, section divider labels, topbar titles, export markdown, and the AI review
prompt. Use a plain dash `-` or double dash `--` instead. Unicode `\u2014`
is an em dash and is also forbidden.

This applies everywhere in the file -- HTML, JavaScript strings, and exported
markdown output.

---

## 12. Navigation Bar

```html
<div id="topbar">
  <h1>{emoji} {App Title}</h1>
  <span class="subtitle">Debug &amp; Trace Session</span>
  <div style="flex:1"></div>
  <button class="btn-theme" id="theme-toggle"
    onclick="toggleTheme()"
    aria-label="Switch to dark mode">
    <span id="theme-icon" aria-hidden="true">Moon emoji</span>
  </button>
  <button class="top-btn" id="export-btn"
    onclick="exportMarkdown()" disabled>
    Export
  </button>
  <button class="top-btn" id="btn-reset"
    onclick="resetAll()"
    aria-label="Reset all inputs and bug fixes">
    Reset
  </button>
</div>
```

Rules:
- App title is the scenario name: "Island Logic", "Trail Conditions Check"
- The subtitle is always "Debug & Trace Session" (consistent across all apps)
- The export button starts `disabled`; it is enabled only when all questions
  have at least 1 character typed
- Theme toggle: shows moon icon in light mode (click -> dark), sun icon in dark
  mode (click -> light)
- The topbar spacer must use `flex:1` to push controls right

---

## 13. Light / Dark Mode

### Architecture

`:root` holds the **light-mode defaults**. Dark mode is applied via:

```css
html[data-theme="dark"] { /* overrides */ }
```

Light mode is explicit for elements that default dark (code panel, topbar):

```css
html[data-theme="light"] #code-panel { background: #f5f8f5; }
html[data-theme="light"] td.code      { color: #1a3020; }
html[data-theme="light"] .kw          { color: #00507a; }
/* etc. */
```

**Light mode is always the default.** The FOUC script must default to `'light'`,
not to `prefers-color-scheme`. Dark mode is available via the toggle but is not
the starting state. This is required for classroom use -- dark mode over video
share creates contrast problems that cannot be controlled by the instructor.

`color-scheme: light dark;` should be set on `html` so the browser renders
scrollbars and system UI consistently.

### Theme Toggle JS

```javascript
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('trace-theme', next);
  document.getElementById('theme-icon').textContent = next === 'dark' ? '☀' : '🌙';
  document.getElementById('theme-toggle').setAttribute('aria-label',
    next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}
```

---

## 14. Live Share (TRACE_ADAPTER)

Every trace app must expose `window.TRACE_ADAPTER`. This is the interface
consumed by `../../shared/trace-liveshare.js`.

```javascript
window.TRACE_ADAPTER = {
  // Unique across all apps -- convention: w{week}{day}-trace
  appId: 'w5thur-trace',

  // One entry per question
  questions: Q_META.map((q, i) => ({
    id:    q.id,
    index: i,
    el:    () => document.getElementById(q.id),
    bugId: Q_TO_BUG[q.id] || null,
  })),

  // Returns the full shareable state (answers + bug fix status)
  getState() {
    return {
      answers: Q_META.map(q => document.getElementById(q.id)?.value || ''),
      bugs:    BUG_META.map(b => ({ bugId: b.bugId, fixed: fixed.has(b.bugId) })),
    };
  },

  // Applies a received state (from another student's session)
  applyState(state) {
    state.answers?.forEach((val, i) => {
      const el = document.getElementById(Q_META[i]?.id);
      if (el) { el.value = val; syncQuestion(Q_META[i].id); }
    });
    state.bugs?.forEach(({ bugId, fixed: isFixed }) => {
      if (isFixed) markFixed(bugId);
    });
    updateExportEnabled();
  },

  // Resets the app (called by live share host when restarting a session)
  reset: resetAll,
};
```

`appId` naming convention: `w{week}{day}-trace`
- Examples: `w1thur-trace`, `w5thur-trace`, `w6tue-trace`, `w7tue-trace`

---

## 15. Export

The export function downloads a `.md` file. Required sections in order:

```markdown
# {App Title} -- Debug & Trace Session
**Week {N}, {Day} | Topic: {Java topic description}**
*(optional: Room/cohort line if in live-share mode)*

## Bug Board

| #   | Line | Label | Status |
| --- | ---- | ----- | ------ |
| 1   | 6    | Bug 1 | FIXED  |
| 2   | 10   | Bug 2 | OPEN   |

## Trace Answers

### Q1 -- {label} ({anchor})
{student answer or "(no answer)"}

### Q2 -- {label} ({anchor})
{student answer or "(no answer)"}
...

## Code Snapshot

```java
{full code -- fixed lines show corrected version,
 unfixed bug lines show original}
```

## AI Review Prompt

Paste the code above into Claude or ChatGPT with:

"{Topic-specific review prompt}"
```

Rules:
- Bug board shows `FIXED` or `OPEN` -- never reveals the fix
- Code snapshot reconstructs the full source; fixed lines = student's correct input
- AI review prompt is written for the specific Java concept being practiced
  (e.g., "Review this code for correct use of inheritance and the super keyword")
- Export is disabled until all questions have at least 1 character
- Downloaded filename: `{app-title-kebab}-trace.md`
- **No em dashes anywhere in the exported markdown.** Use `--` instead of `--`.
  Unicode `\u2014` is forbidden.

---

## 16. Accessibility Requirements

All four categories below apply to every trace app. Check both light and dark
mode for each requirement.

---

### 16.1 WCAG AA Contrast

All text must pass 4.5:1 minimum contrast (body text) or 3:1 (large text >= 18px
regular or >= 14px bold). This applies in BOTH light and dark mode.

Include a verified comment block at the top of `<style>`:

```css
/*
  WCAG AA verification -- check BOTH modes (format: description -- ratio -- PASS/FAIL):
  [Light mode]
  code-text on code-bg       -- X.X:1  PASS
  line-num on code-bg        -- X.X:1  PASS
  text on page bg            -- X.X:1  PASS
  muted/secondary on page bg -- X.X:1  PASS
  topbar text on topbar bg   -- X.X:1  PASS
  export btn: label on bg    -- X.X:1  PASS
  reset btn: label on bg     -- X.X:1  PASS
  syntax comments on code-bg -- X.X:1  PASS
  [Dark mode overrides -- recheck every pair that changes]
  code-text on code-bg       -- X.X:1  PASS
  muted text on dark bg      -- X.X:1  PASS
*/
```

**Common failure patterns to watch for:**

- Muted/secondary text on DARK backgrounds: the fix is to LIGHTEN the text color,
  not darken it. A color that passes on white will fail on near-black.
- Syntax comment color (`--syn-cm`): comments are real text and must pass 4.5:1.
  They are not decorative. A common mistake is to use a very dim color to "de-emphasize"
  comments -- this fails for low-vision users.
- Gold/amber accent colors used as text on light backgrounds: amber hues have
  relatively low luminance and frequently fail on off-white surfaces. Always
  verify the actual ratio (do not estimate by eye).
- Light-mode code panel overrides: the `html[data-theme="light"]` color block
  must be re-verified for every color it changes. Do not assume a color that
  worked on the dark page background also works on the light code panel background.

---

### 16.2 Color-Blind Safe Patterns

**Do not use color as the only indicator of state.** At minimum two distinct
visual cues must differentiate states. Accepted cue pairs:

| State pair              | Color | Shape / style cue required              |
| ----------------------- | ----- | --------------------------------------- |
| Bug found / not found   | yes   | Dashed outline on found, no outline on idle |
| Bug fixed / found       | yes   | Solid thick outline on fixed, dashed on found |
| Correct answer          | yes   | Solid heavy left border or solid border-style |
| Wrong answer            | yes   | Dashed border-style                     |
| Tab: bugs / no bugs     | yes   | Filled pip vs empty outlined pip        |

**Bug dot shape pattern (required):**
```css
/* idle: no outline */
.bug-dot { background: var(--bug-dot-idle); }

/* found/identified: dashed outline = shape cue */
.bug-dot.identified {
  background: var(--bug-dot-found);
  outline: 2px dashed var(--bug-dot-found);
  outline-offset: 2px;
}

/* fixed: solid thicker outline = distinct shape from identified */
.bug-dot.fixed {
  background: var(--bug-dot-fixed);
  outline: 3px solid var(--bug-dot-fixed);
  outline-offset: 2px;
}
```

**Correct/wrong input pattern (required for FITB/multiple choice revealed states):**
- Correct: `border: 2px solid var(--correct-color); border-left: 5px solid var(--correct-color);` (heavy left bar)
- Wrong: `border: 2px dashed var(--wrong-color);` (dashed)

**Never use red + green as the only pair.** This is the most common failure for
deuteranopia (red-green colorblindness, ~8% of male users). Red/green pairs are
fine as a color cue only when paired with one of the shape cues above.

---

### 16.3 Dyslexia Considerations

**Fonts:**
- Body text is **always DM Sans** -- it has open letterforms, clear letter
  spacing, and generous x-height that benefit readers with dyslexia.
- Code font: **JetBrains Mono** (preferred) or Fira Code. Both have clear
  distinction between 0/O, 1/l/I which prevents character confusion.
- **Never use Courier New or Courier** -- these have narrow, similar letterforms
  (1/l/I especially) and poor glyph distinction for dyslexic readers.
- Serif fonts (Crimson Pro, etc.) may be used sparingly for atmospheric flavor
  text (card questions, subtitles) but must never be used for primary question
  text, labels, or any text a student needs to read carefully. Body is DM Sans.

**Line height (minimum values -- never go below these):**
- Body / UI text: `line-height: 1.6`
- Question text and reading passages: `line-height: 1.65`
- Flavor/card text using a serif or decorative font: `line-height: 1.55`
- Code panel text: `line-height: 1.7` to `1.85` (breathing room between lines)
- Display/title elements (Anton, Barlow Condensed): line-height can be tighter
  (0.95-1.1) as these are single-line headings, not reading passages.

**Font sizes:**
- Body minimum: 16px (18px preferred for classroom/presentation)
- Code text minimum: 14px (15px preferred)
- Labels and meta text: 12px absolute minimum; prefer 13-14px
- Never set body line-height lower than 1.5 even for light flavor text

---

### 16.4 Both Modes Must Pass

Every accessibility check applies in BOTH light and dark mode.

**Architecture reminder:** `:root` holds light-mode values. Dark mode is applied
via `html[data-theme="dark"] { }` overrides. When you change a color in the dark
override block, re-verify every text/bg pair that uses that color.

**Specific pairs to re-verify in dark mode:**
- Muted/secondary text on the dark page background (`--bg-base`, `--bg-panel`)
- Line numbers on the dark code background (`--bg-code`)
- Syntax highlighting tokens on the dark code background
- Bug dot labels on the dark bug bar background
- Any text inside the question panel (which may have a dark surface in dark mode)

**Specific pairs to re-verify in light mode:**
- Syntax highlighting tokens on the light code panel background (the light panel
  is usually a medium gray -- colors that work on near-black may fail here)
- Bug callout text on the light editable row background
- Muted text on the light page background (a color that looks "readable" on dark
  often has insufficient contrast on light surfaces)
- Line numbers on the light code panel background

**Light mode is always the default.** The FOUC script must default to `'light'`.
Classroom video share requires a light background. Dark mode is an optional
toggle, not the starting state.

---

### 16.5 Viewport Meta Tag

`<meta name="viewport" content="width=1080">` is required on every trace app.
This is an accessibility and layout requirement, not optional.

---

### 16.6 Required ARIA

```
topbar:            role="banner"
bug-bar:           role="region" aria-label="Bug tracker"
bug-dots:          role="list"
bug-dot-wrap:      role="listitem"
bug-dot:           aria-label="Bug {n} status: not yet identified"
code-panel:        aria-label="Java source code"
question-panel:    aria-label="Trace questions"
textarea:          aria-label="Question {n} answer"
theme-toggle:      aria-label="Switch to dark/light mode"
export-btn:        implicit from text content, or aria-label
File tab buttons:  role="tab", aria-selected, aria-controls
File tab panels:   role="tabpanel", aria-labelledby
Editable inputs:   aria-label="Editable code line {n} in {File}.java -- fix the bug"
```

---

### 16.7 Keyboard

- All interactive elements reachable by Tab in logical order
- Export and Reset always focusable even when export is disabled
- File tabs: clicking or pressing Enter/Space switches pane
- `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`
  on all code inputs (prevents autocorrect from mangling Java syntax)

---

## 17. Java Program Guidelines

### Program Requirements

- **Length**: 15-40 lines (not counting blank lines or closing braces)
- **Realism**: the program should do something that makes intuitive sense
  (score checker, gear validator, route planner, weather checker, etc.)
- **Self-contained**: no external imports beyond `java.util.*` where needed
- **Bugs are structural** -- see §9.1 for the full definition and examples.
  Never use business logic bugs.

### Matching Program to Week's Topic

| Week | Topic                       | Program ideas                                     |
| ---- | --------------------------- | ------------------------------------------------- |
| 1    | Variables, if/else          | Score threshold check, gear rating validator      |
| 2    | Methods, parameters         | Tip calculator, area calculator                   |
| 3    | Arrays, loops               | Grade averager, inventory counter                 |
| 4    | Strings, string methods     | Name formatter, sentence analyzer                 |
| 5    | Classes, constructors, this | Game scorer, player profile, reward system        |
| 6    | Inheritance, extends, super | Character hierarchy, animal classification        |
| 7    | Interfaces, abstract        | Payment processor, shape renderer, access control |

### Naming Conventions in Code

- Variable and method names: camelCase, descriptive
- Class names: PascalCase
- Do not use placeholder names like `x`, `temp`, `foo`
- Use domain-appropriate names (e.g., `gearRating`, `weatherScore`, `isWinning`)

---

## 18. Generation Checklist

Use this checklist when generating a new trace app from scratch:

**Theme**
- [ ] Theme name chosen, metaphor established
- [ ] All `:root` variables filled in
- [ ] WCAG contrast comment block written and verified -- BOTH light and dark mode (§16.1)
- [ ] Dark mode `html[data-theme="dark"]` block complete
- [ ] Light mode code panel overrides complete -- re-verified on lighter bg (§16.4)
- [ ] Favicon SVG written, tests at 16px
- [ ] Google Fonts imported (max 2 families + DM Sans); JetBrains Mono used for code (§16.3)
- [ ] Press Start 2P (if used) restricted to display headers only -- never body text

**Accessibility**
- [ ] Body line-height >= 1.6; question text >= 1.65; code >= 1.7 (§16.3)
- [ ] No Courier New -- use JetBrains Mono or Fira Code for all code text (§16.3)
- [ ] Bug dots use dashed outline (found) + solid thick outline (fixed) shape cues (§16.2)
- [ ] Correct/wrong answer states use border-style shape cues, not color only (§16.2)
- [ ] Muted text on DARK backgrounds is lightened, not darkened (§16.1)
- [ ] Syntax comment color passes 4.5:1 on code-bg (§16.1)
- [ ] All gold/amber accent text verified by ratio -- do not estimate by eye (§16.1)

**Viewport and Defaults**
- [ ] `<meta name="viewport" content="width=1080">` present
- [ ] FOUC script defaults to `'light'`, not `prefers-color-scheme`

**Copy Rules**
- [ ] No em dashes anywhere in HTML copy, JS strings, or exported markdown
- [ ] Double dash `--` used wherever a dash separator is needed

**Java Program**
- [ ] 15-40 lines, topic-appropriate, believable
- [ ] 2-8 bugs -- all structural, none business logic (see §9.1)
- [ ] Each bug line appears exactly once in the CODE array (no duplicate plain + bug entry)
- [ ] Bug lines are structurally interesting (not just typos)
- [ ] CODE array (single-file) or HTML panes (multi-tab) complete

**Questions**
- [ ] 5-8 questions
- [ ] Q1-Q2: pure trace (no bug hunting yet)
- [ ] Bug-hunt questions come after trace questions
- [ ] Every question anchored to specific line(s)
- [ ] No spoilers in question text or placeholders
- [ ] Placeholders describe linguistic form, not "enter answer here"
- [ ] Section dividers are neutral (no bug descriptions)

**Bug System**
- [ ] Q_TO_BUG and BUG_TO_FIX_DIV mappings set
- [ ] Q_META labels are neutral -- no "Bug X fix" phrasing
- [ ] BUG_META has no `fix` field
- [ ] Bug tracker dots labeled "Bug 1", "Bug 2", etc.

**Nav & Controls**
- [ ] Topbar title = scenario name
- [ ] Theme toggle icon + aria-label correct
- [ ] Export button starts disabled

**Export**
- [ ] All required sections present
- [ ] AI review prompt is topic-specific
- [ ] Code snapshot uses correct fix/unfixed logic
- [ ] No em dashes (`\u2014`) anywhere in the exported markdown strings

**Live Share**
- [ ] `window.TRACE_ADAPTER` defined
- [ ] `appId` is unique (check against list in §14)

**Accessibility**
- [ ] `<meta name="viewport" content="width=1080">` present
- [ ] All ARIA roles and labels from §16 present
- [ ] `autocomplete="off"` etc. on all code inputs
- [ ] Keyboard tab order logical

**Anti-Spoiler**
- [ ] Searched for `>=`, `==`, `<=` in visible text -- none found
- [ ] No bug type names in labels or dividers
- [ ] No `fix` field in BUG_META
- [ ] No "Bug X fix" in Q_META labels

---

## 19. Retheme Checklist

Use this checklist when reskinning an **existing** trace app for a different
week or theme. This is faster than the full generation checklist -- only the
visual layer changes. Content, logic, and questions stay identical.

**What changes in a retheme:**

- [ ] `:root` CSS variables -- all hex values for colors, radius, shadow
- [ ] `html[data-theme="dark"]` overrides -- updated to match new dark palette
- [ ] `html[data-theme="light"]` code panel overrides -- updated to match new light palette
- [ ] Google Fonts `<link>` -- swap display and code font families
- [ ] `#topbar h1` font-family declaration -- match new display font
- [ ] `.bug-bar-label`, `.sdlabel`, `.q-number`, `.top-btn` font-family -- match new display font
- [ ] Favicon inline SVG -- new theme-relevant symbol in new accent color
- [ ] WCAG contrast comment block -- re-verified for new palette (both modes)
- [ ] Page `<title>` -- update if scenario name changed (usually stays the same)
- [ ] Topbar `<h1>` emoji -- swap to theme-relevant emoji if desired

**What does NOT change in a retheme:**

- All HTML structure and layout
- All question card content, anchors, and placeholders
- All section divider labels
- Bug tracker bar labels
- CODE array and all bug definitions
- Q_META, BUG_META, Q_TO_BUG, FIX_DIV
- All JavaScript logic
- TRACE_ADAPTER (appId stays the same -- it is the same app)
- Export function content (title, AI prompt, filename)
- Viewport meta tag
- FOUC script
- ARIA labels and roles
- All copy rules (no em dashes, etc.)

**Fastest retheme path:**

1. Open the existing app and the theme catalog (§4.5) side by side
2. Pick the target theme's display font and accent color
3. Do a find-replace on the old accent hex value to new accent hex value
4. Swap the font import URL and all font-family references
5. Adjust the remaining `:root` variables (bg, surface, code-bg, etc.)
6. Update both dark and light mode override blocks
7. Redraw the favicon SVG with the new symbol and accent color
8. Verify WCAG contrast on every changed color pair
9. Spot-check: load in browser, toggle light/dark, check all panels read cleanly