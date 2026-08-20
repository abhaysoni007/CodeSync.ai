/**
 * How to run a file.
 *
 * One table, used both to decide whether a Run button appears and to build the command - the two
 * used to be separate lists in FileExplorer, so a type added to one was silently missing from the
 * other.
 *
 * Two kinds of "run":
 *  - 'terminal': a command typed into the project shell.
 *  - 'browser':  the web has no terminal equivalent. An .html file is opened as a real page via
 *                the backend's /preview route so its own CSS, JS and images resolve.
 */

// The shell runs with the project root as its cwd, so quoted relative paths are all it needs.
const q = (relPath) => `"${relPath.replace(/"/g, '\\"')}"`;
const stem = (relPath) => relPath.replace(/\.[^./\\]+$/, '');
const baseStem = (relPath) => stem(relPath.split('/').pop());

const TERMINAL_RUNNERS = {
  js: (p) => `node ${q(p)}`,
  mjs: (p) => `node ${q(p)}`,
  cjs: (p) => `node ${q(p)}`,
  jsx: (p) => `node ${q(p)}`,
  ts: (p) => `npx tsx ${q(p)}`,
  tsx: (p) => `npx tsx ${q(p)}`,
  py: (p) => `python ${q(p)}`,
  rb: (p) => `ruby ${q(p)}`,
  php: (p) => `php ${q(p)}`,
  go: (p) => `go run ${q(p)}`,
  rs: (p) => `rustc ${q(p)} -o ${q(stem(p))} && ${q(stem(p))}`,
  java: (p) => `javac ${q(p)} && java ${baseStem(p)}`,
  cpp: (p) => `g++ ${q(p)} -o ${q(stem(p))} && ${q(stem(p))}`,
  cc: (p) => `g++ ${q(p)} -o ${q(stem(p))} && ${q(stem(p))}`,
  c: (p) => `gcc ${q(p)} -o ${q(stem(p))} && ${q(stem(p))}`,
  cs: (p) => `dotnet script ${q(p)}`,
  sh: (p) => `bash ${q(p)}`,
  bash: (p) => `bash ${q(p)}`,
  ps1: (p) => `powershell -ExecutionPolicy Bypass -File ${q(p)}`,
  bat: (p) => q(p),
  cmd: (p) => q(p),
};

// Files a browser renders directly.
const BROWSER_EXTS = new Set(['html', 'htm', 'svg']);

export const extensionOf = (fileName) => (fileName.split('.').pop() || '').toLowerCase();

/**
 * @param {string} fileName
 * @param {string} relPath - path from the project root, '/'-joined
 * @returns {{kind:'terminal', command:string} | {kind:'browser'} | null}
 */
export const runnerFor = (fileName, relPath) => {
  const ext = extensionOf(fileName);
  if (BROWSER_EXTS.has(ext)) return { kind: 'browser' };
  const build = TERMINAL_RUNNERS[ext];
  return build ? { kind: 'terminal', command: build(relPath ?? fileName) } : null;
};

export const isRunnable = (fileName) => Boolean(runnerFor(fileName, fileName));

// A CSS file is not a page, but the page next to it usually is - offer a preview anyway so the
// user can check their stylesheet without hunting for index.html.
export const isPreviewable = (fileName) =>
  BROWSER_EXTS.has(extensionOf(fileName)) || ['css', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf']
    .includes(extensionOf(fileName));
