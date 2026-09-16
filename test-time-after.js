/**
 * Test - set time AFTER navigating, then refresh
 */
const { chromium } = require('playwright');

async function test() {
  console.log('Testing time set AFTER navigation...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Login as coach
  console.log('Logging in as coach...');
  await page.goto('https://lancers-bball.web.app/login.html');
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', 'lmeltabarger@icloud.com');
  await page.fill('input[type="password"]', 'Iloveyou24');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  // Navigate to game stats FIRST (no time set yet)
  console.log('Going to game-stats...');
  await page.goto('https://lancers-bball.web.app/game-stats.html?game=5');
  await page.waitForTimeout(3000);

  // Check player cards BEFORE setting time
  let cards = await page.$$('#court-players .player-card');
  console.log(`Player cards BEFORE time set: ${cards.length}`);

  // NOW set the simulated time
  console.log('Setting simulated time...');
  await page.evaluate(() => {
    localStorage.setItem('simulatedDateTime', '2026-12-19T09:00:00');
  });

  // Refresh to apply
  console.log('Refreshing page...');
  await page.reload();
  await page.waitForTimeout(5000);

  // Check again
  cards = await page.$$('#court-players .player-card');
  console.log(`Player cards AFTER time set + refresh: ${cards.length}`);

  console.log('Browser open. Ctrl+C to close.');
  await new Promise(() => {});
}

test().catch(console.error);
