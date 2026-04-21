/**
 * trace-liveshare.js — Shared Ably live-share engine for Java Academy trace apps.
 *
 * USAGE
 * ─────
 * Each app must set window.TRACE_ADAPTER before this script runs:
 *
 *   window.TRACE_ADAPTER = {
 *     title:         'App Title HTML',        // shown in landing card
 *     subtitle:      'App Subtitle HTML',
 *     channelPrefix: 'tdd',                   // unique prefix for Ably channel name
 *     questions: [                            // one entry per question, in order
 *       { id: 'q1', hasBug: false },
 *       { id: 'q2', hasBug: true  },
 *       // ...
 *     ],
 *     getAnswer(qid),          // → string: current textarea value for this question
 *     setAnswer(qid, val),     // set textarea + trigger any side effects (fix prompt, bug activate)
 *     getFixValues(),          // → { lineKey: value } for all .bug-input elements currently in DOM
 *     applyFixValue(key, val), // apply value to .bug-input[data-line-key=key], update correct styling
 *     isDoneReady(qIdx),       // → bool: text entered AND (if bug Q) all fixes correct
 *     setEditable(qIdx, bool), // enable/disable textarea's paired fix inputs (not the textarea itself)
 *     onReset(),               // clear fixed Set, restore code cells, hide fix prompts, etc.
 *   };
 *
 * The app's HTML must have:
 *   - id="card-q1", id="card-q2"... on each question card (div.q-card)
 *   - id="q1", id="q2"... on each question textarea (textarea.q-input)
 *   - id="question-panel" on the right-hand scroll container
 *   - class="topbar" + class="tb-spacer" in the top bar
 *
 * The shared script injects: landing overlay, conn badge, room strip,
 * done buttons, answered-by tags, and all live-share CSS.
 *
 * Public API: window.TraceLiveShare
 *   .reset()            — call from app's resetAll() after clearing content
 *   .checkDoneEnabled(qIdx)
 *   .notifyTyping()
 *   .syncBroadcast(msg)
 *   .isMyTurn()
 *   .isMultiPlayer()
 *   .getState()         — returns the ls object (read-only reference)
 *
 * Ably key parts are injected by CI (deploy.yml) via sed replacement.
 */
(function () {
  'use strict';

  // ── Ably key (split to avoid plaintext secret in source) ─────────────
  const _k1 = '9K3Yw';
  const _k2 = 'w.CdrK';
  const _k3 = 'NA:0rAn';
  const _k4 = '91BzUR72';
  const _k5 = 'SFbIX3ZjdzmwkMm1U1J4QmPY6z61dWE';
  const ABLY_KEY = _k1 + _k2 + _k3 + _k4 + _k5;

  // ── Adapter shorthand ─────────────────────────────────────────────────
  function A() { return window.TRACE_ADAPTER; }

  // ── Live-share state ──────────────────────────────────────────────────
  const ls = {
    mode: null,           // 'solo' | 'room'
    myName: null,
    cohort: null,
    roomCode: null,
    members: {},          // { name: { isSelf, typing, colorIdx, initial } }
    turnOrder: [],
    activeTurn: null,
    currentQ: 0,
    questionOwners: null, // Array(qCount) — initialized on DOMContentLoaded
  };

  // ── Ably handles ──────────────────────────────────────────────────────
  let ablyClient = null, ablyChannel = null, ablyPresence = null;
  let bc = null, subscribed = false, presenceSubscribed = false;
  let _heartbeatTimer = null, _staleTimer = null, _hideCloseTimer = null;

  // ── Avatar palette ────────────────────────────────────────────────────
  const AV_BG  = ['#fef3c7','#dbeafe','#d1fae5','#fce7f3','#ede9fe','#ffedd5'];
  const AV_TXT = ['#92400e','#1e40af','#065f46','#9d174d','#4c1d95','#7c2d12'];

  // =====================================================================
  // CSS INJECTION
  // Prefixed with .ls- or q-card state classes to avoid collisions.
  // Uses CSS custom property fallbacks so it works even if the app's
  // :root vars haven't loaded yet (they always have, but belt-and-suspenders).
  // =====================================================================
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
/* ── Q-card room-mode states ─────────────────────────────────────────── */
.q-card.q-locked    { opacity: 0.38; pointer-events: none; }
.q-card.q-active    { border-color: var(--ls-accent,#3b8aff); }
.q-card.q-watching  { border-color: var(--border-subtle,#252a42); border-style: dashed; }
.q-card.q-done-state{ border-color: #2e5a3a; }

/* ── Answered-by tag ─────────────────────────────────────────────────── */
.q-answered-by {
  display: none; margin-top: 8px;
  font-family: var(--font-heading, var(--font-ui, sans-serif)); font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: #4a7c58;
}

/* ── Done button ─────────────────────────────────────────────────────── */
/* Structural only — visuals deferred to :where() so app button class wins */
.q-done-btn { display: none; width: 100%; margin-top: 10px; cursor: pointer; }
:where(.q-done-btn) {
  height: 38px;
  background: var(--ls-accent, #3b8aff);
  color: var(--ls-on-accent, var(--text-primary, #e8eaf2));
  border: none; border-radius: 6px;
  font-family: var(--font-heading, var(--font-ui, sans-serif)); font-size: 12px; font-weight: 600;
  letter-spacing: 0.06em; transition: filter 0.15s, opacity 0.15s;
}
:where(.q-done-btn:hover)         { filter: brightness(1.15); }
:where(.q-done-btn:focus-visible) { outline: 2px solid var(--ls-accent, #3b8aff); outline-offset: 2px; }

/* ── Room strip ──────────────────────────────────────────────────────── */
#ls-room-strip {
  display: none;
  background: var(--bg-panel, #131629);
  border: 1px solid var(--border-subtle, #252a42);
  border-radius: 8px; padding: 10px 12px; margin-bottom: 13px;
}
.ls-turn-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 6px;
  border: 1.5px solid transparent;
  font-family: var(--font-heading, var(--font-ui, sans-serif)); font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 9px;
}
.ls-turn-banner.your-turn {
  background: rgba(46,90,58,0.35);
  border-color: #4a7c58; color: #9ed8b0;
}
.ls-turn-banner.waiting {
  background: rgba(40,44,60,0.5);
  border-color: var(--border-subtle, #252a42); color: var(--text-secondary, #9aa0bb);
}
#ls-members-list { display: flex; flex-direction: column; gap: 5px; }
.ls-member-row {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 8px; border-radius: 5px;
  border: 1.5px solid transparent;
  transition: border-color 0.15s, background 0.15s;
  font-family: var(--font-ui, sans-serif); font-size: 13px;
}
.ls-member-row.active-turn {
  border-color: #4a7c58; background: rgba(46,90,58,0.18);
}
.ls-member-row.active-turn .ls-member-name { color: #9ed8b0; font-weight: 600; }
.ls-member-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
}
.ls-member-name {
  flex: 1; min-width: 0; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
  color: var(--text-secondary, #9aa0bb);
}
.ls-typing-dot { font-size: 11px; color: var(--ls-accent, #3b8aff); font-weight: 700; }
.ls-turn-pip {
  width: 7px; height: 7px; border-radius: 50%;
  background: #4a7c58; flex-shrink: 0;
  animation: lsTurnPulse 1.2s ease-in-out infinite;
}
@keyframes lsTurnPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.45; transform: scale(0.65); }
}

/* ── Connection badge ────────────────────────────────────────────────── */
.ls-conn-badge {
  font-family: var(--font-heading, var(--font-ui, sans-serif)); font-size: 10px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 4px; flex-shrink: 0;
}
.ls-conn-badge.connecting   { background: var(--bg-card, #1a1e35); color: var(--text-secondary, #9aa0bb); }
.ls-conn-badge.connected    { background: rgba(46,90,58,0.35); color: #a8f0c0; }
.ls-conn-badge.disconnected { background: rgba(154,46,32,0.25); color: #ffb8b0; }

/* ── Turn pill (top nav status indicator) ───────────────────────────── */
#ls-turn-pill {
  display: none; align-items: center; flex-shrink: 0;
  height: 32px; padding: 0 14px;
  border: 1.5px solid var(--border-hi, #353560); background: var(--surface2, #161628);
  color: var(--text-mid, #8888aa);
  font-family: var(--font-ui, var(--font-heading, 'Press Start 2P', monospace)); font-size: 9px; letter-spacing: .04em;
  white-space: nowrap; user-select: none;
}
#ls-turn-pill.your-turn {
  border-color: var(--accent, #00ff99); color: var(--accent, #00ff99);
  background: var(--accent-glow, rgba(0,255,153,0.14));
}

/* ── Landing overlay ─────────────────────────────────────────────────── */
#ls-landing {
  position: fixed; inset: 0; z-index: 200;
  background: var(--bg-base, #0d0f1a);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.ls-lnd-card {
  background: var(--bg-panel, #131629);
  border: 1px solid var(--border-subtle, #252a42);
  border-radius: 12px; padding: 38px 46px;
  max-width: 460px; width: 100%;
  box-shadow: 0 8px 40px rgba(0,0,0,0.55);
  display: flex; flex-direction: column; gap: 20px;
}
.ls-lnd-header { text-align: center; }
.ls-lnd-title {
  font-family: var(--font-heading, var(--font-display, sans-serif)); font-size: 24px; font-weight: 700;
  color: var(--ls-accent, #3b8aff); letter-spacing: 0.04em; margin-bottom: 5px;
}
.ls-lnd-sub {
  font-family: var(--font-ui, sans-serif); font-style: italic;
  color: var(--text-secondary, #9aa0bb); font-size: 15px;
}
.ls-lnd-field-label {
  font-family: var(--font-heading, var(--font-ui, sans-serif)); font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-secondary, #9aa0bb); margin-bottom: 6px;
}
.ls-lnd-input, .ls-lnd-select {
  width: 100%; height: 44px;
  background: var(--bg-card, #1a1e35);
  border: 1.5px solid var(--border-subtle, #252a42);
  border-radius: 7px; padding: 0 14px;
  font-family: var(--font-ui, sans-serif); font-size: 16px;
  color: var(--text-primary, #e8eaf2); outline: none;
  transition: border-color 0.15s;
}
.ls-lnd-input:focus, .ls-lnd-select:focus { border-color: var(--ls-accent, #3b8aff); }
.ls-lnd-code { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.ls-lnd-code::placeholder { text-transform: none; letter-spacing: normal; font-weight: 400; }
.ls-lnd-select {
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235c6380' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
  padding-right: 40px; cursor: pointer;
}
/* Structural only — visuals deferred to :where() so app button class wins */
.ls-lnd-solo-btn { width: 100%; cursor: pointer; }
:where(.ls-lnd-solo-btn) {
  height: 46px;
  background: var(--bg-card, #1a1e35);
  color: var(--text-primary, #e8eaf2);
  border: 1.5px solid var(--border-subtle, #252a42);
  border-radius: 7px; font-family: var(--font-heading, var(--font-ui, sans-serif));
  font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
  transition: border-color 0.15s, filter 0.15s;
}
:where(.ls-lnd-solo-btn:hover)         { border-color: var(--text-secondary, #9aa0bb); filter: brightness(1.1); }
:where(.ls-lnd-solo-btn:focus-visible) { outline: 2px solid var(--ls-accent, #3b8aff); outline-offset: 2px; }
.ls-lnd-join-btn { width: 100%; cursor: pointer; }
:where(.ls-lnd-join-btn) {
  height: 46px;
  background: var(--ls-accent, #3b8aff);
  color: var(--ls-on-accent, var(--text-primary, #e8eaf2));
  border: none; border-radius: 7px; font-family: var(--font-heading, var(--font-ui, sans-serif));
  font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
  transition: filter 0.15s, opacity 0.15s;
}
:where(.ls-lnd-join-btn:hover:not(:disabled)) { filter: brightness(1.15); }
:where(.ls-lnd-join-btn:disabled)             { opacity: 0.32; cursor: default; }
:where(.ls-lnd-join-btn:focus-visible)        { outline: 2px solid var(--ls-accent, #3b8aff); outline-offset: 2px; }
.ls-lnd-divider {
  text-align: center; font-family: var(--font-ui, sans-serif); font-style: italic;
  font-size: 14px; color: var(--text-muted, #5c6380);
  position: relative; padding: 0 70px;
}
.ls-lnd-divider::before, .ls-lnd-divider::after {
  content: ''; position: absolute; top: 50%; width: 30%; height: 1px;
  background: var(--border-subtle, #252a42);
}
.ls-lnd-divider::before { left: 0; }
.ls-lnd-divider::after  { right: 0; }

/* ── Light mode overrides ────────────────────────────────────────────── */
/* Apps define light mode via element rules, NOT by redefining CSS vars.
   So var(--bg-base) etc. stay dark in light mode — we must override explicitly. */
:is(html, body)[data-theme="light"] #ls-landing              { background: #f0f2f8; }
:is(html, body)[data-theme="light"] .ls-lnd-card             { background: #ffffff; border-color: #d0d4e6; box-shadow: 0 8px 40px rgba(0,0,0,0.10); }
:is(html, body)[data-theme="light"] .ls-lnd-sub              { color: #5a6080; }
:is(html, body)[data-theme="light"] .ls-lnd-field-label      { color: #5a6080; }
:is(html, body)[data-theme="light"] .ls-lnd-input,
:is(html, body)[data-theme="light"] .ls-lnd-select           { background: #e8eaf4; border-color: #d0d4e6; color: #1a1c2e; }
:is(html, body)[data-theme="light"] .ls-lnd-solo-btn         { background: #e8eaf4; border-color: #d0d4e6; color: #1a1c2e; }
:is(html, body)[data-theme="light"] .ls-lnd-solo-btn:hover   { background: #d8daf0; border-color: #b0b4d0; }
:is(html, body)[data-theme="light"] .ls-lnd-divider          { color: #7a80a0; }
:is(html, body)[data-theme="light"] .ls-lnd-divider::before,
:is(html, body)[data-theme="light"] .ls-lnd-divider::after   { background: #d0d4e6; }
:is(html, body)[data-theme="light"] #ls-room-strip           { background: #f0f2f8; border-color: #d0d4e6; }
:is(html, body)[data-theme="light"] .ls-member-name          { color: #4a5070; }
:is(html, body)[data-theme="light"] .ls-conn-badge.connecting{ background: #e8eaf4; color: #4a5070; }
:is(html, body)[data-theme="light"] .ls-conn-badge.connected { background: rgba(46,90,58,0.15); color: #2e5a3a; }
:is(html, body)[data-theme="light"] .ls-conn-badge.disconnected { background: rgba(154,46,32,0.12); color: #9a2e20; }
:is(html, body)[data-theme="light"] #ls-turn-pill            { border-color: #d0d4e6; background: #eeeef8; color: #5a6080; }
:is(html, body)[data-theme="light"] #ls-turn-pill.your-turn  { border-color: #007744; color: #007744; background: rgba(0,119,68,0.08); }
:is(html, body)[data-theme="light"] .ls-turn-banner.your-turn { background: rgba(46,90,58,0.12); border-color: #4a7c58; color: #2e5a3a; }
:is(html, body)[data-theme="light"] .ls-turn-banner.waiting  { background: rgba(0,0,0,0.04); border-color: #d0d4e6; color: #4a5070; }
:is(html, body)[data-theme="light"] .ls-member-row.active-turn { background: rgba(46,90,58,0.1); }
:is(html, body)[data-theme="light"] .ls-member-row.active-turn .ls-member-name { color: #2e5a3a; }
:is(html, body)[data-theme="light"] .q-card.q-done-state     { border-color: #4a7c58; }
:is(html, body)[data-theme="light"] .q-answered-by           { color: #2e5a3a; }
`;
    document.head.appendChild(style);
  }

  // =====================================================================
  // DOM INJECTION
  // =====================================================================

  function injectLanding(title, subtitle) {
    // Set the accent CSS var on :root so it's available to all injected elements
    const accent = (A().accent) || 'var(--accent-blue, #3b8aff)';
    document.documentElement.style.setProperty('--ls-accent', accent);
    if (A().onAccent) document.documentElement.style.setProperty('--ls-on-accent', A().onAccent);

    // If the app uses non-standard CSS vars, inject overrides that point to app-specific refs.
    // This makes the landing adapt correctly to both light and dark via the app's own [data-theme] vars.
    const lv = A().landingVars;
    if (lv) {
      const s = document.createElement('style');
      s.textContent = `
#ls-landing{background:${lv.bg}}
.ls-lnd-card{background:${lv.card};border-color:${lv.border}}
.ls-lnd-input,.ls-lnd-select{background:${lv.input};border-color:${lv.border};color:${lv.text}}
.ls-lnd-solo-btn{background:${lv.input};border-color:${lv.border};color:${lv.text}}
.ls-lnd-field-label,.ls-lnd-sub{color:${lv.textSub}}
.ls-lnd-divider{color:${lv.textSub}}
.ls-lnd-divider::before,.ls-lnd-divider::after{background:${lv.border}}
#ls-room-strip{background:${lv.bg};border-color:${lv.border}}
.ls-member-name{color:${lv.textSub}}
:is(html,body)[data-theme="light"] #ls-landing{background:${lv.bg}}
:is(html,body)[data-theme="light"] .ls-lnd-card{background:${lv.card};border-color:${lv.border}}
:is(html,body)[data-theme="light"] .ls-lnd-input,
:is(html,body)[data-theme="light"] .ls-lnd-select{background:${lv.input};border-color:${lv.border};color:${lv.text}}
:is(html,body)[data-theme="light"] .ls-lnd-solo-btn{background:${lv.input};border-color:${lv.border};color:${lv.text}}
:is(html,body)[data-theme="light"] .ls-lnd-field-label,
:is(html,body)[data-theme="light"] .ls-lnd-sub{color:${lv.textSub}}
:is(html,body)[data-theme="light"] .ls-lnd-divider{color:${lv.textSub}}
:is(html,body)[data-theme="light"] .ls-lnd-divider::before,
:is(html,body)[data-theme="light"] .ls-lnd-divider::after{background:${lv.border}}
:is(html,body)[data-theme="light"] #ls-room-strip{background:${lv.bg};border-color:${lv.border}}
:is(html,body)[data-theme="light"] .ls-member-name{color:${lv.textSub}}`;
      document.head.appendChild(s);
    }

    const div = document.createElement('div');
    div.id = 'ls-landing';
    div.innerHTML = `
<div class="ls-lnd-card">
  <div class="ls-lnd-header">
    <div class="ls-lnd-title">${title}</div>
    <div class="ls-lnd-sub">${subtitle}</div>
  </div>
  <button class="ls-lnd-solo-btn ${A().soloBtnClass || ''}" id="ls-solo-btn">&#128100; Solo Practice</button>
  <div class="ls-lnd-divider">or join your group</div>
  <div>
    <div class="ls-lnd-field-label">Your name</div>
    <input class="ls-lnd-input" id="ls-name" type="text" placeholder="Enter your name..."
      maxlength="40" aria-label="Your name">
  </div>
  <div>
    <div class="ls-lnd-field-label">Cohort</div>
    <select class="ls-lnd-select" id="ls-cohort" aria-label="Cohort number">
      <option value="">Select your cohort...</option>
      ${[1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">Cohort ${n}</option>`).join('')}
    </select>
  </div>
  <div id="ls-room-section" style="display:none">
    <div class="ls-lnd-field-label">Group code</div>
    <input class="ls-lnd-input ls-lnd-code" id="ls-room" type="text"
      placeholder="Group A, B, C..." maxlength="20" aria-label="Group code">
  </div>
  <button class="ls-lnd-join-btn ${A().joinBtnClass || ''}" id="ls-join-btn" disabled>Join Group</button>
</div>`;
    document.body.insertBefore(div, document.body.firstChild);

    document.getElementById('ls-solo-btn').addEventListener('click', joinSolo);
    document.getElementById('ls-join-btn').addEventListener('click', joinRoom);
    document.getElementById('ls-name').addEventListener('input', lndCheckReady);
    document.getElementById('ls-cohort').addEventListener('change', lndSelectCohort);
    document.getElementById('ls-room').addEventListener('input', lndCheckReady);
    document.getElementById('ls-room').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
  }

  function injectConnBadge() {
    // Conn badge lives before the spacer (stays in header flow, left of ctrl group)
    const spacer = document.querySelector('.tb-spacer');
    if (spacer) {
      const badge = document.createElement('span');
      badge.id = 'ls-conn-badge';
      badge.className = 'ls-conn-badge';
      badge.style.display = 'none';
      spacer.parentNode.insertBefore(badge, spacer);
    }

    // Turn pill and leave button: find the button container (apps vary in structure).
    // Try .hdr-ctrl first; fall back to the parent of the theme toggle button.
    const ctrl = document.querySelector('.hdr-ctrl')
      || document.querySelector('#theme-btn, #theme-toggle')?.parentElement;
    if (!ctrl) return;

    // Find the export button reference point — apps use different IDs.
    const exportBtn = document.getElementById('export-btn')
      || document.getElementById('btn-export');

    // Match the leave button class to the app's existing button style.
    // Find the first non-theme button in the container to borrow its class.
    const themeToggle = ctrl.querySelector('#theme-btn, #theme-toggle');
    const sampleBtn = [...ctrl.querySelectorAll('button')].find(b => b !== themeToggle);
    // If no other buttons exist (e.g. header only has theme btn), strip 'btn-theme'
    // from the theme button's class to get the base class (e.g. 'btn').
    const btnCls = sampleBtn
      ? sampleBtn.className
      : (themeToggle?.className || '').replace(/btn-theme/g, '').trim() || 'cbtn';

    const pill = document.createElement('div');
    pill.id = 'ls-turn-pill';
    pill.setAttribute('aria-live', 'polite');
    pill.setAttribute('aria-label', 'Current turn indicator');
    pill.style.display = 'none';
    ctrl.insertBefore(pill, exportBtn || null);

    const leave = document.createElement('button');
    leave.id = 'ls-leave-btn';
    leave.className = btnCls;
    leave.textContent = 'LEAVE';
    leave.title = 'Leave session and return to start';
    leave.style.display = 'none';
    leave.addEventListener('click', leaveSession);
    ctrl.insertBefore(leave, exportBtn || null);
  }

  function injectRoomStrip() {
    const panel = document.getElementById('question-panel');
    if (!panel) return;
    const strip = document.createElement('div');
    strip.id = 'ls-room-strip';
    strip.innerHTML = `
<div id="ls-turn-banner" class="ls-turn-banner">
  <span id="ls-turn-icon"></span>
  <span id="ls-turn-text"></span>
</div>
<div id="ls-members-list"></div>`;
    panel.insertBefore(strip, panel.firstChild);
  }

  function injectDoneButtons(questions) {
    const last = questions.length - 1;
    questions.forEach((q, i) => {
      const card = document.getElementById('card-' + q.id);
      if (!card) return;

      const answered = document.createElement('div');
      answered.className = 'q-answered-by';
      answered.id = 'ls-answered-' + q.id;
      card.appendChild(answered);

      const btn = document.createElement('button');
      btn.className = ('q-done-btn ' + (A().joinBtnClass || '')).trim();
      btn.id = 'ls-done-' + q.id;
      btn.setAttribute('aria-label', i < last
        ? 'Submit answer and pass to next student'
        : 'Submit answer and complete session');
      btn.innerHTML = i < last
        ? 'Done \u2014 pass to next student \u203a'
        : 'Done \u2014 complete session \u2713';
      btn.addEventListener('click', () => submitQuestion(i));
      card.appendChild(btn);
    });
  }

  function attachInputListeners(questions) {
    questions.forEach((q, qIdx) => {
      const el = document.getElementById(q.id);
      if (!el) return;
      el.addEventListener('input', () => {
        const isActive = isMyTurn() && qIdx === ls.currentQ;
        if (ls.mode === 'solo') {
          if (isActive) checkDoneEnabled(qIdx);
          return;
        }
        if (ls.mode !== 'room') return;
        const isRevision = ls.questionOwners[qIdx] === ls.myName && qIdx < ls.currentQ;
        if (isActive || isRevision) {
          notifyTyping();
          syncBroadcast({ type: 'answer-update', qid: q.id, value: el.value });
          if (isActive) checkDoneEnabled(qIdx);
        }
      });
    });
  }

  // =====================================================================
  // LANDING LOGIC
  // =====================================================================

  function lndCheckReady() {
    const name   = document.getElementById('ls-name').value.trim();
    const cohort = document.getElementById('ls-cohort').value;
    const code   = document.getElementById('ls-room').value.trim();
    document.getElementById('ls-join-btn').disabled = !(name && cohort && code);
  }

  function lndSelectCohort() {
    const val = document.getElementById('ls-cohort').value;
    document.getElementById('ls-room-section').style.display = val ? 'block' : 'none';
    lndCheckReady();
    if (val) document.getElementById('ls-room').focus();
  }

  function joinSolo() {
    ls.mode   = 'solo';
    ls.myName = document.getElementById('ls-name').value.trim() || 'Student';
    addMember(ls.myName, true);   // needed so isMyTurn() and submitQuestion work in solo
    showApp();
  }

  function joinRoom() {
    const name   = document.getElementById('ls-name').value.trim();
    const cohort = document.getElementById('ls-cohort').value;
    const code   = document.getElementById('ls-room').value.trim();
    if (!name || !cohort || !code) return;
    ls.mode     = 'room';
    ls.myName   = name;
    ls.cohort   = cohort;
    ls.roomCode = code.toUpperCase();
    showApp();
    syncStart();
  }

  function showApp() {
    const overlay = document.getElementById('ls-landing');
    if (overlay) overlay.style.display = 'none';

    if (ls.mode === 'room') {
      addMember(ls.myName, true);
      const badge = document.getElementById('ls-conn-badge');
      if (badge) badge.style.display = '';
    }

    // Show leave button for all modes
    const leave = document.getElementById('ls-leave-btn');
    if (leave) leave.style.display = '';

    // Update done button labels to match mode
    const questions = A().questions;
    const last = questions.length - 1;
    questions.forEach((q, i) => {
      const btn = document.getElementById('ls-done-' + q.id);
      if (!btn) return;
      if (ls.mode === 'solo') {
        btn.innerHTML   = i < last ? 'Done \u2014 next question \u203a' : 'Done \u2014 finish \u2713';
        btn.setAttribute('aria-label', i < last ? 'Mark done and proceed to next question' : 'Complete session');
      }
    });

    renderQCards();
    renderTurnUI();
    const firstQ = A().questions[0];
    if (firstQ) {
      const el = document.getElementById(firstQ.id);
      if (el && !el.disabled) el.focus();
    }
  }

  // =====================================================================
  // Q-CARD STATE MANAGEMENT
  // States: 'free' | 'active' | 'watching' | 'locked' | 'done'
  // =====================================================================

  function setQState(idx, state) {
    const q        = A().questions[idx];
    const card     = document.getElementById('card-' + q.id);
    const textarea = document.getElementById(q.id);
    const doneBtn  = document.getElementById('ls-done-' + q.id);
    const answered = document.getElementById('ls-answered-' + q.id);
    if (!card) return;

    card.classList.remove('q-locked', 'q-active', 'q-watching', 'q-done-state');

    if (state === 'free') {
      textarea.disabled = false;
      A().setEditable(idx, true);
      if (doneBtn) { doneBtn.dataset.active = ''; doneBtn.style.display = 'none'; }
      if (answered) answered.style.display = 'none';

    } else if (state === 'active') {
      card.classList.add('q-active');
      textarea.disabled = false;
      A().setEditable(idx, true);
      if (doneBtn) {
        doneBtn.dataset.active = 'true';
        doneBtn.style.display = 'none';
        checkDoneEnabled(idx);
      }
      if (answered) answered.style.display = 'none';
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } else if (state === 'watching') {
      card.classList.add('q-watching');
      textarea.disabled = true;
      A().setEditable(idx, false);
      if (doneBtn) { doneBtn.dataset.active = ''; doneBtn.style.display = 'none'; }
      if (answered) answered.style.display = 'none';

    } else if (state === 'locked') {
      card.classList.add('q-locked');
      textarea.disabled = true;
      if (doneBtn) { doneBtn.dataset.active = ''; doneBtn.style.display = 'none'; }
      if (answered) answered.style.display = 'none';

    } else if (state === 'done') {
      card.classList.add('q-done-state');
      // Original answerer can still revise; everyone else is read-only
      const isOwner = ls.questionOwners[idx] === ls.myName;
      textarea.disabled = !isOwner;
      if (!isOwner) A().setEditable(idx, false);
      if (doneBtn) { doneBtn.dataset.active = ''; doneBtn.style.display = 'none'; }
      if (answered) {
        const owner = ls.questionOwners[idx];
        if (owner) {
          answered.innerHTML = '&#10003; Answered by ' + owner;
          answered.style.display = 'block';
        }
      }
    }
  }

  function renderQCards() {
    const qs = A().questions;
    // Both solo and room use sequential progression; solo just never waits on others
    qs.forEach((q, i) => {
      if (i < ls.currentQ)        setQState(i, 'done');
      else if (i === ls.currentQ) setQState(i, isMyTurn() ? 'active' : 'watching');
      else                        setQState(i, 'locked');
    });
  }

  // Show the done button only when the adapter confirms all conditions are met.
  // Called whenever textarea or fix inputs change (active question only).
  function checkDoneEnabled(qIdx) {
    const q       = A().questions[qIdx];
    const doneBtn = document.getElementById('ls-done-' + q.id);
    if (!doneBtn || !doneBtn.dataset.active) return;
    doneBtn.style.display = A().isDoneReady(qIdx) ? 'block' : 'none';
  }

  // =====================================================================
  // SUBMIT / TURN ADVANCE
  // =====================================================================

  function submitQuestion(qIdx) {
    if (!isMyTurn()) return;

    ls.questionOwners[qIdx] = ls.myName;
    ls.currentQ = qIdx + 1;

    // Rotate to next student (wraps round-robin)
    if (ls.turnOrder.length > 1) {
      const cur = ls.turnOrder.indexOf(ls.activeTurn);
      ls.activeTurn = ls.turnOrder[(cur + 1) % ls.turnOrder.length];
    }

    const answers   = {};
    A().questions.forEach(q => { answers[q.id] = A().getAnswer(q.id); });
    const fixValues = A().getFixValues();

    syncBroadcast({
      type: 'turn-set',
      currentQ: ls.currentQ,
      activeTurn: ls.activeTurn,
      turnOrder: ls.turnOrder,
      questionOwners: ls.questionOwners,
      answers,
      fixValues,
    });

    renderQCards();
    renderTurnUI();
  }

  // =====================================================================
  // MEMBERS + TURN UI
  // =====================================================================

  function addMember(name, isSelf) {
    if (!ls.members[name]) {
      const idx = Object.keys(ls.members).length % AV_BG.length;
      ls.members[name] = { isSelf, typing: false, colorIdx: idx, initial: name.slice(0, 2).toUpperCase(), confirmed: isSelf, lastSeen: Date.now() };
      addToTurnOrder(name);
    } else {
      // Refresh lastSeen on re-add (e.g. host reconnects after syncStop — existing
      // members would have stale lastSeen predating the reconnect, causing immediate
      // eviction when evictStaleMembers() runs on tab-show).
      ls.members[name].lastSeen = Date.now();
      ls.members[name].confirmed = true;
    }
    renderTurnUI();
  }

  function addToTurnOrder(name) {
    if (!ls.turnOrder.includes(name)) ls.turnOrder.push(name);
    if (!ls.activeTurn && ls.turnOrder.length > 0) ls.activeTurn = ls.turnOrder[0];
    renderTurnUI();
  }

  function removeFromTurnOrder(name) {
    const idx = ls.turnOrder.indexOf(name);
    const wasActive = ls.activeTurn === name;
    ls.turnOrder = ls.turnOrder.filter(n => n !== name);
    delete ls.members[name];
    if (wasActive) {
      if (ls.turnOrder.length === 0) {
        ls.activeTurn = null;
      } else {
        // Fall back to the person just before the one who left (wrap if they were first).
        const prevIdx = idx > 0 ? idx - 1 : ls.turnOrder.length - 1;
        ls.activeTurn = ls.turnOrder[prevIdx];
        // Broadcast so all peers immediately learn the new turn holder.
        syncBroadcast({ type: 'turn-set', turnOrder: ls.turnOrder, activeTurn: ls.activeTurn });
      }
    }
    renderQCards();
    renderTurnUI();
  }

  function isMyTurn()      { return ls.mode === 'solo' || ls.activeTurn === ls.myName; }
  function isMultiPlayer() { return ls.turnOrder.length > 1; }

  function renderTurnUI() {
    const strip  = document.getElementById('ls-room-strip');
    const banner = document.getElementById('ls-turn-banner');
    const icon   = document.getElementById('ls-turn-icon');
    const text   = document.getElementById('ls-turn-text');
    const list   = document.getElementById('ls-members-list');
    const pill   = document.getElementById('ls-turn-pill');
    if (!strip) return;

    if (ls.mode !== 'room' || !isMultiPlayer()) {
      strip.style.display = 'none';
      if (pill) pill.style.display = 'none';
      return;
    }

    strip.style.display = 'block';
    const qCount = A().questions.length;

    if (isMyTurn()) {
      banner.className = 'ls-turn-banner your-turn';
      icon.textContent = '✏';
      text.textContent = ls.currentQ < qCount
        ? `Your turn — answer Q${ls.currentQ + 1}`
        : 'Session complete!';
      if (pill) {
        pill.style.display = 'flex';
        pill.className = 'your-turn';
        pill.textContent = ls.currentQ < qCount ? `✏ YOUR TURN — Q${ls.currentQ + 1}` : '✓ COMPLETE';
      }
    } else {
      banner.className = 'ls-turn-banner waiting';
      icon.textContent = '⏳';
      text.textContent = ls.currentQ < qCount
        ? `${ls.activeTurn || '...'}'s turn — Q${ls.currentQ + 1}`
        : 'Session complete!';
      if (pill) {
        pill.style.display = 'flex';
        pill.className = '';
        pill.textContent = ls.currentQ < qCount
          ? `${(ls.activeTurn || '...').toUpperCase()}'S TURN`
          : 'COMPLETE';
      }
    }

    list.innerHTML = '';
    Object.entries(ls.members).forEach(([name, m]) => {
      const isActive = name === ls.activeTurn;
      const row = document.createElement('div');
      row.className = 'ls-member-row' + (isActive ? ' active-turn' : '');

      if (isActive) {
        const pip = document.createElement('div');
        pip.className = 'ls-turn-pip';
        row.appendChild(pip);
      } else {
        const av = document.createElement('div');
        av.className = 'ls-member-avatar';
        av.style.background = AV_BG[m.colorIdx];
        av.style.color = AV_TXT[m.colorIdx];
        av.textContent = m.initial;
        row.appendChild(av);
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'ls-member-name';
      nameEl.textContent = name + (m.isSelf ? ' (you)' : '');
      row.appendChild(nameEl);

      if (m.typing && !isActive) {
        const dot = document.createElement('span');
        dot.className = 'ls-typing-dot';
        dot.textContent = '...';
        row.appendChild(dot);
      }

      list.appendChild(row);
    });
  }

  // =====================================================================
  // ABLY / BROADCAST SYNC
  // =====================================================================

  function ablyChannelName() {
    const prefix = A().channelPrefix || 'tdd';
    const safe   = ls.roomCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `${prefix}-c${ls.cohort}-${safe}`;
  }

  function getClientId() {
    let token = sessionStorage.getItem('ls-session-token');
    if (!token) {
      token = Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem('ls-session-token', token);
    }
    return `${ls.myName}__${token}`;
  }

  function displayName(clientId) {
    return clientId ? clientId.split('__')[0] : 'Unknown';
  }

  function setConnBadge(state, label) {
    const badge = document.getElementById('ls-conn-badge');
    if (!badge) return;
    badge.className = 'ls-conn-badge ' + state;
    badge.textContent = label;
  }

  // =====================================================================
  // HEARTBEAT + STALE-MEMBER EVICTION
  // Members send heartbeats every 10s. Any member silent for 20s is
  // evicted. Active-turn holders are evicted faster (15s) so turns
  // don't stay stuck when a mobile browser closes silently.
  // =====================================================================
  const HEARTBEAT_INTERVAL   = 10000;
  const STALE_CONFIRM_MS     =  8000;
  const STALE_SEEN_MS        = 20000;
  const STALE_TURN_HOLDER_MS = 15000;

  function startHeartbeat() {
    stopHeartbeat();
    _heartbeatTimer = setInterval(() => syncBroadcast({ type: 'heartbeat' }), HEARTBEAT_INTERVAL);
  }
  function stopHeartbeat() { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }

  function evictStaleMembers() {
    if (!ls.members) return;
    const now = Date.now();
    let changed = false;
    const snap = Object.entries(ls.members).filter(([,m]) => !m.isSelf)
      .map(([n, m]) => `${n}(confirmed=${m.confirmed},age=${Math.round((now-m.lastSeen)/1000)}s)`);
    if (snap.length) console.log('[trace-stale]', snap.join(', '), '| timer:', !!_staleTimer);
    Object.entries(ls.members).forEach(([name, m]) => {
      if (m.isSelf) return;
      const isActiveTurn = name === ls.activeTurn;
      const stale = !m.confirmed
        ? now - m.lastSeen > STALE_CONFIRM_MS
        : isActiveTurn
          ? now - m.lastSeen > STALE_TURN_HOLDER_MS
          : now - m.lastSeen > STALE_SEEN_MS;
      if (stale) {
        removeFromTurnOrder(name);
        changed = true;
      }
    });
    if (changed) { renderQCards(); renderTurnUI(); }
  }

  function startStaleCheck(earlyMs) {
    stopStaleCheck();
    if (earlyMs) setTimeout(evictStaleMembers, earlyMs);
    _staleTimer = setInterval(evictStaleMembers, HEARTBEAT_INTERVAL);
  }
  function stopStaleCheck() { clearInterval(_staleTimer); _staleTimer = null; }

  function syncStart() {
    const prefix = A().channelPrefix || 'tdd';
    const bcKey  = `${prefix}-c${ls.cohort}-${ls.roomCode}`;
    try {
      bc = new BroadcastChannel(bcKey);
      bc.onmessage = evt => handleSyncMsg(evt.data);
    } catch(e) { bc = null; }

    setConnBadge('connecting', 'Connecting...');

    if (typeof Ably === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.ably.com/lib/ably.min-2.js';
      script.onload  = initAbly;
      script.onerror = () => setConnBadge('disconnected', 'Offline — same device only');
      document.head.appendChild(script);
    } else {
      initAbly();
    }
  }

  function initAbly() {
    subscribed = false;
    ablyClient = new Ably.Realtime({
      key: ABLY_KEY,
      clientId: getClientId(),
      disconnectedRetryTimeout: 2000,
      suspendedRetryTimeout: 10000,
    });
    ablyClient.connection.on('connected',    () => { setConnBadge('connected', 'Connected'); attachChannel(); });
    ablyClient.connection.on('disconnected', () => setConnBadge('connecting', 'Reconnecting...'));
    ablyClient.connection.on('suspended',    () => setConnBadge('disconnected', 'Connection lost — retrying'));
    ablyClient.connection.on('failed',       () => setConnBadge('disconnected', 'Connection failed'));
  }

  function attachChannel() {
    const chName = ablyChannelName();
    if (!ablyChannel) {
      ablyChannel  = ablyClient.channels.get(chName);
      ablyPresence = ablyChannel.presence;
    }
    if (!subscribed) {
      ablyChannel.subscribe('msg', msg => {
        try {
          const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
          handleSyncMsg(data);
        } catch(e) {}
      });
      subscribed = true;
    }
    if (!presenceSubscribed) {
      ablyPresence.subscribe('enter',  m => onPresenceEnter(m.clientId));
      ablyPresence.subscribe('leave',  m => onPresenceLeave(m.clientId));
      ablyPresence.subscribe('update', () => {});
      presenceSubscribed = true;
    }
    ablyChannel.once('attached', () => enterPresenceAndAnnounce());
    if (ablyChannel.state === 'attached') enterPresenceAndAnnounce();
  }

  function enterPresenceAndAnnounce() {
    ablyPresence.enter({ name: ls.myName }).then(() => {
      ablyPresence.get().then(members => {
        // Reconcile: remove stale local members not in current Ably presence.
        const presenceNames = new Set(members.map(m => displayName(m.clientId)));
        Object.keys(ls.members).forEach(name => {
          if (!ls.members[name].isSelf && !presenceNames.has(name)) {
            removeFromTurnOrder(name);
          }
        });
        const others = members.filter(m => m.clientId !== getClientId());
        others.forEach(m => addMember(displayName(m.clientId), false));
        if (others.length > 0) {
          // Joining an existing session — clear activeTurn and let the existing
          // host's state-sync message set the correct turn state.
          ls.activeTurn = null;
          renderTurnUI();
          startStaleCheck(STALE_CONFIRM_MS);
        } else {
          startStaleCheck(null);
        }
        startHeartbeat();
        syncBroadcast({ type: 'join', name: ls.myName });
      }).catch(() => {
        startStaleCheck(STALE_CONFIRM_MS);
        startHeartbeat();
        syncBroadcast({ type: 'join', name: ls.myName });
      });
    }).catch((err) => {
      // presence.enter() failed (e.g. key lacks presence capability) — start timers
      // anyway so heartbeat-based stale eviction still works via message channel.
      console.warn('[TraceLiveShare] enterPresence failed:', err && err.message);
      startStaleCheck(STALE_CONFIRM_MS);
      startHeartbeat();
      syncBroadcast({ type: 'join', name: ls.myName });
    });
  }

  // Grace timers: on mobile, Ably fires presence leave on brief network hiccups,
  // then fires enter again when the connection recovers. We wait 3s before acting
  // on a leave — if the user re-enters presence within that window we cancel it.
  const _presenceLeaveTimers = {};

  function onPresenceEnter(clientId) {
    if (clientId === getClientId()) return;
    const name = displayName(clientId);
    if (_presenceLeaveTimers[name]) {
      console.log('[presence] ENTER fired for', name, '— cancelling grace timer (reconnect)');
      clearTimeout(_presenceLeaveTimers[name]);
      delete _presenceLeaveTimers[name];
    } else {
      console.log('[presence] ENTER fired for', name);
    }
    addMember(name, false);
  }

  function onPresenceLeave(clientId) {
    if (clientId === getClientId()) return;
    const name = displayName(clientId);
    console.log('[presence] LEAVE fired for', name, '— starting 10s grace timer');
    if (_presenceLeaveTimers[name]) clearTimeout(_presenceLeaveTimers[name]);
    _presenceLeaveTimers[name] = setTimeout(() => {
      delete _presenceLeaveTimers[name];
      console.log('[presence] grace expired, removing', name);
      if (ls.members[name]) removeFromTurnOrder(name);
    }, 10000);
  }

  function syncStop() {
    stopHeartbeat();
    stopStaleCheck();
    if (ablyPresence) { try { ablyPresence.leave().catch(() => {}); } catch(e) {} ablyPresence = null; }
    if (ablyChannel)  { try { ablyChannel.unsubscribe(); ablyChannel.presence.unsubscribe(); } catch(e) {} ablyChannel = null; }
    if (ablyClient)   { try { ablyClient.close().catch(() => {}); } catch(e) {} ablyClient = null; }
    if (bc)           { try { bc.close(); } catch(e) {} bc = null; }
    subscribed = false; presenceSubscribed = false;
  }

  function leaveSession() {
    if (_hideCloseTimer) { clearTimeout(_hideCloseTimer); _hideCloseTimer = null; }
    // Broadcast leave first so peers remove us before the socket closes.
    // Delay the actual close by 250ms so the message has time to flush.
    if (ablyChannel) { try { syncBroadcast({ type: 'leave' }); } catch(e) {} }
    if (ablyPresence) { try { ablyPresence.leave().catch(() => {}); } catch(e) {} }
    stopHeartbeat();
    stopStaleCheck();
    const _ch = ablyChannel, _cl = ablyClient, _bc = bc;
    ablyPresence = null; ablyChannel = null; ablyClient = null; bc = null; subscribed = false; presenceSubscribed = false;
    setTimeout(() => {
      if (_ch) { try { _ch.unsubscribe(); _ch.presence.unsubscribe(); } catch(e) {} }
      if (_cl) { try { _cl.close().catch(() => {}); } catch(e) {} }
      if (_bc) { try { _bc.close(); } catch(e) {} }
    }, 250);

    // Reset live-share state
    ls.mode     = null; ls.myName  = null;
    ls.cohort   = null; ls.roomCode = null;
    ls.members  = {}; ls.turnOrder = []; ls.activeTurn = null; ls.currentQ = 0;
    ls.questionOwners = Array(A().questions.length).fill(null);

    // Reset app content (clears textareas, bug inputs, code cells)
    A().onReset();

    // Hide leave button, turn pill, and conn badge
    const leave = document.getElementById('ls-leave-btn');
    if (leave) leave.style.display = 'none';
    const pill = document.getElementById('ls-turn-pill');
    if (pill) { pill.style.display = 'none'; pill.className = ''; pill.textContent = ''; }
    const badge = document.getElementById('ls-conn-badge');
    if (badge) { badge.style.display = 'none'; badge.className = 'ls-conn-badge'; badge.textContent = ''; }

    // Show landing again
    const overlay = document.getElementById('ls-landing');
    if (overlay) overlay.style.display = 'flex';
  }

  // Typing indicator (debounced 1.2 s)
  let _typingTimer = null;
  function notifyTyping() {
    if (ls.mode !== 'room' || !isMyTurn()) return;
    if (ls.members[ls.myName]) ls.members[ls.myName].typing = true;
    renderTurnUI();
    syncBroadcast({ type: 'typing', typing: true });
    clearTimeout(_typingTimer);
    _typingTimer = setTimeout(() => {
      if (ls.members[ls.myName]) ls.members[ls.myName].typing = false;
      renderTurnUI();
      syncBroadcast({ type: 'typing', typing: false });
    }, 1200);
  }

  function syncBroadcast(msg) {
    msg._sender = ls.myName;
    if (ablyChannel) {
      try { ablyChannel.publish('msg', JSON.stringify(msg)); } catch(e) {}
    }
    if (bc) try { bc.postMessage(msg); } catch(e) {}
  }

  // =====================================================================
  // MESSAGE HANDLER
  // =====================================================================

  function handleSyncMsg(msg) {
    if (!msg || msg._sender === ls.myName) return;
    const sender = msg._sender || 'Unknown';
    // Any message from a peer confirms they are alive — refresh lastSeen
    const senderMember = ls.members[sender];
    if (senderMember) { senderMember.confirmed = true; senderMember.lastSeen = Date.now(); }

    switch (msg.type) {

      case 'join': {
        // A peer joined — add them, then reply with full current state.
        // turnOrder is the authoritative member list (already reconciled against presence).
        addMember(sender, false);
        const answers = {};
        A().questions.forEach(q => { answers[q.id] = A().getAnswer(q.id); });
        syncBroadcast({
          type: 'state-sync',
          turnOrder: ls.turnOrder,
          activeTurn: ls.activeTurn,
          currentQ: ls.currentQ,
          questionOwners: ls.questionOwners,
          answers,
          fixValues: A().getFixValues(),
        });
        break;
      }

      case 'state-sync': {
        // Apply full state snapshot from an existing peer (received on join).
        // Derive membership from turnOrder (already reconciled against presence by sender).
        if (msg.turnOrder) {
          ls.turnOrder = msg.turnOrder;
          msg.turnOrder.forEach(name => { if (name !== ls.myName) addMember(name, false); });
        }
        if (msg.activeTurn !== undefined) ls.activeTurn  = msg.activeTurn;
        if (msg.currentQ   !== undefined) ls.currentQ    = msg.currentQ;
        if (msg.questionOwners)        ls.questionOwners = msg.questionOwners;
        if (msg.answers) {
          A().questions.forEach(q => {
            if (msg.answers[q.id] !== undefined) A().setAnswer(q.id, msg.answers[q.id]);
          });
        }
        if (msg.fixValues) {
          Object.entries(msg.fixValues).forEach(([k, v]) => A().applyFixValue(k, v));
        }
        renderQCards();
        renderTurnUI();
        break;
      }

      case 'answer-update': {
        // Real-time keystroke from the active student
        A().setAnswer(msg.qid, msg.value);
        // Keep fix inputs locked for watchers even if bug prompt just appeared
        const updIdx = A().questions.findIndex(q => q.id === msg.qid);
        if (updIdx >= 0 && A().questions[updIdx].hasBug) A().setEditable(updIdx, false);
        break;
      }

      case 'fix-update': {
        // Real-time fix input value from the active student
        A().applyFixValue(msg.lineKey, msg.value);
        break;
      }

      case 'turn-set': {
        // Full state snapshot broadcast when active student submits a question
        if (msg.turnOrder)             ls.turnOrder      = msg.turnOrder;
        if (msg.activeTurn !== undefined) ls.activeTurn  = msg.activeTurn;
        if (msg.currentQ   !== undefined) ls.currentQ    = msg.currentQ;
        if (msg.questionOwners)        ls.questionOwners = msg.questionOwners;
        if (msg.answers) {
          A().questions.forEach(q => {
            if (msg.answers[q.id] !== undefined) A().setAnswer(q.id, msg.answers[q.id]);
          });
        }
        if (msg.fixValues) {
          Object.entries(msg.fixValues).forEach(([k, v]) => A().applyFixValue(k, v));
        }
        renderQCards();
        renderTurnUI();
        break;
      }

      case 'typing': {
        if (!ls.members[sender]) break;
        ls.members[sender].typing = msg.typing;
        renderTurnUI();
        break;
      }

      case 'reset': {
        A().onReset();
        ls.currentQ       = 0;
        ls.questionOwners = Array(A().questions.length).fill(null);
        if (ls.turnOrder.length > 0) ls.activeTurn = ls.turnOrder[0];
        renderQCards();
        renderTurnUI();
        break;
      }

      case 'heartbeat':
        // lastSeen/confirmed already updated above — nothing else needed
        break;

      case 'leave':
        removeFromTurnOrder(sender);
        break;
    }
  }

  // =====================================================================
  // PUBLIC RESET HOOK
  // Call window.TraceLiveShare.reset() from the app's resetAll() AFTER
  // clearing textarea values and restoring code cells.
  // =====================================================================

  function handleReset() {
    if (ls.mode === 'room') {
      ls.currentQ       = 0;
      ls.questionOwners = Array(A().questions.length).fill(null);
      if (ls.turnOrder.length > 0) ls.activeTurn = ls.turnOrder[0];
      renderQCards();
      renderTurnUI();
      if (isMultiPlayer()) syncBroadcast({ type: 'reset' });
    }
  }

  // =====================================================================
  // PUBLIC API
  // =====================================================================
  window.TraceLiveShare = {
    reset:           handleReset,
    checkDoneEnabled,
    notifyTyping,
    syncBroadcast,
    isMyTurn,
    isMultiPlayer,
    leaveSession,
    getState:        () => ls,
  };

  // =====================================================================
  // INIT
  // =====================================================================
  document.addEventListener('DOMContentLoaded', function () {
    const adapter = A();
    if (!adapter) {
      console.error('[TraceLiveShare] window.TRACE_ADAPTER must be defined before trace-liveshare.js loads');
      return;
    }
    ls.questionOwners = Array(adapter.questions.length).fill(null);

    injectCSS();
    injectLanding(adapter.title, adapter.subtitle);
    injectConnBadge();
    injectRoomStrip();
    injectDoneButtons(adapter.questions);
    attachInputListeners(adapter.questions);
  });

  // On tab/page close: broadcast leave, then close Ably client synchronously.
  // Calling ablyClient.close() synchronously sends a WebSocket CLOSE frame that
  // the OS TCP stack flushes even as the page dies — Ably fires presence.leave
  // on peers immediately. More reliable than async syncStop() on Android.
  function _handlePageUnload() {
    if (!ablyClient) return;
    try { syncBroadcast({ type: 'leave' }); } catch(e) {}
    if (ablyPresence) { try { ablyPresence.leave().catch(() => {}); } catch(e) {} }
    stopHeartbeat();
    stopStaleCheck();
    const _bc = bc;
    try { ablyClient.close(); } catch(e) {}
    if (_bc) { try { _bc.close(); } catch(e) {} }
    ablyPresence = null; ablyChannel = null; ablyClient = null; bc = null; subscribed = false; presenceSubscribed = false;
  }
  window.addEventListener('beforeunload', _handlePageUnload);
  window.addEventListener('pagehide',     _handlePageUnload);

  // On hide: leave presence immediately. Start a 5s timer to close the connection
  // entirely — this forces a TCP-level disconnect that Ably detects reliably on Android.
  // Quick tab switches (< 5s) are not disrupted.
  // On show: cancel the close timer; re-enter presence if connection is alive, or
  // full syncStart if it was closed. Immediately evict stale members.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (ls.mode !== 'room') return;
      stopHeartbeat();
      stopStaleCheck();
      // Do NOT call presence.leave() here — it detaches the channel, which breaks
      // re-entry when the user returns within the 5s window. The syncStop() timer
      // below handles full disconnection if the tab stays hidden long enough.
      _hideCloseTimer = setTimeout(() => {
        _hideCloseTimer = null;
        syncStop();
      }, 15000);
    } else {
      if (_hideCloseTimer) { clearTimeout(_hideCloseTimer); _hideCloseTimer = null; }
      if (ls.mode === 'room') {
        if (ablyClient && ablyPresence) {
          enterPresenceAndAnnounce();
        } else {
          syncStart();
        }
        startStaleCheck(STALE_CONFIRM_MS);
      }
      evictStaleMembers();
    }
  });

})();
