import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));

export const fixture = () =>
  JSON.parse(fs.readFileSync(path.join(here, '.auth', 'fixture.json'), 'utf8'));

/** Open the project room and wait until the file tree has rendered. */
export const openProject = async (page) => {
  const { projectId } = fixture();
  await page.goto(`/project/${projectId}`);
  await expect(page.locator('.file-explorer')).toBeVisible();
  await expect(page.locator('.file-tree .node-name').first()).toBeVisible();
  return projectId;
};

/** Create a file (or folder) at the tree root through the explorer UI. */
export const createNode = async (page, name, type = 'file') => {
  await page.locator(`.file-explorer-header .icon-btn[title="New ${type === 'file' ? 'File' : 'Folder'}"]`).click();
  const input = page.locator('.modal-input');
  await expect(input).toBeVisible();
  await input.fill(name);
  await input.press('Enter');
  await expect(page.locator('.modal-input')).toHaveCount(0);
  await expect(page.locator('.file-tree .node-name', { hasText: name })).toBeVisible();
};

export const treeItem = (page, name) =>
  page.locator('.file-tree .tree-node-content', { has: page.locator('.node-name', { hasText: new RegExp(`^${name}$`) }) }).first();

/** Open the terminal panel and wait for a live shell prompt. */
export const openTerminal = async (page) => {
  const panel = page.locator('.terminal-panel');
  if (!(await panel.isVisible())) {
    await page.getByRole('button', { name: 'Terminal' }).click();
  }
  await expect(panel).toBeVisible();
  await expect(activeTerminal(page).locator('.xterm-screen')).toBeVisible();
  // A real PTY prints its own prompt; that is our "shell is alive" signal.
  await expect
    .poll(() => terminalText(page), { timeout: 30_000, message: 'shell never printed a prompt' })
    .toMatch(/[>$#]/);
};

/** Everything the active xterm currently shows, as plain text. */
export const terminalText = async (page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('.xterm-container')].find(
      (n) => n.getClientRects().length > 0
    );
    if (!el) return '';
    return [...el.querySelectorAll('.xterm-rows > div')]
      .map((row) => row.textContent.replace(/ /g, ' ').trimEnd())
      .join('\n');
  });

/** The xterm of the tab currently on screen (hidden tabs share the same class names). */
export const activeTerminal = (page) =>
  page.locator('.xterm-container:visible').first();

/** Type a command into the visible xterm and press Enter. */
export const runInTerminal = async (page, command) => {
  await activeTerminal(page).locator('.xterm-helper-textarea').click();
  await page.keyboard.type(command);
  await page.keyboard.press('Enter');
};

/** Columns the shell believes it has, read back from xterm itself. */
export const terminalCols = (page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('.xterm-container')].find(
      (n) => n.getClientRects().length > 0
    );
    const screen = el?.querySelector('.xterm-screen');
    // xterm sizes a hidden element holding a whole run of 'W's, so divide by that run's length.
    const probe = el?.querySelector('.xterm-char-measure-element');
    const charWidth = probe
      ? probe.getBoundingClientRect().width / (probe.textContent.length || 1)
      : 0;
    if (!screen || !charWidth) return 0;
    return Math.floor(screen.getBoundingClientRect().width / charWidth);
  });

/** Wait until the terminal output contains `pattern`. */
export const expectTerminalOutput = async (page, pattern, timeout = 60_000) =>
  expect
    .poll(() => terminalText(page), { timeout, message: `terminal never showed ${pattern}` })
    .toMatch(pattern);

/**
 * Record console output. Socket lifecycle is logged by ProjectRoom, so counting
 * "Socket connected:" lines is a far steadier signal than catching auto-dismissing toasts.
 */
export const recordConsole = (page) => {
  const lines = [];
  page.on('console', (msg) => lines.push(msg.text()));
  page.on('pageerror', (err) => lines.push(`PAGEERROR: ${err.message}`));
  return lines;
};

export const countLines = (lines, pattern) => lines.filter((l) => pattern.test(l)).length;

/**
 * Replace the editor's contents by typing, the way a user would.
 * WHY not `locator.fill`: Monaco's real input is `textarea.inputarea`, and `.monaco-editor
 * textarea` matches the hidden IME textarea first, which is readonly.
 */
export const typeInEditor = async (page, text) => {
  await page.locator('.monaco-editor .view-lines').click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(text);
};

/** Monaco's current model text. */
export const editorText = (page) =>
  page.evaluate(() => window.monaco?.editor.getModels()[0]?.getValue() ?? null);
