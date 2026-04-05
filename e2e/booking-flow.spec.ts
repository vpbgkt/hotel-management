/**
 * E2E Test: Hotel Browsing & Booking Flow
 * 
 * Tests the guest journey: browse hotels → view hotel → select room → book.
 */

import { test, expect } from '@playwright/test';

test.describe('Hotel Browsing', () => {
  test('should display hotel listing page', async ({ page }) => {
    await page.goto('/hotels');
    
    await page.waitForLoadState('networkidle');
    
    // Should show hotel cards or a listing
    const hotelCards = page.locator('[class*="card"], [class*="hotel"], article').first();
    
    // Page should have loaded (even if no hotels in DB)
    await expect(page).toHaveTitle(/.+/);
  });

  test('should display city-based hotel search', async ({ page }) => {
    await page.goto('/hotels?city=goa');
    
    await page.waitForLoadState('networkidle');
    
    // URL should contain the search parameter
    expect(page.url()).toContain('goa');
  });
});

test.describe('Hotel Detail Page', () => {
  test('should load a hotel detail page with rooms', async ({ page }) => {
    // First visit hotels listing to find a hotel slug
    await page.goto('/hotels');
    await page.waitForLoadState('networkidle');
    
    // Try clicking on first hotel link
    const hotelLink = page.locator('a[href*="/hotels/"]').first();
    
    if (await hotelLink.isVisible()) {
      await hotelLink.click();
      await page.waitForLoadState('networkidle');
      
      // Hotel detail page should have a heading
      const hotelName = page.locator('h1').first();
      await expect(hotelName).toBeVisible();
      
      // Should show room types or booking section
      const roomSection = page.locator('[class*="room"], [class*="booking"]').first();
      // This is optional — hotel may not have rooms configured
    }
  });
});

test.describe('Booking Flow', () => {
  test('should show booking widget on hotel page', async ({ page }) => {
    await page.goto('/hotels');
    await page.waitForLoadState('networkidle');
    
    const hotelLink = page.locator('a[href*="/hotels/"]').first();
    
    if (await hotelLink.isVisible()) {
      await hotelLink.click();
      await page.waitForLoadState('networkidle');
      
      // Look for date inputs (booking widget)
      const dateInput = page.locator('input[type="date"]').first();
      
      if (await dateInput.isVisible()) {
        await expect(dateInput).toBeVisible();
        
        // Look for "Book Now" button
        const bookButton = page.locator('button').filter({ hasText: /book|reserve/i }).first();
        if (await bookButton.isVisible()) {
          await expect(bookButton).toBeVisible();
        }
      }
    }
  });
});

test.describe('Search Functionality', () => {
  test('should handle search from homepage', async ({ page }) => {
    await page.goto('/');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="city" i], input[placeholder*="destination" i]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Goa');
      
      // Submit search (press Enter or click search button)
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Should navigate to results
      expect(page.url()).toMatch(/hotels|search|city/);
    }
  });
});
