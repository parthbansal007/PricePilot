import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://pricepilot-zr6n.onrender.com/');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.getByRole('textbox', { name: 'name@example.com' }).click();
  await page.getByRole('textbox', { name: 'name@example.com' }).fill('abc123@example.com');
  await page.getByRole('textbox', { name: '••••••••' }).click();
  await page.getByRole('textbox', { name: '••••••••' }).fill('Abc12345$');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Search Products' }).click();
  await page.getByRole('textbox', { name: 'Search for a product (e.g.' }).click();
  await page.getByRole('textbox', { name: 'Search for a product (e.g.' }).fill('iphone 16');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
});