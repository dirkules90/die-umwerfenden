const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const svg = fs.readFileSync(svgPath, 'utf-8');
const sizes = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 180, file: 'apple-touch-icon.png' },
  { size: 32, file: 'favicon-32.png' },
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  for (const { size, file } of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;padding:0;">${svg}</body></html>`);
    await page.evaluate((s) => {
      const el = document.querySelector('svg');
      el.style.width = s + 'px';
      el.style.height = s + 'px';
      document.body.style.width = s + 'px';
      document.body.style.height = s + 'px';
    }, size);
    const out = path.join(__dirname, '..', 'public', 'icons', file);
    await page.screenshot({ path: out, omitBackground: false });
    console.log('wrote', out);
  }
  await browser.close();
})();
