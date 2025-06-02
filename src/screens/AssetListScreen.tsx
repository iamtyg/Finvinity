import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { calculateAssetHolding, formatCurrency, formatPercentage, sortAssets } from '../utils/calculations';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { AssetCategory, Asset } from '../types';

interface AssetListScreenProps {
  navigation: any;
}

const AssetListScreen: React.FC<AssetListScreenProps> = ({ navigation }) => {
  const { assets, deleteAsset } = usePortfolio();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'gainLoss' | 'date'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const categories = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: AssetCategory.STOCKS, label: 'Stocks', icon: 'trending-up' },
    { key: AssetCategory.CRYPTOCURRENCY, label: 'Crypto', icon: 'logo-bitcoin' },
    { key: AssetCategory.FOREIGN_CURRENCY, label: 'Currency', icon: 'card' },
    { key: AssetCategory.GOLD, label: 'Gold', icon: 'diamond' },
    { key: AssetCategory.MUTUAL_FUNDS, label: 'Funds', icon: 'pie-chart' },
  ];

  const sortOptions = [
    { key: 'value', label: 'Value' },
    { key: 'gainLoss', label: 'Gain/Loss' },
    { key: 'name', label: 'Name' },
    { key: 'date', label: 'Date' },
  ];

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory);
    }

    // Sort assets
    return sortAssets(filtered, sortBy, sortOrder);
  }, [assets, searchQuery, selectedCategory, sortBy, sortOrder]);

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case AssetCategory.STOCKS:
        return 'trending-up';
      case AssetCategory.CRYPTOCURRENCY:
        return 'logo-bitcoin';
      case AssetCategory.FOREIGN_CURRENCY:
        return 'card';
      case AssetCategory.GOLD:
        return 'diamond';
      case AssetCategory.MUTUAL_FUNDS:
        return 'pie-chart';
      default:
        return 'wallet';
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

  const handleDeleteAsset = (asset: Asset) => {
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete ${asset.name}? This will also delete all associated transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAsset(asset.id),
        },
      ]
    );
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const renderAssetItem = ({ item: asset }: { item: Asset }) => {
    const holding = calculateAssetHolding(asset);
    const categoryColor = getCategoryColor(asset.category);

    return (
      <TouchableOpacity
        style={styles.assetCard}
        onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
      >
        <View style={styles.assetHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
            <Text style={{ fontSize: 20, color: 'white' }}>
              {asset.category === AssetCategory.STOCKS ? '📈' : 
               asset.category === AssetCategory.CRYPTOCURRENCY ? '₿' :
               asset.category === AssetCategory.FOREIGN_CURRENCY ? '💱' :
               asset.category === AssetCategory.GOLD ? '🥇' : '📊'}
            </Text>
          </View>
          <View style={styles.assetInfo}>
            <Text style={styles.assetName}>{asset.name}</Text>
            <Text style={styles.assetSymbol}>{asset.symbol}</Text>
            <Text style={styles.assetShares}>
              {holding.totalShares.toFixed(2)} shares
            </Text>
          </View>
          <View style={styles.assetValues}>
            <Text style={styles.assetValue}>
              {formatCurrency(holding.currentValue)}
            </Text>
            <Text
              style={[
                styles.assetGainLoss,
                { color: holding.gainLoss >= 0 ? colors.gain : colors.loss },
              ]}
            >
              {formatCurrency(holding.gainLoss)}
            </Text>
            <Text
              style={[
                styles.assetGainLossPercent,
                { color: holding.gainLoss >= 0 ? colors.gain : colors.loss },
              ]}
            >
              {formatPercentage(holding.gainLossPercentage)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleDeleteAsset(asset)}
          >
            <Text style={{ fontSize: 20, color: colors.error }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilter}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.key && styles.selectedCategoryChip,
            ]}
            onPress={() => setSelectedCategory(item.key as any)}
          >
            <Text style={{ 
              fontSize: 16, 
              color: selectedCategory === item.key ? colors.surface : colors.textSecondary 
            }}>
              {item.key === 'all' ? '📱' :
               item.key === AssetCategory.STOCKS ? '📈' : 
               item.key === AssetCategory.CRYPTOCURRENCY ? '₿' :
               item.key === AssetCategory.FOREIGN_CURRENCY ? '💱' :
               item.key === AssetCategory.GOLD ? '🥇' : '📊'}
            </Text>
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === item.key && styles.selectedCategoryChipText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      {sortOptions.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.sortChip,
            sortBy === option.key && styles.selectedSortChip,
          ]}
          onPress={() => handleSort(option.key as any)}
        >
          <Text
            style={[
              styles.sortChipText,
              sortBy === option.key && styles.selectedSortChipText,
            ]}
          >
            {option.label}
          </Text>
          {sortBy === option.key && (
            <Text style={{ fontSize: 12, color: colors.surface }}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Assets</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={{ fontSize: 20, color: colors.textLight }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: 20, color: colors.textLight }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderCategoryFilter()}
      {renderSortOptions()}

      <FlatList
        data={filteredAndSortedAssets}
        keyExtractor={(item) => item.id}
        renderItem={renderAssetItem}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, color: colors.textLight }}>🔍</Text>
            <Text style={styles.emptyStateText}>No assets found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first asset to get started'}
            </Text>
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
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  categoryFilter: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  selectedCategoryChipText: {
    color: colors.surface,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedSortChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedSortChipText: {
    color: colors.surface,
    marginRight: spacing.xs,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  assetCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  assetInfo: {
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
  assetShares: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  assetValues: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  assetValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  assetGainLoss: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  assetGainLossPercent: {
    ...typography.caption,
    fontWeight: '600',
  },
  moreButton: {
    padding: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
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
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  addButtonText: {
    fontSize: 20,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default AssetListScreen; 