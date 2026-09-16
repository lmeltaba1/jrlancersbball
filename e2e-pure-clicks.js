// E2E Pure Click Simulation - NO backend manipulation
// Time is controlled by SIMULATED_DATE in app.js (deployed)
// This script ONLY clicks like a real user

const { chromium } = require('playwright');

const BASE_URL = 'https://lancers-bball.web.app';

// Test accounts
const ACCOUNTS = {
  coach: { email: 'lmeltabarger@icloud.com', password: 'Iloveyou24' },
  scorekeeper: { email: 'mindy.m.carney@gmail.com', password: 'test123' },
  parent: { email: 'brittany28@aol.com', password: 'LancersTest123!' },
  viewer: { email: 'maureen.trott@att.net', password: 'LancersView123!' }
};

// Screenshot helper
const fs = require('fs');
const SCREENSHOT_DIR = '/tmp/lancers-e2e-pure';
let screenshotCounter = 0;

function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, name, label, role) {
  screenshotCounter++;
  const filename = `${String(screenshotCounter).padStart(2, '0')}-${role}-${name}.png`;
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${filename}` });
  console.log(`  📸 [${role}] ${label}`);
}

// Login
async function login(page, email, password, role) {
  console.log(`  Logging in as ${role}...`);
  await page.goto(`${BASE_URL}/login.html`);
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log(`    ✓ Logged in as ${role}`);
}

async function runSimulation() {
  console.log('🚀 E2E Pure Click Simulation');
  console.log('============================');
  console.log('NO backend manipulation - clicks only\n');

  ensureDir();

  // Create browser windows
  const windowWidth = 420;
  const windowHeight = 800;
  const browsers = {};
  const pages = {};

  console.log('📱 Creating browser windows...\n');

  const roles = ['coach', 'scorekeeper', 'parent', 'viewer'];
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    browsers[role] = await chromium.launch({
      headless: false,
      args: [`--window-position=${i * windowWidth},50`, `--window-size=${windowWidth},${windowHeight}`]
    });
    const context = await browsers[role].newContext({
      viewport: { width: windowWidth - 20, height: windowHeight - 100 }
    });
    pages[role] = await context.newPage();
  }

  try {
    // Login all users
    console.log('🔐 Logging in...');
    for (const role of roles) {
      await login(pages[role], ACCOUNTS[role].email, ACCOUNTS[role].password, role);
    }

    // Take initial screenshots
    console.log('\n📋 HOME PAGE');
    for (const role of roles) {
      await pages[role].goto(BASE_URL);
      await pages[role].waitForTimeout(2000);
      await screenshot(pages[role], 'home', 'Home page', role);
    }

    // Scorekeeper goes to game stats via notification or nav
    console.log('\n🏀 GAME TRACKING');

    // Click on the live stats button/notification on home page
    const liveBtn = await pages.scorekeeper.$('a[href*="game-stats"]');
    if (liveBtn) {
      await liveBtn.click();
      await pages.scorekeeper.waitForTimeout(3000);
      await screenshot(pages.scorekeeper, 'game-stats', 'Game stats page', 'scorekeeper');
    } else {
      // Navigate directly
      await pages.scorekeeper.goto(`${BASE_URL}/game-stats.html?game=6`);
      await pages.scorekeeper.waitForTimeout(3000);
      await screenshot(pages.scorekeeper, 'game-stats', 'Game stats page', 'scorekeeper');
    }

    // Parent and viewer go to follow
    await pages.parent.goto(`${BASE_URL}/game-stats.html?game=6`);
    await pages.parent.waitForTimeout(2000);
    await screenshot(pages.parent, 'following', 'Following game', 'parent');

    await pages.viewer.goto(`${BASE_URL}/game-stats.html?game=6`);
    await pages.viewer.waitForTimeout(2000);
    await screenshot(pages.viewer, 'following', 'Following game', 'viewer');

    // Scorekeeper clicks START GAME
    console.log('  Clicking START GAME...');
    const startBtn = await pages.scorekeeper.$('#phaseBtn');
    if (startBtn) {
      const btnText = await startBtn.textContent();
      console.log(`    Button text: "${btnText}"`);
      await startBtn.scrollIntoViewIfNeeded();
      await startBtn.click();
      await pages.scorekeeper.waitForTimeout(2000);
      await screenshot(pages.scorekeeper, 'game-started', 'Game started', 'scorekeeper');
    } else {
      console.log('    ⚠️ No START GAME button found');
    }

    // Check if player cards appeared
    const playerCards = await pages.scorekeeper.$$('#court-players .player-card');
    console.log(`  Found ${playerCards.length} player cards`);

    if (playerCards.length > 0) {
      // Click +2 on first player
      console.log('  Recording stats...');
      const firstCard = playerCards[0];
      const plus2Btn = await firstCard.$('button:has-text("+2")');
      if (plus2Btn) {
        await plus2Btn.click();
        await pages.scorekeeper.waitForTimeout(500);
        console.log('    ✓ Clicked +2');
      }

      // Click +3 on second player
      if (playerCards.length > 1) {
        const secondCard = playerCards[1];
        const plus3Btn = await secondCard.$('button:has-text("+3")');
        if (plus3Btn) {
          await plus3Btn.click();
          await pages.scorekeeper.waitForTimeout(500);
          console.log('    ✓ Clicked +3');
        }
      }

      // Click opponent +2
      const oppBtn = await pages.scorekeeper.$('.opponent-row button:has-text("+2")');
      if (oppBtn) {
        await oppBtn.click();
        await pages.scorekeeper.waitForTimeout(500);
        console.log('    ✓ Clicked Opp +2');
      }

      await screenshot(pages.scorekeeper, 'stats-recorded', 'Stats recorded', 'scorekeeper');

      // Check viewers see updates
      await pages.parent.waitForTimeout(2000);
      await pages.viewer.waitForTimeout(2000);
      await screenshot(pages.parent, 'sees-stats', 'Parent sees stats', 'parent');
      await screenshot(pages.viewer, 'sees-stats', 'Viewer sees stats', 'viewer');

      // Advance through quarters
      for (const quarter of ['Q2', 'Halftime', 'Q3', 'Q4']) {
        console.log(`  Advancing to ${quarter}...`);
        const phaseBtn = await pages.scorekeeper.$('#phaseBtn');
        if (phaseBtn) {
          await phaseBtn.scrollIntoViewIfNeeded();
          await phaseBtn.click();
          await pages.scorekeeper.waitForTimeout(1500);
        }

        // Record a stat each quarter
        const cards = await pages.scorekeeper.$$('#court-players .player-card');
        if (cards.length > 0) {
          const btn = await cards[0].$('button:has-text("+2")');
          if (btn) await btn.click();
          await pages.scorekeeper.waitForTimeout(300);
        }
      }

      await screenshot(pages.scorekeeper, 'q4', 'Q4 stats', 'scorekeeper');

      // End game
      console.log('  Ending game...');
      pages.scorekeeper.once('dialog', d => d.accept());
      const endBtn = await pages.scorekeeper.$('#endBtn');
      if (endBtn) {
        await endBtn.scrollIntoViewIfNeeded();
        await endBtn.click();
        await pages.scorekeeper.waitForTimeout(2000);
      }
      await screenshot(pages.scorekeeper, 'game-ended', 'Game ended', 'scorekeeper');

      // Get final score
      const lancersScore = await pages.scorekeeper.$eval('#lancers-score', el => el.textContent).catch(() => '?');
      const oppScore = await pages.scorekeeper.$eval('#opponent-score', el => el.textContent).catch(() => '?');
      console.log(`\n✅ Final Score: Lancers ${lancersScore} - Rockets ${oppScore}`);
    }

    console.log(`\n📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('\n⏳ Browsers open for inspection. Press Ctrl+C to close.');
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

runSimulation().catch(console.error);
