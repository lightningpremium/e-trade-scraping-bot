const fs = require('fs').promises;
const path = require('path');

// Hepsiburada'dan kategori kazıma fonksiyonu
async function scrapeCategory(browser, categoryUrl) {
  const page = await browser.newPage();
  try {
    // Temel headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.hepsiburada.com/'
    };

    await page.setUserAgent(headers['User-Agent']);
    await page.setExtraHTTPHeaders(headers);
    
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Basit scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Ürünleri çek
    const products = await page.evaluate(() => {
      // Selectors
      const selectors = {
        productCard: '.productListContent-zAP0Y5msy8OHn5z7T_K_',
        productTitle: '.title-module_titleText__8FlNQ',
        productBrand: '.title-module_brandText__GIxWY',
        discountRate: '.price-module_discountRate__Uh-XD',
        originalPrice: '.price-module_originalPrice__43Wnd',
        finalPrice: '.price-module_finalPrice__LtjvY',
        productImage: '.hbImageView-module_hbImage__Ca3xO',
        productLink: '.productCardLink-module_productCardLink__GZ3eU'
      };
      
      const productElements = document.querySelectorAll(selectors.productCard);
      return Array.from(productElements).map(el => {
        // Ürün başlığı ve marka
        const titleElement = el.querySelector(selectors.productTitle);
        const brandElement = el.querySelector(selectors.productBrand);
        
        let title = '';
        let brand = '';
        
        if (titleElement) {
          const fullText = titleElement.textContent.trim();
          title = fullText;
        }
        
        if (brandElement) {
          brand = brandElement.textContent.trim();
          // Markayı başlıktan çıkar
          title = title.replace(brand, '').trim();
        }
        
        // Fiyatları çek
        const finalPriceElement = el.querySelector(selectors.finalPrice);
        const originalPriceElement = el.querySelector(selectors.originalPrice);
        const discountRateElement = el.querySelector(selectors.discountRate);
        
        let price = '';
        let originalPrice = '';
        let discountRate = '';
        let priceValue = null;
        let originalPriceValue = null;
        let hasDiscount = false;
        let discountPercentage = 0;
        
        if (finalPriceElement) {
          price = finalPriceElement.textContent.replace(/[^0-9,\.]/g, '').replace(',', '.').trim();
          priceValue = parseFloat(price);
        }
        
        if (originalPriceElement) {
          originalPrice = originalPriceElement.textContent.replace(/[^0-9,\.]/g, '').replace(',', '.').trim();
          originalPriceValue = parseFloat(originalPrice);
          hasDiscount = true;
        }
        
        if (discountRateElement) {
          discountRate = discountRateElement.textContent.trim();
          const discountMatch = discountRate.match(/\d+/);
          if (discountMatch) {
            discountPercentage = parseInt(discountMatch[0]);
          }
        }
        
        // İndirim hesaplama (eğer indirim oranı belirtilmemişse)
        if (priceValue && originalPriceValue && priceValue < originalPriceValue && !discountPercentage) {
          discountPercentage = Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100);
          discountRate = `%${discountPercentage}`;
          hasDiscount = true;
        }
        
        // Ürün resmi ve URL
        const imageElement = el.querySelector(selectors.productImage);
        const linkElement = el.querySelector(selectors.productLink);
        
        let imageUrl = '';
        let url = '';
        
        if (imageElement && imageElement.src) {
          imageUrl = imageElement.src;
        } else if (imageElement && imageElement.srcset) {
          const srcsetParts = imageElement.srcset.split(' ');
          if (srcsetParts.length > 0) {
            imageUrl = srcsetParts[0];
          }
        }
        
        if (linkElement && linkElement.href) {
          url = linkElement.href;
        }
        
        return { 
          title, 
          brand, 
          price: priceValue ? priceValue.toLocaleString('tr-TR') + ' TL' : '', 
          originalPrice: originalPriceValue ? originalPriceValue.toLocaleString('tr-TR') + ' TL' : '', 
          discountRate, 
          discountPercentage, 
          imageUrl, 
          url, 
          hasDiscount 
        };
      }).filter(p => p !== null && p.title);
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
    
    const fileName = `hepsiburada-${new Date().toISOString().replace(/:/g, '-')}.json`;
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
      site: 'Hepsiburada',
      baseUrl: 'https://www.hepsiburada.com',
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