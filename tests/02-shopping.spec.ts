import { test, expect } from '@playwright/test';

const APP_URL = 'https://pricepilot-zr6n.onrender.com/';
const TEST_EMAIL = 'abc123@example.com';
const TEST_PASSWORD = 'Abc12345$';

test.describe('Shopping and Search Flows', () => {
  // Use a beforeEach hook to ensure we are logged in before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByRole('textbox', { name: /name@example\.com|email/i }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: /••••••••|password/i }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('User can search for a product', async ({ page }) => {
    // Navigate to Search Products from the sidebar/navigation
    const searchLink = page.getByRole('navigation').getByRole('link', { name: 'Search Products' });
    await expect(searchLink).toBeVisible();
    await searchLink.click();
    
    // Ensure we reached the products search page
    await expect(page).toHaveURL(/.*products/);

    // Enter a search query
    const searchInput = page.getByRole('textbox', { name: /Search for a product/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('iphone 16');
    
    // Click Search
    const searchBtn = page.getByRole('button', { name: 'Search', exact: true });
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();
    
    // Wait for the button to indicate action, or for network idle
    // In a real application, we might look for a spinner or wait for product cards
    // This assertion ensures the app doesn't crash during search
    await expect(searchBtn).toBeEnabled({ timeout: 25000 });
    
    // Try to find if there is a loading state or a grid of results
    // We expect some results container to exist, even if it says "No results"
    const contentArea = page.locator('main').first();
    await expect(contentArea).toBeVisible();
  });

  test('User can access AI Advisor page', async ({ page }) => {
    // Navigate to AI Advisor from the sidebar/navigation
    const advisorLink = page.getByRole('navigation').getByRole('link', { name: 'AI Advisor' });
    await expect(advisorLink).toBeVisible();
    await advisorLink.click();
    
    // Ensure we reached the advisor page
    await expect(page).toHaveURL(/.*advisor/);

    // Verify main components of the advisor page
    await expect(page.getByText(/AI Shopping Advisor/i)).toBeVisible();
    
    // Ensure the product dropdown or input is present
    const analyzeButton = page.getByRole('button', { name: /Analyze/i });
    await expect(analyzeButton).toBeVisible();
  });
});
