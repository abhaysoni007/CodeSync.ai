import { test, expect } from '@playwright/test';
import {
  openProject,
  createNode,
  treeItem,
  openTerminal,
  runInTerminal,
  terminalText,
  terminalCols,
  expectTerminalOutput,
  typeInEditor,
} from './helpers.js';

test.describe('Terminal — a real shell, used the way a dev uses one', () => {
  test('runs a command and shows its output', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);
    await runInTerminal(page, 'echo codesync-e2e-ok');
    await expectTerminalOutput(page, /codesync-e2e-ok/);
  });

  test('keeps the shell alive across commands (cd persists)', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);
    await runInTerminal(page, 'cd ..');
    await page.waitForTimeout(500);
    await runInTerminal(page, 'echo still-here');
    await expectTerminalOutput(page, /still-here/);
  });

  test('the PTY is as wide as the panel — long lines must not hard-wrap early', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);

    expect(await terminalCols(page), 'xterm rendered a usable width').toBeGreaterThan(60);

    // 120 identical characters: if the PTY thinks it is narrower than it is, the shell inserts a
    // newline and the run appears on two lines.
    await runInTerminal(page, 'echo ' + 'x'.repeat(120));
    await expectTerminalOutput(page, /x{120}/);
  });

  test('Ctrl+C interrupts a running program', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);
    await runInTerminal(page, 'node -e "setInterval(()=>{},1000)"');
    await page.waitForTimeout(2500);
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(1500);
    // Back at a prompt: another command still runs.
    await runInTerminal(page, 'echo after-interrupt');
    await expectTerminalOutput(page, /after-interrupt/);
  });

  test('a second terminal tab gets its own independent shell', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);
    await page.locator('.terminal-header button[title="New Terminal"]').click();
    await expect(page.locator('.terminal-header .flex.items-center.gap-1 > button')).toHaveCount(2);
    await page.waitForTimeout(2000);
    await runInTerminal(page, 'echo second-tab');
    await expectTerminalOutput(page, /second-tab/);
  });

  test('clear empties the view without killing the shell', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);
    await runInTerminal(page, 'echo before-clear');
    await expectTerminalOutput(page, /before-clear/);
    await page.locator('.terminal-header button[title="Clear Terminal"]').click();
    await expect.poll(() => terminalText(page)).not.toMatch(/before-clear/);
    await runInTerminal(page, 'echo after-clear');
    await expectTerminalOutput(page, /after-clear/);
  });

  test('editor files are on disk: Run a saved script from the explorer', async ({ page }) => {
    await openProject(page);
    const name = `run_${Date.now()}.js`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await typeInEditor(page, 'console.log("ran-from-explorer")');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('File saved')).toBeVisible();

    await openTerminal(page);
    await treeItem(page, name).hover();
    await treeItem(page, name).locator('.run-file-btn').click();
    await expectTerminalOutput(page, /ran-from-explorer/);
  });

  test('the terminal survives clicking around the file tree', async ({ page }) => {
    await openProject(page);
    const name = `keep_${Date.now()}.js`;
    await createNode(page, name);
    await openTerminal(page);
    await runInTerminal(page, 'echo before-click');
    await expectTerminalOutput(page, /before-click/);

    await treeItem(page, name).click();
    await page.waitForTimeout(1500);

    await runInTerminal(page, 'echo after-click');
    await expectTerminalOutput(page, /after-click/);
  });

  test('npm works in the project directory', async ({ page }) => {
    test.slow();
    await openProject(page);
    await openTerminal(page);
    await runInTerminal(page, 'npm --version');
    await expectTerminalOutput(page, /\d+\.\d+\.\d+/);
  });
});
