import { test, expect } from '@playwright/test';
import {
  openProject,
  createNode,
  treeItem,
  openTerminal,
  expectTerminalOutput,
  typeInEditor,
} from './helpers.js';

const writeAndSave = async (page, name, contents) => {
  await createNode(page, name);
  await treeItem(page, name).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await typeInEditor(page, contents);
  await page.keyboard.press('Control+s');
  await expect(page.getByText('File saved')).toBeVisible();
};

test.describe('Run button', () => {
  test('runs a file even when the terminal panel is closed', async ({ page }) => {
    await openProject(page);
    const name = `closed_${Date.now()}.js`;
    await writeAndSave(page, name, 'console.log("ran-with-panel-closed")');

    // Deliberately never open the terminal: clicking Run should bring it up itself.
    await expect(page.locator('.terminal-panel')).toBeHidden();
    await treeItem(page, name).hover();
    await treeItem(page, name).locator('.run-file-btn').click();

    await expect(page.locator('.terminal-panel')).toBeVisible();
    await expectTerminalOutput(page, /ran-with-panel-closed/);
  });

  test('runs a python file', async ({ page }) => {
    await openProject(page);
    const name = `py_${Date.now()}.py`;
    await writeAndSave(page, name, 'print("ran-python")');

    await openTerminal(page);
    await treeItem(page, name).hover();
    await treeItem(page, name).locator('.run-file-btn').click();
    await expectTerminalOutput(page, /ran-python/);
  });

  test('runs a file that lives in a subfolder', async ({ page }) => {
    await openProject(page);
    const folder = `sub_${Date.now()}`;
    await createNode(page, folder, 'folder');
    await treeItem(page, folder).click({ button: 'right' });
    await page.locator('.context-menu-item', { hasText: 'New File' }).click();
    await page.locator('.modal-input').fill('nested-run.js');
    await page.locator('.modal-input').press('Enter');

    await treeItem(page, 'nested-run.js').click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await typeInEditor(page, 'console.log("ran-from-subfolder")');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('File saved')).toBeVisible();

    await openTerminal(page);
    await treeItem(page, 'nested-run.js').hover();
    await treeItem(page, 'nested-run.js').locator('.run-file-btn').click();
    await expectTerminalOutput(page, /ran-from-subfolder/);
  });
});

test.describe('Activity timeline', () => {
  const openTimeline = async (page) => {
    await page.getByRole('button', { name: 'Activity' }).click();
    await expect(page.getByRole('heading', { name: 'Activity Timeline' })).toBeVisible();
  };

  test('shows the join that just happened instead of staying empty', async ({ page }) => {
    await openProject(page);
    await openTimeline(page);
    await expect(page.locator('text=No activity yet')).toHaveCount(0);
  });

  test('a file created now appears without a reload', async ({ page }) => {
    await openProject(page);
    await openTimeline(page);
    const name = `act_${Date.now()}.js`;
    await createNode(page, name);
    await expect(page.getByText(new RegExp(`created .*${name}`))).toBeVisible({ timeout: 20_000 });
  });

  test('saving a file shows up as an edit', async ({ page }) => {
    await openProject(page);
    const name = `edit_${Date.now()}.js`;
    await writeAndSave(page, name, 'const edited = 1;');
    await openTimeline(page);
    await expect(page.getByText(new RegExp(`edited .*${name}`))).toBeVisible({ timeout: 20_000 });
  });

  test('deleting a file shows up, live', async ({ page }) => {
    await openProject(page);
    const name = `del_${Date.now()}.js`;
    await createNode(page, name);
    await openTimeline(page);

    page.once('dialog', (d) => d.accept());
    await treeItem(page, name).click({ button: 'right' });
    await page.locator('.context-menu-item', { hasText: 'Delete' }).click();

    await expect(page.getByText(new RegExp(`deleted .*${name}`))).toBeVisible({ timeout: 20_000 });
  });
});
