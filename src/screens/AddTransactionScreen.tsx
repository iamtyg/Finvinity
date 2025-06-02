import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { TransactionType, AssetCategory, StockSearchResult } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { formatCurrency, getCurrentHoldings, validateSellTransaction } from '../utils/calculations';
import { searchStocks, getStockQuote } from '../services/marketData';

interface AddTransactionScreenProps {
  navigation: any;
  route: any;
}

interface AssetSuggestion extends StockSearchResult {
  id?: string;
  currentPrice?: number;
  isExisting: boolean;
  category: AssetCategory;
}

// Helper function to map asset category to stock type
const getStockTypeFromCategory = (category: AssetCategory): string => {
  switch (category) {
    case AssetCategory.STOCKS:
      return 'Common Stock';
    case AssetCategory.MUTUAL_FUNDS:
      return 'ETF';
    case AssetCategory.CRYPTOCURRENCY:
      return 'Cryptocurrency';
    case AssetCategory.GOLD:
      return 'Commodity';
    case AssetCategory.FOREIGN_CURRENCY:
      return 'Currency';
    default:
      return 'Common Stock';
  }
};

// Helper function to map stock type to asset category
const getAssetCategoryFromType = (type: string): AssetCategory => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('etf') || lowerType.includes('fund')) return AssetCategory.MUTUAL_FUNDS;
  if (lowerType.includes('stock') || lowerType.includes('equity')) return AssetCategory.STOCKS;
  if (lowerType.includes('crypto')) return AssetCategory.CRYPTOCURRENCY;
  if (lowerType.includes('currency')) return AssetCategory.FOREIGN_CURRENCY;
  if (lowerType.includes('commodity')) return AssetCategory.GOLD;
  return AssetCategory.STOCKS; // Default to stocks
};

// Helper function to format decimal input to max 2 decimal places
const formatDecimalInput = (value: string, maxDecimals: number = 2): string => {
  // Remove any non-numeric characters except decimal point
  const cleaned = value.replace(/[^0-9.]/g, '');
  
  // Split by decimal point
  const parts = cleaned.split('.');
  
  // If there's more than one decimal point, keep only the first one
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('').substring(0, maxDecimals);
  }
  
  // If there's a decimal part, limit it to maxDecimals places
  if (parts.length === 2) {
    return parts[0] + '.' + parts[1].substring(0, maxDecimals);
  }
  
  return cleaned;
};

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({ navigation, route }) => {
  const { assets, addTransaction, addAsset, addAssetAndTransaction, loading, marketStatus } = usePortfolio();
  const { assetId } = route.params || {};
  
  // Transaction form state
  const [selectedAsset, setSelectedAsset] = useState<AssetSuggestion | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.BUY);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Asset search state
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showNewAssetForm, setShowNewAssetForm] = useState(false);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // New asset form state
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetSymbol, setNewAssetSymbol] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<AssetCategory>(AssetCategory.STOCKS);
  const [newAssetPrice, setNewAssetPrice] = useState('');
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Helper function to format date for display
  const formatDateForDisplay = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to format date for user-friendly display
  const formatDateForUI = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Sync selectedDate with date string
  useEffect(() => {
    setDate(formatDateForDisplay(selectedDate));
  }, [selectedDate]);

  // Initialize with pre-selected asset if provided
  useEffect(() => {
    if (assetId) {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        const assetSuggestion: AssetSuggestion = {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: getStockTypeFromCategory(asset.category),
          region: 'US',
          marketOpen: '09:30',
          marketClose: '16:00',
          timezone: 'US/Eastern',
          currency: 'USD',
          currentPrice: asset.currentPrice,
          isExisting: true,
          category: asset.category,
        };
        setSelectedAsset(assetSuggestion);
        setPrice(asset.currentPrice.toString());
      }
    }
  }, [assetId, assets]);

  // Create asset suggestions from existing assets + search results
  const assetSuggestions = useMemo(() => {
    console.log('🔍 Creating asset suggestions...');
    console.log('📋 Existing assets in portfolio:', assets.map(a => ({ id: a.id, symbol: a.symbol, name: a.name })));
    console.log('🔍 Search results:', searchResults.map(r => ({ symbol: r.symbol, name: r.name, type: r.type })));

    const existingAssets: AssetSuggestion[] = assets.map(asset => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      type: getStockTypeFromCategory(asset.category),
      region: 'US',
      marketOpen: '09:30',
      marketClose: '16:00',
      timezone: 'US/Eastern',
      currency: 'USD',
      currentPrice: asset.currentPrice,
      isExisting: true,
      category: asset.category,
    }));

    const searchResultsWithFlags: AssetSuggestion[] = searchResults.map(result => ({
      ...result,
      isExisting: false,
      category: getAssetCategoryFromType(result.type),
    }));
    
    const allSuggestions = [...existingAssets, ...searchResultsWithFlags];
    console.log('📋 Final asset suggestions:', allSuggestions.map(s => ({ 
      id: s.id, 
      symbol: s.symbol, 
      name: s.name, 
      isExisting: s.isExisting 
    })));
    
    return allSuggestions;
  }, [assets, searchResults]);

  // Search for stocks when query changes
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (assetSearchQuery.trim().length >= 2) {
        setSearchLoading(true);
        try {
          const results = await searchStocks(assetSearchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Error searching stocks:', error);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [assetSearchQuery]);

  // Auto-populate price when asset is selected
  useEffect(() => {
    if (selectedAsset && selectedAsset.currentPrice && !price) {
      setPrice(selectedAsset.currentPrice.toString());
    }
  }, [selectedAsset]);

  // Real-time form validation
  useEffect(() => {
    const errors: {[key: string]: string} = {};
    
    if (!selectedAsset) {
      errors.asset = 'Please select an asset';
    }
    
    if (!amount.trim()) {
      errors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    
    if (!price.trim()) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      errors.price = 'Please enter a valid price';
    }
    
    if (!date) {
      errors.date = 'Date is required';
    }

    // Validate sell transactions for existing assets
    if (selectedAsset && selectedAsset.isExisting && transactionType === TransactionType.SELL && amount) {
      const existingAsset = assets.find(a => a.id === selectedAsset.id);
      if (existingAsset) {
        const sellAmount = parseFloat(amount);
        if (!isNaN(sellAmount)) {
          const validation = validateSellTransaction(existingAsset, sellAmount);
          if (!validation.isValid) {
            errors.amount = validation.message || 'Insufficient holdings for this sale';
          }
        }
      }
    }

    setValidationErrors(errors);
    const formValid = Object.keys(errors).length === 0;
    setIsFormValid(formValid);
  }, [selectedAsset, transactionType, amount, price, date, assets]);

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case AssetCategory.STOCKS:
        return '📈';
      case AssetCategory.CRYPTOCURRENCY:
        return '₿';
      case AssetCategory.FOREIGN_CURRENCY:
        return '💱';
      case AssetCategory.GOLD:
        return '🥇';
      case AssetCategory.MUTUAL_FUNDS:
        return '📊';
      default:
        return '💼';
    }
  };

  const getCategoryColor = (category: AssetCategory) => {
    switch (category) {
      case AssetCategory.STOCKS:
        return '#3B82F6';
      case AssetCategory.CRYPTOCURRENCY:
        return '#F59E0B';
      case AssetCategory.FOREIGN_CURRENCY:
        return '#10B981';
      case AssetCategory.GOLD:
        return '#EAB308';
      case AssetCategory.MUTUAL_FUNDS:
        return '#8B5CF6';
      default:
        return colors.primary;
    }
  };

  const getAssetTypeIcon = (type: string) => {
    if (type.toLowerCase().includes('etf')) return '📊';
    if (type.toLowerCase().includes('stock')) return '📈';
    return '💼';
  };

  const getAssetTypeColor = (type: string) => {
    if (type.toLowerCase().includes('etf')) return '#8B5CF6';
    if (type.toLowerCase().includes('stock')) return '#3B82F6';
    return colors.primary;
  };

  const handleAssetSelect = async (asset: AssetSuggestion) => {
    console.log('🎯 Asset selected:', {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      isExisting: asset.isExisting,
      category: asset.category,
      currentPrice: asset.currentPrice
    });

    setSelectedAsset(asset);
    setAssetSearchQuery('');
    setShowAssetPicker(false);
    
    // Try to get real-time price for the selected asset
    if (!asset.isExisting) {
      console.log(`📈 Fetching real-time price for new asset: ${asset.symbol}`);
      try {
        const quote = await getStockQuote(asset.symbol);
        if (quote) {
          const updatedAsset = { ...asset, currentPrice: quote.price };
          console.log(`💰 Updated asset price: ${asset.symbol} -> $${quote.price}`);
          setSelectedAsset(updatedAsset);
          setPrice(quote.price.toString());
        }
      } catch (error) {
        console.error('Error fetching price for', asset.symbol, error);
        // Use fallback price if available
        if (asset.currentPrice) {
          setPrice(asset.currentPrice.toString());
        }
      }
    } else {
      console.log(`💰 Using existing asset price: ${asset.symbol} -> $${asset.currentPrice}`);
      if (asset.currentPrice) {
        setPrice(asset.currentPrice.toString());
      }
    }
  };

  const handleCreateNewAsset = async () => {
    if (!newAssetName.trim() || !newAssetSymbol.trim() || !newAssetPrice.trim()) {
      Alert.alert('Error', 'Please fill in all asset details');
      return;
    }

    const price = parseFloat(newAssetPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      const newAssetResult = await addAsset(
        newAssetName.trim(),
        newAssetSymbol.trim().toUpperCase(),
        newAssetCategory
      );

      const newAsset: AssetSuggestion = {
        id: newAssetResult.id,
        symbol: newAssetResult.symbol,
        name: newAssetResult.name,
        type: getStockTypeFromCategory(newAssetResult.category),
        region: 'US',
        marketOpen: '09:30',
        marketClose: '16:00',
        timezone: 'US/Eastern',
        currency: 'USD',
        category: newAssetResult.category,
        currentPrice: newAssetResult.currentPrice,
        isExisting: true,
      };

      setSelectedAsset(newAsset);
      setPrice(newAssetResult.currentPrice.toString());
      setShowNewAssetForm(false);
      setShowAssetPicker(false);
      
      // Reset new asset form
      setNewAssetName('');
      setNewAssetSymbol('');
      setNewAssetCategory(AssetCategory.STOCKS);
      setNewAssetPrice('');

    } catch (error) {
      Alert.alert('Error', 'Failed to create asset. Please try again.');
    }
  };

  const handleAmountChange = (value: string) => {
    const formattedValue = formatDecimalInput(value, 2);
    setAmount(formattedValue);
  };

  const handlePriceChange = (value: string) => {
    const formattedValue = formatDecimalInput(value, 2);
    setPrice(formattedValue);
  };

  const handleDatePress = () => {
    setShowDatePicker(true);
  };

  const handleDateConfirm = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const handleAddTransaction = async () => {
    if (!isFormValid || !selectedAsset) return;

    const amountValue = parseFloat(amount);
    const priceValue = parseFloat(price);
    const totalValue = amountValue * priceValue;

    // Show confirmation for large transactions
    if (totalValue > 10000) {
      Alert.alert(
        'Confirm Large Transaction',
        `You're about to ${transactionType.toLowerCase()} ${amountValue} shares for ${formatCurrency(totalValue)}. Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => processTransaction() }
        ]
      );
    } else {
      processTransaction();
    }
  };

  const processTransaction = async () => {
    if (!selectedAsset) {
      console.error('❌ No selected asset');
      return;
    }

    console.log('🔍 Processing transaction with selected asset:', {
      id: selectedAsset.id,
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      isExisting: selectedAsset.isExisting,
      category: selectedAsset.category
    });

    try {
      // Use the new atomic function that handles both asset creation and transaction addition
      await addAssetAndTransaction(
        selectedAsset.name,
        selectedAsset.symbol,
        selectedAsset.category,
        transactionType,
        parseFloat(amount),
        parseFloat(price),
        date,
        notes.trim() || undefined
      );

      console.log(`✅ Asset and transaction added successfully`);

      // Show success message and handle navigation
      Alert.alert('Success', 'Transaction added successfully', [
        {
          text: 'Add Another',
          onPress: () => {
            // Reset form for another transaction
            setAmount('');
            setNotes('');
            setSelectedAsset(null);
            setPrice('');
            setSelectedDate(new Date()); // Reset date to today
          },
        },
        {
          text: 'Done',
          style: 'default',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to add transaction: ${errorMessage}`);
    }
  };

  const renderAssetPicker = () => (
    <Modal
      visible={showAssetPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAssetPicker(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAssetPicker(false)}>
            <Text style={styles.modalCloseButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Asset</Text>
          <TouchableOpacity onPress={() => setShowNewAssetForm(true)}>
            <Text style={styles.modalActionButton}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search assets..."
              placeholderTextColor={colors.textLight}
              value={assetSearchQuery}
              onChangeText={setAssetSearchQuery}
              autoCapitalize="none"
            />
            {assetSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setAssetSearchQuery('')}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.assetList} showsVerticalScrollIndicator={false}>
          {assetSuggestions.map((asset, index) => (
            <TouchableOpacity
              key={`${asset.symbol}-${index}`}
              style={styles.assetSuggestion}
              onPress={() => handleAssetSelect(asset)}
            >
              <View style={[styles.assetIcon, { backgroundColor: getCategoryColor(asset.category) }]}>
                <Text style={styles.assetIconText}>{getCategoryIcon(asset.category)}</Text>
              </View>
              <View style={styles.assetDetails}>
                <View style={styles.assetMainInfo}>
                  <Text style={styles.assetNameText}>{asset.name}</Text>
                  <View style={styles.assetBadgeContainer}>
                    <Text style={styles.assetSymbolText}>{asset.symbol}</Text>
                    {asset.isExisting && (
                      <View style={styles.existingBadge}>
                        <Text style={styles.existingBadgeText}>Owned</Text>
                      </View>
                    )}
                  </View>
                </View>
                {asset.currentPrice && (
                  <Text style={styles.assetPriceText}>
                    {formatCurrency(asset.currentPrice)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
          
          {assetSuggestions.length === 0 && assetSearchQuery.trim() && (
            <View style={styles.emptySearchState}>
              <Text style={styles.emptySearchText}>No assets found</Text>
              <TouchableOpacity
                style={styles.createAssetButton}
                onPress={() => {
                  setNewAssetName(assetSearchQuery);
                  setNewAssetSymbol(assetSearchQuery.toUpperCase());
                  setShowNewAssetForm(true);
                }}
              >
                <Text style={styles.createAssetButtonText}>Create "{assetSearchQuery}"</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderNewAssetForm = () => (
    <Modal
      visible={showNewAssetForm}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowNewAssetForm(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowNewAssetForm(false)}>
            <Text style={styles.modalCloseButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add New Asset</Text>
          <TouchableOpacity 
            onPress={handleCreateNewAsset}
            disabled={!newAssetName.trim() || !newAssetSymbol.trim() || !newAssetPrice.trim()}
          >
            <Text style={[
              styles.modalActionButton,
              (!newAssetName.trim() || !newAssetSymbol.trim() || !newAssetPrice.trim()) && styles.disabledButton
            ]}>
              Create
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.newAssetForm} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Asset Name</Text>
            <TextInput
              style={styles.input}
              value={newAssetName}
              onChangeText={setNewAssetName}
              placeholder="e.g., Apple Inc."
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Symbol</Text>
            <TextInput
              style={styles.input}
              value={newAssetSymbol}
              onChangeText={(text) => setNewAssetSymbol(text.toUpperCase())}
              placeholder="e.g., AAPL"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {Object.values(AssetCategory).map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    newAssetCategory === category && styles.selectedCategoryChip,
                  ]}
                  onPress={() => setNewAssetCategory(category)}
                >
                  <Text style={styles.categoryChipIcon}>{getCategoryIcon(category)}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      newAssetCategory === category && styles.selectedCategoryChipText,
                    ]}
                  >
                    {category.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Price</Text>
            <TextInput
              style={styles.input}
              value={newAssetPrice}
              onChangeText={setNewAssetPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderTransactionTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Transaction Type</Text>
      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === TransactionType.BUY && styles.selectedBuyButton,
          ]}
          onPress={() => setTransactionType(TransactionType.BUY)}
        >
          <Text style={styles.typeIcon}>📈</Text>
          <Text style={[
            styles.typeButtonText,
            transactionType === TransactionType.BUY && styles.selectedTypeText,
          ]}>
            Buy
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.typeButton,
            transactionType === TransactionType.SELL && styles.selectedSellButton,
          ]}
          onPress={() => setTransactionType(TransactionType.SELL)}
        >
          <Text style={styles.typeIcon}>📉</Text>
          <Text style={[
            styles.typeButtonText,
            transactionType === TransactionType.SELL && styles.selectedTypeText,
          ]}>
            Sell
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentHoldings = () => {
    if (!selectedAsset || !selectedAsset.isExisting || transactionType === TransactionType.BUY) return null;

    const existingAsset = assets.find(a => a.id === selectedAsset.id);
    if (!existingAsset) return null;

    const currentHoldings = getCurrentHoldings(existingAsset);

    return (
      <View style={styles.holdingsCard}>
        <Text style={styles.holdingsTitle}>💼 Current Holdings</Text>
        <View style={styles.holdingsInfo}>
          <Text style={styles.holdingsAmount}>{currentHoldings.toFixed(2)} shares</Text>
          <Text style={styles.holdingsValue}>
            Value: {formatCurrency(currentHoldings * existingAsset.currentPrice)}
          </Text>
        </View>
      </View>
    );
  };

  const renderDatePicker = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const daysInMonth = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <Modal
        visible={showDatePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDateCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleDateCancel}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={() => handleDateConfirm(selectedDate)}>
              <Text style={styles.modalActionButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Transaction Date</Text>
            
            <View style={styles.dateSelectorsContainer}>
              {/* Month Selector */}
              <View style={styles.dateSelector}>
                <Text style={styles.dateSelectorLabel}>Month</Text>
                <ScrollView style={styles.dateScrollView} showsVerticalScrollIndicator={false}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.dateOption,
                        selectedDate.getMonth() === index && styles.selectedDateOption
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(index);
                        // Handle cases where day doesn't exist in new month (e.g., Jan 31 -> Feb)
                        const maxDaysInNewMonth = new Date(newDate.getFullYear(), index + 1, 0).getDate();
                        if (newDate.getDate() > maxDaysInNewMonth) {
                          newDate.setDate(maxDaysInNewMonth);
                        }
                        setSelectedDate(newDate);
                      }}
                    >
                      <Text style={[
                        styles.dateOptionText,
                        selectedDate.getMonth() === index && styles.selectedDateOptionText
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Selector */}
              <View style={styles.dateSelector}>
                <Text style={styles.dateSelectorLabel}>Day</Text>
                <ScrollView style={styles.dateScrollView} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dateOption,
                        selectedDate.getDate() === day && styles.selectedDateOption
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(day);
                        setSelectedDate(newDate);
                      }}
                    >
                      <Text style={[
                        styles.dateOptionText,
                        selectedDate.getDate() === day && styles.selectedDateOptionText
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Selector */}
              <View style={styles.dateSelector}>
                <Text style={styles.dateSelectorLabel}>Year</Text>
                <ScrollView style={styles.dateScrollView} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.dateOption,
                        selectedDate.getFullYear() === year && styles.selectedDateOption
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setFullYear(year);
                        // Handle leap year cases (e.g., Feb 29 in non-leap year)
                        const maxDaysInMonth = new Date(year, newDate.getMonth() + 1, 0).getDate();
                        if (newDate.getDate() > maxDaysInMonth) {
                          newDate.setDate(maxDaysInMonth);
                        }
                        setSelectedDate(newDate);
                      }}
                    >
                      <Text style={[
                        styles.dateOptionText,
                        selectedDate.getFullYear() === year && styles.selectedDateOptionText
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.selectedDateDisplay}>
              <Text style={styles.selectedDateLabel}>Selected Date:</Text>
              <Text style={styles.selectedDateText}>{formatDateForUI(selectedDate)}</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Asset Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Asset</Text>
            {selectedAsset ? (
              <TouchableOpacity
                style={styles.selectedAssetCard}
                onPress={() => setShowAssetPicker(true)}
              >
                <View style={[styles.assetIcon, { backgroundColor: getCategoryColor(selectedAsset.category) }]}>
                  <Text style={styles.assetIconText}>{getCategoryIcon(selectedAsset.category)}</Text>
                </View>
                <View style={styles.selectedAssetInfo}>
                  <Text style={styles.selectedAssetName}>{selectedAsset.name}</Text>
                  <View style={styles.selectedAssetDetails}>
                    <Text style={styles.selectedAssetSymbol}>{selectedAsset.symbol}</Text>
                    {selectedAsset.isExisting && (
                      <View style={styles.ownedBadge}>
                        <Text style={styles.ownedBadgeText}>Owned</Text>
                      </View>
                    )}
                  </View>
                  {selectedAsset.currentPrice && (
                    <Text style={styles.selectedAssetPrice}>
                      Current: {formatCurrency(selectedAsset.currentPrice)}
                    </Text>
                  )}
                </View>
                <Text style={styles.changeAssetText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.assetPlaceholder}
                onPress={() => setShowAssetPicker(true)}
              >
                <Text style={styles.assetPlaceholderIcon}>🔍</Text>
                <Text style={styles.assetPlaceholderText}>Tap to search or add an asset</Text>
              </TouchableOpacity>
            )}
            {validationErrors.asset && (
              <Text style={styles.errorText}>{validationErrors.asset}</Text>
            )}
          </View>

          {/* Transaction Type */}
          {renderTransactionTypeSelector()}

          {/* Current Holdings */}
          {renderCurrentHoldings()}

          {/* Transaction Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Details</Text>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={[styles.input, validationErrors.amount && styles.inputError]}
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
                {validationErrors.amount && (
                  <Text style={styles.errorText}>{validationErrors.amount}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
                <Text style={styles.inputLabel}>Price per Share</Text>
                <TextInput
                  style={[styles.input, validationErrors.price && styles.inputError]}
                  value={price}
                  onChangeText={handlePriceChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
                {validationErrors.price && (
                  <Text style={styles.errorText}>{validationErrors.price}</Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, validationErrors.date && styles.inputError]}
                onPress={handleDatePress}
              >
                <Text style={styles.dateButtonText}>{formatDateForUI(selectedDate)}</Text>
                <Text style={styles.dateIcon}>📅</Text>
              </TouchableOpacity>
              {validationErrors.date && (
                <Text style={styles.errorText}>{validationErrors.date}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this transaction..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            {amount && price && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Value</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(parseFloat(amount || '0') * parseFloat(price || '0'))}
                </Text>
              </View>
            )}

            {/* Submit Button - placed directly below the form */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid && styles.disabledSubmitButton,
              ]}
              onPress={handleAddTransaction}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>
                  Add {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Transaction
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderAssetPicker()}
      {renderNewAssetForm()}
      {renderDatePicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  // Asset Selection Styles
  selectedAssetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  assetPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  assetPlaceholderIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  assetPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  assetIconText: {
    fontSize: 24,
    color: 'white',
  },
  selectedAssetInfo: {
    flex: 1,
  },
  selectedAssetName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  selectedAssetDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  selectedAssetSymbol: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  ownedBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ownedBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 10,
  },
  selectedAssetPrice: {
    ...typography.caption,
    color: colors.textLight,
  },
  changeAssetText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },

  // Transaction Type Styles
  typeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedBuyButton: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success,
  },
  selectedSellButton: {
    backgroundColor: colors.error + '15',
    borderColor: colors.error,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  typeButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectedTypeText: {
    color: colors.text,
  },

  // Holdings Card
  holdingsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  holdingsTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  holdingsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingsAmount: {
    ...typography.body,
    color: colors.text,
  },
  holdingsValue: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Input Styles
  inputRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Total Container
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  totalLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  totalValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },

  // Button Styles
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    minHeight: 50,
    ...shadows.sm,
  },
  disabledSubmitButton: {
    backgroundColor: colors.textLight,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 16,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalCloseButton: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalActionButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  disabledButton: {
    color: colors.textLight,
  },

  // Search Styles
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    fontSize: 20,
    color: colors.textLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  clearButton: {
    fontSize: 20,
    color: colors.textLight,
  },

  // Asset List Styles
  assetList: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  assetSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  assetDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  assetMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNameText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  assetBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetSymbolText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  existingBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  existingBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 10,
  },
  assetPriceText: {
    ...typography.caption,
    color: colors.textLight,
  },

  // Empty Search State
  emptySearchState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptySearchText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  createAssetButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  createAssetButtonText: {
    ...typography.bodySmall,
    color: colors.surface,
    fontWeight: '600',
  },

  // New Asset Form Styles
  newAssetForm: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  categoryScroll: {
    marginTop: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  categoryChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedCategoryChipText: {
    color: colors.surface,
  },

  // Date Styles
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  dateIcon: {
    fontSize: 18,
    color: colors.primary,
  },

  // Date Picker Styles
  datePickerContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  datePickerTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dateSelectorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateSelector: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    ...shadows.sm,
  },
  dateSelectorLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dateScrollView: {
    height: 200,
  },
  dateOption: {
    padding: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  selectedDateOption: {
    backgroundColor: colors.primary,
  },
  dateOptionText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  selectedDateOptionText: {
    color: colors.surface,
    fontWeight: '600',
  },
  selectedDateDisplay: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  selectedDateLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectedDateText: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default AddTransactionScreen; 