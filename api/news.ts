// Vercel Serverless Function for Live Market News
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const feeds = [
      { name: 'BlogTiềnẢo', source: 'BlogTiềnẢo', url: 'https://blogtienao.com/feed/', type: 'CRYPTO' },
      { name: 'CoinDesk Crypto', source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'CRYPTO' },
      { name: 'CoinTelegraph', source: 'CoinTelegraph', url: 'https://cointelegraph.com/rss', type: 'CRYPTO' },
      { name: 'CafeF Chứng khoán', source: 'CafeF', url: 'https://cafef.vn/thi-truong-chung-khoan.rss', type: 'VN_STOCK' },
      { name: 'VnEconomy Chứng khoán', source: 'VnEconomy', url: 'https://vneconomy.vn/chung-khoan.rss', type: 'VN_STOCK' },
      { name: 'CafeF Tài chính', source: 'CafeF', url: 'https://cafef.vn/tai-chinh-quoc-te.rss', type: 'MACRO' },
    ];

    const rawArticles: { title: string; desc: string; source: string; pubDate: string; type: string }[] = [];

    for (const f of feeds) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(f.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const text = await response.text();
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          let match;
          let count = 0;
          while ((match = itemRegex.exec(text)) !== null && count < 6) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
            const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
            const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

            const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
            const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

            if (title && !title.toLowerCase().includes('thông báo') && !title.toLowerCase().includes('lịch sự kiện')) {
              rawArticles.push({
                title,
                desc,
                source: f.source,
                pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
                type: f.type,
              });
              count++;
            }
          }
        }
      } catch (e) {
        // ignore and proceed
      }
    }

    const KNOWN_TICKERS = [
      'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'SUI', 'DOGE', 'PAXG', 'XAUT', 'SJC',
      'VN-INDEX', 'TPB', 'VCB', 'MBB', 'TCB', 'CTG', 'ACB', 'VPB', 'FPT', 'HPG',
      'SSI', 'VND', 'MWG', 'VIC', 'VHM', 'VNM', 'VEOF', 'VESAF', 'DCDS',
    ];

    const isCryptoArticle = (raw: any) => {
      const txt = `${raw.title} ${raw.desc}`.toUpperCase();
      return (
        raw.type === 'CRYPTO' ||
        raw.source === 'CoinDesk' ||
        raw.source === 'BlogTiềnẢo' ||
        raw.source === 'CoinTelegraph' ||
        ['BITCOIN', 'CRYPTO', 'ETH', 'BTC', 'SOLANA', 'SOL', 'XRP', 'DOGE', 'ALTCOIN', 'TIỀN ĐIỆN TỬ', 'TIỀN MÃ HÓA', 'BLOCKCHAIN', 'DEFI', 'BINANCE', 'ETF BITCOIN'].some(k => txt.includes(k))
      );
    };

    const convertSingleArticle = (raw: any) => {
      const fullText = `${raw.title} ${raw.desc}`.toUpperCase();
      const isCrypto = isCryptoArticle(raw);
      const impactedAssets: string[] = [];

      for (const tick of KNOWN_TICKERS) {
        const reg = new RegExp(`(^|[^A-Z0-9])${tick}([^A-Z0-9]|$)`, 'i');
        if (reg.test(fullText)) {
          impactedAssets.push(tick);
        }
      }

      if (impactedAssets.length === 0) {
        if (isCrypto) {
          impactedAssets.push('BTC', 'ETH', 'SOL');
        } else if (fullText.includes('VÀNG') || fullText.includes('GOLD')) {
          impactedAssets.push('SJC', 'PAXG');
        } else if (fullText.includes('NGÂN HÀNG') || fullText.includes('BANK')) {
          impactedAssets.push('TPB', 'VCB', 'MBB', 'VN-INDEX');
        } else if (fullText.includes('QUỸ') || fullText.includes('NAV')) {
          impactedAssets.push('VEOF', 'VESAF', 'VN-INDEX');
        } else {
          impactedAssets.push('VN-INDEX', 'FPT', 'HPG');
        }
      }

      const bullishWords = ['TĂNG', 'MUA RÒNG', 'BỐC ĐẦU', 'KỶ TÍCH', 'LẬP ĐỈNH', 'GOM RÒNG', 'HÚT TIỀN', 'LÃI', 'BỨT PHÁ', 'PHỤC HỒI', 'VƯỢT ĐỈNH', 'TĂNG TRƯỞNG', 'SURGE', 'RALLY', 'BULL', 'RECORD', 'GAIN', 'TOKENIZING', 'THÔNG QUA', 'ỦNG HỘ'];
      const bearishWords = ['GIẢM', 'RƠI', 'THỦNG', 'BÁN RÒNG', 'XẢ', 'BÁN THÁO', 'LỖ', 'LAO DỐC', 'ÉP', 'ÁP LỰC', 'SUY GIẢM', 'ĐỎ', 'PHÁ SẢN', 'LO NGẠI', 'DROP', 'FALL', 'LOSS', 'BEAR', 'PLUNGE', 'CRASH', 'XẢ MẠNH', 'LEAKS', 'THEFT'];
      const volatileWords = ['BIẾN ĐỘNG', 'GIỜ G', 'TRANH CHẤP', 'CUỘC CHIẾN', 'RUNG LẮC', 'VOLATILITY', 'FIGHT', 'WARNS'];

      let impactType: 'BULLISH' | 'BEARISH' | 'VOLATILE' | 'NEUTRAL' = 'NEUTRAL';
      if (bearishWords.some((w) => fullText.includes(w))) {
        impactType = 'BEARISH';
      } else if (bullishWords.some((w) => fullText.includes(w))) {
        impactType = 'BULLISH';
      } else if (volatileWords.some((w) => fullText.includes(w))) {
        impactType = 'VOLATILE';
      }

      const targetList = Array.from(new Set(impactedAssets)).slice(0, 4);

      let impactSummary = '';
      if (isCrypto) {
        if (impactType === 'BULLISH') {
          impactSummary = `Dòng vốn và lực cầu Crypto gia tăng mạnh mẽ, củng cố đà bứt phá cho ${targetList.join(', ')}.`;
        } else if (impactType === 'BEARISH') {
          impactSummary = `Áp lực bán chốt lời và điều chỉnh ngắn hạn; quan sát mốc hỗ trợ nến 4H của ${targetList.join(', ')}.`;
        } else if (impactType === 'VOLATILE') {
          impactSummary = `Thị trường tiền số biến động mạnh theo tin tức vĩ mô; ưu tiên quản trị rủi ro và chia nhỏ DCA.`;
        } else {
          impactSummary = `Dòng tiền On-chain tích lũy chờ tín hiệu xác nhận xu hướng cho ${targetList.join(', ')}.`;
        }
      } else {
        if (impactType === 'BULLISH') {
          impactSummary = `Lực cầu và dòng tiền gia tăng tích cực, tạo động lực nâng đỡ kỳ vọng bứt phá cho nhóm ${targetList.join(', ')}.`;
        } else if (impactType === 'BEARISH') {
          impactSummary = `Áp lực bán tháo và điều chỉnh ngắn hạn gia tăng; cần quan sát kỹ các mốc hỗ trợ nến 4H của ${targetList.join(', ')}.`;
        } else if (impactType === 'VOLATILE') {
          impactSummary = `Thị trường xuất hiện rung lắc mạnh theo diễn biến tin tức; ưu tiên quản trị tỷ trọng và giải ngân chia nhỏ DCA.`;
        } else {
          impactSummary = `Dòng tiền đang ở trạng thái tích lũy thận trọng, tạo vùng đệm cân bằng cho ${targetList.join(', ')}.`;
        }
      }

      return {
        title: raw.title,
        source: raw.source || 'Tin tức Thị trường',
        timeAgo: 'Vừa cập nhật (Chu kỳ 4H)',
        impactedAssets: targetList,
        impactType,
        impactSummary,
        isCrypto,
      };
    };

    const cryptoPool: any[] = [];
    const stockPool: any[] = [];
    const seenTitles = new Set<string>();

    for (const raw of rawArticles) {
      if (!raw.title || seenTitles.has(raw.title)) continue;
      seenTitles.add(raw.title);
      const item = convertSingleArticle(raw);
      if (item.isCrypto) {
        cryptoPool.push(item);
      } else {
        stockPool.push(item);
      }
    }

    const results: any[] = [];
    let cIdx = 0;
    let sIdx = 0;

    // Guaranteed interleave: Crypto, Stock, Crypto, Stock, Crypto (or Stock)
    while (results.length < 5 && (cIdx < cryptoPool.length || sIdx < stockPool.length)) {
      if (results.length % 2 === 0 && cIdx < cryptoPool.length) {
        results.push(cryptoPool[cIdx++]);
      } else if (sIdx < stockPool.length) {
        results.push(stockPool[sIdx++]);
      } else if (cIdx < cryptoPool.length) {
        results.push(cryptoPool[cIdx++]);
      }
    }

    return res.status(200).json({
      success: true,
      data: results.map(({ isCrypto, ...rest }) => rest),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error fetching live news' });
  }
}
