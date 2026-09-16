/**
 * Raw test - NO localStorage manipulation at all
 * Just login and navigate, see what happens
 */
const { chromium } = require('playwright');

async function test() {
  console.log('Opening browser - NO JS manipulation...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Login as coach (who can track anytime)
  console.log('Logging in as coach...');
  await page.goto('https://lancers-bball.web.app/login.html');
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', 'lmeltabarger@icloud.com');
  await page.fill('input[type="password"]', 'Iloveyou24');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log('Logged in');

  // Navigate to game stats - NO time manipulation
  console.log('Going to game-stats for game 5...');
  await page.goto('https://lancers-bball.web.app/game-stats.html?game=5');

  console.log('Waiting for page...');
  await page.waitForTimeout(8000);

  // Check player cards
  const cards = await page.$$('#court-players .player-card');
  console.log(`Player cards found: ${cards.length}`);

  console.log('Browser open - check it manually. Ctrl+C to close.');
  await new Promise(() => {});
}

test().catch(console.error);
