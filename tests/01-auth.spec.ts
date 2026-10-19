import { test, expect } from '@playwright/test';

const APP_URL = 'https://pricepilot-zr6n.onrender.com/';
const TEST_EMAIL = 'abc123@example.com';
const TEST_PASSWORD = 'Abc12345$';

test.describe('Authentication Flows', () => {
  test('Landing page loads correctly', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Check that we're on the landing page
    const loginButton = page.getByRole('button', { name: 'Log In' });
    await expect(loginButton).toBeVisible();
    
    // The landing page should have some welcoming text or branding
    await expect(page.getByText(/AI Shopping/i).first()).toBeVisible();
  });

  test('User can log in successfully', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Navigate to Login
    await page.getByRole('button', { name: 'Log In' }).click();
    
    // Verify URL
    await expect(page).toHaveURL(/.*login/);

    // Fill in credentials
    const emailInput = page.getByRole('textbox', { name: /name@example\.com|email/i });
    await expect(emailInput).toBeVisible();
    await emailInput.fill(TEST_EMAIL);
    
    const passwordInput = page.getByRole('textbox', { name: /••••••••|password/i });
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(TEST_PASSWORD);
    
    // Submit login form
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    
    // Verify successful login by checking for dashboard elements
    await expect(page.getByText(/Good morning/i)).toBeVisible();
  });
});
