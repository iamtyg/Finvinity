export enum AssetCategory {
  STOCKS = 'stocks',
  GOLD = 'gold',
  FOREIGN_CURRENCY = 'foreign_currency',
  MUTUAL_FUNDS = 'mutual_funds',
  CRYPTOCURRENCY = 'cryptocurrency',
}

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell',
}

export interface Transaction {
  id: string;
  assetId: string;
  type: TransactionType;
  amount: number;
  price: number;
  date: string;
  notes?: string;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  category: AssetCategory;
  currentPrice: number;
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  assets: Asset[];
}

export interface AssetHolding {
  asset: Asset;
  totalShares: number;
  averageBuyPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercentage: number;
  lastUpdated: string;
}

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

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface FilterOptions {
  category?: AssetCategory;
  sortBy?: 'name' | 'value' | 'gainLoss' | 'date';
  sortOrder?: 'asc' | 'desc';
}

export interface NavigationProps {
  navigation: any;
  route: any;
} 