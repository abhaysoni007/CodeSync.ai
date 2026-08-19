import { test, expect, request } from '@playwright/test';
import { openProject, createNode, treeItem, typeInEditor, fixture, openTerminal, runInTerminal } from './helpers.js';

const API = process.env.E2E_API_URL || 'http://localhost:5000';

const api = async () => {
  const { token } = fixture();
  const ctx = await request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  return ctx;
};

test.describe('Search across files', () => {
  test('finds a string and jumps to its line', async ({ page }) => {
    await openProject(page);
    const name = `needle_${Date.now()}.js`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await typeInEditor(page, 'const a = 1;\nconst b = 2;\nconst FINDME_TOKEN = 3;');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('File saved')).toBeVisible();

    await page.locator('nav button[aria-label="Search across files"]').click();
    await page.getByTestId('search-input').fill('FINDME_TOKEN');
    await page.getByTestId('search-run').click();

    const hit = page.getByTestId('search-results').getByText(/FINDME_TOKEN/).first();
    await expect(hit).toBeVisible({ timeout: 20_000 });
    await hit.click();

    // Clicking a result opens the file and puts the cursor on the matching line.
    await expect(page.locator('[data-testid^="editor-tab-"]', { hasText: name })).toBeVisible();
    await expect(page.locator('.h-6').first()).toContainText('Line 3');
  });
});

test.describe('Command palette and quick open', () => {
  test('Ctrl+Shift+P opens the palette and can run a command', async ({ page }) => {
    await openProject(page);
    await page.keyboard.press('Control+Shift+P');
    await expect(page.getByTestId('command-palette')).toBeVisible();

    await page.getByTestId('palette-input').fill('>Ports');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('ports-list')).toBeVisible();
  });

  test('Ctrl+P opens a file by name', async ({ page }) => {
    await openProject(page);
    const name = `quick_${Date.now()}.js`;
    await createNode(page, name);

    await page.keyboard.press('Control+p');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.getByTestId('palette-input').fill(name);
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid^="editor-tab-"]', { hasText: name })).toBeVisible();
  });

  test('Ctrl+G jumps to a line', async ({ page }) => {
    await openProject(page);
    const name = `goto_${Date.now()}.js`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await typeInEditor(page, 'one\ntwo\nthree\nfour\nfive');

    await page.keyboard.press('Control+g');
    await page.getByTestId('palette-input').fill('4');
    await page.keyboard.press('Enter');

    await expect(page.locator('.h-6').first()).toContainText('Line 4');
  });
});

test.describe('Autosave and save status', () => {
  test('typing with autosave on persists without Ctrl+S', async ({ page }) => {
    await openProject(page);
    const name = `auto_${Date.now()}.js`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();

    const toggle = page.getByTestId('autosave-toggle');
    if ((await toggle.textContent())?.includes('Off')) await toggle.click();
    await expect(toggle).toContainText('On');

    await typeInEditor(page, 'const autosaved = true;');
    await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });

    await page.reload();
    await expect(page.locator('.file-tree .node-name').first()).toBeVisible();
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toContainText('const autosaved = true;');

    await page.getByTestId('autosave-toggle').click();
  });

  test('the status bar reports unsaved work', async ({ page }) => {
    await openProject(page);
    const name = `status_${Date.now()}.js`;
    await createNode(page, name);
    await treeItem(page, name).click();
    await expect(page.getByTestId('save-status')).toHaveText('Saved');
    await typeInEditor(page, 'x');
    await expect(page.getByTestId('save-status')).toHaveText('Unsaved');
  });
});

test.describe('Open tabs survive a reload', () => {
  test('reopening the project restores the tabs that were open', async ({ page }) => {
    await openProject(page);
    const a = `restore_a_${Date.now()}.js`;
    const b = `restore_b_${Date.now()}.js`;
    await createNode(page, a);
    await createNode(page, b);
    await treeItem(page, a).click();
    await treeItem(page, b).click();
    await expect(page.locator('[data-testid^="editor-tab-"]')).toHaveCount(2);

    await page.reload();
    await expect(page.locator('.file-tree .node-name').first()).toBeVisible();
    await expect(page.locator('[data-testid^="editor-tab-"]')).toHaveCount(2, { timeout: 20_000 });
  });
});

test.describe('Move (drag and drop) via the API the UI calls', () => {
  test('a file moves into a folder and the tree follows', async ({ page }) => {
    const { projectId } = fixture();
    const ctx = await api();

    const folder = `moved_${Date.now()}`;
    const file = `mover_${Date.now()}.js`;
    await ctx.post(`/api/filesystem/${projectId}/create`, { data: { name: folder, type: 'folder' } });
    await ctx.post(`/api/filesystem/${projectId}/create`, { data: { name: file, type: 'file', content: 'moved!' } });

    await openProject(page);
    await expect(page.locator('.file-tree .node-name', { hasText: file })).toBeVisible();

    const move = await ctx.post(`/api/filesystem/${projectId}/move`, {
      data: { path: [file], targetPath: [folder] },
    });
    expect(move.ok()).toBeTruthy();

    // The watcher pushes the change; no reload.
    await treeItem(page, folder).click();
    await expect(page.locator('.file-tree .node-name', { hasText: file })).toBeVisible({ timeout: 20_000 });

    const read = await ctx.get(`/api/filesystem/${projectId}/file`, {
      params: { path: JSON.stringify([folder, file]) },
    });
    expect((await read.json()).data.content).toBe('moved!');
    await ctx.dispose();
  });

  test('a folder cannot be moved into itself', async () => {
    const { projectId } = fixture();
    const ctx = await api();
    const folder = `selfmove_${Date.now()}`;
    await ctx.post(`/api/filesystem/${projectId}/create`, { data: { name: folder, type: 'folder' } });
    const res = await ctx.post(`/api/filesystem/${projectId}/move`, {
      data: { path: [folder], targetPath: [folder] },
    });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });
});

test.describe('Filesystem watcher', () => {
  test('a file created outside the terminal appears without a refresh click', async ({ page }) => {
    const { projectId } = fixture();
    const ctx = await api();
    await openProject(page);

    const name = `watched_${Date.now()}.txt`;
    await ctx.post(`/api/filesystem/${projectId}/create`, {
      data: { name, type: 'file', content: 'from the api' },
    });

    await expect(page.locator('.file-tree .node-name', { hasText: name })).toBeVisible({
      timeout: 20_000,
    });
    await ctx.dispose();
  });
});

test.describe('Ports', () => {
  test('the ports panel lists the backend that is serving this test', async ({ page }) => {
    await openProject(page);
    await page.locator('nav button[aria-label="Ports"]').click();
    // Port 5000 is this very backend, so it is guaranteed to be listening during the run.
    await expect(page.getByTestId('ports-list')).toContainText('5000', { timeout: 20_000 });
  });
});

test.describe('Long-running processes', () => {
  test('a dev-server-style process keeps running and Ctrl+C stops it', async ({ page }) => {
    test.setTimeout(120_000);
    await openProject(page);
    await openTerminal(page);

    // A stand-in for `npm run dev`: stays alive, prints, and must survive several seconds.
    await runInTerminal(page, `node -e "setInterval(()=>console.log('alive-tick'),700)"`);
    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() => {
              const el = [...document.querySelectorAll('.xterm-container')].find(
                (n) => n.getClientRects().length > 0
              );
              return el ? el.innerText : '';
            })
          ).split('alive-tick').length - 1,
        { timeout: 30_000, message: 'process did not keep printing' }
      )
      .toBeGreaterThan(2);

    await page.keyboard.press('Control+C');
    const after = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.xterm-container')].find(
        (n) => n.getClientRects().length > 0
      );
      return el ? el.innerText.length : 0;
    });
    await page.waitForTimeout(3000);
    const later = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.xterm-container')].find(
        (n) => n.getClientRects().length > 0
      );
      return el ? el.innerText.length : 0;
    });
    // Once interrupted the ticker must stop adding output.
    expect(later - after).toBeLessThan(40);
  });
});
