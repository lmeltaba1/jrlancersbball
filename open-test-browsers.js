/**
 * Open 3 browsers with different logged-in users for manual testing
 */
const { chromium } = require('playwright');

const USERS = [
  { name: 'Mindy (Scorekeeper)', email: 'mindy.m.carney@gmail.com', password: 'test123', x: 0 },
  { name: 'Brittany (Parent)', email: 'brittany28@aol.com', password: 'LancersTest123!', x: 520 },
  { name: 'Maureen (Viewer)', email: 'maureen.trott@att.net', password: 'LancersView123!', x: 1040 }
];

async function openBrowsers() {
  console.log('Opening 3 test browsers...\n');

  for (const user of USERS) {
    const browser = await chromium.launch({
      headless: false,
      args: [`--window-position=${user.x},50`, '--window-size=500,850']
    });

    const context = await browser.newContext({ viewport: { width: 480, height: 800 } });
    const page = await context.newPage();

    console.log(`Logging in ${user.name}...`);
    await page.goto('https://lancers-bball.web.app/login.html');
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    await page.goto('https://lancers-bball.web.app/index.html');
    await page.waitForTimeout(1500);

    console.log(`  ✓ ${user.name} ready`);
  }

  console.log('\n✅ All 3 browsers open and logged in!');
  console.log('Simulated time set to Dec 13, 4:30 PM (Game 4 vs Celtics - Mindy scorekeeping)');
  console.log('\nPress Ctrl+C when done testing.');

  // Keep script running
  await new Promise(() => {});
}

openBrowsers().catch(console.error);
