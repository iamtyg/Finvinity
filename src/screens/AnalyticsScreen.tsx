import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { usePortfolio } from '../context/PortfolioContext';
import { calculateAssetHolding, formatCurrency, formatPercentage, calculatePortfolioPerformance, getPerformanceTrend, formatLargeNumber } from '../utils/calculations';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { AssetCategory, ChartDataPoint, FilterOptions } from '../types';
import { generatePortfolioHistoricalData, getPerformanceMetrics } from '../services/historicalData';
import AssetChart from '../components/AssetChart';
import { 
  generatePortfolioPerformanceData, 
  getPortfolioPerformanceMetrics,
  getAvailableTimeframes 
} from '../services/portfolioPerformance';

interface AnalyticsScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');
const chartWidth = width - (spacing.md * 2);

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const { portfolio, assets, refreshMarketPrices } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioHistoricalData, setPortfolioHistoricalData] = useState<ChartDataPoint[]>([]);
  const [selectedTab, setSelectedTab] = useState<'allocation' | 'performance'>('allocation');
  
  // Portfolio chart states
  const [portfolioPerformanceData, setPortfolioPerformanceData] = useState<ChartDataPoint[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'>('1M');
  const [availableTimeframes, setAvailableTimeframes] = useState<Array<'1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'>>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  // Calculate enhanced portfolio performance
  const portfolioPerformance = calculatePortfolioPerformance(assets);
  const performanceTrend = getPerformanceTrend(portfolioPerformance.gainLossPercentage);

  useEffect(() => {
    if (assets.length > 0) {
      const historicalData = generatePortfolioHistoricalData(assets, 90);
      setPortfolioHistoricalData(historicalData);
    }
  }, [assets]);

  // Portfolio chart effect
  useEffect(() => {
    if (assets.length > 0) {
      // Get available timeframes based on transaction history
      const available = getAvailableTimeframes(assets);
      setAvailableTimeframes(available);
      
      // Use the first available timeframe if current selection is not available
      if (available.length > 0 && !available.includes(selectedTimeframe)) {
        setSelectedTimeframe(available[0]);
      }
      
      if (available.includes(selectedTimeframe)) {
        // Generate percentage-based performance data
        const performanceData = generatePortfolioPerformanceData(assets, selectedTimeframe);
        setPortfolioPerformanceData(performanceData);
        
        // Get comprehensive performance metrics
        const metrics = getPortfolioPerformanceMetrics(assets);
        setPerformanceMetrics(metrics);
      }
    } else {
      setPortfolioPerformanceData([]);
      setPerformanceMetrics(null);
      setAvailableTimeframes([]);
    }
  }, [assets, selectedTimeframe]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMarketPrices();
    } catch (error) {
      console.error('Failed to refresh market prices');
    } finally {
      setRefreshing(false);
    }
  };

  const getCategoryName = (category: AssetCategory) => {
    switch (category) {
      case AssetCategory.STOCKS:
        return 'Stocks';
      case AssetCategory.CRYPTOCURRENCY:
        return 'Crypto';
      case AssetCategory.FOREIGN_CURRENCY:
        return 'Forex';
      case AssetCategory.GOLD:
        return 'Gold';
      case AssetCategory.MUTUAL_FUNDS:
        return 'Funds';
      default:
        return 'Other';
    }
  };

  // Generate consistent unique colors for individual assets
  const getAssetColor = (assetSymbol: string) => {
    // Generate a hash from the asset symbol for consistent colors
    let hash = 0;
    for (let i = 0; i < assetSymbol.length; i++) {
      const char = assetSymbol.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to a hue value (0-360)
    const hue = Math.abs(hash) % 360;
    
    // Use HSL to generate vibrant, distinguishable colors
    // High saturation (70-90%) and medium lightness (45-65%) for good contrast
    const saturation = 70 + (Math.abs(hash) % 20); // 70-90%
    const lightness = 45 + (Math.abs(hash) % 20);  // 45-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getAssetAllocationData = () => {
    // Create individual asset data instead of grouping by category
    const assetData = assets.map(asset => {
      const holding = calculateAssetHolding(asset);
      return {
        asset,
        name: asset.symbol,
        fullName: asset.name,
        population: holding.currentValue,
        color: getAssetColor(asset.symbol),
        legendFontColor: colors.text,
        legendFontSize: 12,
        category: asset.category,
      };
    }).filter(item => item.population > 0) // Only show assets with value
    .sort((a, b) => b.population - a.population); // Sort by value descending

    return assetData;
  };

  const renderTimeframeSelector = () => {
    if (availableTimeframes.length === 0) return null;

    // Ensure proper chronological order
    const timeframeOrder = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'];
    const orderedTimeframes = timeframeOrder.filter(tf => 
      availableTimeframes.includes(tf as any)
    );

    return (
      <View style={styles.timeframeSelector}>
        {orderedTimeframes.map((timeframe) => (
          <TouchableOpacity
            key={timeframe}
            style={[
              styles.timeframeButton,
              selectedTimeframe === timeframe && styles.selectedTimeframeButton,
            ]}
            onPress={() => setSelectedTimeframe(timeframe as any)}
          >
            <Text
              style={[
                styles.timeframeButtonText,
                selectedTimeframe === timeframe && styles.selectedTimeframeButtonText,
              ]}
            >
              {timeframe}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      {[
        { key: 'allocation', label: 'Allocation' },
        { key: 'performance', label: 'Performance' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            selectedTab === tab.key && styles.selectedTabButton,
          ]}
          onPress={() => setSelectedTab(tab.key as any)}
        >
          <Text
            style={[
              styles.tabButtonText,
              selectedTab === tab.key && styles.selectedTabButtonText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAllocationTab = () => {
    const allocationData = getAssetAllocationData();
    
    if (allocationData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No assets to analyze</Text>
        </View>
      );
    }

    // Calculate concentration metrics
    const concentrationThreshold = 25; // 25% concentration considered high
    const highConcentrationAssets = allocationData.filter(item => 
      (item.population / portfolioPerformance.totalValue) * 100 > concentrationThreshold
    );

    return (
      <View>
        {/* Portfolio Overview Stats */}
        <View style={styles.allocationOverview}>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewValue}>{formatLargeNumber(portfolioPerformance.totalValue)}</Text>
              <Text style={styles.overviewLabel}>Total Value</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewValue}>{portfolioPerformance.numberOfAssets}</Text>
              <Text style={styles.overviewLabel}>Asset Types</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={[styles.overviewValue, {
                color: portfolioPerformance.gainLossPercentage >= 0 ? colors.success : colors.error
              }]}>
                {formatPercentage(portfolioPerformance.gainLossPercentage)}
              </Text>
              <Text style={styles.overviewLabel}>Total Return</Text>
            </View>
          </View>
        </View>

        {/* Asset Allocation Chart */}
        <View style={styles.fullWidthChartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Portfolio Allocation</Text>
            <Text style={styles.chartSubtitle}>Distribution by individual holdings</Text>
          </View>
          
          {/* Centered Container for Legend + Chart */}
          <View style={styles.centeredChartContainer}>
            {/* Custom Legend positioned above chart, centered */}
            <View style={styles.centeredLegend}>
              {allocationData.map(item => {
                const percentage = (item.population / portfolioPerformance.totalValue) * 100;
                return (
                  <View key={item.asset.id} style={styles.legendItem}>
                    <View style={[styles.legendColorIndicator, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>
                      {item.name} {formatPercentage(percentage)}
                    </Text>
                  </View>
                );
              })}
            </View>
            
            {/* Pie Chart */}
            <View style={styles.chartWrapper}>
            <PieChart
              data={allocationData.map(item => {
                const percentage = (item.population / portfolioPerformance.totalValue) * 100;
                return {
                  ...item,
                    name: `${formatPercentage(percentage)}`,
                    legendFontColor: 'transparent', // Hide default legend text
                    legendFontSize: 0,
                };
              })}
                width={Math.min(width - 120, 260)} // Slightly smaller for better balance
                height={260}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                color: (opacity = 1) => colors.text,
                labelColor: (opacity = 1) => colors.text,
                style: {
                  borderRadius: 0,
                },
                propsForLabels: {
                    fontSize: 11,
                  fontWeight: '500',
                },
              }}
              accessor="population"
              backgroundColor="transparent"
                paddingLeft="40"
                center={[20, 0]}
              absolute={false}
                hasLegend={false} // Disable built-in legend
              avoidFalseZero={true}
                style={styles.centeredPieChart}
            />
            </View>
          </View>
        </View>

        {/* Allocation Breakdown */}
        <View style={styles.allocationDetails}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Allocation Breakdown</Text>
            {highConcentrationAssets.length > 0 && (
              <View style={styles.warningBadge}>
                <Text style={styles.warningText}>High Concentration</Text>
              </View>
            )}
          </View>
          
          {allocationData.map((item, index) => {
            const percentage = (item.population / portfolioPerformance.totalValue) * 100;
            const isHighConcentration = percentage > concentrationThreshold;
            
            return (
              <TouchableOpacity
                key={item.asset.id}
                style={[
                  styles.allocationItem,
                  isHighConcentration && styles.highConcentrationItem
                ]}
                onPress={() => navigation.navigate('AssetDetail', { assetId: item.asset.id })}
              >
                <View style={styles.allocationItemLeft}>
                  <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                  <View style={styles.allocationInfo}>
                    <View style={styles.allocationItemHeader}>
                      <Text style={styles.allocationItemName}>{item.name}</Text>
                      {isHighConcentration && (
                        <Text style={styles.concentrationWarning}>!</Text>
                      )}
                    </View>
                    <Text style={styles.allocationItemSubtitle}>
                      {item.fullName}
                    </Text>
                    <Text style={styles.allocationItemCategory}>
                      {getCategoryName(item.category)} • {formatPercentage(percentage)} of portfolio
                    </Text>
                  </View>
                </View>
                <View style={styles.allocationItemRight}>
                  <Text style={styles.allocationItemValue}>
                    {formatCurrency(item.population)}
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: item.color 
                      }]} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPerformanceTab = () => {
    // Always show chart section if we have assets
    if (assets.length === 0) return null;

    // Check if we have valid performance data
    const hasValidData = portfolioPerformanceData.length > 0 && performanceMetrics;
    const hasAssets = assets.length > 0;
    const hasTransactions = assets.some(asset => asset.transactions.length > 0);
    
    if (!hasValidData || !hasAssets || !hasTransactions) {
      return (
        <View style={styles.chartSection}>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataTitle}>Portfolio Performance</Text>
            <Text style={styles.noDataText}>
              {!hasAssets 
                ? 'Add assets to view portfolio performance'
                : !hasTransactions
                ? 'Add transactions to view performance over time'
                : 'Loading performance data...'
              }
            </Text>
            {hasAssets && hasTransactions && (
              <Text style={styles.noDataSubtext}>
                Debug: {assets.length} assets, {selectedTimeframe} timeframe
              </Text>
            )}
          </View>
        </View>
      );
    }

    // Get the performance for the selected timeframe
    const timeframePerformance = performanceMetrics.timeframePerformance[selectedTimeframe];
    
    // Use timeframe-specific performance for the chart summary (dynamic)
    const timeframeGainLoss = timeframePerformance?.change || 0;
    const timeframeGainLossPercentage = timeframePerformance?.changePercentage || 0;
    
    // For display purposes, show the timeframe-specific performance in the summary
    const displayCurrentValue = portfolio.totalValue; // Current portfolio value stays the same
    
    return (
      <View style={styles.chartSection}>
        <AssetChart
          data={portfolioPerformanceData}
          title="Portfolio Performance"
          currentValue={displayCurrentValue}
          gainLoss={timeframeGainLoss}
          gainLossPercentage={timeframeGainLossPercentage}
          chartType="area"
          isPercentageBased={true}
          timeframe={selectedTimeframe}
        />
        {renderTimeframeSelector()}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Text style={{ fontSize: 24, color: refreshing ? colors.textLight : colors.primary }}>
            🔄
          </Text>
        </TouchableOpacity>
      </View>

      {renderTabSelector()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'allocation' && renderAllocationTab()}
        {selectedTab === 'performance' && renderPerformanceTab()}
      </ScrollView>
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
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  selectedTabButton: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedTabButtonText: {
    color: colors.surface,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    ...typography.h4,
    color: colors.textSecondary,
  },
  chartHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  chartTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chartSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  allocationOverview: {
    margin: spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flex: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  overviewValue: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  overviewLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  allocationDetails: {
    margin: spacing.md,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningBadge: {
    backgroundColor: colors.warning,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.surface,
    fontWeight: '600',
  },
  allocationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  highConcentrationItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  allocationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  allocationInfo: {
    flex: 1,
  },
  allocationItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationItemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  concentrationWarning: {
    ...typography.body,
    color: colors.warning,
    fontWeight: 'bold',
  },
  allocationItemSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  allocationItemRight: {
    alignItems: 'flex-end',
  },
  allocationItemValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  selectedTimeframeButton: {
    backgroundColor: colors.primary,
  },
  timeframeButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedTimeframeButtonText: {
    color: colors.surface,
  },
  chartSection: {
    margin: spacing.md,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  noDataTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noDataText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  noDataSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  metricCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flex: 1,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  metricPercentage: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  allocationItemCategory: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  fullWidthChartSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    alignItems: 'center',
  },
  centeredChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  centeredLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  legendColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
    flexShrink: 0,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  centeredPieChart: {
    borderRadius: 0,
    alignSelf: 'center',
  },
});

export default AnalyticsScreen; 