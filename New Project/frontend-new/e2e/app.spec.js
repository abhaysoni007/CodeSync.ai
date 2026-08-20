import { test, expect } from '@playwright/test';

test.describe('CodeSync.ai E2E Test Suite', () => {
  test('1. User Registration & Dashboard Access', async ({ page }) => {
    const timestamp = Date.now();
    const user = {
      username: `user1_${timestamp}`,
      email: `user1_${timestamp}@example.com`,
      password: 'Password123!',
    };

    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create Account');

    await page.fill('#username', user.username);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.fill('#confirmPassword', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Your Projects')).toBeVisible({ timeout: 10000 });
  });

  test('2. Create Project, Monaco Editor & Yjs CRDT Mounting', async ({ page }) => {
    const timestamp = Date.now();
    const user = {
      username: `user2_${timestamp}`,
      email: `user2_${timestamp}@example.com`,
      password: 'Password123!',
    };

    // Register & go directly to dashboard
    await page.goto('/register');
    await page.fill('#username', user.username);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.fill('#confirmPassword', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Open Create Project modal
    const newProjectBtn = page.locator('button:has-text("New Project")').first();
    await newProjectBtn.click();

    // Fill project form
    await page.fill('#projectName', `E2E Project ${timestamp}`);
    await page.fill('#projectDesc', 'Playwright automated E2E test project');
    await page.click('button[type="submit"]:has-text("Create")');

    // Dashboard automatically navigates directly to /project/:id on creation
    await page.waitForURL('**/project/**', { timeout: 15000 });
    await expect(page).toHaveURL(/.*project/);

    // Wait for file explorer to render
    const fileNode = page.locator('.node-name').first();
    await expect(fileNode).toBeVisible({ timeout: 10000 });

    // Click on a file in explorer
    const fileToOpen = page.locator('.node-name:has-text("README.md"), .node-name:has-text("readme.md"), .node-name:has-text("package.json"), .node-name:has-text("index.js")').first();
    await fileToOpen.click();

    // Verify Monaco Editor mounts and renders
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Verify Yjs CRDT indicator in active tab
    await expect(page.locator('text=Yjs CRDT')).toBeVisible();
  });

  test('3. Real-Time Yjs CRDT Code Synchronization & Chat between Two Users', async ({ browser }) => {
    test.setTimeout(90000);
    const timestamp = Date.now();

    const userA = {
      username: `userA_${timestamp}`,
      email: `userA_${timestamp}@example.com`,
      password: 'Password123!',
    };

    const userB = {
      username: `userB_${timestamp}`,
      email: `userB_${timestamp}@example.com`,
      password: 'Password123!',
    };

    // Context A (User A)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // Context B (User B)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // 1. Register User A and create project
    await pageA.goto('/register');
    await pageA.fill('#username', userA.username);
    await pageA.fill('#email', userA.email);
    await pageA.fill('#password', userA.password);
    await pageA.fill('#confirmPassword', userA.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/dashboard', { timeout: 15000 });

    await pageA.locator('button:has-text("New Project")').first().click();
    await pageA.fill('#projectName', `Collab Project ${timestamp}`);
    await pageA.click('button[type="submit"]:has-text("Create")');
    await pageA.waitForURL('**/project/**', { timeout: 15000 });

    // 2. Read Join Code from User A's header after project data loads
    const joinCodeLocator = pageA.locator('.bg-vscode-panel span.text-xs.rounded');
    await expect(joinCodeLocator).not.toHaveText('', { timeout: 10000 });
    const joinCode = (await joinCodeLocator.innerText()).trim();
    console.log(`[E2E] Successfully obtained project join code: "${joinCode}"`);

    // 3. Register User B
    await pageB.goto('/register');
    await pageB.fill('#username', userB.username);
    await pageB.fill('#email', userB.email);
    await pageB.fill('#password', userB.password);
    await pageB.fill('#confirmPassword', userB.password);
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL('**/dashboard', { timeout: 15000 });

    // 4. User B joins the project via Join Code
    await pageB.click('button:has-text("Join by Code")');
    await pageB.fill('#joinCode', joinCode);
    await pageB.click('button[type="submit"]:has-text("Join Project")');
    await pageB.waitForURL('**/project/**', { timeout: 15000 });

    // 5. Both users select the exact same file in File Explorer
    const fileA = pageA.locator('.node-name:has-text("README.md"), .node-name:has-text("readme.md"), .node-name:has-text("package.json"), .node-name:has-text("index.js")').first();
    await expect(fileA).toBeVisible({ timeout: 10000 });
    await fileA.click();

    const fileB = pageB.locator('.node-name:has-text("README.md"), .node-name:has-text("readme.md"), .node-name:has-text("package.json"), .node-name:has-text("index.js")').first();
    await expect(fileB).toBeVisible({ timeout: 10000 });
    await fileB.click();

    // Verify Monaco editors mount for both users
    await pageA.waitForSelector('.monaco-editor .view-lines', { timeout: 15000 });
    await pageB.waitForSelector('.monaco-editor .view-lines', { timeout: 15000 });

    // 6. Test Yjs CRDT: User A writes code into Monaco Editor
    console.log('[E2E] User A typing into Monaco Editor...');
    await pageA.click('.monaco-editor .view-lines');
    await pageA.keyboard.press('Control+End');
    await pageA.keyboard.type('\n// TEST_USER_A_YJS_LIVE_SYNC\nconst yjsA = 100;\n', { delay: 15 });

    // 7. Verify User B receives User A's code update in real-time via Yjs CRDT!
    console.log('[E2E] Verifying User B receives User A code update...');
    await expect(pageB.locator('.monaco-editor')).toContainText('TEST_USER_A_YJS_LIVE_SYNC', { timeout: 15000 });
    await expect(pageB.locator('.monaco-editor')).toContainText('const yjsA = 100;', { timeout: 15000 });
    console.log('✅ User B received User A edit via Yjs CRDT in real-time!');

    // 8. Test Yjs CRDT: User B writes code into Monaco Editor
    console.log('[E2E] User B typing into Monaco Editor...');
    await pageB.click('.monaco-editor .view-lines');
    await pageB.keyboard.press('Control+End');
    await pageB.keyboard.type('// TEST_USER_B_YJS_LIVE_SYNC\nconst yjsB = 200;\n', { delay: 15 });

    // 9. Verify User A receives User B's code update in real-time via Yjs CRDT!
    console.log('[E2E] Verifying User A receives User B code update...');
    await expect(pageA.locator('.monaco-editor')).toContainText('TEST_USER_B_YJS_LIVE_SYNC', { timeout: 15000 });
    await expect(pageA.locator('.monaco-editor')).toContainText('const yjsB = 200;', { timeout: 15000 });
    console.log('✅ User A received User B edit via Yjs CRDT in real-time!');

    await contextA.close();
    await contextB.close();
  });

  test('4. Floating AI Assistant (Ask Mode) Panel & Model Selection', async ({ page }) => {
    const timestamp = Date.now();
    const user = {
      username: `user4_${timestamp}`,
      email: `user4_${timestamp}@example.com`,
      password: 'Password123!',
    };

    // Register & create project
    await page.goto('/register');
    await page.fill('#username', user.username);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.fill('#confirmPassword', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    await page.locator('button:has-text("New Project")').first().click();
    await page.fill('#projectName', `AI Project ${timestamp}`);
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForURL('**/project/**', { timeout: 15000 });

    // Open Floating AI Assistant
    const aiButton = page.locator('button[title*="AI Assistant" i]').first();
    await expect(aiButton).toBeVisible({ timeout: 10000 });
    await aiButton.click();

    // Verify AI Panel opens in Ask Mode
    await expect(page.locator('text=AI Code Assistant')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Ask mode • Gemini AI')).toBeVisible();

    // Verify Model Selector
    const modelBtn = page.locator('button:has-text("Gemini")').first();
    await expect(modelBtn).toBeVisible();
    await modelBtn.click();

    // Select Gemini 1.5 Pro
    const proOption = page.locator('button:has-text("Gemini 1.5 Pro")').first();
    if (await proOption.isVisible()) {
      await proOption.click();
    }

    // Verify Suggestion Buttons
    const suggestionBtn = page.locator('button:has-text("Explain how Yjs CRDT")').first();
    if (await suggestionBtn.isVisible()) {
      await suggestionBtn.click();
      const inputVal = await page.locator('textarea[placeholder*="Ask a coding question" i]').inputValue();
      expect(inputVal).toContain('Yjs CRDT');
    }

    // Close AI Panel
    const closeBtn = page.locator('button[title="Close Panel"]').first();
    await closeBtn.click();
    await expect(page.locator('text=AI Code Assistant')).not.toBeVisible();
  });

  test('5. Multi-Tab Editor Switching & Activity Timeline', async ({ page }) => {
    const timestamp = Date.now();
    const user = {
      username: `user5_${timestamp}`,
      email: `user5_${timestamp}@example.com`,
      password: 'Password123!',
    };

    // Register & create project
    await page.goto('/register');
    await page.fill('#username', user.username);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.fill('#confirmPassword', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    await page.locator('button:has-text("New Project")').first().click();
    await page.fill('#projectName', `MultiTab Project ${timestamp}`);
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForURL('**/project/**', { timeout: 15000 });

    // Wait for file explorer to render and click file
    const fileToOpen = page.locator('.node-name:has-text("README.md"), .node-name:has-text("readme.md"), .node-name:has-text("package.json"), .node-name:has-text("index.js")').first();
    await expect(fileToOpen).toBeVisible({ timeout: 15000 });
    await fileToOpen.click();
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });

    // Verify tab bar rendered
    const tabs = page.locator('.h-9 .cursor-pointer');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(1);

    // Toggle Activity Timeline Panel
    const activityBtn = page.locator('button[title="Activity Timeline"]').first();
    await activityBtn.click();
    await expect(page.locator('h2:has-text("Activity Timeline")').first()).toBeVisible({ timeout: 5000 });

    // Close Activity Timeline Panel
    await activityBtn.click();
    await expect(page.locator('aside:has-text("Activity Timeline")')).not.toBeVisible();
  });
});
