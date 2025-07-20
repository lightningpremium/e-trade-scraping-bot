const fs = require('fs').promises;
const path = require('path');

// Trendyol'dan kategori kazıma fonksiyonu
async function scrapeCategory(browser, categoryUrl) {
  const page = await browser.newPage();
  try {
    // Temel headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.trendyol.com/'
    };

    await page.setUserAgent(headers['User-Agent']);
    await page.setExtraHTTPHeaders(headers);
    
    // Console çıktısını gizle
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Basit scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Ürünleri çek
    const products = await page.evaluate(() => {
      // Selectors
      const selectors = {
        productCard: '.p-card-wrppr',
        productTitle: '.prdct-desc-cntnr-name',
        productBrand: '.prdct-desc-cntnr-ttl',
        productDiscountRate: '.discount-badge',
        productImage: '.p-card-img'
      };
      
      const productElements = document.querySelectorAll(selectors.productCard);
      return Array.from(productElements).map(el => {
        // Fiyatları çek
        const discountedPriceElement =
          el.querySelector('.price-item.lowest-price-discounted, .price-item.discounted, .prc-box-dscntd, .discounted-price, .price-box.discounted');
        const originalPriceElement =
          el.querySelector('.price-item.lowest-price-original, .price-item.old-price, .price-item.original, .prc-box-orgnl, .original-price, .price-box.original, .price-box-old-price');
        let price = '';
        let originalPrice = '';
        let priceValue = null;
        let originalPriceValue = null;
        
        if (discountedPriceElement) {
          price = discountedPriceElement.textContent.replace(/[^0-9,\.]/g, '').replace(',', '.').trim();
          priceValue = parseFloat(price);
        }
        if (originalPriceElement) {
          originalPrice = originalPriceElement.textContent.replace(/[^0-9,\.]/g, '').replace(',', '.').trim();
          originalPriceValue = parseFloat(originalPrice);
        }
        
        if ((!priceValue || !originalPriceValue) && el.innerHTML.includes('Son 30 Günün En Düşük Fiyatı')) {
          const priceMatches = el.innerHTML.match(/([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)\s*TL/g);
          if (priceMatches && priceMatches.length >= 2) {
            const p1 = parseFloat(priceMatches[priceMatches.length - 2].replace(/[^0-9,\.]/g, '').replace(',', '.'));
            const p2 = parseFloat(priceMatches[priceMatches.length - 1].replace(/[^0-9,\.]/g, '').replace(',', '.'));
            if (p1 > p2) {
              originalPriceValue = p1;
              priceValue = p2;
            } else {
              originalPriceValue = p2;
              priceValue = p1;
            }
            price = priceValue.toLocaleString('tr-TR') + ' TL';
            originalPrice = originalPriceValue.toLocaleString('tr-TR') + ' TL';
          }
        }
        
        let discountRate = el.querySelector(selectors.productDiscountRate)?.textContent.trim() || '';
        const title = el.querySelector(selectors.productTitle)?.textContent.trim() || '';
        const brand = el.querySelector(selectors.productBrand)?.textContent.trim() || '';
        const imageUrl = el.querySelector(selectors.productImage)?.src || '';
        const url = el.querySelector('a')?.href || '';
        
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
          brand, 
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
    
    await page.close();
    const totalDiscountedProducts = products.filter(p => p.hasDiscount).length;
    return {
      url: categoryUrl,
      products,
      totalProducts: products.length,
      totalDiscountedProducts
    };
  } catch (err) {
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
    
    const fileName = `trendyol-${new Date().toISOString().replace(/:/g, '-')}.json`;
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
      const categoryResult = await scrapeCategory(browser, url);
      results.push(categoryResult);
    }
    
    const finalResult = {
      site: 'Trendyol',
      baseUrl: 'https://www.trendyol.com',
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