import { Asset, Transaction, TransactionType, AssetHolding, Portfolio } from '../types';

export const calculateAssetHolding = (asset: Asset): AssetHolding => {
  let totalShares = 0;
  let totalCost = 0;
  let totalSold = 0;
  let totalSoldValue = 0;

  asset.transactions.forEach((transaction) => {
    if (transaction.type === TransactionType.BUY) {
      totalShares += transaction.amount;
      totalCost += transaction.amount * transaction.price;
    } else {
      totalShares -= transaction.amount;
      totalSold += transaction.amount;
      totalSoldValue += transaction.amount * transaction.price;
    }
  });

  // Ensure we don't have negative shares due to calculation errors
  totalShares = Math.max(0, totalShares);
  
  // Calculate average buy price based on total purchases
  const totalBought = totalShares + totalSold;
  const averageBuyPrice = totalBought > 0 ? totalCost / totalBought : 0;
  
  const currentValue = totalShares * asset.currentPrice;
  
  // Total investment is what we spent minus what we got back from sales
  const totalInvestment = totalCost - totalSoldValue;
  
  // For holdings, gain/loss is current value minus remaining investment
  const remainingCostBasis = totalShares * averageBuyPrice;
  const gainLoss = currentValue - remainingCostBasis;
  const gainLossPercentage = remainingCostBasis > 0 ? (gainLoss / remainingCostBasis) * 100 : 0;

  return {
    asset,
    totalShares,
    averageBuyPrice,
    currentValue,
    gainLoss,
    gainLossPercentage,
  };
};

export const calculatePortfolio = (assets: Asset[]): Portfolio => {
  const holdings = assets.map(calculateAssetHolding);
  
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalGainLoss = holdings.reduce((sum, holding) => sum + holding.gainLoss, 0);
  
  // Calculate total investment as sum of current cost basis for all holdings
  const totalInvestment = holdings.reduce((sum, holding) => {
    return sum + (holding.totalShares * holding.averageBuyPrice);
  }, 0);
  
  const totalGainLossPercentage = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  return {
    totalValue,
    totalGainLoss,
    totalGainLossPercentage,
    assets,
  };
};

// New function to calculate detailed portfolio performance metrics
export const calculatePortfolioPerformance = (assets: Asset[]) => {
  const holdings = assets.map(calculateAssetHolding);
  
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalGainLoss = holdings.reduce((sum, holding) => sum + holding.gainLoss, 0);
  const totalInvestment = holdings.reduce((sum, holding) => {
    return sum + (holding.totalShares * holding.averageBuyPrice);
  }, 0);
  
  const gainLossPercentage = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
  
  // Calculate allocation percentages
  const allocations = holdings.map(holding => ({
    asset: holding.asset,
    value: holding.currentValue,
    percentage: totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0,
    gainLoss: holding.gainLoss,
    gainLossPercentage: holding.gainLossPercentage
  }));
  
  // Sort by value for performance ranking
  const performanceRanking = [...allocations].sort((a, b) => b.gainLossPercentage - a.gainLossPercentage);
  
  return {
    totalValue,
    totalInvestment,
    totalGainLoss,
    gainLossPercentage,
    allocations,
    performanceRanking,
    numberOfAssets: assets.length,
    activeHoldings: holdings.filter(h => h.totalShares > 0).length
  };
};

// Helper function to get performance trend
export const getPerformanceTrend = (gainLossPercentage: number): 'up' | 'down' | 'neutral' => {
  if (gainLossPercentage > 0.1) return 'up';
  if (gainLossPercentage < -0.1) return 'down';
  return 'neutral';
};

// Helper function to format large numbers
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const sortAssets = (
  assets: Asset[],
  sortBy: 'name' | 'value' | 'gainLoss' | 'date',
  sortOrder: 'asc' | 'desc' = 'desc'
): Asset[] => {
  const holdings = assets.map(calculateAssetHolding);
  
  const sorted = holdings.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.asset.name.localeCompare(b.asset.name);
        break;
      case 'value':
        comparison = a.currentValue - b.currentValue;
        break;
      case 'gainLoss':
        comparison = a.gainLoss - b.gainLoss;
        break;
      case 'date':
        comparison = new Date(a.asset.updatedAt).getTime() - new Date(b.asset.updatedAt).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return sorted.map(holding => holding.asset);
};

// New function to get current holdings for an asset
export const getCurrentHoldings = (asset: Asset): number => {
  let totalShares = 0;
  
  asset.transactions.forEach((transaction) => {
    if (transaction.type === TransactionType.BUY) {
      totalShares += transaction.amount;
    } else {
      totalShares -= transaction.amount;
    }
  });

  return Math.max(0, totalShares);
};

// New function to validate sell transaction
export const validateSellTransaction = (asset: Asset, sellAmount: number): { isValid: boolean; availableShares: number; message?: string } => {
  const availableShares = getCurrentHoldings(asset);
  
  if (sellAmount <= 0) {
    return {
      isValid: false,
      availableShares,
      message: 'Sell amount must be greater than 0'
    };
  }
  
  if (sellAmount > availableShares) {
    return {
      isValid: false,
      availableShares,
      message: `Cannot sell ${sellAmount} shares. You only own ${availableShares} shares.`
    };
  }
  
  return {
    isValid: true,
    availableShares
  };
}; 