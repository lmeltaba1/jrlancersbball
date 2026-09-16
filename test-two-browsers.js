/**
 * Two browser test - scorekeeper + viewer
 * Focus on game tracking only
 */
const { chromium } = require('playwright');

async function test() {
  console.log('Two browser test - scorekeeper + viewer\n');

  // Launch two separate browsers with taller viewport to avoid bottom nav overlap
  const browser1 = await chromium.launch({
    headless: false,
    args: ['--window-position=0,50', '--window-size=500,900']
  });
  const browser2 = await chromium.launch({
    headless: false,
    args: ['--window-position=520,50', '--window-size=500,900']
  });

  const context1 = await browser1.newContext({ viewport: { width: 480, height: 850 } });
  const context2 = await browser2.newContext({ viewport: { width: 480, height: 850 } });
  const scorekeeper = await context1.newPage();
  const viewer = await context2.newPage();

  // Login scorekeeper (Mindy)
  console.log('Logging in scorekeeper (Mindy)...');
  await scorekeeper.goto('https://lancers-bball.web.app/login.html');
  await scorekeeper.waitForTimeout(1500);
  await scorekeeper.fill('input[type="email"]', 'mindy.m.carney@gmail.com');
  await scorekeeper.fill('input[type="password"]', 'test123');
  await scorekeeper.click('button[type="submit"]');
  await scorekeeper.waitForTimeout(3000);
  console.log('  ✓ Scorekeeper logged in');

  // Login viewer
  console.log('Logging in viewer (Maureen)...');
  await viewer.goto('https://lancers-bball.web.app/login.html');
  await viewer.waitForTimeout(1500);
  await viewer.fill('input[type="email"]', 'maureen.trott@att.net');
  await viewer.fill('input[type="password"]', 'LancersView123!');
  await viewer.click('button[type="submit"]');
  await viewer.waitForTimeout(3000);
  console.log('  ✓ Viewer logged in');

  // Set simulated time on both browsers
  console.log('\nSetting simulated time to game time (Dec 19, 9:00 AM)...');
  await scorekeeper.evaluate(() => localStorage.setItem('simulatedDateTime', '2026-12-19T09:00:00'));
  await viewer.evaluate(() => localStorage.setItem('simulatedDateTime', '2026-12-19T09:00:00'));

  // Scorekeeper goes to game-stats
  console.log('\nScorekeeper navigating to game-stats...');
  await scorekeeper.goto('https://lancers-bball.web.app/game-stats.html?game=5');
  await scorekeeper.waitForTimeout(5000);

  // Check player cards on scorekeeper
  let cards = await scorekeeper.$$('#court-players .player-card');
  console.log(`  Scorekeeper player cards: ${cards.length}`);

  // Viewer goes to game-stats
  console.log('Viewer navigating to game-stats...');
  await viewer.goto('https://lancers-bball.web.app/game-stats.html?game=5');
  await viewer.waitForTimeout(3000);

  // If scorekeeper has cards, click START GAME
  if (cards.length > 0) {
    console.log('\nClicking START GAME...');
    const startBtn = await scorekeeper.$('#phaseBtn');
    if (startBtn) {
      await startBtn.click();
      await scorekeeper.waitForTimeout(2000);
      console.log('  ✓ Game started');

      // Click +2 on first player
      cards = await scorekeeper.$$('#court-players .player-card');
      if (cards.length > 0) {
        const plus2 = await cards[0].$('button:has-text("+2")');
        if (plus2) {
          await plus2.click();
          console.log('  ✓ Clicked +2 on first player');
          await scorekeeper.waitForTimeout(1000);
        }
      }

      // Check viewer sees update
      await viewer.waitForTimeout(2000);
      const viewerScore = await viewer.$eval('#lancers-score', el => el.textContent).catch(() => '?');
      console.log(`  Viewer sees score: ${viewerScore}`);
    }
  } else {
    console.log('  ⚠️ No player cards found!');
  }

  console.log('\nBrowsers open for inspection. Ctrl+C to close.');
  await new Promise(() => {});
}

test().catch(console.error);
