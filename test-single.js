/**
 * Simple test - just one browser, one user, see if player cards render
 */
const { chromium } = require('playwright');

const BASE_URL = 'https://lancers-bball.web.app';

async function test() {
  console.log('Opening single browser as scorekeeper...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 500, height: 800 } });
  const page = await context.newPage();

  // Login as Mindy
  console.log('Logging in as Mindy...');
  await page.goto(`${BASE_URL}/login.html`);
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'mindy.m.carney@gmail.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('Logged in');

  // Set simulated time to game time
  console.log('Setting simulated time to game day...');
  await page.evaluate(() => {
    localStorage.setItem('simulatedDateTime', '2026-12-19T09:00:00');
  });

  // Go to game stats for game 5
  console.log('Navigating to game-stats...');
  await page.goto(`${BASE_URL}/game-stats.html?game=5`);

  // Wait a long time for everything to load
  console.log('Waiting 10 seconds for page to fully initialize...');
  await page.waitForTimeout(10000);

  // Check what we have
  const playerCards = await page.$$('#court-players .player-card');
  console.log(`Found ${playerCards.length} player cards`);

  // Take screenshot
  await page.screenshot({ path: '/tmp/test-single.png' });
  console.log('Screenshot saved to /tmp/test-single.png');

  // Keep open for inspection
  console.log('Browser open for inspection. Ctrl+C to close.');
  await new Promise(() => {});
}

test().catch(console.error);
