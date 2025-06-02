import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { calculateAssetHolding, formatCurrency, formatPercentage, calculatePortfolioPerformance, getPerformanceTrend } from '../utils/calculations';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { AssetCategory } from '../types';
import MarketStatusBanner from '../components/MarketStatusBanner';
import { calculateRealTodayPerformance, debugTodayCalculation } from '../services/realTodayPerformance';
import { getPortfolioPerformanceMetrics } from '../services/portfolioPerformance';

interface PortfolioScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

const PortfolioScreen: React.FC<PortfolioScreenProps> = ({ navigation }) => {
  const { 
    portfolio, 
    assets, 
    loading, 
    marketStatus, 
    lastUpdated, 
    refreshMarketPrices, 
    refreshMarketStatus,
    autoUpdateEnabled,
    toggleAutoUpdate
  } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [todayPerformance, setTodayPerformance] = useState<{
    change: number;
    changePercentage: number;
    startValue: number;
    currentValue: number;
    isMarketOpen: boolean;
  } | null>(null);

  // Calculate enhanced portfolio performance
  const portfolioPerformance = calculatePortfolioPerformance(assets);
  const performanceTrend = getPerformanceTrend(portfolioPerformance.gainLossPercentage);

  // Calculate accurate today performance based on market status
  useEffect(() => {
    const updateTodayPerformance = async () => {
      if (assets.length > 0) {
        try {
          console.log('🔄 Updating today performance...');
          
          // Debug: Show current portfolio state
          debugTodayCalculation(assets);
          
          const todayPerf = await calculateRealTodayPerformance(assets);
          setTodayPerformance(todayPerf);
          
          console.log('✅ Today performance updated:', todayPerf);
        } catch (error) {
          console.error('❌ Error calculating today performance:', error);
        }
      } else {
        setTodayPerformance(null);
      }
    };

    updateTodayPerformance();
  }, [assets, marketStatus]); // Recalculate when assets or market status changes

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshMarketPrices(),
        refreshMarketStatus()
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh market data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarketStatusRefresh = async () => {
    try {
      await Promise.all([
        refreshMarketPrices(),
        refreshMarketStatus()
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh market data');
    }
  };

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

  const renderPortfolioSummary = () => {
    // Use accurate today performance calculation
    const totalGainLoss = portfolioPerformance.totalGainLoss;
    const totalGainLossPercentage = portfolioPerformance.gainLossPercentage;
    
    // Use the new accurate today performance or fallback to 0
    const oneDayChange = todayPerformance?.change || 0;
    const oneDayChangePercentage = todayPerformance?.changePercentage || 0;
    
    return (
      <View style={styles.portfolioContainer}>
        {/* Main Portfolio Value Section */}
        <View style={styles.portfolioValueSection}>
          <Text style={styles.portfolioLabel}>Portfolio Value</Text>
          <Text style={styles.portfolioMainValue}>
            {formatCurrency(portfolioPerformance.totalValue)}
          </Text>
        </View>

        {/* Performance Metrics Grid */}
        <View style={styles.performanceGrid}>
          {/* Total Performance */}
          <View style={styles.performanceMetric}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceLabel}>Total Return</Text>
            </View>
            <Text style={[
              styles.performanceAmount,
              { color: totalGainLoss >= 0 ? colors.success : colors.error }
            ]}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
            </Text>
            <Text style={[
              styles.performancePercentage,
              { color: totalGainLoss >= 0 ? colors.success : colors.error }
            ]}>
              {formatPercentage(totalGainLossPercentage)}
            </Text>
          </View>

          {/* Accurate Today Performance */}
          <View style={styles.performanceMetric}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceLabel}>Today</Text>
              {todayPerformance?.isMarketOpen && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.performanceAmount,
              { color: oneDayChange >= 0 ? colors.success : colors.error }
            ]}>
              {oneDayChange >= 0 ? '+' : ''}{formatCurrency(oneDayChange)}
            </Text>
            <Text style={[
              styles.performancePercentage,
              { color: oneDayChange >= 0 ? colors.success : colors.error }
            ]}>
              {formatPercentage(oneDayChangePercentage)}
            </Text>
          </View>
        </View>

        {/* Portfolio Statistics */}
        <View style={styles.portfolioStatsSection}>
          <View style={styles.statGroup}>
            <Text style={styles.statValue}>{portfolioPerformance.numberOfAssets}</Text>
            <Text style={styles.statLabel}>Assets</Text>
          </View>
          
          <View style={styles.statDividerLine} />
          
          <View style={styles.statGroup}>
            <Text style={styles.statValue}>{formatCurrency(portfolioPerformance.totalInvestment)}</Text>
            <Text style={styles.statLabel}>Invested</Text>
          </View>
          
          <View style={styles.statDividerLine} />
          
          <View style={styles.statGroup}>
            <Text style={styles.statValue}>{portfolioPerformance.activeHoldings}</Text>
            <Text style={styles.statLabel}>Holdings</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAssetItem = (asset: any) => {
    const holding = calculateAssetHolding(asset);
    const categoryColor = getCategoryColor(asset.category);

    return (
      <TouchableOpacity
        key={asset.id}
        style={styles.assetCard}
        onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
      >
        <View style={styles.assetHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
            <Text style={{ fontSize: 20, color: 'white' }}>
              {getCategoryIcon(asset.category)}
            </Text>
          </View>
          <View style={styles.assetInfo}>
            <Text style={styles.assetName}>{asset.name}</Text>
            <Text style={styles.assetSymbol}>{asset.symbol}</Text>
            <Text style={styles.holdingsQuantity}>
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
                { color: holding.gainLoss >= 0 ? colors.success : colors.error },
              ]}
            >
              {holding.gainLoss >= 0 ? '+' : ''}{formatCurrency(holding.gainLoss)}
            </Text>
            <Text
              style={[
                styles.assetGainLossPercentage,
                { color: holding.gainLoss >= 0 ? colors.success : colors.error },
              ]}
            >
              {formatPercentage(holding.gainLossPercentage)}
            </Text>
          </View>
        </View>
        <View style={styles.assetDetails}>
          <View style={styles.priceInfoContainer}>
            <View style={styles.currentPriceSection}>
              <Text style={styles.priceLabel}>Current</Text>
              <Text style={styles.priceValue}>{formatCurrency(asset.currentPrice)}</Text>
            </View>
            <View style={styles.avgPriceSection}>
              <Text style={styles.priceLabel}>Avg. Cost</Text>
              <Text style={styles.priceValue}>{formatCurrency(holding.averageBuyPrice)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={{ fontSize: 24, color: colors.primary }}>⚙️</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finvinity</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Text style={{ fontSize: 24, color: refreshing ? colors.textLight : colors.primary }}>
            🔄
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Market Status Banner with Auto-Update Toggle */}
          <MarketStatusBanner
            marketStatus={marketStatus}
            lastUpdated={lastUpdated}
            onRefresh={handleMarketStatusRefresh}
            loading={loading || refreshing}
            autoUpdateEnabled={autoUpdateEnabled}
            toggleAutoUpdate={toggleAutoUpdate}
          />

          {renderPortfolioSummary()}

          <View style={styles.assetsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Assets</Text>
            </View>

            {assets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48, color: colors.textLight }}>💼</Text>
                <Text style={styles.emptyStateText}>No assets yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add your first asset to start tracking your portfolio
                </Text>
                <TouchableOpacity
                  style={styles.addFirstAssetButton}
                  onPress={() => navigation.navigate('AddTransaction')}
                >
                  <Text style={styles.addFirstAssetButtonText}>Add Asset</Text>
                </TouchableOpacity>
              </View>
            ) : (
              assets.slice(0, 5).map(renderAssetItem)
            )}
          </View>
        </ScrollView>
      </View>
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  portfolioContainer: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  portfolioValueSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  portfolioLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  portfolioMainValue: {
    ...typography.h1,
    color: colors.text,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  performanceMetric: {
    alignItems: 'center',
    flex: 1,
    minHeight: 80,
  },
  performanceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  performanceAmount: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  performancePercentage: {
    ...typography.bodySmall,
    fontWeight: '500',
    textAlign: 'center',
  },
  portfolioStatsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statGroup: {
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
    marginBottom: spacing.xs,
  },
  statDividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  assetsSection: {
    paddingHorizontal: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  assetCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  },
  assetValues: {
    alignItems: 'flex-end',
  },
  assetValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  assetGainLoss: {
    ...typography.caption,
    fontWeight: '600',
  },
  assetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  currentPriceSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  avgPriceSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
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
  addFirstAssetButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  addFirstAssetButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  holdingsQuantity: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  assetGainLossPercentage: {
    ...typography.caption,
    fontWeight: '500',
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    minHeight: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  liveText: {
    ...typography.caption,
    color: colors.success,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default PortfolioScreen; 