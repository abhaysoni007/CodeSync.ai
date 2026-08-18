import { test, expect } from '@playwright/test';
import { openProject, createNode, treeItem, recordConsole, typeInEditor } from './helpers.js';

const openFile = async (page, name) => {
  await createNode(page, name);
  await treeItem(page, name).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.locator('.monaco-editor .view-lines').click();
};

test.describe('Editor — Monaco behaving like VS Code', () => {
  test('Ctrl+S saves and the content is what the server hands back on reload', async ({ page }) => {
    const name = `save_${Date.now()}.js`;
    await openProject(page);
    await openFile(page, name);

    await typeInEditor(page, 'const saved = true;');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('File saved')).toBeVisible();

    await page.reload();
    await expect(page.locator('.file-tree .node-name').first()).toBeVisible();
    await treeItem(page, name).click();
    await expect(page.locator('.monaco-editor')).toContainText('const saved = true;');
  });

  test('Ctrl+S does not trigger the browser save dialog outside the editor', async ({ page }) => {
    const name = `focus_${Date.now()}.js`;
    await openProject(page);
    await openFile(page, name);
    await typeInEditor(page, 'x');

    // Focus something that is not Monaco, the way a dev does after clicking the tree.
    await treeItem(page, name).click();
    const defaultPrevented = await page.evaluate(() => {
      const evt = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true, bubbles: true });
      document.body.dispatchEvent(evt);
      return evt.defaultPrevented;
    });
    expect(defaultPrevented, 'app must own Ctrl+S, not the browser').toBe(true);
  });

  test('syntax highlighting follows the file extension', async ({ page }) => {
    await openProject(page);
    await openFile(page, `lang_${Date.now()}.py`);
    await expect(page.locator('.h-6', { hasText: 'python' })).toBeVisible();
  });

  test('autoclosing brackets and quotes', async ({ page }) => {
    await openProject(page);
    await openFile(page, `br_${Date.now()}.js`);
    await page.keyboard.type('function f(');
    await expect(page.locator('.monaco-editor')).toContainText('function f()');
  });

  test('the status bar tracks the cursor position', async ({ page }) => {
    await openProject(page);
    await openFile(page, `cur_${Date.now()}.js`);
    await page.keyboard.type('one\ntwo\nthree');
    await expect(page.locator('.h-6').first()).toContainText('Line 3');
  });

  test('editing does not throw', async ({ page }) => {
    const logs = recordConsole(page);
    await openProject(page);
    await openFile(page, `err_${Date.now()}.js`);
    await page.keyboard.type('const a = [1,2,3].map(n => n * 2);\n');
    await page.waitForTimeout(500);
    expect(logs.filter((l) => l.startsWith('PAGEERROR:'))).toEqual([]);
  });
});
