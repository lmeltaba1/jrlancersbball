const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

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

  const baseUrl = 'https://lancers-bball.web.app';

  // Login
  console.log('Logging in...');
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  // Add your credentials here
  await page.type('input[type="email"]', 'YOUR_EMAIL');
  await page.type('input[type="password"]', 'YOUR_PASSWORD');
  await page.click('button[type="submit"]');
  console.log('Waiting for login...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  async function screenshot(name, extraWait = 2000) {
    await new Promise(r => setTimeout(r, extraWait));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
    console.log(`  ✓ ${name}.png`);
  }

  // === MAIN PAGES ===
  console.log('\n--- Main Pages ---');

  // Home
  console.log('Home...');
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('home', 3000);

  // Roster - Players tab
  console.log('Roster Players...');
  await page.goto(`${baseUrl}/roster.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('roster', 2000);

  // Roster - Parents tab
  console.log('Roster Parents...');
  try {
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('.section-tab');
      tabs.forEach(tab => {
        if (tab.textContent.includes('Parents')) tab.click();
      });
    });
    await screenshot('roster-parents', 2000);
  } catch (e) { console.log('  Parents tab error:', e.message); }

  // Click on a player to open modal
  console.log('Player profile modal...');
  try {
    // Go back to players tab first
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('.section-tab');
      tabs.forEach(tab => {
        if (tab.textContent.includes('Players')) tab.click();
      });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.waitForSelector('.player-card', { timeout: 5000 });
    const playerCards = await page.$$('.player-card');
    if (playerCards.length > 0) {
      await playerCards[playerCards.length - 2].click(); // Dean
      await screenshot('player-profile', 2500);

      // Look for invite viewer section
      console.log('Looking for invite viewer...');
      const hasViewerSection = await page.evaluate(() => {
        const card = document.getElementById('viewers-card');
        return card && card.style.display !== 'none';
      });

      if (hasViewerSection) {
        // Click add viewer button
        await page.evaluate(() => {
          const form = document.getElementById('add-viewer-form');
          if (form) form.style.display = 'block';
        });
        await screenshot('invite-viewer', 1500);
      }

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
      });
    }
  } catch (e) { console.log('  Player modal error:', e.message); }

  // Schedule
  console.log('Schedule...');
  await page.goto(`${baseUrl}/schedule.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('schedule', 2000);

  // Game detail - click first game
  console.log('Game detail...');
  try {
    await page.goto(`${baseUrl}/game-detail.html?id=1`, { waitUntil: 'networkidle2', timeout: 20000 });
    await screenshot('game-detail', 3000);
  } catch (e) { console.log('  Game detail error:', e.message); }

  // Attendance
  console.log('Attendance...');
  await page.goto(`${baseUrl}/attendance.html?game=1`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('attendance', 2000);

  // === CHAT / MESSAGES ===
  console.log('\n--- Messages ---');

  // Group Chat tab (default)
  console.log('Group Chat...');
  await page.goto(`${baseUrl}/messages.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('chat-group', 2500);

  // Posts tab - use evaluate to click
  console.log('Posts tab...');
  try {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.tab-btn');
      btns.forEach(btn => {
        if (btn.textContent.includes('Posts')) btn.click();
      });
    });
    await screenshot('chat-posts', 2000);
  } catch (e) { console.log('  Posts tab error:', e.message); }

  // Text tab
  console.log('Text tab...');
  try {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.tab-btn');
      btns.forEach(btn => {
        if (btn.textContent.includes('Text')) btn.click();
      });
    });
    await screenshot('chat-text', 2000);
  } catch (e) { console.log('  Text tab error:', e.message); }

  // === PLAYBOOK ===
  console.log('\n--- Playbook ---');
  await page.goto(`${baseUrl}/playbook.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('playbook', 2000);

  // === HIGHLIGHTS ===
  console.log('\n--- Highlights ---');
  await page.goto(`${baseUrl}/highlights.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('highlights', 3000);

  // Open upload modal
  console.log('Upload highlights modal...');
  try {
    await page.evaluate(() => {
      const btn = document.getElementById('uploadBtn');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const modalOpen = await page.evaluate(() => {
      const modal = document.getElementById('uploadModal');
      return modal && modal.classList.contains('active');
    });
    if (modalOpen) {
      await screenshot('highlights-upload', 1500);
    } else {
      console.log('  Upload modal not found');
    }
  } catch (e) { console.log('  Upload modal error:', e.message); }

  // === VOLUNTEERS ===
  console.log('\n--- Volunteers ---');
  await page.goto(`${baseUrl}/volunteers.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('volunteers', 2000);

  // === LIVE STATS / SCOREKEEPER ===
  console.log('\n--- Game Stats ---');

  // Stats page - try with a game param
  await page.goto(`${baseUrl}/game-stats.html?game=1`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('stats-tracking', 4000);

  // Scroll down to see more of the tracking interface
  await page.evaluate(() => window.scrollBy(0, 400));
  await screenshot('stats-tracking-buttons', 2000);

  // Stats view page
  console.log('Stats view page...');
  await page.goto(`${baseUrl}/stats-view.html?game=1`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('stats-view', 3000);

  // === LOGIN PAGE ===
  console.log('\n--- Login ---');
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle2', timeout: 20000 });
  await screenshot('login', 2000);

  await browser.close();
  console.log('\n✓ Done! Screenshots saved to docs/screenshots/');
}

takeScreenshots().catch(console.error);
