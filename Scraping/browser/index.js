const puppeteer = require('puppeteer');

let browser;

// Tarayıcı başlatma fonksiyonu
async function initBrowser() {
  try {
    // Puppeteer uyarılarını gizle
    process.env.PUPPETEER_DISABLE_HEADLESS_WARNING = 'true';
    
    browser = await puppeteer.launch({
      headless: false, // Bot korumasını aşmak için görünür mod
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-blink-features=AutomationControlled', // Otomasyonu gizle
        '--window-size=1920,1080',
      ],
      defaultViewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    return browser;
  } catch (error) {
    console.error('Tarayıcı başlatılamadı:', error);
    throw error;
  }
}

// Tarayıcıyı kapatma fonksiyonu
async function closeBrowser() {
  if (browser) {
    await browser.close();
  }
}

module.exports = {
  initBrowser,
  closeBrowser
}; 