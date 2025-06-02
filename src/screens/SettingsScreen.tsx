import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePortfolio } from '../context/PortfolioContext';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { formatCurrency } from '../utils/calculations';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { portfolio, assets, clearAllData } = usePortfolio();
  const [darkMode, setDarkMode] = useState(false);

  const handleDarkModeToggle = (value: boolean) => {
    Alert.alert(
      'Coming Soon',
      'Dark Mode is not available yet. Stay tuned for future updates!',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleLanguageSettings = () => {
    Alert.alert(
      'Coming Soon',
      'Language settings will be available in a future update.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleCurrencySettings = () => {
    Alert.alert(
      'Coming Soon',
      'Multi-currency support is coming soon.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to contact our support team:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => {
            const email = 'finvinityapp@gmail.com';
            const subject = 'Finvinity Support Request';
            const body = 'Hello,\n\nI need assistance with Finvinity.\n\nPlease describe your issue here:\n\n';
            Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          }
        }
      ]
    );
  };

  const handleVersionInfo = () => {
    Alert.alert(
      'Version Information',
      'Finvinity v1.0.0\n\nDeveloped by: Tahsin Gültekin\nLocation: Istanbul, Turkey\nBuild: 2024.1\nLast Updated: December 2024\n\nThank you for using Finvinity!',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleTermsOfService = () => {
    navigation.navigate('TermsOfService');
  };

  const handleExportData = async () => {
    try {
      const portfolioData = {
        portfolio,
        assets,
        exportDate: new Date().toISOString(),
        totalAssets: assets.length,
        totalValue: portfolio.totalValue,
      };

      const dataString = JSON.stringify(portfolioData, null, 2);
      
      await Share.share({
        message: `Finvinity Portfolio Export\n\nTotal Value: ${formatCurrency(portfolio.totalValue)}\nTotal Assets: ${assets.length}\nExported on: ${new Date().toLocaleDateString()}\n\nData:\n${dataString}`,
        title: 'Finvinity Portfolio Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export portfolio data');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all portfolio data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Success', 'Portfolio data cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear portfolio data');
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? colors.surface : colors.textLight}
      />
    </View>
  );

  const renderActionItem = (
    title: string,
    subtitle: string,
    onPress: () => void,
    icon: string,
    color: string = colors.text
  ) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color }]}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={[styles.chevron, { color }]}>›</Text>
    </TouchableOpacity>
  );

  const renderPortfolioSummary = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Portfolio Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>{formatCurrency(portfolio.totalValue)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Assets</Text>
          <Text style={styles.summaryValue}>{assets.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
          <Text style={[
            styles.summaryValue,
            { color: portfolio.totalGainLoss >= 0 ? colors.success : colors.error }
          ]}>
            {formatCurrency(portfolio.totalGainLoss)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Categories</Text>
          <Text style={styles.summaryValue}>
            {new Set(assets.map(a => a.category)).size}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderPortfolioSummary()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {renderSettingItem(
            'Dark Mode',
            'Use dark theme throughout the app',
            darkMode,
            handleDarkModeToggle,
            '🌙'
          )}

          {renderActionItem(
            'Change Language',
            'Select your preferred language',
            handleLanguageSettings,
            '🌐'
          )}

          {renderActionItem(
            'Currency Selection',
            'Choose your default currency',
            handleCurrencySettings,
            '💱'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          {renderActionItem(
            'Export Portfolio',
            'Export your portfolio data',
            handleExportData,
            '📤'
          )}
          
          {renderActionItem(
            'Import Data',
            'Import portfolio from backup',
            () => Alert.alert('Coming Soon', 'Import feature will be available in a future update.'),
            '📥'
          )}
          
          {renderActionItem(
            'Backup to Cloud',
            'Save your data to cloud storage',
            () => Alert.alert('Coming Soon', 'Cloud backup feature will be available in a future update.'),
            '☁️'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          {renderActionItem(
            'Help & FAQ',
            'Get help and find answers',
            () => Alert.alert('Coming Soon', 'Help section will be available in a future update.'),
            '❓'
          )}
          
          {renderActionItem(
            'Contact Support',
            'Get in touch with our team',
            handleContactSupport,
            '📧'
          )}
          
          {renderActionItem(
            'Rate App',
            'Rate Finvinity on the App Store',
            () => Alert.alert('Thank You!', 'App Store rating feature will be available in a future update.'),
            '⭐'
          )}

          {renderActionItem(
            'Version Info',
            'View app version and build details',
            handleVersionInfo,
            'ℹ️'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {renderActionItem(
            'Privacy Policy',
            'Read our privacy policy',
            handlePrivacyPolicy,
            '🔒'
          )}
          
          {renderActionItem(
            'Terms of Service',
            'Read our terms of service',
            handleTermsOfService,
            '📄'
          )}
          
          {renderActionItem(
            'Clear All Data',
            'Remove all portfolio data',
            handleClearData,
            '🗑️',
            colors.error
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Finvinity v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ for portfolio tracking
          </Text>
        </View>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  summaryTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    margin: spacing.md,
    marginTop: 0,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  settingSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footerSubtext: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default SettingsScreen; 