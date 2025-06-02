import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePortfolio } from '../context/PortfolioContext';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { newsService, NewsArticle, MarketIndicator } from '../services/newsService';

interface NewsScreenProps {
  navigation: any;
}

const NewsScreen: React.FC<NewsScreenProps> = ({ navigation }) => {
  const { portfolio, assets } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'news' | 'insights'>('news');
  const [marketNews, setMarketNews] = useState<NewsArticle[]>([]);
  const [portfolioNews, setPortfolioNews] = useState<NewsArticle[]>([]);
  const [marketIndicators, setMarketIndicators] = useState<MarketIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    loadNewsData(false);
  }, [assets]);

  const loadNewsData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setApiStatus('🔄 Loading real-time news...');
      
      const startTime = Date.now();
      
      // Fetch data from live APIs with force refresh option
      const [marketNewsData, marketIndicatorsData, portfolioNewsData] = await Promise.all([
        newsService.getMarketNews(8, forceRefresh),
        newsService.getMarketIndicators(),
        newsService.getPortfolioNews(assets, 6, forceRefresh),
      ]);

      const loadTime = Date.now() - startTime;
      
      setMarketNews(marketNewsData);
      setMarketIndicators(marketIndicatorsData);
      setPortfolioNews(portfolioNewsData);
      setLastUpdateTime(new Date());
      
      // Determine data source and API status
      const liveApiSources = ['NewsAPI', 'Finnhub', 'Alpha Vantage'];
      const hasLiveData = marketNewsData.some(article => 
        liveApiSources.includes(article.apiSource || '')
      );
      
      if (hasLiveData) {
        setApiStatus(`✅ Live APIs connected`);
        setDataSource(`Real-time data (${loadTime}ms)`);
      } else {
        setApiStatus(`⚠️ Using cached/curated data`);
        setDataSource(`Fallback data (${loadTime}ms)`);
      }
      
      // Log cache status for debugging
      console.log('[NewsScreen] Cache Status:', newsService.getCacheStatus());
      
    } catch (error) {
      console.error('Error loading news data:', error);
      setApiStatus('❌ API connection failed');
      setDataSource('Error loading data');
      Alert.alert('Error', 'Failed to load news data. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNewsData(true); // Force refresh from APIs
    setRefreshing(false);
  };

  const handleArticlePress = async (article: NewsArticle) => {
    try {
      // Check if URL is valid and not a placeholder
      if (!article.url || 
          article.url.includes('example.com') || 
          article.url === 'https://finnhub.io') {
        Alert.alert(
          'Demo Article', 
          'This article uses demo content. Real articles from live APIs will have working URLs.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const supported = await Linking.canOpenURL(article.url);
      if (supported) {
        await Linking.openURL(article.url);
      } else {
        Alert.alert('Error', 'Unable to open article URL');
      }
    } catch (error) {
      console.error('Error opening article:', error);
      Alert.alert('Error', 'Failed to open article');
    }
  };

  const clearCacheAndRefresh = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached news and force fetch fresh data from APIs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            newsService.clearCache();
            await loadNewsData(true);
          },
        },
      ]
    );
  };

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          selectedTab === 'news' && styles.selectedTabButton,
        ]}
        onPress={() => setSelectedTab('news')}
      >
        <Text style={styles.tabIcon}>📰</Text>
        <Text
          style={[
            styles.tabButtonText,
            selectedTab === 'news' && styles.selectedTabButtonText,
          ]}
        >
          Market News
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tabButton,
          selectedTab === 'insights' && styles.selectedTabButton,
        ]}
        onPress={() => setSelectedTab('insights')}
      >
        <Text style={styles.tabIcon}>💡</Text>
        <Text
          style={[
            styles.tabButtonText,
            selectedTab === 'insights' && styles.selectedTabButtonText,
          ]}
        >
          Portfolio Insights
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatusBar = () => (
    <View style={styles.statusBar}>
      <View style={styles.statusLeft}>
        <Text style={styles.statusText}>{apiStatus}</Text>
        <Text style={styles.dataSourceText}>{dataSource}</Text>
      </View>
      <View style={styles.statusRight}>
        {lastUpdateTime && (
          <Text style={styles.updateTime}>
            Updated: {newsService.formatTimeAgo(lastUpdateTime.toISOString())}
          </Text>
        )}
        <TouchableOpacity
          onPress={clearCacheAndRefresh}
          style={styles.clearCacheButton}
        >
          <Text style={styles.clearCacheText}>🗑️ Clear Cache</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMarketIndicator = (indicator: MarketIndicator) => (
    <View key={indicator.name} style={styles.indicatorItem}>
      <Text style={styles.indicatorName}>{indicator.name}</Text>
      <Text style={styles.indicatorValue}>{indicator.value}</Text>
      <View style={styles.indicatorChange}>
        <Text style={[
          styles.indicatorChangeText,
          { color: indicator.isPositive ? colors.success : colors.error }
        ]}>
          {indicator.isPositive ? '+' : ''}{indicator.change.toFixed(2)}
        </Text>
        <Text style={[
          styles.indicatorChangePercent,
          { color: indicator.isPositive ? colors.success : colors.error }
        ]}>
          ({indicator.isPositive ? '+' : ''}{indicator.changePercent.toFixed(2)}%)
        </Text>
      </View>
    </View>
  );

  const renderNewsArticle = (article: NewsArticle) => (
    <TouchableOpacity
      key={article.id}
      style={styles.newsCard}
      onPress={() => handleArticlePress(article)}
      activeOpacity={0.7}
    >
      <View style={styles.newsContent}>
        <View style={styles.newsHeader}>
          <View style={styles.newsSource}>
            <Text style={styles.newsSourceText}>{article.source}</Text>
            <View style={styles.newsMetadata}>
              <Text style={styles.newsTime}>
                {newsService.formatTimeAgo(article.publishedAt)}
              </Text>
              {article.apiSource && (
                <Text style={styles.apiSourceBadge}>
                  {article.apiSource}
                </Text>
              )}
            </View>
          </View>
          {article.sentiment !== undefined && (
            <View style={[
              styles.sentimentBadge,
              { backgroundColor: newsService.getSentimentColor(article.sentiment) }
            ]}>
              <Text style={styles.sentimentText}>
                {newsService.getSentimentLabel(article.sentiment)}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.newsTitle} numberOfLines={3}>{article.title}</Text>
        <Text style={styles.newsSnippet} numberOfLines={2}>{article.snippet}</Text>
        
        {article.relatedSymbols && article.relatedSymbols.length > 0 && (
          <View style={styles.symbolContainer}>
            {article.relatedSymbols.map((symbol) => (
              <View key={symbol} style={styles.symbolBadge}>
                <Text style={styles.symbolText}>{symbol}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      {article.imageUrl && (
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.newsImage}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );

  const renderMarketNewsTab = () => (
    <View style={styles.tabContent}>
      {/* Enhanced Status Bar */}
      {renderStatusBar()}

      {/* Market Indicators */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Overview</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.indicatorsContainer}
        >
          {marketIndicators.map(renderMarketIndicator)}
        </ScrollView>
      </View>

      {/* Market News */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest Market News</Text>
        <Text style={styles.sectionSubtitle}>
          Real-time financial news from NewsAPI, Finnhub, and other sources
        </Text>
        
        {marketNews.length > 0 ? (
          marketNews.map(renderNewsArticle)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No news available</Text>
            <Text style={styles.emptyStateSubtext}>Pull to refresh or check your connection</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.viewMoreButton} onPress={onRefresh}>
          <Text style={styles.viewMoreText}>🔄 Force Refresh from APIs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInsightsTab = () => (
    <View style={styles.tabContent}>
      {/* Enhanced Status Bar */}
      {renderStatusBar()}

      {/* Portfolio News */}
      {portfolioNews.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Portfolio News</Text>
          <Text style={styles.sectionSubtitle}>
            Company-specific news for your holdings ({assets.length} assets)
          </Text>
          
          {portfolioNews.map(renderNewsArticle)}
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No portfolio news available</Text>
            <Text style={styles.emptyStateSubtext}>
              Add assets to your portfolio to see company-specific news
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>News & Insights</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading real-time financial news...</Text>
          <Text style={styles.loadingSubtext}>Connecting to NewsAPI, Finnhub, and Alpha Vantage</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Empty space for balance */}
        </View>
        <Text style={styles.headerTitle}>News & Insights</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.headerRight}>
          <Text style={{ 
            fontSize: 24, 
            color: refreshing ? colors.textLight : colors.primary 
          }}>
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
        {selectedTab === 'news' && renderMarketNewsTab()}
        {selectedTab === 'insights' && renderInsightsTab()}
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
  headerLeft: {
    width: 24, // Same width as refresh button for balance
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  loadingSubtext: {
    ...typography.caption,
    color: colors.textLight,
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
  tabIcon: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  tabButtonText: {
    ...typography.caption,
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
    paddingBottom: 100,
  },
  tabContent: {
    paddingHorizontal: spacing.md,
  },
  
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  statusLeft: {
    flex: 1,
  },
  statusRight: {
    alignItems: 'flex-end',
  },
  statusText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dataSourceText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  updateTime: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  clearCacheButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  clearCacheText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  newsMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  apiSourceBadge: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
    fontSize: 9,
    fontWeight: '600',
  },
  indicatorItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    minWidth: 120,
    alignItems: 'center',
    ...shadows.sm,
  },
  indicatorName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  indicatorValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  indicatorChange: {
    alignItems: 'center',
  },
  indicatorChangeText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  indicatorChangePercent: {
    ...typography.caption,
    fontWeight: '500',
  },
  newsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  newsContent: {
    padding: spacing.md,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  newsSource: {
    flex: 1,
  },
  newsSourceText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  newsTime: {
    ...typography.caption,
    color: colors.textLight,
  },
  sentimentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sentimentText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 10,
  },
  newsTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  newsSnippet: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  symbolContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  symbolBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  symbolText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 10,
  },
  newsImage: {
    width: '100%',
    height: 120,
  },
  viewMoreButton: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  viewMoreText: {
    ...typography.button,
    color: colors.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    ...typography.caption,
    color: colors.textLight,
  },
  
  // Market Indicators
  indicatorsContainer: {
    marginBottom: spacing.md,
  },
});

export default NewsScreen; 