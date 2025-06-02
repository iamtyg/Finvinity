import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset, Transaction, AssetCategory, TransactionType, Portfolio, MarketStatus } from '../types';
import { calculatePortfolio, generateId, validateSellTransaction } from '../utils/calculations';
import { getMarketData, updateMarketPrices, getMarketStatus, forceRefreshMarketData, clearMarketDataCache } from '../services/marketData';

// Storage keys
const STORAGE_KEYS = {
  PORTFOLIO_DATA: 'finvinity_portfolio_data',
  AUTO_UPDATE_SETTING: 'finvinity_auto_update_setting',
  LAST_SYNC: 'finvinity_last_sync',
};

interface PortfolioState {
  assets: Asset[];
  portfolio: Portfolio;
  loading: boolean;
  error: string | null;
  marketStatus: MarketStatus | null;
  lastUpdated: string | null;
  autoUpdateEnabled: boolean;
  isInitialDataLoaded: boolean;
}

type PortfolioAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'UPDATE_ASSET'; payload: Asset }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: { assetId: string; transaction: Transaction } }
  | { type: 'UPDATE_TRANSACTION'; payload: { assetId: string; transaction: Transaction } }
  | { type: 'DELETE_TRANSACTION'; payload: { assetId: string; transactionId: string } }
  | { type: 'UPDATE_MARKET_PRICES'; payload: Asset[] }
  | { type: 'SET_ASSETS'; payload: Asset[] }
  | { type: 'SET_MARKET_STATUS'; payload: MarketStatus }
  | { type: 'SET_LAST_UPDATED'; payload: string }
  | { type: 'SET_AUTO_UPDATE'; payload: boolean }
  | { type: 'SET_INITIAL_DATA_LOADED'; payload: boolean };

const initialState: PortfolioState = {
  assets: [],
  portfolio: {
    totalValue: 0,
    totalGainLoss: 0,
    totalGainLossPercentage: 0,
    assets: [],
  },
  loading: false,
  error: null,
  marketStatus: null,
  lastUpdated: null,
  autoUpdateEnabled: true,
  isInitialDataLoaded: false,
};

const portfolioReducer = (state: PortfolioState, action: PortfolioAction): PortfolioState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_ASSETS':
      const portfolio = calculatePortfolio(action.payload);
      return { ...state, assets: action.payload, portfolio };
    
    case 'ADD_ASSET':
      const newAssets = [...state.assets, action.payload];
      return { ...state, assets: newAssets, portfolio: calculatePortfolio(newAssets) };
    
    case 'UPDATE_ASSET':
      const updatedAssets = state.assets.map(asset =>
        asset.id === action.payload.id ? action.payload : asset
      );
      return { ...state, assets: updatedAssets, portfolio: calculatePortfolio(updatedAssets) };
    
    case 'DELETE_ASSET':
      const filteredAssets = state.assets.filter(asset => asset.id !== action.payload);
      return { ...state, assets: filteredAssets, portfolio: calculatePortfolio(filteredAssets) };
    
    case 'ADD_TRANSACTION':
      const assetsWithNewTransaction = state.assets.map(asset =>
        asset.id === action.payload.assetId
          ? {
              ...asset,
              transactions: [...asset.transactions, action.payload.transaction],
              updatedAt: new Date().toISOString(),
            }
          : asset
      );
      return { ...state, assets: assetsWithNewTransaction, portfolio: calculatePortfolio(assetsWithNewTransaction) };
    
    case 'UPDATE_TRANSACTION':
      const assetsWithUpdatedTransaction = state.assets.map(asset =>
        asset.id === action.payload.assetId
          ? {
              ...asset,
              transactions: asset.transactions.map(transaction =>
                transaction.id === action.payload.transaction.id
                  ? action.payload.transaction
                  : transaction
              ),
              updatedAt: new Date().toISOString(),
            }
          : asset
      );
      return { ...state, assets: assetsWithUpdatedTransaction, portfolio: calculatePortfolio(assetsWithUpdatedTransaction) };
    
    case 'DELETE_TRANSACTION':
      const assetsWithDeletedTransaction = state.assets.map(asset =>
        asset.id === action.payload.assetId
          ? {
              ...asset,
              transactions: asset.transactions.filter(
                transaction => transaction.id !== action.payload.transactionId
              ),
              updatedAt: new Date().toISOString(),
            }
          : asset
      );
      return { ...state, assets: assetsWithDeletedTransaction, portfolio: calculatePortfolio(assetsWithDeletedTransaction) };
    
    case 'UPDATE_MARKET_PRICES':
      return { 
        ...state, 
        assets: action.payload, 
        portfolio: calculatePortfolio(action.payload),
        lastUpdated: new Date().toISOString(),
      };
    
    case 'SET_MARKET_STATUS':
      return { ...state, marketStatus: action.payload };
    
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    
    case 'SET_AUTO_UPDATE':
      return { ...state, autoUpdateEnabled: action.payload };
    
    case 'SET_INITIAL_DATA_LOADED':
      return { ...state, isInitialDataLoaded: action.payload };
    
    default:
      return state;
  }
};

interface PortfolioContextType extends PortfolioState {
  addAsset: (name: string, symbol: string, category: AssetCategory) => Promise<Asset>;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (assetId: string) => void;
  addTransaction: (assetId: string, type: TransactionType, amount: number, price: number, date: string, notes?: string) => void;
  updateTransaction: (assetId: string, transaction: Transaction) => void;
  deleteTransaction: (assetId: string, transactionId: string) => void;
  refreshMarketPrices: () => Promise<void>;
  refreshMarketStatus: () => Promise<void>;
  toggleAutoUpdate: () => void;
  clearAllData: () => Promise<void>;
  addAssetAndTransaction: (
    assetName: string,
    assetSymbol: string,
    assetCategory: AssetCategory,
    transactionType: TransactionType,
    amount: number,
    price: number,
    date: string,
    notes?: string
  ) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

interface PortfolioProviderProps {
  children: ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRefreshTimeRef = useRef<number>(0);

  // Data persistence functions
  const savePortfolioData = async (assets: Asset[]) => {
    try {
      const dataToSave = {
        assets,
        lastSaved: new Date().toISOString(),
        version: '1.0.0',
      };
      await AsyncStorage.setItem(STORAGE_KEYS.PORTFOLIO_DATA, JSON.stringify(dataToSave));
      console.log('💾 Portfolio data saved successfully');
    } catch (error) {
      console.error('❌ Failed to save portfolio data:', error);
    }
  };

  const loadPortfolioData = async (): Promise<Asset[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PORTFOLIO_DATA);
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('📂 Portfolio data loaded from storage:', parsedData.assets?.length || 0, 'assets');
        return parsedData.assets || [];
      }
      console.log('📂 No existing portfolio data found, starting fresh');
      return [];
    } catch (error) {
      console.error('❌ Failed to load portfolio data:', error);
      return [];
    }
  };

  const saveAutoUpdateSetting = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_UPDATE_SETTING, JSON.stringify(enabled));
    } catch (error) {
      console.error('❌ Failed to save auto-update setting:', error);
    }
  };

  const loadAutoUpdateSetting = async (): Promise<boolean> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_UPDATE_SETTING);
      return data ? JSON.parse(data) : true; // Default to true
    } catch (error) {
      console.error('❌ Failed to load auto-update setting:', error);
      return true;
    }
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PORTFOLIO_DATA,
        STORAGE_KEYS.AUTO_UPDATE_SETTING,
        STORAGE_KEYS.LAST_SYNC,
      ]);
      console.log('🗑️ All portfolio data cleared');
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
    }
  };

  // Auto-save whenever assets change
  useEffect(() => {
    if (state.isInitialDataLoaded && state.assets.length >= 0) {
      savePortfolioData(state.assets);
    }
  }, [state.assets, state.isInitialDataLoaded]);

  // Auto-save auto-update setting
  useEffect(() => {
    if (state.isInitialDataLoaded) {
      saveAutoUpdateSetting(state.autoUpdateEnabled);
    }
  }, [state.autoUpdateEnabled, state.isInitialDataLoaded]);

  // Load initial data and start real-time updates
  useEffect(() => {
    loadInitialData();
    updateMarketStatus();
    
    // Start periodic updates
    startPeriodicUpdates();
    
    return () => {
      stopPeriodicUpdates();
    };
  }, []);

  // Handle auto-update toggle
  useEffect(() => {
    if (state.autoUpdateEnabled) {
      startPeriodicUpdates();
    } else {
      stopPeriodicUpdates();
    }
  }, [state.autoUpdateEnabled, state.assets.length]);

  // App state listener for automatic refresh on foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`🔄 App state changed from ${appStateRef.current} to ${nextAppState}`);
      console.log(`📊 Current state - Assets: ${state.assets.length}, Initial data loaded: ${state.isInitialDataLoaded}, Loading: ${state.loading}`);
      
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('📱 App came to foreground - checking if refresh is needed');
        
        // Wait for initial data to be loaded before attempting refresh
        if (!state.isInitialDataLoaded) {
          console.log('⏳ Initial data not loaded yet, skipping automatic refresh');
          return;
        }
        
        if (state.assets.length === 0) {
          console.log('🚫 No assets in portfolio, skipping automatic refresh');
          return;
        }
        
        // Check if enough time has passed since last refresh (minimum 30 seconds)
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        const minRefreshInterval = 30000; // 30 seconds
        
        if (timeSinceLastRefresh >= minRefreshInterval || lastRefreshTimeRef.current === 0) {
          console.log(`✅ Performing automatic refresh for ${state.assets.length} assets (${Math.round(timeSinceLastRefresh / 1000)}s since last refresh)`);
          lastRefreshTimeRef.current = now;
          
          try {
            dispatch({ type: 'SET_LOADING', payload: true });
            await refreshMarketPrices();
            await updateMarketStatus();
            console.log('✅ Automatic refresh completed successfully');
          } catch (error) {
            console.error('❌ Automatic refresh failed:', error);
          } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          const timeUntilNextRefresh = minRefreshInterval - timeSinceLastRefresh;
          console.log(`⏳ Skipping refresh (next allowed in ${Math.round(timeUntilNextRefresh / 1000)}s)`);
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [state.assets.length, state.isInitialDataLoaded]); // Re-subscribe when assets or initial load status changes

  // Trigger automatic refresh once initial data is loaded
  useEffect(() => {
    if (state.isInitialDataLoaded && state.assets.length > 0 && !state.loading) {
      console.log('🚀 Initial data loaded, triggering immediate price refresh for fresh data');
      
      // Small delay to ensure UI is ready
      const timeoutId = setTimeout(async () => {
        try {
          await refreshMarketPrices();
          console.log('✅ Initial automatic refresh completed');
        } catch (error) {
          console.error('❌ Initial automatic refresh failed:', error);
        }
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [state.isInitialDataLoaded]);

  const startPeriodicUpdates = () => {
    stopPeriodicUpdates(); // Clear any existing intervals
    
    // Update market status every 5 minutes
    statusIntervalRef.current = setInterval(updateMarketStatus, 5 * 60 * 1000);
    
    // Only start price updates if we have assets
    if (state.assets.length > 0) {
      // Update prices based on market status
      const updateInterval = state.marketStatus?.isOpen ? 30000 : 300000; // 30s when open, 5min when closed
      updateIntervalRef.current = setInterval(refreshMarketPrices, updateInterval);
    }
  };

  const stopPeriodicUpdates = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  const updateMarketStatus = async () => {
    try {
      const status = await getMarketStatus();
      dispatch({ type: 'SET_MARKET_STATUS', payload: status });
    } catch (error) {
      console.error('Error updating market status:', error);
    }
  };

  const loadInitialData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Load saved portfolio data and settings
      const [assets, autoUpdateEnabled] = await Promise.all([
        loadPortfolioData(),
        loadAutoUpdateSetting(),
      ]);

      dispatch({ type: 'SET_ASSETS', payload: assets });
      dispatch({ type: 'SET_AUTO_UPDATE', payload: autoUpdateEnabled });
      
      // Get initial market prices if we have assets
      if (assets.length > 0) {
        await refreshMarketPrices();
      }
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load portfolio data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_INITIAL_DATA_LOADED', payload: true });
    }
  };

  const addAsset = async (name: string, symbol: string, category: AssetCategory): Promise<Asset> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Check if asset with same symbol already exists
      const existingAsset = state.assets.find(asset => 
        asset.symbol.toUpperCase() === symbol.toUpperCase()
      );
      
      if (existingAsset) {
        console.log(`✅ Asset ${symbol} already exists, returning existing asset`);
        dispatch({ type: 'SET_LOADING', payload: false });
        return existingAsset;
      }
      
      const marketData = await getMarketData(symbol);
      const currentPrice = marketData?.price || 0;

      const newAsset: Asset = {
        id: generateId(),
        name,
        symbol: symbol.toUpperCase(),
        category,
        currentPrice,
        transactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(`✅ Creating new asset ${symbol}`);
      dispatch({ type: 'ADD_ASSET', payload: newAsset });
      return newAsset;
    } catch (error) {
      console.error('Failed to add asset:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add asset' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateAsset = (asset: Asset) => {
    dispatch({ type: 'UPDATE_ASSET', payload: asset });
  };

  const deleteAsset = (assetId: string) => {
    dispatch({ type: 'DELETE_ASSET', payload: assetId });
  };

  const addTransaction = (
    assetId: string,
    type: TransactionType,
    amount: number,
    price: number,
    date: string,
    notes?: string
  ) => {
    console.log(`🔍 addTransaction called with assetId: ${assetId}`);
    console.log(`📋 Current assets in state:`, state.assets.map(a => ({ id: a.id, symbol: a.symbol, name: a.name })));
    
    // Find the asset to validate against
    const asset = state.assets.find(a => a.id === assetId);
    if (!asset) {
      console.error(`❌ Asset with ID ${assetId} not found in state.assets`);
      console.error(`📋 Available asset IDs:`, state.assets.map(a => a.id));
      throw new Error('Asset not found');
    }

    console.log(`✅ Asset found: ${asset.symbol} (${asset.id})`);

    // Validate sell transactions
    if (type === TransactionType.SELL) {
      const validation = validateSellTransaction(asset, amount);
      if (!validation.isValid) {
        throw new Error(validation.message || 'Invalid sell transaction');
      }
    }

    const transaction: Transaction = {
      id: generateId(),
      assetId,
      type,
      amount,
      price,
      date,
      notes,
    };

    console.log(`✅ Adding transaction to asset ${asset.symbol}:`, { type, amount, price, date });
    dispatch({ type: 'ADD_TRANSACTION', payload: { assetId, transaction } });
  };

  const updateTransaction = (assetId: string, transaction: Transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { assetId, transaction } });
  };

  const deleteTransaction = (assetId: string, transactionId: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: { assetId, transactionId } });
  };

  const refreshMarketPrices = async () => {
    console.log(`🔄 refreshMarketPrices called - Assets: ${state.assets.length}, Initial loaded: ${state.isInitialDataLoaded}`);
    console.log(`📋 Current assets:`, state.assets.map(a => ({ symbol: a.symbol, name: a.name })));
    
    if (state.assets.length === 0) {
      console.log('🚫 No assets to refresh prices for');
      return;
    }
    
    console.log('🔄 Refreshing market prices for', state.assets.length, 'assets...');
    
    try {
      const symbols = state.assets.map(asset => asset.symbol);
      console.log(`📡 Fetching fresh market data for symbols: ${symbols.join(', ')}`);
      
      // Use force refresh to clear cache and get fresh data
      const marketData = await forceRefreshMarketData(symbols);
      
      console.log(`✅ Successfully refreshed prices for ${marketData.length}/${symbols.length} assets`);
      
      const updatedAssets = state.assets.map(asset => {
        const data = marketData.find(d => d.symbol === asset.symbol);
        if (data) {
          console.log(`💰 Updated ${asset.symbol}: $${data.price.toFixed(2)} (${data.change > 0 ? '+' : ''}${data.change.toFixed(2)})`);
          return { 
            ...asset, 
            currentPrice: data.price, 
            updatedAt: new Date().toISOString() 
          };
        } else {
          console.warn(`⚠️ No price data received for ${asset.symbol}`);
          return asset;
        }
      });

      dispatch({ type: 'UPDATE_MARKET_PRICES', payload: updatedAssets });
      
      // Update the last refresh time for automatic refresh logic
      lastRefreshTimeRef.current = Date.now();
    } catch (error) {
      console.error('❌ Failed to refresh market prices:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh market prices. Please check your internet connection.' });
      
      // Clear error after 5 seconds
      setTimeout(() => {
        dispatch({ type: 'SET_ERROR', payload: null });
      }, 5000);
    }
  };

  const refreshMarketStatus = async () => {
    await updateMarketStatus();
  };

  const toggleAutoUpdate = () => {
    dispatch({ type: 'SET_AUTO_UPDATE', payload: !state.autoUpdateEnabled });
  };

  const addAssetAndTransaction = async (
    assetName: string,
    assetSymbol: string,
    assetCategory: AssetCategory,
    transactionType: TransactionType,
    amount: number,
    price: number,
    date: string,
    notes?: string
  ): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log(`🔄 addAssetAndTransaction: ${assetName} (${assetSymbol}) with ${transactionType} transaction`);
      
      // Check if asset already exists
      let targetAsset = state.assets.find(asset => 
        asset.symbol.toUpperCase() === assetSymbol.toUpperCase()
      );
      
      if (!targetAsset) {
        // Create new asset
        console.log(`🔄 Creating new asset: ${assetName} (${assetSymbol})`);
        const marketData = await getMarketData(assetSymbol);
        const currentPrice = marketData?.price || price; // Use market price or fallback to transaction price

        targetAsset = {
          id: generateId(),
          name: assetName,
          symbol: assetSymbol.toUpperCase(),
          category: assetCategory,
          currentPrice,
          transactions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log(`✅ New asset created: ${targetAsset.symbol} (${targetAsset.id})`);
      } else {
        console.log(`✅ Using existing asset: ${targetAsset.symbol} (${targetAsset.id})`);
      }

      // Validate sell transactions
      if (transactionType === TransactionType.SELL) {
        const validation = validateSellTransaction(targetAsset, amount);
        if (!validation.isValid) {
          throw new Error(validation.message || 'Invalid sell transaction');
        }
      }

      // Create the transaction
      const transaction: Transaction = {
        id: generateId(),
        assetId: targetAsset.id,
        type: transactionType,
        amount,
        price,
        date,
        notes,
      };

      // Add transaction to the asset
      const updatedAsset = {
        ...targetAsset,
        transactions: [...targetAsset.transactions, transaction],
        updatedAt: new Date().toISOString(),
      };

      // Update the state atomically
      const isNewAsset = !state.assets.find(a => a.id === targetAsset.id);
      
      if (isNewAsset) {
        // Add new asset with transaction
        const newAssets = [...state.assets, updatedAsset];
        dispatch({ type: 'SET_ASSETS', payload: newAssets });
        console.log(`✅ Added new asset with transaction: ${updatedAsset.symbol}`);
      } else {
        // Update existing asset with new transaction
        const updatedAssets = state.assets.map(asset =>
          asset.id === targetAsset.id ? updatedAsset : asset
        );
        dispatch({ type: 'SET_ASSETS', payload: updatedAssets });
        console.log(`✅ Updated existing asset with transaction: ${updatedAsset.symbol}`);
      }

    } catch (error) {
      console.error('Failed to add asset and transaction:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add asset and transaction' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value: PortfolioContextType = {
    ...state,
    addAsset,
    updateAsset,
    deleteAsset,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshMarketPrices,
    refreshMarketStatus,
    toggleAutoUpdate,
    clearAllData,
    addAssetAndTransaction,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};