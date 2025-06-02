import { MarketData, AssetCategory } from '../types';

// Market status interface
export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
  timezone: string;
  lastUpdated: string;
}

// Stock search interface
export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  price?: number;
}

// Cache interface
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// Configuration for different APIs with environment variables for security
const API_CONFIG = {
  // Alpha Vantage - Free tier: 25 requests per day
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: process.env.EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY || 'RIBXT3XGXZQT1S0L', // Fallback for development
    rateLimit: 5, // Conservative limit for demo
  },
  // Yahoo Finance v8 API - No authentication required
  YAHOO_FINANCE: {
    baseUrl: 'https://query2.finance.yahoo.com/v8/finance/chart',
    public: true, // No API key required
    rateLimit: 50, // Conservative limit
  },
  // Finnhub - Free tier: 60 calls per minute
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    apiKey: process.env.EXPO_PUBLIC_FINNHUB_API_KEY || 'cr9pr49r01qgdm3mqr7gcr9pr49r01qgdm3mqr80', // Fallback for development
    rateLimit: 30, // Conservative for demo
  },
  // Twelve Data - Free tier: 800 requests per day
  TWELVE_DATA: {
    baseUrl: 'https://api.twelvedata.com',
    apiKey: process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || 'ac8c3d8f4d1d4e1a8f3c8e8a8f3c8e8a', // Fallback for development
    rateLimit: 40,
  }
};

// In-memory cache
const cache = new Map<string, CacheEntry>();
const requestHistory: number[] = [];

// Cache duration constants (in milliseconds)
const CACHE_DURATIONS = {
  MARKET_DATA: 1000 * 60, // 1 minute for market data
  MARKET_STATUS: 1000 * 60 * 5, // 5 minutes for market status
  STOCK_SEARCH: 1000 * 60 * 60 * 24, // 24 hours for stock search results
  STOCK_QUOTE: 1000 * 30, // 30 seconds for individual quotes
};

// Rate limiting helper
const canMakeRequest = (rateLimit: number): boolean => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove old requests
  while (requestHistory.length > 0 && requestHistory[0] < oneMinuteAgo) {
    requestHistory.shift();
  }
  
  return requestHistory.length < rateLimit;
};

// Cache helpers
const getCacheKey = (prefix: string, ...parts: string[]): string => {
  return `${prefix}:${parts.join(':')}`;
};

const setCache = (key: string, data: any, duration: number): void => {
  try {
    const now = Date.now();
    cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + duration,
    });
  } catch (error) {
    console.warn('Cache set error:', error);
  }
};

const getCache = (key: string): any | null => {
  try {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.warn('Cache get error:', error);
    return null;
  }
};

// Market status detection
export const getMarketStatus = async (): Promise<MarketStatus> => {
  const cacheKey = getCacheKey('market_status', 'US');
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // Get current time in Eastern Time (NYSE timezone) using a more reliable method
    const now = new Date();
    
    // Validate that we have a valid date
    if (isNaN(now.getTime())) {
      throw new Error('Invalid current date');
    }
    
    // Calculate Eastern Time offset (EST = UTC-5, EDT = UTC-4)
    // This is a simplified approach - in production, consider using a timezone library
    const easternOffset = -5; // EST offset in hours (will be -4 during EDT)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const easternTime = new Date(utc + (easternOffset * 3600000));
    
    // Validate eastern time calculation
    if (isNaN(easternTime.getTime())) {
      throw new Error('Invalid eastern time calculation');
    }
    
    // Check if we're in daylight saving time (second Sunday in March to first Sunday in November)
    const year = now.getFullYear();
    const marchSecondSunday = new Date(year, 2, 8 + (7 - new Date(year, 2, 8).getDay()) % 7);
    const novemberFirstSunday = new Date(year, 10, 1 + (7 - new Date(year, 10, 1).getDay()) % 7);
    
    // Validate DST calculation dates
    if (isNaN(marchSecondSunday.getTime()) || isNaN(novemberFirstSunday.getTime())) {
      throw new Error('Invalid DST calculation');
    }
    
    const isDST = now >= marchSecondSunday && now < novemberFirstSunday;
    const adjustedEasternTime = isDST ? new Date(easternTime.getTime() + 3600000) : easternTime;
    
    // Final validation of adjusted time
    if (isNaN(adjustedEasternTime.getTime())) {
      throw new Error('Invalid adjusted eastern time');
    }
    
    const currentHour = adjustedEasternTime.getHours();
    const currentMinute = adjustedEasternTime.getMinutes();
    const currentDay = adjustedEasternTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Validate extracted time components
    if (currentHour < 0 || currentHour > 23 || currentMinute < 0 || currentMinute > 59 || currentDay < 0 || currentDay > 6) {
      throw new Error('Invalid time components');
    }
    
    // Market is open Monday-Friday, 9:30 AM - 4:00 PM ET
    const isWeekday = currentDay >= 1 && currentDay <= 5;
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
    const marketCloseMinutes = 16 * 60; // 4:00 PM
    
    const isInTradingHours = currentTimeInMinutes >= marketOpenMinutes && currentTimeInMinutes < marketCloseMinutes;
    const isOpen = isWeekday && isInTradingHours;
    
    // Calculate next open/close times
    let nextOpen: string | undefined;
    let nextClose: string | undefined;
    
    if (isOpen) {
      // Market is open, calculate when it closes today
      const closeTime = new Date(adjustedEasternTime);
      closeTime.setHours(16, 0, 0, 0);
      
      // Validate close time
      if (isNaN(closeTime.getTime())) {
        throw new Error('Invalid close time calculation');
      }
      
      nextClose = closeTime.toISOString();
    } else {
      // Market is closed, calculate when it opens next
      const openTime = new Date(adjustedEasternTime);
      
      if (isWeekday && currentTimeInMinutes < marketOpenMinutes) {
        // Same day, before market open
        openTime.setHours(9, 30, 0, 0);
      } else {
        // After hours or weekend - next business day
        let daysUntilOpen = 1;
        if (currentDay === 5) daysUntilOpen = 3; // Friday -> Monday
        else if (currentDay === 6) daysUntilOpen = 2; // Saturday -> Monday
        else if (currentDay === 0) daysUntilOpen = 1; // Sunday -> Monday
        
        openTime.setDate(openTime.getDate() + daysUntilOpen);
        openTime.setHours(9, 30, 0, 0);
      }
      
      // Validate open time
      if (isNaN(openTime.getTime())) {
        throw new Error('Invalid open time calculation');
      }
      
      nextOpen = openTime.toISOString();
    }

    const marketStatus: MarketStatus = {
      isOpen,
      nextOpen,
      nextClose,
      timezone: 'America/New_York',
      lastUpdated: new Date().toISOString(),
    };

    setCache(cacheKey, marketStatus, CACHE_DURATIONS.MARKET_STATUS);
    return marketStatus;
  } catch (error) {
    console.error('Error getting market status:', error);
    // Return a fallback status with current time
    const now = new Date();
    const currentHour = now.getUTCHours() - 5; // Rough EST approximation
    const isLikelyOpen = currentHour >= 9 && currentHour < 16 && now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
    
    return {
      isOpen: isLikelyOpen,
      timezone: 'America/New_York',
      lastUpdated: new Date().toISOString(),
    };
  }
};

// Live stock search using multiple APIs - NO hardcoded data
export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  if (!query || query.length < 1) return [];
  
  const cacheKey = getCacheKey('stock_search', query.toLowerCase());
  const cached = getCache(cacheKey);
  if (cached) return cached;

  console.log(`🔍 Searching for assets matching "${query}" via live APIs...`);
  
  const results: StockSearchResult[] = [];
  
  // Try Alpha Vantage symbol search first
  try {
    const alphaResults = await searchViaAlphaVantage(query);
    results.push(...alphaResults);
    console.log(`✅ Found ${alphaResults.length} results from Alpha Vantage`);
  } catch (error) {
    console.warn('Alpha Vantage search failed:', error);
  }
  
  // Try Finnhub symbol search
  try {
    const finnhubResults = await searchViaFinnhub(query);
    results.push(...finnhubResults);
    console.log(`✅ Found ${finnhubResults.length} results from Finnhub`);
  } catch (error) {
    console.warn('Finnhub search failed:', error);
  }
  
  // Try Twelve Data search
  try {
    const twelveDataResults = await searchViaTwelveData(query);
    results.push(...twelveDataResults);
    console.log(`✅ Found ${twelveDataResults.length} results from Twelve Data`);
  } catch (error) {
    console.warn('Twelve Data search failed:', error);
  }
  
  // Remove duplicates based on symbol
  const uniqueResults = results.filter((result, index, self) => 
    index === self.findIndex(r => r.symbol === result.symbol)
  );
  
  // Sort by relevance
  const sortedResults = uniqueResults.sort((a, b) => {
    const queryLower = query.toLowerCase();
    
    // Exact symbol match gets highest priority
    if (a.symbol.toLowerCase() === queryLower) return -1;
    if (b.symbol.toLowerCase() === queryLower) return 1;
    
    // Symbol starts with query gets next priority
    if (a.symbol.toLowerCase().startsWith(queryLower) && !b.symbol.toLowerCase().startsWith(queryLower)) return -1;
    if (b.symbol.toLowerCase().startsWith(queryLower) && !a.symbol.toLowerCase().startsWith(queryLower)) return 1;
    
    // Name contains query
    if (a.name.toLowerCase().includes(queryLower) && !b.name.toLowerCase().includes(queryLower)) return -1;
    if (b.name.toLowerCase().includes(queryLower) && !a.name.toLowerCase().includes(queryLower)) return 1;
    
    return a.symbol.localeCompare(b.symbol);
  });

  const finalResults = sortedResults.slice(0, 50); // Top 50 results
  setCache(cacheKey, finalResults, CACHE_DURATIONS.STOCK_SEARCH);
  
  console.log(`📊 Returning ${finalResults.length} unique assets for "${query}"`);
  return finalResults;
};

// Live search via Alpha Vantage Symbol Search API
const searchViaAlphaVantage = async (query: string): Promise<StockSearchResult[]> => {
  if (!canMakeRequest(5)) return []; // Conservative rate limiting
  
  const url = `${API_CONFIG.ALPHA_VANTAGE.baseUrl}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_CONFIG.ALPHA_VANTAGE.apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alpha Vantage search error: ${response.status}`);
  
  const data = await response.json();
  const results: StockSearchResult[] = [];
  
  if (data.bestMatches && Array.isArray(data.bestMatches)) {
    data.bestMatches.forEach((match: any) => {
      results.push({
        symbol: match['1. symbol'] || '',
        name: match['2. name'] || '',
        type: match['3. type'] || 'Equity',
        region: match['4. region'] || 'US',
        marketOpen: '09:30',
        marketClose: '16:00',
        timezone: 'US/Eastern',
        currency: match['8. currency'] || 'USD'
      });
    });
  }
  
  return results.slice(0, 20); // Limit results
};

// Live search via Finnhub Symbol Lookup API
const searchViaFinnhub = async (query: string): Promise<StockSearchResult[]> => {
  if (!canMakeRequest(10)) return []; // Conservative rate limiting
  
  const url = `${API_CONFIG.FINNHUB.baseUrl}/search?q=${encodeURIComponent(query)}&token=${API_CONFIG.FINNHUB.apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Finnhub search error: ${response.status}`);
  
  const data = await response.json();
  const results: StockSearchResult[] = [];
  
  if (data.result && Array.isArray(data.result)) {
    data.result.forEach((match: any) => {
      results.push({
        symbol: match.symbol || '',
        name: match.description || match.displaySymbol || '',
        type: match.type || 'Common Stock',
        region: 'US',
        marketOpen: '09:30',
        marketClose: '16:00',
        timezone: 'US/Eastern',
        currency: 'USD'
      });
    });
  }
  
  return results.slice(0, 20); // Limit results
};

// Live search via Twelve Data Symbol Search API
const searchViaTwelveData = async (query: string): Promise<StockSearchResult[]> => {
  if (!canMakeRequest(15)) return []; // Conservative rate limiting
  
  const url = `${API_CONFIG.TWELVE_DATA.baseUrl}/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${API_CONFIG.TWELVE_DATA.apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Twelve Data search error: ${response.status}`);
  
  const data = await response.json();
  const results: StockSearchResult[] = [];
  
  if (data.data && Array.isArray(data.data)) {
    data.data.forEach((match: any) => {
      results.push({
        symbol: match.symbol || '',
        name: match.instrument_name || match.security_name || '',
        type: match.instrument_type || 'Common Stock',
        region: match.country || 'US',
        marketOpen: '09:30',
        marketClose: '16:00',
        timezone: match.timezone || 'US/Eastern',
        currency: match.currency || 'USD'
      });
    });
  }
  
  return results.slice(0, 20); // Limit results
};

// Get real-time or cached stock quote
export const getStockQuote = async (symbol: string): Promise<MarketData | null> => {
  const cacheKey = getCacheKey('stock_quote', symbol);
  const cached = getCache(cacheKey);
  
  const marketStatus = await getMarketStatus();
  
  // If market is closed, use longer cache duration
  const cacheDuration = marketStatus.isOpen ? CACHE_DURATIONS.STOCK_QUOTE : CACHE_DURATIONS.MARKET_DATA;
  
  // Check if we have valid cached data
  if (cached && (!marketStatus.isOpen || (Date.now() - (cached.timestamp || 0)) < cacheDuration)) {
    console.log(`📄 Using cached data for ${symbol}: $${cached.price?.toFixed(2) || 'N/A'}`);
    return cached;
  }

  // Clear old cache when market status changes or data is stale
  if (cached) {
    console.log(`🔄 Cache expired for ${symbol}, fetching fresh data...`);
  }

  try {
    // Try to get real data from APIs
    const quote = await fetchQuoteFromAPI(symbol);
    if (quote) {
      console.log(`💾 Caching real data for ${symbol}`);
      setCache(cacheKey, quote, cacheDuration);
      return quote;
    }
  } catch (error) {
    console.error(`❌ Error fetching real data for ${symbol}:`, error);
  }

  // Check if we have any cached data (even if stale) before falling back to mock
  if (cached) {
    console.log(`⚠️ Using stale cached data for ${symbol} as fallback`);
    return cached;
  }

  // No mock data fallback - return null to force proper error handling
  console.warn(`❌ No real data available for ${symbol} from any API - returning null`);
  return null;
};

// API integration with multiple fallbacks
const fetchQuoteFromAPI = async (symbol: string): Promise<MarketData | null> => {
  console.log(`🔍 Attempting to fetch real market data for ${symbol}...`);
  
  // Try Alpha Vantage first (most reliable free tier)
  try {
    const quote = await Promise.race([
      fetchFromAlphaVantage(symbol),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000))
    ]);
    if (quote) {
      console.log(`✅ Got real data from Alpha Vantage for ${symbol}: $${quote.price.toFixed(2)}`);
      return quote;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Alpha Vantage failed or timed out:', errorMessage);
  }

  // Try Yahoo Finance v8 with timeout
  try {
    const quote = await Promise.race([
      fetchFromYahooFinance(symbol),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    if (quote) {
      console.log(`✅ Got real data from Yahoo Finance for ${symbol}: $${quote.price.toFixed(2)}`);
      return quote;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Yahoo Finance failed or timed out:', errorMessage);
  }

  // Try Finnhub with timeout
  try {
    const quote = await Promise.race([
      fetchFromFinnhub(symbol),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    if (quote) {
      console.log(`✅ Got real data from Finnhub for ${symbol}: $${quote.price.toFixed(2)}`);
      return quote;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Finnhub failed or timed out:', errorMessage);
  }

  // Try Twelve Data with timeout
  try {
    const quote = await Promise.race([
      fetchFromTwelveData(symbol),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    if (quote) {
      console.log(`✅ Got real data from Twelve Data for ${symbol}: $${quote.price.toFixed(2)}`);
      return quote;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Twelve Data failed or timed out:', errorMessage);
  }

  // Try free public API (no authentication required) as final fallback
  try {
    const quote = await Promise.race([
      fetchFromFreeAPI(symbol),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    if (quote) {
      console.log(`✅ Got real data from Free API for ${symbol}: $${quote.price.toFixed(2)}`);
      return quote;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Free API failed or timed out:', errorMessage);
  }

  console.warn(`⚠️ All APIs failed for ${symbol}, will use realistic fallback data`);
  return null;
};

// Yahoo Finance v8 API integration - Updated endpoint
const fetchFromYahooFinance = async (symbol: string): Promise<MarketData | null> => {
  if (!canMakeRequest(API_CONFIG.YAHOO_FINANCE.rateLimit)) {
    throw new Error('Yahoo Finance rate limit reached');
  }

  requestHistory.push(Date.now());
  
  const url = `${API_CONFIG.YAHOO_FINANCE.baseUrl}/${symbol}?interval=1d&range=1d`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.chart && data.chart.result && data.chart.result.length > 0) {
    const result = data.chart.result[0];
    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose;
    
    if (currentPrice && currentPrice > 0) {
      const change = currentPrice - previousClose;
      const changePercentage = ((change / previousClose) * 100);
      
      return {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change: change,
        changePercentage: changePercentage,
        lastUpdated: new Date().toISOString(),
      };
    }
  }
  
  return null;
};

// Finnhub API integration
const fetchFromFinnhub = async (symbol: string): Promise<MarketData | null> => {
  if (!canMakeRequest(API_CONFIG.FINNHUB.rateLimit)) {
    throw new Error('Finnhub rate limit reached');
  }

  requestHistory.push(Date.now());
  
  const url = `${API_CONFIG.FINNHUB.baseUrl}/quote?symbol=${symbol}&token=${API_CONFIG.FINNHUB.apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.c && data.c > 0) { // c = current price
    const currentPrice = data.c;
    const change = data.d || 0; // d = change
    const changePercentage = data.dp || 0; // dp = percent change
    
      return {
        symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: change,
      changePercentage: changePercentage,
        lastUpdated: new Date().toISOString(),
      };
  }
  
  return null;
};

// Alpha Vantage API integration - Enhanced
const fetchFromAlphaVantage = async (symbol: string): Promise<MarketData | null> => {
  if (!canMakeRequest(API_CONFIG.ALPHA_VANTAGE.rateLimit)) {
    throw new Error('Alpha Vantage rate limit reached');
  }

  requestHistory.push(Date.now());
  
  const url = `${API_CONFIG.ALPHA_VANTAGE.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Check for the correct Alpha Vantage response structure
  const quote = data['Global Quote'];
  if (quote && quote['05. price']) {
    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']) || 0;
    const changePercentString = quote['10. change percent'] || '0%';
    const changePercentage = parseFloat(changePercentString.replace('%', '')) || 0;
    
    if (price && price > 0) {
      return {
        symbol: symbol.toUpperCase(),
        price,
        change,
        changePercentage,
        lastUpdated: new Date().toISOString(),
      };
    }
  }
  
  return null;
};

// Twelve Data API integration (backup)
const fetchFromTwelveData = async (symbol: string): Promise<MarketData | null> => {
  if (!canMakeRequest(API_CONFIG.TWELVE_DATA.rateLimit)) {
    throw new Error('Twelve Data rate limit reached');
  }

  requestHistory.push(Date.now());
  
  const url = `${API_CONFIG.TWELVE_DATA.baseUrl}/quote?symbol=${symbol}&apikey=${API_CONFIG.TWELVE_DATA.apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Twelve Data API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.close && parseFloat(data.close) > 0) {
    const price = parseFloat(data.close);
    const change = parseFloat(data.change) || 0;
    const changePercentage = parseFloat(data.percent_change) || 0;
    
    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercentage,
      lastUpdated: new Date().toISOString(),
    };
  }
  
    return null;
};

// Free public API (no authentication required) - Final fallback
const fetchFromFreeAPI = async (symbol: string): Promise<MarketData | null> => {
  // Using a free public API that doesn't require authentication
  const url = `https://api.fcsapi.com/stock/latest?symbol=${symbol}&access_key=fcsapi_demo`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Free API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.response && data.response.length > 0) {
    const quote = data.response[0];
    const price = parseFloat(quote.c) || parseFloat(quote.price);
    const change = parseFloat(quote.ch) || 0;
    const changePercentage = parseFloat(quote.cp) || 0;
    
    if (price && price > 0) {
  return {
    symbol: symbol.toUpperCase(),
        price,
        change,
        changePercentage,
    lastUpdated: new Date().toISOString(),
  };
    }
  }
  
  return null;
};

// Legacy function for backward compatibility
export const getMarketData = async (symbol: string): Promise<MarketData | null> => {
  return getStockQuote(symbol);
};

// Batch update function for portfolio
export const updateMarketPrices = async (symbols: string[]): Promise<MarketData[]> => {
  const results: MarketData[] = [];
  
  // Process in smaller batches to respect rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const batchPromises = batch.map(symbol => getStockQuote(symbol));
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(result => {
      if (result) results.push(result);
    });
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};

// Get asset suggestions by category using live API search
export const getAssetSuggestions = async (category: AssetCategory): Promise<string[]> => {
  try {
  switch (category) {
    case AssetCategory.STOCKS:
        // Search for popular stock symbols dynamically
        const stockQueries = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Tesla'];
        const stockResults = await Promise.all(
          stockQueries.map(query => searchStocks(query))
        );
        return stockResults.flat().map(result => result.symbol).slice(0, 10);
        
    case AssetCategory.CRYPTOCURRENCY:
        // For crypto, we could use a crypto API or return commonly traded symbols
        return ['BTC-USD', 'ETH-USD', 'ADA-USD', 'DOT-USD', 'LINK-USD'];
        
    case AssetCategory.FOREIGN_CURRENCY:
        // Currency pairs - these are standard forex symbols
        return ['EURUSD=X', 'GBPUSD=X', 'JPYUSD=X', 'CADUSD=X', 'AUDUSD=X'];
        
    case AssetCategory.GOLD:
        // Precious metals symbols
        return ['GC=F', 'SI=F', 'PL=F', 'PA=F']; // Gold, Silver, Platinum, Palladium futures
        
    case AssetCategory.MUTUAL_FUNDS:
        // Search for popular ETF symbols dynamically
        const etfQueries = ['SPY', 'QQQ', 'VTI', 'VOO', 'IWM'];
        const etfResults = await Promise.all(
          etfQueries.map(query => searchStocks(query))
        );
        return etfResults.flat().map(result => result.symbol).slice(0, 10);
        
    default:
        return [];
    }
  } catch (error) {
    console.error('Error getting asset suggestions:', error);
    // Return empty array instead of fallback static data
      return [];
  }
};

// Force refresh function for manual refresh (clears cache)
export const forceRefreshMarketData = async (symbols: string[]): Promise<MarketData[]> => {
  console.log('🔄 Force refreshing market data (clearing cache)...');
  
  // Clear cache for all requested symbols
  symbols.forEach(symbol => {
    const cacheKey = getCacheKey('stock_quote', symbol);
    cache.delete(cacheKey);
  });
  
  // Also clear market status cache to get fresh market status
  cache.delete(getCacheKey('market_status', 'US'));
  
  // Fetch fresh data
  return updateMarketPrices(symbols);
};

// Clear cache function for manual refresh
export const clearCache = (): void => {
  console.log('🗑️ Clearing all market data cache...');
  cache.clear();
  requestHistory.length = 0;
};

// Clear only market data cache (keeps other cache)
export const clearMarketDataCache = (): void => {
  console.log('🗑️ Clearing market data cache...');
  
  // Clear only market data related cache entries
  const keysToDelete: string[] = [];
  for (const [key] of cache) {
    if (key.startsWith('stock_quote:') || key.startsWith('market_status:')) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  requestHistory.length = 0;
};

// Get cache statistics for debugging
export const getCacheStats = (): { size: number; entries: string[] } => {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
}; 