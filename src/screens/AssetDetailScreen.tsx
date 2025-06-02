import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePortfolio } from '../context/PortfolioContext';
import { calculateAssetHolding, formatCurrency, formatPercentage, formatDate } from '../utils/calculations';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { TransactionType } from '../types';

interface AssetDetailScreenProps {
  navigation: any;
  route: any;
}

const AssetDetailScreen: React.FC<AssetDetailScreenProps> = ({ navigation, route }) => {
  const { assetId } = route.params;
  const { assets, refreshMarketPrices, deleteAsset } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);

  const asset = assets.find(a => a.id === assetId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMarketPrices();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh market prices');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteAsset = () => {
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete ${asset?.name}? This will also delete all associated transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAsset(assetId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!asset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Asset Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Asset not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const holding = calculateAssetHolding(asset);

  const renderAssetInfo = () => (
    <View style={styles.assetInfoCard}>
      <View style={styles.assetHeader}>
        <View style={styles.assetTitleContainer}>
          <Text style={styles.assetName}>{asset.name}</Text>
          <Text style={styles.assetSymbol}>{asset.symbol}</Text>
        </View>
        <View style={styles.assetPriceContainer}>
          <Text style={styles.currentPrice}>{formatCurrency(asset.currentPrice)}</Text>
          <Text style={[
            styles.priceChange,
            { color: holding.gainLoss >= 0 ? colors.success : colors.error }
          ]}>
            {formatPercentage(holding.gainLossPercentage)}
          </Text>
        </View>
      </View>

      <View style={styles.holdingStats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Shares:</Text>
          <Text style={styles.statValue}>{holding.totalShares.toFixed(2)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Average Buy Price:</Text>
          <Text style={styles.statValue}>{formatCurrency(holding.averageBuyPrice)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Current Value:</Text>
          <Text style={styles.statValue}>{formatCurrency(holding.currentValue)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Gain/Loss:</Text>
          <Text style={[
            styles.statValue,
            { color: holding.gainLoss >= 0 ? colors.success : colors.error }
          ]}>
            {formatCurrency(holding.gainLoss)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTransactionHistory = () => (
    <View style={styles.transactionsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddTransaction', { assetId: asset.id })}
        >
          <Text style={styles.addTransactionText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      
      {asset.transactions.length === 0 ? (
        <View style={styles.emptyTransactions}>
          <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
        </View>
      ) : (
        asset.transactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionHeader}>
                <View style={[
                  styles.transactionTypeIndicator,
                  { backgroundColor: transaction.type === TransactionType.BUY ? colors.success : colors.error }
                ]}>
                  <Text style={styles.transactionTypeText}>
                    {transaction.type === TransactionType.BUY ? 'BUY' : 'SELL'}
                  </Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionAmount}>
                    {transaction.amount} shares @ {formatCurrency(transaction.price)}
                  </Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                </View>
                <Text style={styles.transactionTotal}>
                  {formatCurrency(transaction.amount * transaction.price)}
                </Text>
              </View>
              {transaction.notes && (
                <Text style={styles.transactionNotes}>{transaction.notes}</Text>
              )}
            </View>
          ))
      )}
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.actionButton, styles.buyButton]}
        onPress={() => navigation.navigate('AddTransaction', { assetId: asset.id, defaultType: 'buy' })}
      >
        <Text style={styles.actionButtonText}>Buy More</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.sellButton]}
        onPress={() => navigation.navigate('AddTransaction', { assetId: asset.id, defaultType: 'sell' })}
      >
        <Text style={styles.actionButtonText}>Sell</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={handleDeleteAsset}
      >
        <Text style={styles.actionButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{asset.symbol}</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Text style={{ fontSize: 24, color: refreshing ? colors.textLight : colors.primary }}>
            🔄
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderAssetInfo()}
        
        {renderTransactionHistory()}
        {renderActionButtons()}
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
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Reduced from 120 to 100 to account for flush tab bar positioning
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.h4,
    color: colors.textSecondary,
  },
  assetInfoCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  assetTitleContainer: {
    flex: 1,
  },
  assetName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: 'bold',
  },
  assetSymbol: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  assetPriceContainer: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    ...typography.h3,
    color: colors.text,
    fontWeight: 'bold',
  },
  priceChange: {
    ...typography.body,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  holdingStats: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  transactionsContainer: {
    margin: spacing.md,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  addTransactionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyTransactions: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  transactionItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTypeIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  transactionTypeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  transactionTotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  transactionNotes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: spacing.md,
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    ...shadows.sm,
  },
  buyButton: {
    backgroundColor: colors.success,
  },
  sellButton: {
    backgroundColor: colors.warning,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});

export default AssetDetailScreen; 