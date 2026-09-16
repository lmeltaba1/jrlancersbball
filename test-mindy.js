/**
 * Test with Mindy specifically
 */
const { chromium } = require('playwright');

async function test() {
  console.log('Testing with Mindy...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Login as Mindy
  console.log('Logging in as Mindy...');
  await page.goto('https://lancers-bball.web.app/login.html');
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', 'mindy.m.carney@gmail.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  // Set simulated time (game time - when Mindy should be able to track)
  console.log('Setting simulated time to game time...');
  await page.evaluate(() => {
    localStorage.setItem('simulatedDateTime', '2026-12-19T09:00:00');
  });

  // Navigate to game stats
  console.log('Going to game-stats...');
  await page.goto('https://lancers-bball.web.app/game-stats.html?game=5');
  await page.waitForTimeout(5000);

  // Check player cards
  const cards = await page.$$('#court-players .player-card');
  console.log(`Player cards: ${cards.length}`);

  // Check if in view-only mode
  const isViewOnly = await page.evaluate(() => document.body.classList.contains('view-only-mode'));
  console.log(`View-only mode: ${isViewOnly}`);

  console.log('Browser open. Ctrl+C to close.');
  await new Promise(() => {});
}

test().catch(console.error);
