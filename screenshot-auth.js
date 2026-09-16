const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://lancers-bball.web.app';
const SCREENSHOT_DIR = '/tmp/lancers-screenshots';

const accounts = [
  { name: 'coach', email: 'lmeltabarger@icloud.com', password: 'Iloveyou24' },
  { name: 'parent', email: 'mindy.m.carney@gmail.com', password: 'test123' },
];

const pages = [
  { name: 'home', path: '/index.html' },
  { name: 'schedule', path: '/schedule.html' },
  { name: 'roster', path: '/roster.html' },
  { name: 'highlights', path: '/highlights.html' },
  { name: 'messages', path: '/messages.html' },
  { name: 'game-stats', path: '/game-stats.html' },
  { name: 'game-detail', path: '/game-detail.html?id=1' },
  { name: 'playbook', path: '/playbook.html' },
  { name: 'attendance', path: '/attendance.html' },
  { name: 'volunteers', path: '/volunteers.html' },
];

async function login(page, email, password) {
  console.log(`  Logging in as ${email}...`);
  await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("LOG IN")');

  // Wait for redirect
  await page.waitForTimeout(4000);
  console.log('  ✓ Logged in');
}

async function captureScreenshots() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  for (const account of accounts) {
    console.log(`\n👤 ${account.name.toUpperCase()}`);

    // Mobile
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();
    await login(page, account.email, account.password);

    for (const pg of pages) {
      const filename = `${account.name}-mobile-${pg.name}.png`;
      const filepath = path.join(SCREENSHOT_DIR, filename);

      try {
        console.log(`  📸 ${pg.name}...`);
        await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(3000); // Wait for Firebase data to render

        await page.screenshot({ path: filepath, fullPage: true });
        console.log(`     ✓ saved`);
      } catch (err) {
        console.log(`     ✗ ${err.message.substring(0, 40)}`);
      }
    }

    await context.close();

    // Desktop
    const dCtx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });

    const dPage = await dCtx.newPage();
    await login(dPage, account.email, account.password);

    for (const pg of pages) {
      const filename = `${account.name}-desktop-${pg.name}.png`;
      const filepath = path.join(SCREENSHOT_DIR, filename);

      try {
        console.log(`  📸 ${pg.name} (desktop)...`);
        await dPage.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await dPage.waitForTimeout(3000);

        await dPage.screenshot({ path: filepath, fullPage: true });
        console.log(`     ✓ saved`);
      } catch (err) {
        console.log(`     ✗ ${err.message.substring(0, 40)}`);
      }
    }

    await dCtx.close();
  }

  await browser.close();
  console.log(`\n✅ Done!`);
}

captureScreenshots().catch(console.error);
