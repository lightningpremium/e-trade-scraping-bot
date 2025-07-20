const fs = require('fs').promises;
const path = require('path');
const browserUtils = require('./Scraping/browser');
const trendyolScraper = require('./Scraping/trendyol');

function printWelcome() {
    console.log('\n');
    console.log('\x1b[36m    │                                                             \x1b[0m');
  
    console.log('\x1b[36m    │                                                             \x1b[0m');
    console.log('\x1b[36m    │                    ⚡ L I G H T N I N G ⚡                    \x1b[0m');
    console.log('\x1b[36m    │                                                                \x1b[0m');
    console.log('\x1b[36m    │       ╭─────────────────────────────────────────────╮         \x1b[0m');
    console.log('\x1b[36m    │       │  ⚡ S C R A P I N G   S O L U T I O N S ⚡  │        \x1b[0m');
    console.log('\x1b[36m    │       ╰─────────────────────────────────────────────╯         \x1b[0m');
    console.log('\x1b[36m    │                                                               \x1b[0m');
    console.log('\x1b[36m    │                    ⚡ Premium Quality ⚡                     \x1b[0m');
    console.log('\x1b[36m    │                  🌟 Fast & Reliable 🌟                       \x1b[0m');
    console.log('\x1b[36m    │                   💎 Advanced Tools 💎                        \x1b[0m');
    console.log('\x1b[36m    │                                                              \x1b[0m');
    console.log('\x1b[36m    │                ⚡ ━━━━━━━━━━━━━━━━━━━━━ ⚡\x1b[0m');
    console.log('\x1b[36m    │                        Developer\x1b[0m');
    console.log('\x1b[36m    │                     lightningpremium\x1b[0m');
    console.log('\x1b[36     │                                                              \x1b[0m');
}

async function checkConfigExists() {
  try {
    await fs.access(path.join(__dirname, 'Config', 'TrendyolConfig.json'));
    return true;
  } catch (error) {
    return false;
  }
}

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function silentMode() {
  console.log = function() {};
  console.error = function() {};
}

function resetConsole() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}

async function main() {
  printWelcome();
  
  try {
    const configExists = await checkConfigExists();
    if (!configExists) {
      resetConsole();
      console.error('HATA: Config/TrendyolConfig.json dosyası bulunamadı!');
      return;
    }
    
    const configFile = await fs.readFile(path.join(__dirname, 'Config', 'TrendyolConfig.json'), 'utf8');
    const config = JSON.parse(configFile);
    
    if (!config.categoryUrls || config.categoryUrls.length === 0) {
      resetConsole();
      console.error('HATA: Yapılandırma dosyasında URL bulunamadı!');
      return;
    }
    
    silentMode();
    
    const browser = await browserUtils.initBrowser();
    
    const result = await trendyolScraper.scrape(browser, config.categoryUrls);
    
    const outputPath = await trendyolScraper.saveToJson(result);
    
    resetConsole();
    console.log(`\n  İşlem tamamlandı! Dosya kaydedildi: ${outputPath}`);
    console.log(`  Toplam: ${result.totalProducts} ürün (${result.totalDiscountedProducts} indirimli)`);
  } catch (error) {
    resetConsole();
    console.error('\n  Hata oluştu:', error.message);
  } finally {
    silentMode();
    await browserUtils.closeBrowser();
  }
}

main().catch(error => {
  resetConsole();
  console.error('\n  Kritik hata:', error.message);
}); 