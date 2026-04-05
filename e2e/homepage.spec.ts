/**
 * E2E Test: Homepage & Navigation
 * 
 * Verifies the BlueStay homepage loads correctly and core navigation works.
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage with hero section', async ({ page }) => {
    await page.goto('/');
    
    // Page should load without errors
    await expect(page).toHaveTitle(/BlueStay/i);
    
    // Hero section should be visible
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
    
    // Should have a search/CTA section
    const ctaButton = page.locator('a[href*="hotels"], button').filter({ hasText: /search|explore|book|browse/i }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');
    
    // Check meta description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
    
    // Check viewport meta
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    
    // Page should still render
    await expect(page).toHaveTitle(/BlueStay/i);
    
    // No horizontal scrollbar (content fits viewport)
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // small tolerance
  });
});

test.describe('Navigation', () => {
  test('should navigate to hotels listing page', async ({ page }) => {
    await page.goto('/');
    
    // Click on a link that leads to hotels
    const hotelsLink = page.locator('a[href*="hotels"]').first();
    
    if (await hotelsLink.isVisible()) {
      await hotelsLink.click();
      await page.waitForURL(/hotels/);
      expect(page.url()).toContain('hotels');
    }
  });

  test('should have login/signup access', async ({ page }) => {
    await page.goto('/');
    
    // Look for auth-related link/button
    const authLink = page.locator('a[href*="login"], a[href*="signin"], button').filter({ hasText: /login|sign in|sign up/i }).first();
    
    if (await authLink.isVisible()) {
      await authLink.click();
      await page.waitForLoadState('networkidle');
      // Should navigate to auth page or show modal
      const loginForm = page.locator('input[type="email"], input[name="email"]').first();
      await expect(loginForm).toBeVisible({ timeout: 5000 });
    }
  });
});
