const fs = require('fs');
let content = fs.readFileSync('src/context/DataContext.tsx', 'utf8');
content = content.replace(
  "import { fetchMarketPrices } from '../services/priceService';",
  "import { priceService } from '../services/priceService';"
);
content = content.replace(
  /const updatedAssets = await fetchMarketPrices\(investmentAssets\);/g,
  `const priceUpdates = await priceService.fetchBatchPrices(investmentAssets);
      const updatedAssets = investmentAssets.map(a => {
        const update = priceUpdates[a.id];
        if (update && update.success && update.price) {
          return { ...a, current_price: update.price, price_updated_at: new Date().toISOString() };
        }
        return a;
      });`
);
fs.writeFileSync('src/context/DataContext.tsx', content);
