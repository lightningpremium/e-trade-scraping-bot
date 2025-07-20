const fs = require('fs').promises;
const path = require('path');
const browserUtils = require('./Scraping/browser');
const trendyolScraper = require('./Scraping/trendyol');
const hepsiburadaScraper = require('./Scraping/hepsiburada');
const amazonScraper = require('./Scraping/amazon');

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

async function checkConfigExists(configFile) {
  try {
    await fs.access(path.join(__dirname, 'Config', configFile));
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

async function scrapeTrendyol() {
  try {
    const configExists = await checkConfigExists('TrendyolConfig.json');
    if (!configExists) {
      resetConsole();
      console.error('HATA: Config/TrendyolConfig.json dosyası bulunamadı!');
      return false;
    }
    
    const configFile = await fs.readFile(path.join(__dirname, 'Config', 'TrendyolConfig.json'), 'utf8');
    const config = JSON.parse(configFile);
    
    if (!config.categoryUrls || config.categoryUrls.length === 0) {
      resetConsole();
      console.error('HATA: Trendyol yapılandırma dosyasında URL bulunamadı!');
      return false;
    }
    
    silentMode();
    
    const browser = await browserUtils.initBrowser();
    
    const result = await trendyolScraper.scrape(browser, config.categoryUrls);
    
    const outputPath = await trendyolScraper.saveToJson(result);
    
    resetConsole();
    console.log(`\n  İşlem tamamlandı! Dosya kaydedildi: ${outputPath}`);
    console.log(`  Toplam: ${result.totalProducts} ürün (${result.totalDiscountedProducts} indirimli)`);
    
    await browserUtils.closeBrowser();
    return true;
  } catch (error) {
    resetConsole();
    console.error('\n  Hata oluştu:', error.message);
    return false;
  }
}

async function scrapeHepsiburada() {
  try {
    const configExists = await checkConfigExists('HepsiburadaConfig.json');
    if (!configExists) {
      resetConsole();
      console.error('HATA: Config/HepsiburadaConfig.json dosyası bulunamadı!');
      return false;
    }
    
    const configFile = await fs.readFile(path.join(__dirname, 'Config', 'HepsiburadaConfig.json'), 'utf8');
    const config = JSON.parse(configFile);
    
    if (!config.categoryUrls || config.categoryUrls.length === 0) {
      resetConsole();
      console.error('HATA: Hepsiburada yapılandırma dosyasında URL bulunamadı!');
      return false;
    }
    
    silentMode();
    
    const browser = await browserUtils.initBrowser();
    
    const result = await hepsiburadaScraper.scrape(browser, config.categoryUrls);
    
    const outputPath = await hepsiburadaScraper.saveToJson(result);
    
    resetConsole();
    console.log(`\n  İşlem tamamlandı! Dosya kaydedildi: ${outputPath}`);
    console.log(`  Toplam: ${result.totalProducts} ürün (${result.totalDiscountedProducts} indirimli)`);
    
    await browserUtils.closeBrowser();
    return true;
  } catch (error) {
    resetConsole();
    console.error('\n  Hata oluştu:', error.message);
    return false;
  }
}

async function scrapeAmazon() {
  try {
    const configExists = await checkConfigExists('AmazonConfig.json');
    if (!configExists) {
      resetConsole();
      console.error('HATA: Config/AmazonConfig.json dosyası bulunamadı!');
      return false;
    }
    
    const configFile = await fs.readFile(path.join(__dirname, 'Config', 'AmazonConfig.json'), 'utf8');
    const config = JSON.parse(configFile);
    
    if (!config.categoryUrls || config.categoryUrls.length === 0) {
      resetConsole();
      console.error('HATA: Amazon yapılandırma dosyasında URL bulunamadı!');
      return false;
    }
    
    silentMode();
    
    const browser = await browserUtils.initBrowser();
    
    const result = await amazonScraper.scrape(browser, config.categoryUrls);
    
    const outputPath = await amazonScraper.saveToJson(result);
    
    resetConsole();
    console.log(`\n  İşlem tamamlandı! Dosya kaydedildi: ${outputPath}`);
    console.log(`  Toplam: ${result.totalProducts} ürün (${result.totalDiscountedProducts} indirimli)`);
    
    await browserUtils.closeBrowser();
    return true;
  } catch (error) {
    resetConsole();
    console.error('\n  Hata oluştu:', error.message);
    return false;
  }
}

async function main() {
  printWelcome();
  
  // Komut satırı argümanlarını kontrol et
  const args = process.argv.slice(2);
  
  if (args.includes('--trendyol')) {
    await scrapeTrendyol();
  } else if (args.includes('--hepsiburada')) {
    await scrapeHepsiburada();
  } else if (args.includes('--amazon')) {
    await scrapeAmazon();
  } else {
    // Parametre belirtilmezse tüm siteleri kazı
    console.log('\n  Trendyol kazıma başlatılıyor...');
    await scrapeTrendyol();
    
    console.log('\n  Hepsiburada kazıma başlatılıyor...');
    await scrapeHepsiburada();
    
    console.log('\n  Amazon kazıma başlatılıyor...');
    await scrapeAmazon();
  }
}

main().catch(error => {
  resetConsole();
  console.error('\n  Kritik hata:', error.message);
}); 