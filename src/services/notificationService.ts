import { Alert } from 'react-native';
import { Asset, Portfolio } from '../types';
import { calculateAssetHolding, formatCurrency, formatPercentage } from '../utils/calculations';

export interface PriceAlert {
  id: string;
  assetId: string;
  assetSymbol: string;
  type: 'above' | 'below' | 'change';
  targetPrice?: number;
  changePercentage?: number;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  priceAlerts: boolean;
  portfolioUpdates: boolean;
  marketNews: boolean;
  weeklyReports: boolean;
  pushNotifications: boolean;
}

class NotificationService {
  private alerts: PriceAlert[] = [];
  private settings: NotificationSettings = {
    priceAlerts: true,
    portfolioUpdates: true,
    marketNews: false,
    weeklyReports: true,
    pushNotifications: true,
  };

  // Price Alert Management
  createPriceAlert(
    assetId: string,
    assetSymbol: string,
    type: 'above' | 'below' | 'change',
    targetPrice?: number,
    changePercentage?: number
  ): PriceAlert {
    const alert: PriceAlert = {
      id: Date.now().toString(),
      assetId,
      assetSymbol,
      type,
      targetPrice,
      changePercentage,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.alerts.push(alert);
    return alert;
  }

  getPriceAlerts(): PriceAlert[] {
    return this.alerts.filter(alert => alert.isActive);
  }

  getAlertsForAsset(assetId: string): PriceAlert[] {
    return this.alerts.filter(alert => alert.assetId === assetId && alert.isActive);
  }

  updateAlert(alertId: string, updates: Partial<PriceAlert>): void {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex !== -1) {
      this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...updates };
    }
  }

  deleteAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  // Check for triggered alerts
  checkPriceAlerts(assets: Asset[]): void {
    if (!this.settings.priceAlerts) return;

    const triggeredAlerts: PriceAlert[] = [];

    assets.forEach(asset => {
      const assetAlerts = this.getAlertsForAsset(asset.id);
      
      assetAlerts.forEach(alert => {
        let isTriggered = false;
        let message = '';

        switch (alert.type) {
          case 'above':
            if (alert.targetPrice && asset.currentPrice >= alert.targetPrice) {
              isTriggered = true;
              message = `${asset.symbol} has reached ${formatCurrency(alert.targetPrice)}! Current price: ${formatCurrency(asset.currentPrice)}`;
            }
            break;
          
          case 'below':
            if (alert.targetPrice && asset.currentPrice <= alert.targetPrice) {
              isTriggered = true;
              message = `${asset.symbol} has dropped to ${formatCurrency(alert.targetPrice)}! Current price: ${formatCurrency(asset.currentPrice)}`;
            }
            break;
          
          case 'change':
            if (alert.changePercentage) {
              const holding = calculateAssetHolding(asset);
              const changePercent = Math.abs(holding.gainLossPercentage);
              
              if (changePercent >= Math.abs(alert.changePercentage)) {
                isTriggered = true;
                message = `${asset.symbol} has changed by ${formatPercentage(holding.gainLossPercentage)}!`;
              }
            }
            break;
        }

        if (isTriggered) {
          triggeredAlerts.push(alert);
          this.showNotification('Price Alert', message);
          // Deactivate the alert after triggering
          this.updateAlert(alert.id, { isActive: false });
        }
      });
    });
  }

  // Portfolio notifications
  checkPortfolioUpdates(portfolio: Portfolio, previousPortfolio?: Portfolio): void {
    if (!this.settings.portfolioUpdates || !previousPortfolio) return;

    const valueChange = portfolio.totalValue - previousPortfolio.totalValue;
    const percentChange = previousPortfolio.totalValue > 0 
      ? (valueChange / previousPortfolio.totalValue) * 100 
      : 0;

    // Notify for significant portfolio changes (>5%)
    if (Math.abs(percentChange) >= 5) {
      const direction = valueChange > 0 ? 'increased' : 'decreased';
      const message = `Your portfolio has ${direction} by ${formatPercentage(Math.abs(percentChange))} (${formatCurrency(Math.abs(valueChange))})`;
      
      this.showNotification('Portfolio Update', message);
    }
  }

  // Daily/Weekly reports
  generateDailyReport(portfolio: Portfolio, assets: Asset[]): string {
    const totalAssets = assets.length;
    const gainers = assets.filter(asset => {
      const holding = calculateAssetHolding(asset);
      return holding.gainLoss > 0;
    }).length;
    
    const losers = totalAssets - gainers;
    
    return `Daily Report:
Portfolio Value: ${formatCurrency(portfolio.totalValue)}
Total Gain/Loss: ${formatCurrency(portfolio.totalGainLoss)} (${formatPercentage(portfolio.totalGainLossPercentage)})
Assets: ${totalAssets} (${gainers} gaining, ${losers} losing)`;
  }

  generateWeeklyReport(portfolio: Portfolio, assets: Asset[]): string {
    const bestPerformer = assets.reduce((best, asset) => {
      const holding = calculateAssetHolding(asset);
      const bestHolding = calculateAssetHolding(best);
      return holding.gainLossPercentage > bestHolding.gainLossPercentage ? asset : best;
    });

    const worstPerformer = assets.reduce((worst, asset) => {
      const holding = calculateAssetHolding(asset);
      const worstHolding = calculateAssetHolding(worst);
      return holding.gainLossPercentage < worstHolding.gainLossPercentage ? asset : worst;
    });

    const bestHolding = calculateAssetHolding(bestPerformer);
    const worstHolding = calculateAssetHolding(worstPerformer);

    return `Weekly Report:
Portfolio Value: ${formatCurrency(portfolio.totalValue)}
Best Performer: ${bestPerformer.symbol} (${formatPercentage(bestHolding.gainLossPercentage)})
Worst Performer: ${worstPerformer.symbol} (${formatPercentage(worstHolding.gainLossPercentage)})
Total Assets: ${assets.length}`;
  }

  // Notification display
  private showNotification(title: string, message: string): void {
    if (!this.settings.pushNotifications) return;

    // In a real app, this would use a proper push notification service
    Alert.alert(title, message, [
      { text: 'OK', style: 'default' }
    ]);
  }

  // Settings management
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Market news simulation
  generateMarketNews(): string[] {
    const newsItems = [
      'Stock market shows positive momentum this week',
      'Cryptocurrency market experiences volatility',
      'Gold prices remain stable amid economic uncertainty',
      'Tech stocks lead market gains',
      'Energy sector shows mixed performance',
      'Federal Reserve announces interest rate decision',
      'International markets show strong performance',
      'Emerging markets attract investor attention',
    ];

    // Return 3 random news items
    const shuffled = newsItems.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  // Recommendation engine
  generateRecommendations(portfolio: Portfolio, assets: Asset[]): string[] {
    const recommendations: string[] = [];
    
    // Diversification recommendations
    const categories = new Set(assets.map(asset => asset.category));
    if (categories.size < 3) {
      recommendations.push('Consider diversifying across more asset categories to reduce risk.');
    }

    // Performance recommendations
    const losers = assets.filter(asset => {
      const holding = calculateAssetHolding(asset);
      return holding.gainLoss < 0;
    });

    if (losers.length > assets.length * 0.6) {
      recommendations.push('Consider reviewing your investment strategy as most assets are underperforming.');
    }

    // Portfolio size recommendations
    if (assets.length < 5) {
      recommendations.push('Consider adding more assets to your portfolio for better diversification.');
    }

    // Cash allocation recommendations
    if (portfolio.totalValue > 10000) {
      recommendations.push('Consider setting aside some cash reserves for emergency funds.');
    }

    return recommendations.length > 0 ? recommendations : ['Your portfolio looks well-balanced!'];
  }
}

export const notificationService = new NotificationService();
export default notificationService; 