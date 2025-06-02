import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePortfolio } from '../context/PortfolioContext';
import { formatCurrency, formatPercentage } from '../utils/calculations';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { Transaction, TransactionType } from '../types';

interface TransactionHistoryScreenProps {
  navigation: any;
}

interface TransactionWithAsset extends Transaction {
  assetName: string;
  assetSymbol: string;
  assetCategory: string;
}

const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({ navigation }) => {
  const { assets, refreshMarketPrices } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'asset'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Filter states
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [amountRange, setAmountRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Flatten all transactions with asset information
  const allTransactions: TransactionWithAsset[] = useMemo(() => {
    const transactions: TransactionWithAsset[] = [];
    
    assets.forEach(asset => {
      asset.transactions.forEach(transaction => {
        transactions.push({
          ...transaction,
          assetName: asset.name,
          assetSymbol: asset.symbol,
          assetCategory: asset.category,
        });
      });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assets]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = allTransactions;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(transaction =>
        transaction.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.assetSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transaction.notes && transaction.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by transaction type
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Filter by date range
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const isAfterStart = !dateRange.start || transactionDate >= dateRange.start;
        const isBeforeEnd = !dateRange.end || transactionDate <= dateRange.end;
        return isAfterStart && isBeforeEnd;
      });
    }

    // Filter by amount range
    if (amountRange.min !== null || amountRange.max !== null) {
      filtered = filtered.filter(transaction => {
        const totalValue = transaction.amount * transaction.price;
        const isAboveMin = amountRange.min === null || totalValue >= amountRange.min;
        const isBelowMax = amountRange.max === null || totalValue <= amountRange.max;
        return isAboveMin && isBelowMax;
      });
    }

    // Filter by selected asset
    if (selectedAsset) {
      filtered = filtered.filter(transaction => transaction.assetSymbol === selectedAsset);
    }

    // Sort transactions
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = (a.amount * a.price) - (b.amount * b.price);
          break;
        case 'asset':
          comparison = a.assetName.localeCompare(b.assetName);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allTransactions, searchQuery, filterType, dateRange, amountRange, selectedAsset, sortBy, sortOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMarketPrices();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const getTransactionIcon = (type: TransactionType) => {
    return type === TransactionType.BUY ? '📈' : '📉';
  };

  const getTransactionColor = (type: TransactionType) => {
    return type === TransactionType.BUY ? colors.success : colors.error;
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'stocks':
        return '📈';
      case 'cryptocurrency':
        return '₿';
      case 'foreign_currency':
        return '💱';
      case 'gold':
        return '🥇';
      case 'mutual_funds':
        return '📊';
      default:
        return '💼';
    }
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const renderTransactionItem = ({ item: transaction }: { item: TransactionWithAsset }) => {
    const totalValue = transaction.amount * transaction.price;
    const transactionColor = getTransactionColor(transaction.type);

    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        onPress={() => {
          const asset = assets.find(a => a.symbol === transaction.assetSymbol);
          if (asset) {
            navigation.navigate('AssetDetail', { assetId: asset.id });
          }
        }}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={styles.iconContainer}>
              <Text style={styles.categoryIcon}>{getCategoryIcon(transaction.assetCategory)}</Text>
              <Text style={[styles.transactionTypeIcon, { color: transactionColor }]}>
                {getTransactionIcon(transaction.type)}
              </Text>
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.assetName}>{transaction.assetName}</Text>
              <Text style={styles.assetSymbol}>{transaction.assetSymbol}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.transactionRight}>
            <Text style={[styles.transactionType, { color: transactionColor }]}>
              {transaction.type.toUpperCase()}
            </Text>
            <Text style={styles.transactionAmount}>
              {transaction.amount.toFixed(2)} shares
            </Text>
            <Text style={styles.transactionValue}>
              {formatCurrency(totalValue)}
            </Text>
            <Text style={styles.transactionPrice}>
              @ {formatCurrency(transaction.price)}
            </Text>
          </View>
        </View>
        {transaction.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>💬 {transaction.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: 'All' },
        { key: TransactionType.BUY, label: 'Buys' },
        { key: TransactionType.SELL, label: 'Sells' },
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterTab,
            filterType === filter.key && styles.selectedFilterTab,
          ]}
          onPress={() => setFilterType(filter.key as any)}
        >
          <Text
            style={[
              styles.filterTabText,
              filterType === filter.key && styles.selectedFilterTabText,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSortModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter</Text>
          {/* Add filter options here */}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const clearAllFilters = () => {
    setFilterType('all');
    setDateRange({ start: null, end: null });
    setAmountRange({ min: null, max: null });
    setSelectedAsset(null);
    setSortBy('date');
    setSortOrder('desc');
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={[styles.modalContent, styles.filterModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {/* Transaction Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Transaction Type</Text>
            <View style={styles.filterTypeContainer}>
              {[
                { key: 'all', label: 'All', icon: '📋' },
                { key: TransactionType.BUY, label: 'Buys', icon: '📈' },
                { key: TransactionType.SELL, label: 'Sells', icon: '📉' },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterTypeChip,
                    filterType === filter.key && styles.selectedFilterTypeChip,
                  ]}
                  onPress={() => setFilterType(filter.key as any)}
                >
                  <Text style={styles.filterTypeIcon}>{filter.icon}</Text>
                  <Text
                    style={[
                      styles.filterTypeText,
                      filterType === filter.key && styles.selectedFilterTypeText,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort by</Text>
            <View style={styles.sortOptionsContainer}>
              {[
                { key: 'date', label: 'Date', icon: '📅' },
                { key: 'amount', label: 'Value', icon: '💰' },
                { key: 'asset', label: 'Asset', icon: '🏷️' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    sortBy === option.key && styles.selectedSortOption,
                  ]}
                  onPress={() => handleSort(option.key as any)}
                >
                  <View style={styles.sortOptionLeft}>
                    <Text style={styles.sortOptionIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === option.key && styles.selectedSortOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {sortBy === option.key && (
                    <Text style={styles.sortArrow}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Asset Filter */}
          {assets.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Asset</Text>
              <View style={styles.assetFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.assetChip,
                    selectedAsset === null && styles.selectedAssetChip,
                  ]}
                  onPress={() => setSelectedAsset(null)}
                >
                  <Text
                    style={[
                      styles.assetChipText,
                      selectedAsset === null && styles.selectedAssetChipText,
                    ]}
                  >
                    All Assets
                  </Text>
                </TouchableOpacity>
                {assets.slice(0, 6).map((asset) => (
                  <TouchableOpacity
                    key={asset.symbol}
                    style={[
                      styles.assetChip,
                      selectedAsset === asset.symbol && styles.selectedAssetChip,
                    ]}
                    onPress={() => setSelectedAsset(selectedAsset === asset.symbol ? null : asset.symbol)}
                  >
                    <Text
                      style={[
                        styles.assetChipText,
                        selectedAsset === asset.symbol && styles.selectedAssetChipText,
                      ]}
                    >
                      {asset.symbol}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Amount Range Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Amount Range</Text>
            <View style={styles.rangeInputContainer}>
              <TextInput
                style={styles.rangeInput}
                placeholder="Min"
                placeholderTextColor={colors.textLight}
                value={amountRange.min?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? null : parseFloat(text);
                  setAmountRange(prev => ({ ...prev, min: value }));
                }}
                keyboardType="numeric"
              />
              <Text style={styles.rangeSeparator}>to</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="Max"
                placeholderTextColor={colors.textLight}
                value={amountRange.max?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? null : parseFloat(text);
                  setAmountRange(prev => ({ ...prev, max: value }));
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Apply Button */}
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderStats = () => {
    const totalBuys = filteredAndSortedTransactions.filter(t => t.type === TransactionType.BUY).length;
    const totalSells = filteredAndSortedTransactions.filter(t => t.type === TransactionType.SELL).length;
    const totalValue = filteredAndSortedTransactions.reduce((sum, t) => sum + (t.amount * t.price), 0);

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{filteredAndSortedTransactions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{totalBuys}</Text>
          <Text style={styles.statLabel}>Buys</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error }]}>{totalSells}</Text>
          <Text style={styles.statLabel}>Sells</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(totalValue)}</Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterIcon}>🗂️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderFilterModal()}
      {renderStats()}

      <FlatList
        data={filteredAndSortedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No transactions found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first transaction'}
            </Text>
            {!searchQuery && filterType === 'all' && (
              <TouchableOpacity
                style={styles.addFirstTransactionButton}
                onPress={() => navigation.navigate('AddTransaction')}
              >
                <Text style={styles.addFirstTransactionButtonText}>Add Transaction</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
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
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  addButtonText: {
    fontSize: 20,
    color: colors.surface,
    fontWeight: '600',
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  filterIcon: {
    fontSize: 20,
    color: colors.surface,
  },
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error,
  },
  clearButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedFilterTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedFilterTabText: {
    color: colors.surface,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIcon: {
    fontSize: 20,
  },
  transactionTypeIcon: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  transactionInfo: {
    flex: 1,
  },
  assetName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  assetSymbol: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionType: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionAmount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  transactionValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  transactionPrice: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  notesContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    color: colors.textLight,
  },
  emptyStateText: {
    ...typography.h4,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    ...typography.bodySmall,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  addFirstTransactionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addFirstTransactionButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    width: '80%',
    maxWidth: 300,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  selectedModalOption: {
    backgroundColor: colors.primary,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOptionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  modalOptionText: {
    ...typography.body,
    color: colors.text,
  },
  selectedModalOptionText: {
    color: colors.surface,
  },
  modalSortArrow: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: 'bold',
  },
  filterModalContent: {
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  filterTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedFilterTypeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTypeIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  filterTypeText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  selectedFilterTypeText: {
    color: colors.surface,
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sortOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedSortOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOptionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  sortOptionText: {
    ...typography.body,
    color: colors.text,
  },
  selectedSortOptionText: {
    color: colors.surface,
  },
  sortArrow: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: 'bold',
  },
  assetFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  assetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedAssetChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  assetChipText: {
    ...typography.body,
    color: colors.text,
  },
  selectedAssetChipText: {
    color: colors.surface,
  },
  rangeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeInput: {
    flex: 1,
    padding: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  rangeSeparator: {
    marginHorizontal: spacing.sm,
    ...typography.caption,
    color: colors.textSecondary,
  },
  applyButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});

export default TransactionHistoryScreen; 