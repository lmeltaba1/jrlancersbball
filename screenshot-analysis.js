const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://lancers-bball.web.app';
const SCREENSHOT_DIR = '/tmp/lancers-screenshots';

// Pages to capture
const pages = [
  { name: 'login', path: '/login.html' },
  { name: 'home', path: '/index.html' },
  { name: 'schedule', path: '/schedule.html' },
  { name: 'roster', path: '/roster.html' },
  { name: 'highlights', path: '/highlights.html' },
  { name: 'messages', path: '/messages.html' },
  { name: 'game-stats', path: '/game-stats.html' },
  { name: 'game-detail', path: '/game-detail.html?id=1' },
];

// Viewports to test
const viewports = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

async function captureScreenshots() {
  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  for (const viewport of viewports) {
    console.log(`\n📱 Capturing at ${viewport.name} (${viewport.width}x${viewport.height})`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2, // Retina
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 1024,
    });

    const page = await context.newPage();

    for (const pageConfig of pages) {
      const url = `${BASE_URL}${pageConfig.path}`;
      const filename = `${viewport.name}-${pageConfig.name}.png`;
      const filepath = path.join(SCREENSHOT_DIR, filename);

      try {
        console.log(`  📸 ${pageConfig.name}...`);

        // Navigate with timeout
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

        // Wait a bit for any animations/loading
        await page.waitForTimeout(2000);

        // Take full page screenshot
        await page.screenshot({
          path: filepath,
          fullPage: true,
          type: 'png'
        });

        console.log(`     ✓ Saved: ${filename}`);
      } catch (err) {
        console.log(`     ✗ Error: ${err.message}`);

        // Still try to capture whatever is on screen
        try {
          await page.screenshot({ path: filepath, fullPage: true });
          console.log(`     ⚠ Partial capture saved`);
        } catch (e) {}
      }
    }

    await context.close();
  }

  await browser.close();

  console.log(`\n✅ Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log(`\nFiles created:`);
  const files = fs.readdirSync(SCREENSHOT_DIR);
  files.forEach(f => console.log(`  - ${f}`));
}

captureScreenshots().catch(console.error);
