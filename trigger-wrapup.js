/**
 * Login as head coach and trigger wrap-up generation
 */
const { chromium } = require('playwright');

async function triggerWrapup() {
  console.log('Opening browser as head coach to trigger wrap-up...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-position=100,100', '--window-size=600,800']
  });

  const context = await browser.newContext({ viewport: { width: 580, height: 750 } });
  const page = await context.newPage();

  // Login as head coach
  console.log('Logging in as head coach...');
  await page.goto('https://lancers-bball.web.app/login.html');
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', 'lmeltabarger@icloud.com');
  await page.fill('input[type="password"]', 'Iloveyou24');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  console.log('  ✓ Logged in as head coach');

  // Set simulated time
  await page.evaluate(() => localStorage.setItem('simulatedDateTime', '2026-12-19T12:30:00'));

  // Go to game 5 detail page
  console.log('\nNavigating to game 5 detail page...');
  await page.goto('https://lancers-bball.web.app/game-detail.html?id=5');
  await page.waitForTimeout(3000);

  // Look for "Generate Wrap-up" or similar button
  const generateBtn = await page.$('button:has-text("Generate"), button:has-text("Wrap")');
  if (generateBtn) {
    console.log('Found wrap-up button, clicking...');
    await generateBtn.click();
    await page.waitForTimeout(5000);
    console.log('  ✓ Triggered wrap-up generation');
  } else {
    console.log('No generate button found. Checking wrap-up status...');
    // Take screenshot to see current state
    await page.screenshot({ path: 'game-detail-wrapup.png' });
    console.log('  Screenshot saved to game-detail-wrapup.png');
  }

  console.log('\nBrowser open for manual interaction. Ctrl+C to close.');
  await new Promise(() => {});
}

triggerWrapup().catch(console.error);
