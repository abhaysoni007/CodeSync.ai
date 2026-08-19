import { test, expect } from '@playwright/test';
import { openProject, createNode, treeItem, recordConsole, countLines, typeInEditor } from './helpers.js';

test.describe('File explorer — the things a dev does every minute', () => {
  test('create, open, rename and delete a file', async ({ page }) => {
    await openProject(page);
    const name = `notes_${Date.now()}.md`;

    await createNode(page, name);

    // Open it: the editor header should name the file and Monaco should mount.
    await treeItem(page, name).click();
    await expect(page.locator('main').getByText(name, { exact: true })).toBeVisible();
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Rename through the context menu.
    await treeItem(page, name).click({ button: 'right' });
    await page.locator('.context-menu-item', { hasText: 'Rename' }).click();
    const renamed = `renamed_${name}`;
    await page.locator('.rename-input').fill(renamed);
    await page.locator('.rename-input').press('Enter');
    await expect(page.locator('.file-tree .node-name', { hasText: renamed })).toBeVisible();

    // Delete it (the app uses window.confirm).
    page.once('dialog', (d) => d.accept());
    await treeItem(page, renamed).click({ button: 'right' });
    await page.locator('.context-menu-item', { hasText: 'Delete' }).click();
    await expect(page.locator('.file-tree .node-name', { hasText: renamed })).toHaveCount(0);
  });

  test('create a folder and a file inside it', async ({ page }) => {
    await openProject(page);
    const folder = `dir_${Date.now()}`;
    await createNode(page, folder, 'folder');

    await treeItem(page, folder).click({ button: 'right' });
    await page.locator('.context-menu-item', { hasText: 'New File' }).click();
    const child = 'nested.js';
    await page.locator('.modal-input').fill(child);
    await page.locator('.modal-input').press('Enter');

    await expect(page.locator('.file-tree .node-name', { hasText: child })).toBeVisible();
  });

  test('file content survives a switch to another file and back', async ({ page }) => {
    await openProject(page);
    const a = `a_${Date.now()}.js`;
    const b = `b_${Date.now()}.js`;
    await createNode(page, a);
    await createNode(page, b);

    await treeItem(page, a).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await typeInEditor(page, 'const a = 1;');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('File saved')).toBeVisible();

    await treeItem(page, b).click();
    await treeItem(page, a).click();
    await expect(page.locator('.monaco-editor')).toContainText('const a = 1;');
  });

  test('clicking files does not tear down the collaboration socket', async ({ page }) => {
    const logs = recordConsole(page);
    await openProject(page);
    const a = `s1_${Date.now()}.js`;
    const b = `s2_${Date.now()}.js`;
    await createNode(page, a);
    await createNode(page, b);

    await page.waitForTimeout(1000);
    const before = countLines(logs, /Socket connected:/);

    for (let i = 0; i < 3; i++) {
      await treeItem(page, a).click();
      await treeItem(page, b).click();
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1000);

    // One connection for the room. Reconnect churn kills terminals and drops presence.
    expect(countLines(logs, /Socket connected:/)).toBe(before);
    expect(countLines(logs, /Socket disconnected/)).toBe(0);
  });
});
