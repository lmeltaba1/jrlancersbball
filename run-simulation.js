/**
 * Run season simulation via browser automation
 */
const { chromium } = require('playwright');

async function runSimulation() {
  console.log('Running season simulation...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-position=50,50', '--window-size=600,900']
  });

  const context = await browser.newContext({ viewport: { width: 580, height: 850 } });
  const page = await context.newPage();

  // Login as coach (Mel)
  console.log('Logging in as coach (Mel)...');
  await page.goto('https://lancers-bball.web.app/login.html');
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', 'lmeltabarger@icloud.com');
  await page.fill('input[type="password"]', 'Iloveyou24');
  await page.click('button[type="submit"]');

  // Wait for redirect to index.html (login success)
  console.log('  Waiting for login redirect...');
  await page.waitForURL('**/index.html', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Check if we're on index
  const url = page.url();
  console.log(`  Current URL: ${url}`);
  if (!url.includes('index.html')) {
    console.log('  ⚠️ Login may have failed');
  } else {
    console.log('  ✓ Logged in successfully');
  }

  // Go to simulate-season page
  console.log('\nNavigating to simulate-season.html...');
  await page.goto('https://lancers-bball.web.app/simulate-season.html');
  await page.waitForTimeout(3000);

  // Click "Run Full Simulation" button
  console.log('Looking for simulation button...');
  const runBtn = await page.$('button:has-text("Run Full Simulation")');
  if (runBtn) {
    console.log('Clicking "Run Full Simulation"...');
    await runBtn.click();
    console.log('  ✓ Simulation started');

    // Wait for simulation to complete - look for status updates
    console.log('  Waiting for simulation to complete (up to 60s)...');

    // Poll for completion
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(2000);
      const status = await page.$eval('#status', el => el.textContent).catch(() => '');
      if (status.includes('Complete') || status.includes('Error') || status.includes('Done')) {
        console.log(`  Status: ${status}`);
        break;
      }
      if (i % 5 === 0) {
        console.log(`  ...waiting (${status || 'running'})`);
      }
    }
  } else {
    console.log('  ⚠️ Run Full Simulation button not found');
    // Take screenshot to debug
    await page.screenshot({ path: 'simulate-page.png' });
    console.log('  Screenshot saved to simulate-page.png');
  }

  // Set simulated time BEFORE navigating (store in context)
  console.log('\nSetting simulated time to game time (Dec 19, 9:00 AM)...');

  // Now go to game-stats to check the buttons
  console.log('Navigating to game-stats...');
  await page.goto('https://lancers-bball.web.app/game-stats.html?game=5');
  await page.waitForTimeout(2000);

  // Set simulated time after page loads
  await page.evaluate(() => localStorage.setItem('simulatedDateTime', '2026-12-19T09:00:00'));
  await page.reload();
  await page.waitForTimeout(4000);

  // Take a screenshot
  await page.screenshot({ path: 'game-stats-buttons.png' });
  console.log('  ✓ Screenshot saved to game-stats-buttons.png');

  console.log('\nBrowser open for inspection. Ctrl+C to close.');
  await new Promise(() => {});
}

runSimulation().catch(console.error);
