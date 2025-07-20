const fs = require('fs').promises;
const path = require('path');

// Amazon'dan kategori kazıma fonksiyonu
async function scrapeCategory(browser, categoryUrl) {
  const page = await browser.newPage();
  try {
    // Tarayıcı parmak izini gizle
    await page.evaluateOnNewDocument(() => {
      // Navigator.webdriver değerini gizle
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // User-Agent'ı değiştir
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // WebDriver ve Chrome özelliklerini gizle
      window.navigator.chrome = { runtime: {} };
      window.navigator.permissions = { query: () => Promise.resolve({ state: 'granted' }) };
    });

    // Temel headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.amazon.com.tr/'
    };

    await page.setUserAgent(headers['User-Agent']);
    await page.setExtraHTTPHeaders(headers);
    
    // Sayfa yükleme zamanını arttır
    await page.setDefaultNavigationTimeout(180000); // 3 dakika
    
    console.log(`Amazon sayfası yükleniyor: ${categoryUrl}`);
    
    // Sayfayı yükle ve daha uzun bekle
    await page.goto(categoryUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 180000 
    });
    
    console.log('Sayfa yüklendi, bekleniyor...');
    
    // Daha uzun bir bekleme süresi
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Çerez kabul penceresini kontrol et ve kapat
    try {
      const cookieSelector = 'input[data-action-type="ACCEPT_ALL"]';
      const hasCookieDialog = await page.evaluate((sel) => {
        return document.querySelector(sel) !== null;
      }, cookieSelector);
      
      if (hasCookieDialog) {
        console.log('Çerez penceresi bulundu, kapatılıyor...');
        await page.click(cookieSelector);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (err) {
      console.log('Çerez penceresi bulunamadı veya kapatılamadı:', err.message);
    }
    
    // İnsan benzeri scroll davranışı
    console.log('Sayfa kaydırılıyor...');
    await page.evaluate(async () => {
      const totalHeight = document.body.scrollHeight;
      const distance = 300;
      let scrolled = 0;
      
      while (scrolled < totalHeight) {
        window.scrollBy(0, distance);
        scrolled += distance;
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Ürünler çekiliyor...');
    
    // Ürünleri çek
    const products = await page.evaluate(() => {
      // Selectors
      const selectors = {
        productCard: '.a-link-normal.dcl-product-link',
        productTitle: '.dcl-truncate.dcl-product-label',
        productImage: '.a-dynamic-image.dcl-dynamic-image',
        productDiscountRate: '._badgeLabel_1frb3_1',
        productDiscountMessage: '._badgeMessage_1frb3_10',
        productNewPrice: '.a-price.dcl-product-price-new',
        productOldPrice: '.a-price.a-text-price.dcl-product-price-old'
      };
      
      const productElements = document.querySelectorAll(selectors.productCard);
      console.log(`Bulunan ürün sayısı: ${productElements.length}`);
      
      if (productElements.length === 0) {
        // Farklı ürün kartı selektörlerini dene
        const altSelectors = [
          'div[data-component-type="s-search-result"]',
          '.s-result-item',
          '.a-carousel-card'
        ];
        
        for (const selector of altSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Alternatif selektör bulundu: ${selector}, ürün sayısı: ${elements.length}`);
            // Burada alternatif selektörler için ürün çekme mantığı eklenebilir
            break;
          }
        }
      }
      
      return Array.from(productElements).map(el => {
        // Fiyatları çek
        const newPriceElement = el.querySelector(selectors.productNewPrice);
        const oldPriceElement = el.querySelector(selectors.productOldPrice);
        
        let price = '';
        let originalPrice = '';
        let priceValue = null;
        let originalPriceValue = null;
        
        if (newPriceElement) {
          const priceText = newPriceElement.querySelector('.a-offscreen')?.textContent || '';
          price = priceText.trim();
          priceValue = parseFloat(price.replace(/[^0-9,\.]/g, '').replace(',', '.'));
        }
        
        if (oldPriceElement) {
          const originalPriceText = oldPriceElement.querySelector('.a-offscreen')?.textContent || '';
          originalPrice = originalPriceText.trim();
          originalPriceValue = parseFloat(originalPrice.replace(/[^0-9,\.]/g, '').replace(',', '.'));
        }
        
        // İndirim bilgisini çek
        const discountBadge = el.querySelector(selectors.productDiscountRate);
        const discountMessage = el.querySelector(selectors.productDiscountMessage);
        let discountRate = '';
        
        if (discountBadge) {
          discountRate = discountBadge.textContent.trim();
        }
        
        // Ürün başlığını çek
        const titleElement = el.querySelector(selectors.productTitle);
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        // Ürün resmi
        const imageElement = el.querySelector(selectors.productImage);
        const imageUrl = imageElement ? imageElement.src : '';
        
        // Ürün URL'si
        const url = el.href || '';
        
        // İndirim kontrolü ve hesaplama
        let hasDiscount = false;
        let calculatedDiscount = 0;
        
        if (priceValue && originalPriceValue && priceValue < originalPriceValue) {
          calculatedDiscount = Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100);
          hasDiscount = true;
          
          // Eğer siteden gelen indirim oranı yoksa, hesaplanan indirim oranını kullan
          if (!discountRate) {
            discountRate = `%${calculatedDiscount}`;
          }
        } else if (discountRate) {
          // Eğer siteden gelen indirim oranı varsa ve hesaplanamadıysa, onu kullan
          const discountMatch = discountRate.match(/\d+/);
          if (discountMatch) {
            calculatedDiscount = parseInt(discountMatch[0]);
            hasDiscount = true;
          }
        }
        
        return { 
          title, 
          price, 
          originalPrice, 
          discountRate, 
          discountPercentage: calculatedDiscount, // Yüzde olarak indirim oranı
          imageUrl, 
          url, 
          hasDiscount 
        };
      }).filter(p => p !== null);
    });
    
    console.log(`Toplanan ürün sayısı: ${products.length}`);
    
    await page.close();
    const totalDiscountedProducts = products.filter(p => p.hasDiscount).length;
    return {
      url: categoryUrl,
      products,
      totalProducts: products.length,
      totalDiscountedProducts
    };
  } catch (err) {
    console.error(`Amazon kazıma hatası: ${err.message}`);
    
    // Hata durumunda ekran görüntüsü al
    try {
      const screenshotPath = path.join(__dirname, '..', 'output', `amazon-error-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Hata ekran görüntüsü kaydedildi: ${screenshotPath}`);
    } catch (screenshotErr) {
      console.error(`Ekran görüntüsü alınamadı: ${screenshotErr.message}`);
    }
    
    await page.close();
    throw err;
  }
}

// JSON'a kaydetme fonksiyonu
async function saveToJson(data) {
  try {
    // Output klasörünü oluştur
    const outputDir = './output';
    await fs.mkdir(outputDir, { recursive: true });
    
    const fileName = `amazon-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    return filePath;
  } catch (error) {
    throw error;
  }
}

// Ana scrape fonksiyonu
async function scrape(browser, categoryUrls = []) {
  try {
    const results = [];
    
    for (const url of categoryUrls) {
      console.log(`Amazon kategorisi kazınıyor: ${url}`);
      try {
        const categoryResult = await scrapeCategory(browser, url);
        results.push(categoryResult);
      } catch (err) {
        console.error(`Kategori kazıma hatası (devam ediliyor): ${err.message}`);
        // Hata durumunda diğer kategorilere devam et
        results.push({
          url,
          products: [],
          totalProducts: 0,
          totalDiscountedProducts: 0,
          error: err.message
        });
      }
    }
    
    const finalResult = {
      site: 'Amazon',
      baseUrl: 'https://www.amazon.com.tr',
      timestamp: new Date().toISOString(),
      categories: results,
      totalProducts: results.reduce((sum, cat) => sum + cat.totalProducts, 0),
      totalDiscountedProducts: results.reduce((sum, cat) => sum + cat.totalDiscountedProducts, 0)
    };
    
    return finalResult;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  scrape,
  saveToJson
}; 