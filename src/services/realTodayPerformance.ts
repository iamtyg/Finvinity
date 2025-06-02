import { Asset } from '../types';
import { getMarketStatus } from './marketData';
import { getBatchPreviousClosePrices } from './historicalPriceService';

/**
 * Calculate today's performance using REAL historical market data from APIs
 * - Market OPEN: Current Value - Previous Market Close (real API prices)
 * - Market CLOSED: Last Market Close - Previous Market Close (real API prices)
 */
export const calculateRealTodayPerformance = async (assets: Asset[]) => {
  if (assets.length === 0) {
    return {
      change: 0,
      changePercentage: 0,
      startValue: 0,
      currentValue: 0,
      isMarketOpen: false,
      debug: 'No assets'
    };
  }

  try {
    console.log('🔍 Starting REAL today performance calculation with API data...');
    
    // Get current market status
    const marketStatus = await getMarketStatus();
    const isMarketOpen = marketStatus.isOpen;
    
    console.log('📊 Market Status:', isMarketOpen ? 'OPEN' : 'CLOSED');
    
    // Calculate current portfolio value with real current prices
    const currentPortfolioValue = calculateCurrentRealPortfolioValue(assets);
    console.log('💰 Current Portfolio Value:', currentPortfolioValue);
    
    // Get REAL previous close prices from APIs
    const previousClosePrices = await getBatchPreviousClosePrices(assets, isMarketOpen);
    
    // Calculate previous close portfolio value using REAL historical data
    const previousCloseValue = calculatePreviousClosePortfolioValueWithRealData(assets, previousClosePrices);
    console.log('📈 Previous Close Value (REAL DATA):', previousCloseValue);
    
    // Log the sources used
    logDataSources(previousClosePrices);
    
    // Calculate change
    const change = currentPortfolioValue - previousCloseValue;
    const changePercentage = previousCloseValue > 0 ? (change / previousCloseValue) * 100 : 0;
    
    console.log('📊 Today Change (REAL):', change);
    console.log('📊 Today Change % (REAL):', changePercentage);
    
    return {
      change,
      changePercentage,
      startValue: previousCloseValue,
      currentValue: currentPortfolioValue,
      isMarketOpen,
      debug: `Market: ${isMarketOpen ? 'OPEN' : 'CLOSED'}, Current: ${currentPortfolioValue}, Previous: ${previousCloseValue} (REAL API DATA)`
    };
    
  } catch (error) {
    console.error('❌ Error calculating real today performance:', error);
    
    // Fallback to simple calculation using current prices
    return calculateSimpleFallback(assets);
  }
};

/**
 * Calculate current portfolio value using real current market prices
 */
function calculateCurrentRealPortfolioValue(assets: Asset[]): number {
  let totalValue = 0;
  
  assets.forEach(asset => {
    // Calculate total shares from transactions
    let totalShares = 0;
    
    asset.transactions.forEach(transaction => {
      if (transaction.type === 'buy') {
        totalShares += transaction.amount;
      } else if (transaction.type === 'sell') {
        totalShares -= transaction.amount;
      }
    });
    
    // Use current market price (this is real-time from API)
    if (totalShares > 0) {
      const value = totalShares * asset.currentPrice;
      totalValue += value;
      
      console.log(`📈 ${asset.symbol}: ${totalShares} shares × $${asset.currentPrice} (current) = $${value}`);
    }
  });
  
  return totalValue;
}

/**
 * Calculate portfolio value at previous market close using REAL historical prices from APIs
 */
function calculatePreviousClosePortfolioValueWithRealData(assets: Asset[], previousClosePrices: Map<string, any>): number {
  let totalValue = 0;
  
  console.log('🔍 Calculating previous close portfolio value with REAL API data...');
  
  assets.forEach(asset => {
    // Calculate total shares from transactions
    let totalShares = 0;
    
    asset.transactions.forEach(transaction => {
      if (transaction.type === 'buy') {
        totalShares += transaction.amount;
      } else if (transaction.type === 'sell') {
        totalShares -= transaction.amount;
      }
    });
    
    if (totalShares > 0) {
      const priceData = previousClosePrices.get(asset.symbol);
      
      if (priceData) {
        const previousClosePrice = priceData.previousClose;
        const value = totalShares * previousClosePrice;
        totalValue += value;
        
        console.log(`📊 ${asset.symbol}: ${totalShares} shares × $${previousClosePrice.toFixed(2)} (${priceData.source}) = $${value.toFixed(2)}`);
      } else {
        // This shouldn't happen with the batch fetch, but handle gracefully
        console.warn(`⚠️ No price data found for ${asset.symbol}, skipping`);
      }
    }
  });
  
  return totalValue;
}

/**
 * Log the data sources used for transparency
 */
function logDataSources(previousClosePrices: Map<string, any>): void {
  console.log('\n=== DATA SOURCES USED ===');
  
  const sources = new Map<string, number>();
  
  previousClosePrices.forEach((priceData, symbol) => {
    console.log(`${symbol}: ${priceData.source} (${priceData.date})`);
    sources.set(priceData.source, (sources.get(priceData.source) || 0) + 1);
  });
  
  console.log('\n📊 Source Summary:');
  sources.forEach((count, source) => {
    console.log(`  ${source}: ${count} assets`);
  });
  
  // Check if any estimations were used
  const hasEstimates = Array.from(sources.keys()).some(source => 
    source.includes('Estimate') || source.includes('Fallback')
  );
  
  if (hasEstimates) {
    console.warn('⚠️ WARNING: Some estimates were used - API limits may have been reached');
  } else {
    console.log('✅ ALL DATA FROM REAL APIs - No estimations used!');
  }
  
  console.log('=== END DATA SOURCES ===\n');
}

/**
 * Simple fallback calculation when API calls fail
 */
function calculateSimpleFallback(assets: Asset[]) {
  console.log('⚠️ Using fallback calculation - API calls failed');
  
  let currentValue = 0;
  let estimatedPreviousValue = 0;
  
  assets.forEach(asset => {
    let totalShares = 0;
    
    asset.transactions.forEach(transaction => {
      if (transaction.type === 'buy') {
        totalShares += transaction.amount;
      } else if (transaction.type === 'sell') {
        totalShares -= transaction.amount;
      }
    });
    
    if (totalShares > 0) {
      const currentAssetValue = totalShares * asset.currentPrice;
      currentValue += currentAssetValue;
      
      // Estimate previous value (assume 0.5% daily change)
      const estimatedPrevPrice = asset.currentPrice * 0.995;
      estimatedPreviousValue += totalShares * estimatedPrevPrice;
    }
  });
  
  const change = currentValue - estimatedPreviousValue;
  const changePercentage = estimatedPreviousValue > 0 ? (change / estimatedPreviousValue) * 100 : 0;
  
  return {
    change,
    changePercentage,
    startValue: estimatedPreviousValue,
    currentValue,
    isMarketOpen: false,
    debug: 'Fallback calculation used - API error'
  };
}

/**
 * Debug function to log calculation details
 */
export function debugTodayCalculation(assets: Asset[]) {
  console.log('\n=== DEBUG: Today Performance Calculation ===');
  
  assets.forEach(asset => {
    let totalShares = 0;
    let totalCost = 0;
    
    console.log(`\n📊 Asset: ${asset.symbol} (${asset.name})`);
    console.log(`💰 Current Price: $${asset.currentPrice}`);
    
    asset.transactions.forEach(transaction => {
      console.log(`  ${transaction.type}: ${transaction.amount} shares @ $${transaction.price} on ${transaction.date}`);
      
      if (transaction.type === 'buy') {
        totalShares += transaction.amount;
        totalCost += transaction.amount * transaction.price;
      } else if (transaction.type === 'sell') {
        totalShares -= transaction.amount;
        totalCost -= transaction.amount * transaction.price;
      }
    });
    
    console.log(`📋 Total Shares: ${totalShares}`);
    console.log(`💵 Current Value: $${(totalShares * asset.currentPrice).toFixed(2)}`);
    console.log(`💸 Total Cost: $${totalCost.toFixed(2)}`);
  });
  
  console.log('\n=== END DEBUG ===\n');
} 