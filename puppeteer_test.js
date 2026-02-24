const puppeteer = require('puppeteer');
const server = require('./src/app');
(async () => {
  console.log('puppeteer_test starting');
  const listener = server.listen(3002);
  try {
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG>', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR>', err.message));
    await page.goto('http://localhost:3002');
    // fallback for older puppeteer versions
    if (page.waitForTimeout) {
      await page.waitForTimeout(2000);
    } else {
      await page.waitFor(2000);
    }
    await page.screenshot({path:'screenshot.png', fullPage:true});
    console.log('screenshot saved');
    await browser.close();
  } catch(e) {
    console.error('puppeteer failed', e);
  }
  listener.close();
})();