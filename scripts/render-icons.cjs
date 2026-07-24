const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Quelle: quadratisches Logo mit etwas Rand, auf weissem Grund (public/icons/logo-icon-source.png).
// Bei einem neuen Logo einfach diese Datei ersetzen und das Skript erneut ausfuehren.
const iconsDir = path.join(__dirname, '..', 'public', 'icons')
const sizes = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 180, file: 'apple-touch-icon.png' },
  { size: 32, file: 'favicon-32.png' },
]

;(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  const page = await browser.newPage()
  const htmlPath = path.join(iconsDir, '_tmp_render.html')
  try {
    for (const { size, file } of sizes) {
      // Muss als eigene HTML-Datei im selben Verzeichnis geladen werden (page.goto mit
      // file://): ein setContent()-Dokument hat eine data:-Origin, von der aus Chromium den
      // Zugriff auf lokale Dateien per file:// verweigert - das Bild bliebe leer.
      fs.writeFileSync(
        htmlPath,
        `<html><body style="margin:0;padding:0;"><img src="logo-icon-source.png" style="display:block;width:${size}px;height:${size}px;" /></body></html>`,
      )
      await page.setViewportSize({ width: size, height: size })
      await page.goto('file://' + htmlPath)
      await page.waitForFunction(() => document.querySelector('img')?.complete)
      const out = path.join(iconsDir, file)
      await page.screenshot({ path: out, omitBackground: false })
      console.log('wrote', out)
    }
  } finally {
    fs.unlinkSync(htmlPath)
    await browser.close()
  }
})()
