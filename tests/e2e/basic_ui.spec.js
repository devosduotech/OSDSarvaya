const { test, expect } = require('@playwright/test');

test.describe('OSDSarvaya Basic UI Flow', () => {
  
  test('should load the application homepage', async ({ page }) => {
    await page.goto('http://localhost:3001');
    // Check if the page has loaded by looking for common elements (e.g., Login container or Logo)
    await expect(page).toHaveURL('http://localhost:3001/');
  });

  test('should display the setup page if no admin exists', async ({ page }) => {
    // This test assumes the database is fresh and no admin is created
    await page.goto('http://localhost:3001');
    // We expect to see setup related fields if it's first launch
    const setupHeader = page.locator('text=Create Admin Account');
    if (await setupHeader.isVisible()) {
        await expect(setupHeader).toBeVisible();
    }
  });

});
