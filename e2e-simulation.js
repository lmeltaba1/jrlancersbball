/**
 * Jr. Lancers E2E Simulation
 *
 * Simple simulation that clicks through the app like a real user.
 * Only JS we use: setting simulated date/time in localStorage
 * Everything else: click buttons, refresh pages, take screenshots
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://lancers-bball.web.app';
const SCREENSHOT_DIR = '/tmp/lancers-e2e-simulation';

// Test accounts
const ACCOUNTS = {
  coach: { email: 'lmeltabarger@icloud.com', password: 'Iloveyou24' },
  scorekeeper: { email: 'mindy.m.carney@gmail.com', password: 'test123' },
  parent: { email: 'brittany28@aol.com', password: 'LancersTest123!' },
  viewer: { email: 'maureen.trott@att.net', password: 'LancersView123!' }
};

// Game 6: Dec 20, 2026 3:00 PM vs Rockets (Mindy is scorekeeper for this game)
const TEST_GAME = {
  id: 6,
  opponent: 'Rockets',
  date: '2026-12-20',
  time: '3:00 PM'
};

// Simulated times
const SIM_TIMES = {
  attendanceReminder: '2026-12-16T09:00:00',  // 4 days before
  volunteerReminder: '2026-12-18T09:00:00',   // 2 days before
  gameDay: '2026-12-20T14:50:00',             // 10 min before game
  gameStart: '2026-12-20T15:00:00',           // Game time (3:00 PM)
  gameEnd: '2026-12-20T15:45:00',             // After game
  postGame: '2026-12-20T16:30:00'             // Highlights/wrapup time
};

let screenshotCounter = 0;

function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  // Clear old screenshots
  const files = fs.readdirSync(SCREENSHOT_DIR);
  for (const file of files) {
    if (file.endsWith('.png')) {
      fs.unlinkSync(path.join(SCREENSHOT_DIR, file));
    }
  }
}

async function screenshot(page, name, description, role) {
  screenshotCounter++;
  const filename = `${String(screenshotCounter).padStart(2, '0')}-${role}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
  console.log(`  📸 [${role}] ${name}`);
}

// Set simulated time in localStorage (the ONLY JS manipulation we do)
async function setTime(page, isoDateTime) {
  await page.evaluate((dt) => {
    localStorage.setItem('simulatedDateTime', dt);
  }, isoDateTime);
}

// Set time on all pages
async function setTimeAll(pages, isoDateTime) {
  console.log(`  ⏰ Setting time to: ${isoDateTime}`);
  for (const page of Object.values(pages)) {
    await setTime(page, isoDateTime);
  }
}

// Refresh all pages
async function refreshAll(pages) {
  console.log('  🔄 Refreshing all pages...');
  await Promise.all(Object.values(pages).map(p => p.reload()));
  await Promise.all(Object.values(pages).map(p => p.waitForTimeout(2000)));
}

// Login a user
async function login(page, email, password, role) {
  console.log(`  Logging in as ${role} (${email})...`);
  await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log(`    ✓ Logged in`);
}

// ============================================
// MAIN SIMULATION
// ============================================
async function runSimulation() {
  console.log('🚀 Jr. Lancers E2E Simulation');
  console.log('================================');
  console.log('Simple click-through simulation - no JS manipulation except time');
  console.log(`Test Game: #${TEST_GAME.id} vs ${TEST_GAME.opponent} on ${TEST_GAME.date}\n`);

  ensureScreenshotDir();

  // Create 4 browser windows
  const windowWidth = 400;
  const windowHeight = 720;
  const roles = Object.keys(ACCOUNTS);
  const browsers = {};
  const pages = {};

  console.log('📱 Creating 4 browser windows...');
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
    // ============================================
    // LOGIN ALL USERS
    // ============================================
    console.log('\n🔐 Logging in all users...');
    for (const [role, account] of Object.entries(ACCOUNTS)) {
      await login(pages[role], account.email, account.password, role);
    }

    // ============================================
    // PHASE 1: ATTENDANCE (4 days before game)
    // ============================================
    console.log('\n📋 PHASE 1: ATTENDANCE REMINDERS');
    await setTimeAll(pages, SIM_TIMES.attendanceReminder);
    await refreshAll(pages);

    // Parent goes to home, should see RSVP reminder
    await screenshot(pages.parent, 'home', 'Home with RSVP reminder', 'parent');

    // Parent clicks schedule, finds the game
    await pages.parent.click('nav a[href="schedule.html"]');
    await pages.parent.waitForTimeout(2000);
    await screenshot(pages.parent, 'schedule', 'Schedule page', 'parent');

    // Parent clicks on Game 5 (Thunder) - use game card ID selector
    await pages.parent.click(`#event-${TEST_GAME.id}`);
    await pages.parent.waitForTimeout(2000);
    await screenshot(pages.parent, 'game-detail', 'Game detail page', 'parent');

    // Click Attendance tab/section if visible
    const attendanceTab = await pages.parent.$('text=Attendance');
    if (attendanceTab) {
      await attendanceTab.click();
      await pages.parent.waitForTimeout(1000);
    }

    // Find and click "I'm Attending" or RSVP button
    const attendingBtn = await pages.parent.$('button:has-text("Attending")');
    if (attendingBtn) {
      await attendingBtn.click();
      await pages.parent.waitForTimeout(1500);
      await screenshot(pages.parent, 'rsvp-submitted', 'RSVP submitted', 'parent');
      console.log('    ✓ Parent submitted RSVP');
    } else {
      console.log('    (No RSVP button - may already have responded)');
      await screenshot(pages.parent, 'rsvp-submitted', 'Attendance view', 'parent');
    }

    // ============================================
    // PHASE 2: VOLUNTEER SIGNUP (2 days before)
    // ============================================
    console.log('\n✋ PHASE 2: VOLUNTEER SIGNUP');
    await setTimeAll(pages, SIM_TIMES.volunteerReminder);
    await refreshAll(pages);

    // Scorekeeper goes to schedule page
    await pages.scorekeeper.click('nav a[href="schedule.html"]');
    await pages.scorekeeper.waitForTimeout(2000);

    // Click on Game 5 using ID selector
    await pages.scorekeeper.click(`#event-${TEST_GAME.id}`);
    await pages.scorekeeper.waitForTimeout(2000);
    await screenshot(pages.scorekeeper, 'game-detail-sk', 'Scorekeeper on game detail', 'scorekeeper');

    // Find volunteers section
    const volunteersTab = await pages.scorekeeper.$('text=Volunteers');
    if (volunteersTab) {
      await volunteersTab.click();
      await pages.scorekeeper.waitForTimeout(1000);
    }

    await screenshot(pages.scorekeeper, 'volunteers-page', 'Volunteers page', 'scorekeeper');

    // Sign up as scorekeeper - look for any Sign Up button
    const signUpBtn = await pages.scorekeeper.$('button:has-text("Sign Up")');
    if (signUpBtn) {
      await signUpBtn.click();
      await pages.scorekeeper.waitForTimeout(1500);
      await screenshot(pages.scorekeeper, 'signed-up', 'Signed up as volunteer', 'scorekeeper');
      console.log('    ✓ Mindy signed up as volunteer');
    } else {
      console.log('    (No Sign Up button available)');
      await screenshot(pages.scorekeeper, 'signed-up', 'Volunteer view', 'scorekeeper');
    }

    // ============================================
    // PHASE 3: GAME DAY - LIVE TRACKING
    // ============================================
    console.log('\n🏀 PHASE 3: GAME DAY - LIVE TRACKING');
    await setTimeAll(pages, SIM_TIMES.gameStart);
    await refreshAll(pages);

    // Scorekeeper goes to game stats
    await pages.scorekeeper.goto(`${BASE_URL}/game-stats.html?game=${TEST_GAME.id}`);
    await pages.scorekeeper.waitForTimeout(3000);
    await screenshot(pages.scorekeeper, 'game-stats-loaded', 'Game stats page loaded', 'scorekeeper');

    // Parent and viewer go to follow live
    await pages.parent.goto(`${BASE_URL}/game-stats.html?game=${TEST_GAME.id}`);
    await pages.parent.waitForTimeout(2000);
    await pages.viewer.goto(`${BASE_URL}/game-stats.html?game=${TEST_GAME.id}`);
    await pages.viewer.waitForTimeout(2000);

    await screenshot(pages.parent, 'following-live', 'Parent following live', 'parent');
    await screenshot(pages.viewer, 'following-live', 'Viewer following live', 'viewer');

    // Scorekeeper clicks START GAME (scroll into view first)
    console.log('  Scorekeeper clicking START GAME...');
    await pages.scorekeeper.evaluate(() => document.querySelector('#phaseBtn').scrollIntoView());
    await pages.scorekeeper.click('#phaseBtn');
    await pages.scorekeeper.waitForTimeout(2000);
    console.log('    ✓ Game started');
    await screenshot(pages.scorekeeper, 'game-started', 'Game started - Q1', 'scorekeeper');

    // Wait for parent/viewer to see the update
    await pages.parent.waitForTimeout(2000);
    await pages.viewer.waitForTimeout(2000);
    await screenshot(pages.parent, 'parent-q1', 'Parent sees Q1 started', 'parent');
    await screenshot(pages.viewer, 'viewer-q1', 'Viewer sees Q1 started', 'viewer');

    // Record some Q1 stats by clicking actual buttons
    console.log('  Recording Q1 stats...');

    // Get player card IDs (format: "card-{playerId}")
    const playerCardIds = await pages.scorekeeper.$$eval('#court-players .player-card', cards =>
      cards.map(c => c.id).filter(id => id.startsWith('card-'))
    );
    console.log(`    Found ${playerCardIds.length} player cards`);

    if (playerCardIds.length > 0) {
      // Click +2 on first player
      await pages.scorekeeper.click(`#${playerCardIds[0]} button:has-text("+2")`);
      await pages.scorekeeper.waitForTimeout(500);
      console.log('    Clicked +2');

      // Click +3 on second player
      if (playerCardIds.length > 1) {
        await pages.scorekeeper.click(`#${playerCardIds[1]} button:has-text("+3")`);
        await pages.scorekeeper.waitForTimeout(500);
        console.log('    Clicked +3');
      }

      // Click R (rebound) on third player
      if (playerCardIds.length > 2) {
        await pages.scorekeeper.click(`#${playerCardIds[2]} button:has-text("R")`);
        await pages.scorekeeper.waitForTimeout(500);
        console.log('    Clicked R (rebound)');
      }

      // Click opponent +2
      await pages.scorekeeper.click('.opponent-row button:has-text("+2")');
      await pages.scorekeeper.waitForTimeout(500);
      console.log('    Clicked Opp +2');
    }

    await screenshot(pages.scorekeeper, 'q1-stats', 'Q1 stats recorded', 'scorekeeper');

    // Check parent/viewer see updates
    await pages.parent.waitForTimeout(2000);
    await screenshot(pages.parent, 'parent-sees-stats', 'Parent sees Q1 stats', 'parent');
    await screenshot(pages.viewer, 'viewer-sees-stats', 'Viewer sees Q1 stats', 'viewer');

    // Advance to Q2 - scroll phaseBtn into view first
    console.log('  Advancing to Q2...');
    await pages.scorekeeper.evaluate(() => document.querySelector('#phaseBtn').scrollIntoView());
    await pages.scorekeeper.click('#phaseBtn');
    await pages.scorekeeper.waitForTimeout(1000);

    // Record some Q2 stats
    const q2CardIds = await pages.scorekeeper.$$eval('#court-players .player-card', cards =>
      cards.map(c => c.id).filter(id => id.startsWith('card-'))
    );
    if (q2CardIds.length > 0) {
      await pages.scorekeeper.click(`#${q2CardIds[0]} button:has-text("+2")`);
    }
    await pages.scorekeeper.waitForTimeout(300);
    await screenshot(pages.scorekeeper, 'q2-stats', 'Q2 stats', 'scorekeeper');

    // Halftime
    console.log('  Halftime...');
    await pages.scorekeeper.evaluate(() => document.querySelector('#phaseBtn').scrollIntoView());
    await pages.scorekeeper.click('#phaseBtn');
    await pages.scorekeeper.waitForTimeout(1000);
    await screenshot(pages.scorekeeper, 'halftime', 'Halftime', 'scorekeeper');

    // Q3
    console.log('  Starting Q3...');
    await pages.scorekeeper.evaluate(() => document.querySelector('#phaseBtn').scrollIntoView());
    await pages.scorekeeper.click('#phaseBtn');
    await pages.scorekeeper.waitForTimeout(1000);
    const q3CardIds = await pages.scorekeeper.$$eval('#court-players .player-card', cards =>
      cards.map(c => c.id).filter(id => id.startsWith('card-'))
    );
    if (q3CardIds.length > 0) {
      await pages.scorekeeper.click(`#${q3CardIds[0]} button:has-text("+2")`);
    }
    await screenshot(pages.scorekeeper, 'q3-stats', 'Q3 stats', 'scorekeeper');

    // Q4
    console.log('  Starting Q4...');
    await pages.scorekeeper.evaluate(() => document.querySelector('#phaseBtn').scrollIntoView());
    await pages.scorekeeper.click('#phaseBtn');
    await pages.scorekeeper.waitForTimeout(1000);
    const q4CardIds = await pages.scorekeeper.$$eval('#court-players .player-card', cards =>
      cards.map(c => c.id).filter(id => id.startsWith('card-'))
    );
    if (q4CardIds.length > 0) {
      await pages.scorekeeper.click(`#${q4CardIds[0]} button:has-text("+2")`);
    }
    await screenshot(pages.scorekeeper, 'q4-stats', 'Q4 stats', 'scorekeeper');

    // End game
    console.log('  Ending game...');
    pages.scorekeeper.once('dialog', dialog => dialog.accept());
    await pages.scorekeeper.evaluate(() => document.querySelector('#endBtn').scrollIntoView());
    await pages.scorekeeper.click('#endBtn');
    await pages.scorekeeper.waitForTimeout(2000);
    await screenshot(pages.scorekeeper, 'game-ended', 'Game ended', 'scorekeeper');

    // Get final score
    const lancersScore = await pages.scorekeeper.$eval('#lancers-score', el => el.textContent).catch(() => '?');
    const oppScore = await pages.scorekeeper.$eval('#opponent-score', el => el.textContent).catch(() => '?');
    console.log(`    ✓ Final Score: Lancers ${lancersScore} - ${oppScore} ${TEST_GAME.opponent}`);

    // ============================================
    // PHASE 4: POST-GAME
    // ============================================
    console.log('\n📣 PHASE 4: POST-GAME');
    await setTimeAll(pages, SIM_TIMES.postGame);
    await refreshAll(pages);

    // Parent views game detail with play-by-play
    await pages.parent.goto(`${BASE_URL}/game-detail.html?id=${TEST_GAME.id}`);
    await pages.parent.waitForTimeout(2000);
    await screenshot(pages.parent, 'game-detail-postgame', 'Game detail with play-by-play', 'parent');

    // Parent goes to highlights
    await pages.parent.click('nav a[href="highlights.html"]');
    await pages.parent.waitForTimeout(2000);
    await screenshot(pages.parent, 'highlights-page', 'Highlights page', 'parent');

    // Coach views wrap-up
    await pages.coach.goto(`${BASE_URL}/game-detail.html?id=${TEST_GAME.id}`);
    await pages.coach.waitForTimeout(2000);
    await screenshot(pages.coach, 'coach-wrapup', 'Coach viewing game wrap-up', 'coach');

    console.log('\n✅ SIMULATION COMPLETE');
    console.log(`   Screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }

  // Keep browsers open for inspection
  console.log('\n⏳ Browsers open for inspection. Press Ctrl+C to close.');
  await new Promise(() => {});
}

runSimulation().catch(console.error);
