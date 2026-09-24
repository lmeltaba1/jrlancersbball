const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const BASE_URL = 'https://lancers-bball.web.app';

// Test accounts
const ACCOUNTS = {
  coach: { email: 'lmeltabarger@icloud.com', password: 'Iloveyou24' },
  parent: { email: 'mindy.m.carney@gmail.com', password: 'test123' },
  viewer: { email: 'maureen.trott@att.net', password: 'LancersView123!' }
};

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function setupPage(browser) {
  const page = await browser.newPage();

  // Emulate iPhone 14 Pro
  await page.setViewport({
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });

  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

  return page;
}

async function login(page, email, password) {
  console.log(`Logging in as ${email}...`);

  // Navigate to login page
  await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Check if already logged in (redirected away from login)
  const url = page.url();
  if (!url.includes('login.html')) {
    console.log('  Already logged in, signing out first...');
    // Sign out via Firebase
    await page.evaluate(() => {
      return firebase.auth().signOut();
    });
    await delay(1000);
    // Navigate back to login
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await delay(3000);
  console.log('  Logged in successfully');
}

async function screenshot(page, name, options = {}) {
  const extraWait = options.wait || 2000;
  const fullPage = options.fullPage || false;
  await delay(extraWait);
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage });
  console.log(`  ✓ ${name}.png`);
}

async function captureCoachScreenshots(browser) {
  console.log('\n========== COACH SCREENSHOTS ==========\n');
  const page = await setupPage(browser);
  await login(page, ACCOUNTS.coach.email, ACCOUNTS.coach.password);

  // === HOME ===
  console.log('Home page...');
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'home', { wait: 3000 });

  // Theme toggle - switch to light mode
  console.log('Theme toggle (light mode)...');
  try {
    await page.evaluate(() => {
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.click();
    });
    await screenshot(page, 'home-light', { wait: 1500 });
    // Switch back to dark
    await page.evaluate(() => {
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.click();
    });
    await delay(500);
  } catch (e) { console.log('  Theme toggle error:', e.message); }

  // === ROSTER ===
  console.log('Roster - Players...');
  await page.goto(`${BASE_URL}/roster.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'roster', { wait: 2000 });

  console.log('Roster - Parents...');
  try {
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('.section-tab');
      tabs.forEach(tab => { if (tab.textContent.includes('Parents')) tab.click(); });
    });
    await screenshot(page, 'roster-parents', { wait: 2000 });
  } catch (e) { console.log('  Parents tab error:', e.message); }

  // Player profile modal
  console.log('Player profile modal...');
  try {
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('.section-tab');
      tabs.forEach(tab => { if (tab.textContent.includes('Players')) tab.click(); });
    });
    await delay(500);
    await page.waitForSelector('.player-card', { timeout: 5000 });
    const playerCards = await page.$$('.player-card');
    if (playerCards.length > 1) {
      await playerCards[1].click(); // Second player
      await screenshot(page, 'player-profile', { wait: 2500 });

      // Scroll to stats section
      await page.evaluate(() => {
        const statsSection = document.querySelector('.stats-grid');
        if (statsSection) statsSection.scrollIntoView({ block: 'center' });
      });
      await screenshot(page, 'player-profile-stats', { wait: 1500 });

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
      });
      await delay(500);
    }
  } catch (e) { console.log('  Player modal error:', e.message); }

  // Invite viewer modal
  console.log('Invite viewer modal...');
  try {
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('.section-tab');
      tabs.forEach(tab => { if (tab.textContent.includes('Players')) tab.click(); });
    });
    await delay(500);
    const playerCards = await page.$$('.player-card');
    // Click on Dean (coach's kid)
    for (const card of playerCards) {
      const text = await card.evaluate(el => el.textContent);
      if (text.includes('Dean') || text.includes('30')) {
        await card.click();
        await delay(1000);
        // Show add viewer form
        await page.evaluate(() => {
          const form = document.getElementById('add-viewer-form');
          if (form) form.style.display = 'block';
        });
        await screenshot(page, 'invite-viewer', { wait: 1500 });
        await page.evaluate(() => {
          const closeBtn = document.querySelector('.modal-close');
          if (closeBtn) closeBtn.click();
        });
        break;
      }
    }
  } catch (e) { console.log('  Invite viewer error:', e.message); }

  // === SCHEDULE ===
  console.log('Schedule...');
  await page.goto(`${BASE_URL}/schedule.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'schedule', { wait: 2000 });

  // === GAME DETAIL ===
  console.log('Game detail (completed game)...');
  await page.goto(`${BASE_URL}/game-detail.html?id=1`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'game-detail', { wait: 3000 });

  // Scroll to box score
  console.log('Game detail - box score...');
  await page.evaluate(() => {
    const boxScore = document.querySelector('.box-score-container') || document.querySelector('.stats-table');
    if (boxScore) boxScore.scrollIntoView({ block: 'start' });
  });
  await screenshot(page, 'game-detail-boxscore', { wait: 1500 });

  // Scroll to play-by-play
  console.log('Game detail - play-by-play...');
  await page.evaluate(() => {
    const pbp = document.querySelector('.play-by-play') || document.querySelector('.event-feed');
    if (pbp) pbp.scrollIntoView({ block: 'start' });
  });
  await screenshot(page, 'game-detail-pbp', { wait: 1500 });

  // === ATTENDANCE ===
  console.log('Attendance...');
  await page.goto(`${BASE_URL}/attendance.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'attendance', { wait: 2000 });

  // === VOLUNTEERS ===
  console.log('Volunteers...');
  await page.goto(`${BASE_URL}/volunteers.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'volunteers', { wait: 2000 });

  // === MESSAGES ===
  console.log('Messages - Group Chat...');
  await page.goto(`${BASE_URL}/messages.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'chat-group', { wait: 2500 });

  console.log('Messages - Posts...');
  try {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.tab-btn');
      btns.forEach(btn => { if (btn.textContent.includes('Posts')) btn.click(); });
    });
    await screenshot(page, 'chat-posts', { wait: 2000 });
  } catch (e) { console.log('  Posts tab error:', e.message); }

  console.log('Messages - Text...');
  try {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.tab-btn');
      btns.forEach(btn => { if (btn.textContent.includes('Text')) btn.click(); });
    });
    await screenshot(page, 'chat-text', { wait: 2000 });
  } catch (e) { console.log('  Text tab error:', e.message); }

  // === PLAYBOOK ===
  console.log('Playbook...');
  await page.goto(`${BASE_URL}/playbook.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'playbook', { wait: 3000 });

  // Click play animation
  console.log('Playbook - animation...');
  try {
    await page.evaluate(() => {
      const playBtn = document.querySelector('.play-btn') || document.querySelector('[onclick*="animate"]');
      if (playBtn) playBtn.click();
    });
    await screenshot(page, 'playbook-animate', { wait: 2000 });
  } catch (e) { console.log('  Playbook animate error:', e.message); }

  // === PLAY DESIGNER (Coach only) ===
  console.log('Play Designer...');
  await page.goto(`${BASE_URL}/play-designer.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'play-designer', { wait: 3000 });

  // Select an action tool
  console.log('Play Designer - actions...');
  try {
    await page.evaluate(() => {
      const actionBtns = document.querySelectorAll('.action-btn');
      if (actionBtns.length > 1) actionBtns[1].click(); // Pass action
    });
    await screenshot(page, 'play-designer-actions', { wait: 1500 });
  } catch (e) { console.log('  Play designer actions error:', e.message); }

  // === HIGHLIGHTS ===
  console.log('Highlights...');
  await page.goto(`${BASE_URL}/highlights.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'highlights', { wait: 3000 });

  console.log('Highlights - upload modal...');
  try {
    await page.evaluate(() => {
      const btn = document.getElementById('uploadBtn') || document.querySelector('[onclick*="upload"]');
      if (btn) btn.click();
    });
    await delay(1000);
    await screenshot(page, 'highlights-upload', { wait: 1500 });
    // Close modal
    await page.evaluate(() => {
      const modal = document.querySelector('.modal.active');
      if (modal) modal.classList.remove('active');
    });
  } catch (e) { console.log('  Upload modal error:', e.message); }

  // === GAME STATS (Track mode) ===
  console.log('Game Stats - tracking...');
  await page.goto(`${BASE_URL}/game-stats.html?game=10`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'stats-tracking', { wait: 4000 });

  // === STATS VIEW ===
  console.log('Stats View...');
  await page.goto(`${BASE_URL}/stats-view.html?game=1`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'stats-view', { wait: 3000 });

  // === STATS EDIT (Coach only - completed game) ===
  console.log('Stats Edit (coach view)...');
  await page.goto(`${BASE_URL}/game-stats.html?game=1`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'stats-edit', { wait: 3000 });

  await page.close();
}

async function capturePublicScreenshots(browser) {
  console.log('\n========== PUBLIC SCREENSHOTS ==========\n');
  const page = await setupPage(browser);

  // Login page
  console.log('Login page...');
  await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'login', { wait: 2000 });

  // Register page
  console.log('Register page...');
  try {
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="register"]');
      if (link) link.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await screenshot(page, 'register', { wait: 2000 });
  } catch (e) {
    // Try direct navigation
    await page.goto(`${BASE_URL}/register.html`, { waitUntil: 'networkidle2', timeout: 20000 });
    await screenshot(page, 'register', { wait: 2000 });
  }

  await page.close();
}

async function captureViewerScreenshots(browser) {
  console.log('\n========== VIEWER SCREENSHOTS ==========\n');
  const page = await setupPage(browser);
  await login(page, ACCOUNTS.viewer.email, ACCOUNTS.viewer.password);

  // Home - viewer sees limited navigation
  console.log('Viewer home...');
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'viewer-home', { wait: 3000 });

  // Roster
  console.log('Viewer roster...');
  await page.goto(`${BASE_URL}/roster.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'viewer-roster', { wait: 2000 });

  // Schedule
  console.log('Viewer schedule...');
  await page.goto(`${BASE_URL}/schedule.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'viewer-schedule', { wait: 2000 });

  // Highlights
  console.log('Viewer highlights...');
  await page.goto(`${BASE_URL}/highlights.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot(page, 'viewer-highlights', { wait: 3000 });

  await page.close();
}

async function takeScreenshots() {
  console.log('=== Jr. Lancers Screenshot Capture ===\n');
  console.log(`Output directory: ${SCREENSHOTS_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Capture public pages first (no login)
    await capturePublicScreenshots(browser);

    // Capture coach screenshots (most features)
    await captureCoachScreenshots(browser);

    // Capture viewer screenshots (limited features)
    await captureViewerScreenshots(browser);

    console.log('\n========================================');
    console.log('✓ All screenshots captured successfully!');
    console.log(`✓ Saved to: ${SCREENSHOTS_DIR}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run
takeScreenshots();
