// Historical Price Service - Real API integration for accurate previous close prices
import { Asset } from '../types';

// API Configuration (matching existing pattern from marketData.ts)
const API_CONFIG = {
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: process.env.EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY || '7168ZN2X4Z7K9ESM',
  },
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    apiKey: process.env.EXPO_PUBLIC_FINNHUB_API_KEY || 'd0tid51r01qlvahcb68gd0tid51r01qlvahcb690',
  },
  TWELVE_DATA: {
    baseUrl: 'https://api.twelvedata.com',
    apiKey: process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || 'ac8c3d8f4d1d4e1a8f3c8e8a8f3c8e8a',
  }
};

interface HistoricalPrice {
  symbol: string;
  date: string;
  close: number;
  source: string;
}

interface PreviousCloseData {
  symbol: string;
  previousClose: number;
  currentPrice: number;
  source: string;
  date: string;
}

/**
 * Get previous market close price for a single symbol using multiple API sources
 */
export async function getPreviousClosePrice(symbol: string, currentPrice: number, isMarketOpen: boolean): Promise<PreviousCloseData> {
  console.log(`🔍 Fetching previous close for ${symbol}, current: $${currentPrice}, market open: ${isMarketOpen}`);
  
  // Try different APIs in order of preference
  const apiAttempts = [
    () => fetchFromAlphaVantage(symbol),
    () => fetchFromFinnhub(symbol),
    () => fetchFromTwelveData(symbol)
  ];
  
  for (const fetchMethod of apiAttempts) {
    try {
      const result = await fetchMethod();
      if (result) {
        console.log(`✅ ${symbol}: Got real previous close $${result.close} from ${result.source}`);
        return {
          symbol,
          previousClose: result.close,
          currentPrice,
          source: result.source,
          date: result.date
        };
      }
    } catch (error) {
      console.warn(`⚠️ API attempt failed for ${symbol}:`, error);
    }
  }
  
  // All APIs failed, return conservative estimate as last resort
  console.warn(`❌ All APIs failed for ${symbol}, using conservative estimate`);
  const estimatedClose = isMarketOpen ? currentPrice * 0.998 : currentPrice * 0.995;
  
  return {
    symbol,
    previousClose: estimatedClose,
    currentPrice,
    source: 'Estimate (API Failed)',
    date: new Date().toISOString().split('T')[0]
  };
}

/**
 * Fetch previous close from Alpha Vantage Daily API
 */
async function fetchFromAlphaVantage(symbol: string): Promise<HistoricalPrice | null> {
  const url = `${API_CONFIG.ALPHA_VANTAGE.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.apiKey}`;
  
  console.log(`📊 Alpha Vantage: Fetching daily data for ${symbol}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alpha Vantage error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Check for API error
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage: ${data['Error Message']}`);
  }
  
  if (data['Note']) {
    throw new Error('Alpha Vantage: API call frequency limit reached');
  }
  
  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) {
    throw new Error('Alpha Vantage: No time series data found');
  }
  
  // Get the most recent trading day (not today)
  const dates = Object.keys(timeSeries).sort().reverse();
  
  if (dates.length < 2) {
    throw new Error('Alpha Vantage: Insufficient historical data');
  }
  
  // Skip today's date if present, get previous trading day
  const previousDate = dates[1] || dates[0];
  const previousData = timeSeries[previousDate];
  
  if (!previousData || !previousData['4. close']) {
    throw new Error('Alpha Vantage: Missing close price data');
  }
  
  const closePrice = parseFloat(previousData['4. close']);
  
  console.log(`📈 Alpha Vantage: ${symbol} previous close on ${previousDate}: $${closePrice}`);
  
  return {
    symbol,
    date: previousDate,
    close: closePrice,
    source: 'Alpha Vantage'
  };
}

/**
 * Fetch previous close from Finnhub Quote API (includes previous close)
 */
async function fetchFromFinnhub(symbol: string): Promise<HistoricalPrice | null> {
  const url = `${API_CONFIG.FINNHUB.baseUrl}/quote?symbol=${symbol}&token=${API_CONFIG.FINNHUB.apiKey}`;
  
  console.log(`📊 Finnhub: Fetching quote for ${symbol}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Finnhub error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Check for valid response
  if (!data || typeof data.pc !== 'number') {
    throw new Error('Finnhub: Invalid response format');
  }
  
  const previousClose = data.pc; // 'pc' is previous close in Finnhub API
  
  if (previousClose <= 0) {
    throw new Error('Finnhub: Invalid previous close price');
  }
  
  console.log(`📈 Finnhub: ${symbol} previous close: $${previousClose}`);
  
  return {
    symbol,
    date: new Date().toISOString().split('T')[0], // Current date for reference
    close: previousClose,
    source: 'Finnhub'
  };
}

/**
 * Fetch previous close from Twelve Data End of Day API
 */
async function fetchFromTwelveData(symbol: string): Promise<HistoricalPrice | null> {
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const url = `${API_CONFIG.TWELVE_DATA.baseUrl}/eod?symbol=${symbol}&date=${yesterdayStr}&apikey=${API_CONFIG.TWELVE_DATA.apiKey}`;
  
  console.log(`📊 Twelve Data: Fetching EOD for ${symbol} on ${yesterdayStr}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Twelve Data error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Check for API error
  if (data.status === 'error') {
    throw new Error(`Twelve Data: ${data.message}`);
  }
  
  if (!data.close) {
    throw new Error('Twelve Data: No close price data');
  }
  
  const closePrice = parseFloat(data.close);
  
  if (closePrice <= 0) {
    throw new Error('Twelve Data: Invalid close price');
  }
  
  console.log(`📈 Twelve Data: ${symbol} close on ${yesterdayStr}: $${closePrice}`);
  
  return {
    symbol,
    date: yesterdayStr,
    close: closePrice,
    source: 'Twelve Data'
  };
}

/**
 * Batch fetch previous close prices for multiple assets
 */
export async function getBatchPreviousClosePrices(assets: Asset[], isMarketOpen: boolean): Promise<Map<string, PreviousCloseData>> {
  console.log(`🔄 Batch fetching previous close prices for ${assets.length} assets...`);
  
  const results = new Map<string, PreviousCloseData>();
  
  // Process assets in parallel but with rate limiting
  const batchSize = 3; // Conservative batch size to respect API limits
  
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    
    const promises = batch.map(async (asset) => {
      try {
        const result = await getPreviousClosePrice(asset.symbol, asset.currentPrice, isMarketOpen);
        results.set(asset.symbol, result);
        return result;
      } catch (error) {
        console.error(`❌ Failed to fetch previous close for ${asset.symbol}:`, error);
        // Still add a fallback result
        const fallback: PreviousCloseData = {
          symbol: asset.symbol,
          previousClose: isMarketOpen ? asset.currentPrice * 0.998 : asset.currentPrice * 0.995,
          currentPrice: asset.currentPrice,
          source: 'Fallback',
          date: new Date().toISOString().split('T')[0]
        };
        results.set(asset.symbol, fallback);
        return fallback;
      }
    });
    
    await Promise.all(promises);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < assets.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  console.log(`✅ Batch fetch complete: ${results.size} results`);
  return results;
}

/**
 * Debug function to test API connectivity
 */
export async function testHistoricalPriceAPIs(): Promise<void> {
  console.log('\n=== Testing Historical Price APIs ===');
  
  const testSymbol = 'AAPL';
  const testPrice = 150.00;
  
  try {
    const result = await getPreviousClosePrice(testSymbol, testPrice, true);
    console.log('✅ Test Result:', result);
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
  
  console.log('=== Test Complete ===\n');
} 