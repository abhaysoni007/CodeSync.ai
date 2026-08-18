import { test, expect, request } from '@playwright/test';
import {
  openProject,
  createNode,
  treeItem,
  openTerminal,
  runInTerminal,
  typeInEditor,
  fixture,
} from './helpers.js';

const API = process.env.E2E_API_URL || 'http://localhost:5000';

/**
 * The three bugs this suite exists for, plus the guarantees that keep them fixed:
 *  1. unsaved work must survive switching files (tabs own their buffers)
 *  2. HTML must be runnable - in a browser, not a shell
 *  3. the explorer must show what is actually on disk, including whatever the terminal made
 */

test.describe('Editor tabs — unsaved work is never silently discarded', () => {
  test('unsaved edits survive switching to another file and back', async ({ page }) => {
    await openProject(page);
    const a = `keepbuf_a_${Date.now()}.js`;
    const b = `keepbuf_b_${Date.now()}.js`;
    await createNode(page, a);
    await createNode(page, b);

    await treeItem(page, a).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await typeInEditor(page, 'const unsaved = "do not lose me";');

    // Deliberately NO save.
    await treeItem(page, b).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await treeItem(page, a).click();

    await expect(page.locator('.monaco-editor')).toContainText('do not lose me');
  });

  test('a dirty tab is marked, and the mark clears on save', async ({ page }) => {
    await openProject(page);
    const name = `dirty_${Date.now()}.js`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();

    const tab = page.locator('[data-testid^="editor-tab-"]', { hasText: name });
    await expect(tab).toHaveAttribute('data-dirty', 'false');

    await typeInEditor(page, 'let x = 1;');
    await expect(tab).toHaveAttribute('data-dirty', 'true');

    await page.keyboard.press('Control+s');
    await expect(page.getByText('File saved')).toBeVisible();
    await expect(tab).toHaveAttribute('data-dirty', 'false');
  });

  test('closing a dirty tab asks first, and cancelling keeps the buffer', async ({ page }) => {
    await openProject(page);
    const name = `close_${Date.now()}.js`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await typeInEditor(page, 'const risky = true;');

    const tab = page.locator('[data-testid^="editor-tab-"]', { hasText: name });
    page.once('dialog', (d) => d.dismiss());
    await tab.hover();
    await tab.getByRole('button', { name: `Close ${name}` }).click();

    await expect(tab).toHaveCount(1);
    await expect(page.locator('.monaco-editor')).toContainText('const risky = true;');
  });

  test('two files stay open as separate tabs', async ({ page }) => {
    await openProject(page);
    const a = `tabs_a_${Date.now()}.js`;
    const b = `tabs_b_${Date.now()}.js`;
    await createNode(page, a);
    await createNode(page, b);

    await treeItem(page, a).click();
    await treeItem(page, b).click();

    await expect(page.locator('[data-testid^="editor-tab-"]')).toHaveCount(2);
  });
});

test.describe('Run HTML in the browser', () => {
  test('an html file opens as a real page with its own markup', async ({ page, context }) => {
    await openProject(page);
    const name = `page_${Date.now()}.html`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    // Only the opening tag: Monaco closes HTML tags for you, so typing the closer as well would
    // overtype the one it inserted and swallow characters.
    await typeInEditor(page, '<h1>hello-from-preview');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('File saved')).toBeVisible();

    const [preview] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('open-in-browser').click(),
    ]);
    await preview.waitForLoadState();
    await expect(preview.locator('body')).toContainText('hello-from-preview');
  });

  test('the explorer offers Open in Browser for html, not a terminal run', async ({ page }) => {
    await openProject(page);
    const name = `ctx_${Date.now()}.html`;
    await createNode(page, name);

    await treeItem(page, name).click({ button: 'right' });
    await expect(page.locator('.context-menu-item', { hasText: 'Open in Browser' })).toBeVisible();
    await expect(page.locator('.context-menu-item', { hasText: 'Run File in Terminal' })).toHaveCount(0);
  });
});

test.describe('The explorer shows what is really on disk', () => {
  test('a folder made in the terminal appears in the tree', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);

    const dir = `shellmade${Date.now()}`;
    await runInTerminal(page, `mkdir ${dir}`);

    await expect(page.locator('.file-tree .node-name', { hasText: dir })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('npm install leaves package.json, a lockfile and node_modules visible', async ({ page }) => {
    test.setTimeout(180_000);
    await openProject(page);
    await openTerminal(page);

    // `npm init -y` writes package.json; installing a tiny real package proves node_modules and
    // the lockfile show up too - the exact case that used to succeed on disk and show nothing.
    // The tree is the assertion, not the scrollback: npm's banner scrolls out of the visible rows.
    await runInTerminal(page, 'npm init -y');
    await expect(page.locator('.file-tree .node-name', { hasText: /^package\.json$/ })).toBeVisible({
      timeout: 60_000,
    });

    await runInTerminal(page, 'npm install left-pad --no-audit --no-fund');
    await expect(page.locator('.file-tree .node-name', { hasText: /^node_modules$/ })).toBeVisible({
      timeout: 150_000,
    });
    await expect(
      page.locator('.file-tree .node-name', { hasText: /^package-lock\.json$/ })
    ).toBeVisible({ timeout: 30_000 });
  });

  test('the refresh button re-reads the tree', async ({ page }) => {
    await openProject(page);
    const before = await page.locator('.file-tree .node-name').count();
    await page.getByTestId('explorer-refresh').click();
    await expect(page.locator('.file-tree .node-name')).toHaveCount(before);
  });

  test('a file written by the shell can be opened in the editor', async ({ page }) => {
    await openProject(page);
    await openTerminal(page);

    const name = `fromshell_${Date.now()}.txt`;
    // Written through node so the test does not depend on the host shell's redirect encoding
    // (PowerShell's `>` emits UTF-16LE, bash's emits UTF-8).
    await runInTerminal(page, `node -e "require('fs').writeFileSync('${name}','shell-authored')"`);

    await expect(page.locator('.file-tree .node-name', { hasText: name })).toBeVisible({
      timeout: 30_000,
    });
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toContainText('shell-authored');
  });
});

test.describe('Filesystem API guards', () => {
  test('another project id is refused', async () => {
    const { token } = fixture();
    const api = await request.newContext({ baseURL: API });
    const res = await api.get('/api/filesystem/000000000000000000000000', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
    await api.dispose();
  });

  test('a path that tries to escape the project is refused', async () => {
    const { token, projectId } = fixture();
    const api = await request.newContext({ baseURL: API });
    const res = await api.get(`/api/filesystem/${projectId}/file`, {
      params: { path: JSON.stringify(['..', '..', 'server.js']) },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    await api.dispose();
  });

  test('no token, no files', async () => {
    const { projectId } = fixture();
    const api = await request.newContext({ baseURL: API });
    const res = await api.get(`/api/filesystem/${projectId}`);
    expect(res.status()).toBe(401);
    await api.dispose();
  });
});
