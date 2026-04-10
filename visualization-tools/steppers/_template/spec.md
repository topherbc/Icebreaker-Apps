# Stepper module authoring spec

TEMPLATE NOTE: no em dashes anywhere in these files -- use plain hyphens or rewrite the sentence.

---

## Overview

A stepper module teaches one concept through a set of named scenarios. Each scenario shows a block of source code and a sequence of steps. Each step highlights one line and updates the right panel (call stack, objects in memory, or a custom panel).

### File structure

```
stepper.html                        <- wrapper app (shell, engine, styles)
steppers/
  _template/
    template.html                   <- blank authoring template
  java-17/
    methods.html                    <- one module per file
    classes-and-objects.html
  python-3/
    functions.html
```

### How static loading works

Each module file contains a single `<script>` block that calls `STEPPER_REGISTRY.register(id, moduleObj)`. The wrapper includes all module files via `<script src="...">` tags at the bottom of `<body>`. No `fetch()`, no async, no server required. Works on `file://` locally and on GitHub Pages identically.

---

## Adding a module: two-step process

**Step 1.** Create the module file in the right language directory. Use `steppers/_template/template.html` as a starting point. The file only needs a `<script>` block -- no HTML shell, no styles, no engine.

**Step 2.** In `stepper.html`, add one `<script src="...">` tag and one entry to `MANIFEST`.

### MANIFEST entry

```js
const MANIFEST = {
  'Java 17': [
    { label: 'Method calls',        id: 'java-17/methods' },
    { label: 'Classes and objects', id: 'java-17/classes-and-objects' },
    { label: 'Your new topic',      id: 'java-17/your-file' },  // add here
  ],
};
```

- `label` appears verbatim in the topic dropdown.
- `id` must exactly match the first argument to `STEPPER_REGISTRY.register(id, ...)` in the module file.

### Script tag

```html
<script src="steppers/java-17/your-file.html"></script>
```

Add this near the bottom of `stepper.html`, alongside the other module `<script>` tags.

### Module file registration call

```js
STEPPER_REGISTRY.register("java-17/your-file", {
  label: 'Your topic label',
  panelConfig: { ... },
  scenarios: [ ... ]
});
```

---

## Module shape

```js
{
  label:       string,       // display name in the topic dropdown
  panelConfig: PanelConfig,
  scenarios:   Scenario[],
}
```

---

## PanelConfig

```js
{
  stack:  boolean,                    // show the call stack section
  heap:   boolean,                    // show the objects-in-memory section
  custom: CustomPanelDef | false,     // optional concept-specific panel
  legend: LegendItem[],               // bottom-of-panel color key
}
```

### CustomPanelDef

```js
{ title: string, emptyText: string }
```

Use `custom` for concept-specific state that does not fit stack or heap. Examples: scope chain, closure variables, array contents, queue/stack ADT state, event loop queue.

### LegendItem

```js
{ color: string, border: string, label: string }
```

`color` and `border` are CSS hex values. Use the reference palette below. Add one entry per value pill style that actually appears in your steps. The legend renders at the bottom of the right panel.

#### Reference palette for legend entries

These are the exact colors the wrapper renders for each pill style. Copy these into `legend` so the swatches match exactly.

| Style                                 | color     | border    | When to use                      |
| ------------------------------------- | --------- | --------- | -------------------------------- |
| Currently running frame               | `#1d5799` | `#9dc0e8` | Active call stack frame          |
| Paused, waiting                       | `#68655f` | `#d4d1cc` | Waiting call stack frame         |
| Just assigned (amber flash)           | `#a0540a` | `#e8c070` | `fresh: true` on a var or field  |
| Holding a value (teal)                | `#095e40` | `#90d4b8` | `fresh: false`, `cls: false` var |
| Reference / object pointer (purple)   | `#3d3490` | `#b0a8e0` | `cls: true` var                  |
| Object instance (heap, purple border) | `#3d3490` | `#b0a8e0` | Heap object                      |
| Active object (heap, orange border)   | `#a0540a` | `#e8c070` | `active: true` heap object       |

---

## Scenario

```js
{
  label:  string,     // tab label shown in the scenario bar
  lines:  Line[],     // the source code to display
  steps:  Step[],     // the step-through states
}
```

---

## Line

Two forms:

```js
{ code: [Token, ...] }   // a rendered code line
{ blank: true }          // empty vertical spacer (no line number)
```

### Token

```js
[cssClass, text]
```

`cssClass` is one of the token classes below, or `''` for unstyled text. Use `''` for indentation whitespace and plain punctuation that needs no visual treatment.

### Token CSS classes

Tokens are differentiated by **weight and style** as well as color, so color-blind users can follow code structure from shape alone.

| Class       | Color              | Weight / style          | Use for                                                                  |
| ----------- | ------------------ | ----------------------- | ------------------------------------------------------------------------ |
| `tok-kw`    | purple `#5b1a96`   | **bold**                | Keywords: `static`, `void`, `def`, `return`, `class`, `new`, `if`, `for` |
| `tok-type`  | teal `#095e40`     | **bold**                | Type names: `int`, `String`, `bool`, `float`                             |
| `tok-meth`  | blue `#1a4f8a`     | **bold**                | Method or function name at call or definition site                       |
| `tok-cls`   | purple `#3d3490`   | **bold + underline**    | Class name (underline distinguishes from plain keywords)                 |
| `tok-str`   | dark red `#8a2500` | normal                  | String literal (quotes provide context regardless of color)              |
| `tok-num`   | orange `#a0540a`   | semibold                | Numeric literal                                                          |
| `tok-cmt`   | muted              | italic                  | Comment (italic alone is the signal)                                     |
| `tok-op`    | muted              | normal                  | Operators, punctuation, and any remaining plain text                     |
| `tok-field` | purple `#3d3490`   | *italic* (no underline) | Instance field or attribute (italic distinguishes from class names)      |
| `tok-dec`   | teal `#095e40`     | *italic*                | Decorator (`@decorator` in Python)                                       |
| `tok-self`  | purple `#5b1a96`   | *italic* + semibold     | `self` or `this`                                                         |

**When in doubt, use `tok-op`.** The goal is structural clarity, not perfect IDE fidelity.

**Never use color as the only differentiator** between two token types that appear in the same code block. Weight and style carry the distinction for color-blind readers.

---

## Step

```js
{
  line:   number,         // 0-indexed active line. Blank lines are not counted.
  stack:  Frame[],        // call stack state. [] = empty stack.
  heap:   HeapObj[],      // omit or [] when heap panel is false
  custom: CustomItem[],   // omit or [] when custom panel is false
  expl:   Explanation,
}
```

### Explanation

```js
{ label: string, text: string }
```

- `label` appears in small caps above the explanation. Keep it short (2-4 words).
- `text` is plain prose. Wrap inline code references in `<hi>...</hi>` for the amber highlight pill.
- No em dashes in any string. Use a plain hyphen or rewrite the sentence.
- Do not use `<hi>` for prose emphasis -- only for actual code tokens, method names, variable names, and keywords.

---

## Frame (call stack item)

```js
{
  name:   string,     // e.g. 'main()', 'greet()', 'bark() on @Dog1'
  active: boolean,    // true = running (blue border + "running" badge), false = waiting (gray)
  vars:   Var[],      // local variables visible in this frame. [] is fine.
}
```

Stack is rendered top-to-bottom. Index 0 is the currently active frame. Subsequent frames are "waiting" (paused, shown below).

### Var

```js
{
  n:     string,    // variable name (left column)
  v:     string,    // display value. Use '?' for not yet assigned.
  fresh: boolean,   // true = just changed this step (amber flash, then settles)
  cls:   boolean,   // true = reference type (purple pill). false = value type (teal pill).
}
```

**Value pill rendering rules:**

| Condition                     | Pill style                                |
| ----------------------------- | ----------------------------------------- |
| `v === '?'` or `v === 'null'` | Gray, dashed border, italic "not set yet" |
| `cls: false, fresh: false`    | Teal -- holding a value                   |
| `cls: false, fresh: true`     | Teal with amber flash                     |
| `cls: true, fresh: false`     | Purple -- reference/pointer               |
| `cls: true, fresh: true`      | Purple with amber flash                   |

Set `fresh: true` only on the step where the value changes. On all subsequent steps, set it back to `false`.

---

## HeapObj (objects-in-memory item)

```js
{
  id:     string,       // unique identifier within the step, e.g. 'd1', 'd2'
  type:   string,       // class name shown in the object header, e.g. 'Dog'
  ref:    string,       // reference label shown in the header, e.g. '@Dog1'
  active: boolean,      // true = orange border (a method is currently executing on this object)
  fields: Field[],
}
```

### Field

```js
{
  n:     string,    // field name (left column)
  v:     string,    // display value (right column)
  fresh: boolean,   // true = just set or changed this step (amber flash)
}
```

Set `active: true` on a heap object only while a method frame targeting that object is at the top of the call stack. Set it back to `false` once the method returns.

---

## CustomItem (custom panel item)

```js
{
  name:  string,        // header label for this item
  tag:   string | null, // optional badge text, e.g. 'active', 'closed'
  rows:  Row[],         // key/value rows inside the item
}
```

### Row

```js
{
  k:     string,    // key label (left column)
  v:     string,    // display value (right column)
  fresh: boolean,   // true = just changed this step (amber flash)
}
```

---

## Worked example: Python functions

```js
STEPPER_REGISTRY.register("python-3/functions", {
  label: 'Functions',
  panelConfig: {
    stack: true,
    heap:  false,
    custom: false,
    legend: [
      { color:'#1d5799', border:'#9dc0e8', label:'Currently running frame' },
      { color:'#68655f', border:'#d4d1cc', label:'Paused, waiting to resume' },
      { color:'#a0540a', border:'#e8c070', label:'Variable just assigned' },
      { color:'#095e40', border:'#90d4b8', label:'Holding a value' },
    ]
  },
  scenarios: [
    {
      label: "Defining and calling",
      lines: [
        { code: [['tok-kw','def '],['tok-meth','add'],['tok-op','(a, b):']] },
        { code: [['','    '],['tok-kw','return '],['tok-op','a + b']] },
        { blank: true },
        { code: [['tok-op','result = '],['tok-meth','add'],['tok-op','('],['tok-num','3'],['tok-op',', '],['tok-num','5'],['tok-op',')']] },
      ],
      steps: [
        { line:0, stack:[],
          expl:{label:'Definition', text:'<hi>def add(a, b):</hi> defines the function. No code runs yet.'} },
        { line:3, stack:[{name:'module',vars:[{n:'result',v:'?',fresh:false,cls:false}],active:true}],
          expl:{label:'Calling add()', text:'<hi>add(3, 5)</hi> is called. Python pushes a new frame.'} },
        { line:0, stack:[{name:'add()',vars:[{n:'a',v:'3',fresh:true,cls:false},{n:'b',v:'5',fresh:true,cls:false}],active:true},{name:'module',vars:[{n:'result',v:'?',fresh:false,cls:false}],active:false}],
          expl:{label:'Inside add()', text:'Parameters <hi>a = 3</hi> and <hi>b = 5</hi> are set in the new frame.'} },
        { line:1, stack:[{name:'add()',vars:[{n:'a',v:'3',fresh:false,cls:false},{n:'b',v:'5',fresh:false,cls:false}],active:true},{name:'module',vars:[{n:'result',v:'?',fresh:false,cls:false}],active:false}],
          expl:{label:'return', text:'<hi>return a + b</hi> computes 8 and sends it back to the caller.'} },
        { line:3, stack:[{name:'module',vars:[{n:'result',v:'8',fresh:true,cls:false}],active:true}],
          expl:{label:'Result received', text:'<hi>add()</hi> returns. <hi>result</hi> is now assigned <hi>8</hi>.'} },
      ]
    }
  ]
});
```

---

## Accessibility rules

These rules are built into the wrapper styles and must be respected in module content.

**No color as the only differentiator.** Every token type uses weight or style in addition to color. When writing code lines, do not invent new token classes -- use the table above.

**No em dashes** anywhere in module files. Use a plain hyphen or rewrite the sentence.

**Keep explanation text concise.** Long explanations strain projection readability. Aim for one to two sentences per step.

**Use `<hi>` only for code tokens** -- variable names, method names, keywords, and literal values that appear in the source code. Do not use it for prose emphasis.

**`fresh: true` for one step only.** The amber flash is a momentary signal. Set `fresh` back to `false` on the very next step, or the flash becomes meaningless noise.

---

## Authoring checklist

- [ ] Module file calls `STEPPER_REGISTRY.register("language-version/filename", { ... })`
- [ ] `id` in MANIFEST matches the first argument to `register()` exactly
- [ ] `<script src="steppers/...">` tag added to `stepper.html`
- [ ] `label` set at module level, scenario level, and in each `expl.label`
- [ ] `line` index is 0-based and excludes blank lines
- [ ] Stack index 0 is always the currently executing frame
- [ ] `fresh: true` set only on the step where a value changes, `false` on all others
- [ ] `active: true` on a heap object only while a method frame targeting it is at the top of the stack
- [ ] Legend entries use colors from the reference palette table and match styles actually used in steps
- [ ] No em dashes in any string
- [ ] `<hi>` used only for code tokens in `expl.text`, not for prose
- [ ] Tested by opening `stepper.html` in a browser (served over HTTP or via GitHub Pages)