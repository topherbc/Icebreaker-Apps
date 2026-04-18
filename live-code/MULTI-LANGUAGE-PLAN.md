# Multi-Language Support: Research & Plan

Research for extending Live Code from Java-only to support: JavaScript, TypeScript, Python, Go, C#, PHP, Rust, Ruby.

---

## Current Java-Specific Surface Area

Seven categories of language-specific code exist in the app today. All references below are in `classroom-apps/live-code.html` unless noted.

---

## 1. CodeMirror Syntax Mode

Currently loads `clike/clike.min.js` (CDN, line ~2368) and uses `text/x-java`.

| Language | Mode File | Mode String | In `clike` already? |
|----------|-----------|-------------|---------------------|
| Java | clike | `text/x-java` | Yes (current) |
| JavaScript | javascript | `text/javascript` | No |
| TypeScript | javascript | `text/typescript` | No (same file, `typescript: true`) |
| Python | python | `text/x-python` | No |
| Go | go | `text/x-go` | No |
| C# | clike | `text/x-csharp` | Yes |
| PHP | php | `text/x-php` | No (also needs clike + htmlmixed) |
| Rust | rust | `text/x-rustsrc` | No |
| Ruby | ruby | `text/x-ruby` | No |

**Work needed:** Dynamically load the right mode CDN script when a language is selected. C# is free since `clike` is already loaded.

---

## 2. File Extensions & Naming

Currently hardcoded: `Main.java`, `ensureJavaExt()` (~line 3033), `pascalCase()` (~line 3032).

| Language | Extension | Entry File | Naming Convention |
|----------|-----------|------------|-------------------|
| Java | `.java` | `Main.java` | PascalCase (must match class name) |
| JavaScript | `.js` | `main.js` | camelCase / kebab-case |
| TypeScript | `.ts` | `main.ts` | camelCase / kebab-case |
| Python | `.py` | `main.py` | snake_case |
| Go | `.go` | `main.go` | snake_case |
| C# | `.cs` | `Program.cs` | PascalCase |
| PHP | `.php` | `index.php` | snake_case |
| Rust | `.rs` | `main.rs` | snake_case |
| Ruby | `.rb` | `main.rb` | snake_case |

**Work needed:** Replace `ensureJavaExt()` and `javaBoilerplate()` with language-aware versions. C# has the same class-name-must-match-file constraint as Java.

---

## 3. Boilerplate Templates

Currently: `public class Main { public static void main(String[] args) { } }` (~line 3041).

| Language | Boilerplate |
|----------|-------------|
| Java | `public class Main { public static void main(String[] args) { } }` |
| JavaScript | `// main.js\nconsole.log("Hello");` |
| TypeScript | `// main.ts\nconsole.log("Hello");` |
| Python | `# main.py\nprint("Hello")` |
| Go | `package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello")\n}` |
| C# | `using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello");\n  }\n}` |
| PHP | `<?php\necho "Hello\\n";\n?>` |
| Rust | `fn main() {\n    println!("Hello");\n}` |
| Ruby | `# main.rb\nputs "Hello"` |

---

## 4. Code Execution

Two execution paths exist today: Judge0 CE (browser) and local Electron (runner.js).

### Judge0 CE Language IDs (Browser Path)

Currently uses ID 91 (Java 17) at `https://ce.judge0.com`. All target languages are supported.

| Language | Judge0 ID | Notes |
|----------|-----------|-------|
| Java 17 | 91 | Current |
| JavaScript (Node 18) | 93 | Single file |
| TypeScript 5.0 | 101 | Verify ID on target CE instance |
| Python 3 | 92 | Single file |
| Go 1.18 | 95 | Single file |
| C# (Mono 6) | 51 | Or .NET SDK via ID 86 |
| PHP 8 | 98 | Single file |
| Rust 1.70 | 73 | Single file |
| Ruby 3 | 72 | Single file |

**Multi-file submission:** Currently uses JSZip for Java. Most scripted languages rarely need multi-file at intro level. Go, Rust, and C# could need it later.

### Electron Local Execution

Currently in `live-code/runner.js`: `javac *.java` then `java Main`.

| Language | Compile Step | Run Step | Runtime Required |
|----------|-------------|----------|------------------|
| Java | `javac *.java` | `java Main` | JDK 17+ |
| JavaScript | None | `node main.js` | Node.js |
| TypeScript | `npx tsc main.ts` | `node main.js` | Node.js + tsc |
| Python | None | `python3 main.py` | Python 3 |
| Go | `go build -o out .` | `./out` | Go SDK |
| C# | `dotnet build` | `dotnet run` | .NET SDK |
| PHP | None | `php index.php` | PHP CLI |
| Rust | `rustc main.rs -o out` | `./out` | rustc |
| Ruby | None | `ruby main.rb` | Ruby |

**Complexity tiers:**
- **Easy** (interpreted, no compile): JS, Python, Ruby, PHP; just `spawn(runtime, [file])`
- **Medium** (compiled, simple): Go, Rust; compile then run binary
- **Hard** (compiled, toolchain): Java (current), C#/.NET, TypeScript; need SDK toolchains

**Work needed:** Refactor `runner.js` from a single `startJava()` function into a strategy pattern with per-language compile/run commands. The detection logic (`_detect()`) needs to check for each runtime.

---

## 5. Problem Library

54 problems in `_PROBLEMS_INLINE` (~line 2540) and `./live-code-problems/problems.json`, all Java.

The problem JSON structure (`week`, `title`, `desc`, `files[]`) is already language-agnostic. No architecture change needed; this is pure content authoring work.

Options:
- Maintain separate problem sets per language (most work, best quality)
- Start with a small universal set per language and grow over time

---

## 6. Reference Sheet

14 collapsible sections of Java reference (~lines 1942-2082). Each language needs its own reference content. The HTML structure is reusable.

Quick comparison of core concepts across languages:

| Concept | Java | Python | JS | Go | C# | Rust | Ruby | PHP |
|---------|------|--------|----|----|----|------|------|-----|
| Variables | `int x = 5;` | `x = 5` | `let x = 5;` | `x := 5` | `int x = 5;` | `let x = 5;` | `x = 5` | `$x = 5;` |
| Output | `System.out.println()` | `print()` | `console.log()` | `fmt.Println()` | `Console.WriteLine()` | `println!()` | `puts` | `echo` |
| Input | `Scanner` | `input()` | `readline` | `fmt.Scan()` | `Console.ReadLine()` | `std::io::stdin()` | `gets` | `fgets(STDIN)` |

---

## 7. Syntax-Specific Editor Behavior

Currently handles `{` brace auto-indent on Enter (~line 3647). This applies to most C-like languages but NOT Python or Ruby.

| Language | Block Style | Indent Trigger | Special Needs |
|----------|-------------|---------------|---------------|
| Java, JS, TS, Go, C#, Rust, PHP | `{ }` braces | `{` on Enter | Current logic works |
| Python | `:` + indent | `:` on Enter | Needs dedent logic (no closing brace) |
| Ruby | `do/end`, `def/end` | `do`/`def` on Enter | Needs `end` auto-insertion |

---

## Recommended Architecture

A language config object centralizes all per-language settings, replacing every hardcoded Java reference:

```js
const LANGUAGES = {
  java: {
    id: 'java',
    label: 'Java',
    cmMode: 'text/x-java',
    cmModeFile: 'clike/clike.min.js',   // already loaded
    ext: '.java',
    entryFile: 'Main.java',
    judge0Id: 91,
    indentUnit: 2,
    blockStyle: 'braces',               // vs 'indent' (python) or 'end' (ruby)
    boilerplate: (name) => { ... },
    classBoilerplate: (name) => { ... },
    fileNaming: 'pascal',               // vs 'snake', 'camel', 'kebab'
    compiledLocal: true,                // needs compile step in Electron
    compileCmd: ['javac', '*.java'],
    runCmd: (main) => ['java', main],
    runtimeDetect: ['javac', '-version'],
  },
  python: {
    id: 'python',
    label: 'Python',
    cmMode: 'text/x-python',
    cmModeFile: 'python/python.min.js',
    ext: '.py',
    entryFile: 'main.py',
    judge0Id: 92,
    indentUnit: 4,
    blockStyle: 'indent',
    boilerplate: (name) => `# ${name}\nprint("Hello")`,
    fileNaming: 'snake',
    compiledLocal: false,
    runCmd: (main) => ['python3', main + '.py'],
    runtimeDetect: ['python3', '--version'],
  },
  // ... etc for each language
};
```

Then every hardcoded Java reference becomes `LANGUAGES[S.language].property`.

---

## Effort Summary

| Category | Scope | Notes |
|----------|-------|-------|
| Language config object | Small | One-time architecture; each lang is ~30 lines of config |
| CodeMirror mode loading | Small | Dynamic `<script>` load; CDN pattern already exists |
| File ext / boilerplate | Small | Driven by config |
| Judge0 browser execution | Small | Swap the language ID |
| Electron runner refactor | Medium | Strategy pattern in runner.js; per-language compile/run |
| Runtime detection | Medium | Check `node --version`, `python3 --version`, etc. |
| Python/Ruby indent logic | Medium | Different block model; custom Enter key handling |
| UI for language selection | Small | Dropdown in room setup or toolbar |
| Reference sheets | Large (content) | 9 languages x ~14 sections |
| Problem libraries | Large (content) | 9 languages x N problems |

The **architecture work** (config object, runner refactor, mode loading, UI picker) is medium scope. The **content work** (problems, reference sheets) is the bulk and can be done incrementally, language by language.

---

## Suggested Rollout Order

1. **Python** - Highest demand, simplest execution (interpreted, no compile), but needs custom indent logic
2. **JavaScript** - Node.js already on every dev machine, brace-based (editor logic reusable)
3. **TypeScript** - Piggybacks on JS mode file and Node runtime; just adds tsc step
4. **Go** - Simple compile/run; brace-based
5. **C#** - Already in clike mode; .NET SDK is the only hurdle
6. **Rust** - Simple compile/run; brace-based
7. **Ruby** - Needs `end` block logic
8. **PHP** - Niche; mode file has extra dependencies (htmlmixed)
