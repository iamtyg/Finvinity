import { ChartDataPoint, Asset } from '../types';

// Generate mock historical data for an asset
export const generateHistoricalData = (asset: Asset, days: number = 30): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Start with the current price and work backwards
  let currentPrice = asset.currentPrice;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Add some realistic price movement (±2% daily volatility)
    const volatility = asset.category === 'cryptocurrency' ? 0.05 : 0.02; // Crypto is more volatile
    const change = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = currentPrice * (1 + change);
    
    // Ensure price doesn't go negative
    currentPrice = Math.max(currentPrice, 0.01);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: currentPrice
    });
  }
  
  // Adjust the last point to match current price
  if (data.length > 0) {
    data[data.length - 1].value = asset.currentPrice;
  }
  
  return data;
};

// Generate portfolio performance data
export const generatePortfolioHistoricalData = (assets: Asset[], days: number = 30): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Generate historical data for each asset
  const assetHistoricalData = assets.map(asset => generateHistoricalData(asset, days));
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Calculate total portfolio value for this day
    let totalValue = 0;
    assetHistoricalData.forEach((assetData, assetIndex) => {
      const asset = assets[assetIndex];
      const dayPrice = assetData[i]?.value || asset.currentPrice;
      
      // Calculate total shares for this asset
      let totalShares = 0;
      asset.transactions.forEach(transaction => {
        if (transaction.type === 'buy') {
          totalShares += transaction.amount;
        } else {
          totalShares -= transaction.amount;
        }
      });
      
      totalValue += totalShares * dayPrice;
    });
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: totalValue
    });
  }
  
  return data;
};

// Get performance metrics from historical data
export const getPerformanceMetrics = (data: ChartDataPoint[]) => {
  if (data.length < 2) {
    return {
      totalReturn: 0,
      totalReturnPercentage: 0,
      dailyChange: 0,
      dailyChangePercentage: 0,
      weeklyChange: 0,
      weeklyChangePercentage: 0,
      monthlyChange: 0,
      monthlyChangePercentage: 0,
    };
  }
  
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  const previousValue = data.length > 1 ? data[data.length - 2].value : firstValue;
  const weekAgoValue = data.length > 7 ? data[data.length - 8].value : firstValue;
  const monthAgoValue = data.length > 30 ? data[data.length - 31].value : firstValue;
  
  return {
    totalReturn: lastValue - firstValue,
    totalReturnPercentage: firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0,
    dailyChange: lastValue - previousValue,
    dailyChangePercentage: previousValue > 0 ? ((lastValue - previousValue) / previousValue) * 100 : 0,
    weeklyChange: lastValue - weekAgoValue,
    weeklyChangePercentage: weekAgoValue > 0 ? ((lastValue - weekAgoValue) / weekAgoValue) * 100 : 0,
    monthlyChange: lastValue - monthAgoValue,
    monthlyChangePercentage: monthAgoValue > 0 ? ((lastValue - monthAgoValue) / monthAgoValue) * 100 : 0,
  };
}; 