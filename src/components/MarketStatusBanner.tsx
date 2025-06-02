import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MarketStatus } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';

interface MarketStatusBannerProps {
  marketStatus: MarketStatus | null;
  lastUpdated: string | null;
  onRefresh: () => void;
  loading?: boolean;
  autoUpdateEnabled: boolean;
  toggleAutoUpdate: () => void;
}

const MarketStatusBanner: React.FC<MarketStatusBannerProps> = ({
  marketStatus,
  lastUpdated,
  onRefresh,
  loading = false,
  autoUpdateEnabled,
  toggleAutoUpdate,
}) => {
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  };

  const getTimeUntilNext = (nextTime?: string): string => {
    if (!nextTime) return '';
    
    const now = new Date();
    const next = new Date(nextTime);
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusMessage = (): { text: string; subtext: string } => {
    if (!marketStatus) {
      return { text: 'Market Status Unknown', subtext: 'Tap to refresh' };
    }

    if (marketStatus.isOpen) {
      const timeUntilClose = getTimeUntilNext(marketStatus.nextClose);
      return {
        text: 'Market Open',
        subtext: timeUntilClose ? `Closes in ${timeUntilClose}` : 'Real-time data available',
      };
    } else {
      const timeUntilOpen = getTimeUntilNext(marketStatus.nextOpen);
      return {
        text: 'Market Closed',
        subtext: timeUntilOpen ? `Opens in ${timeUntilOpen}` : 'Showing closing prices',
      };
    }
  };

  const { text, subtext } = getStatusMessage();
  const isOpen = marketStatus?.isOpen ?? false;

  const renderAutoUpdateToggle = () => (
    <TouchableOpacity
      style={styles.autoUpdateToggle}
      onPress={toggleAutoUpdate}
      activeOpacity={0.7}
    >
      <View style={styles.autoUpdateContent}>
        <View style={[
          styles.toggleSwitch,
          autoUpdateEnabled ? styles.toggleSwitchEnabled : styles.toggleSwitchDisabled
        ]}>
          <View style={[
            styles.toggleThumb,
            autoUpdateEnabled ? styles.toggleThumbEnabled : styles.toggleThumbDisabled
          ]} />
        </View>
        <View style={styles.autoUpdateTextContainer}>
          <Text style={styles.autoUpdateLabel}>Auto-update</Text>
          <Text style={[
            styles.autoUpdateStatus,
            { color: autoUpdateEnabled ? colors.surface : colors.surface + 'CC' }
          ]}>
            {autoUpdateEnabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOpen ? styles.openContainer : styles.closedContainer,
      ]}
      onPress={onRefresh}
      disabled={loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.statusSection}>
          <View style={styles.statusIndicator}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <View style={[
                styles.statusDot,
                isOpen ? styles.openDot : styles.closedDot,
              ]} />
            )}
            <Text style={styles.statusText}>{text}</Text>
            {/* Live indicator next to status text for better layout */}
            {isOpen && !loading && (
              <View style={styles.liveIndicatorInline}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtextText}>{subtext}</Text>
          {lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Updated {formatTime(lastUpdated)} ET
            </Text>
          )}
        </View>
        
        <View style={styles.rightSection}>
          {renderAutoUpdateToggle()}
          <Text style={styles.refreshHint}>Tap to refresh</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  openContainer: {
    backgroundColor: colors.success,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  closedContainer: {
    backgroundColor: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.textSecondary + '40',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  openDot: {
    backgroundColor: colors.surface,
  },
  closedDot: {
    backgroundColor: colors.surface,
  },
  statusText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  subtextText: {
    ...typography.bodySmall,
    color: colors.surface + 'CC',
    marginLeft: spacing.lg,
    marginBottom: spacing.xs,
  },
  lastUpdatedText: {
    ...typography.caption,
    color: colors.surface + 'CC',
    marginLeft: spacing.lg,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  refreshHint: {
    ...typography.caption,
    color: colors.surface + 'AA',
    fontSize: 10,
    marginTop: spacing.sm,
  },
  liveIndicatorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
  },
  liveText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  autoUpdateToggle: {
    marginBottom: spacing.xs,
  },
  autoUpdateContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleSwitch: {
    width: 36,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface + '30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surface + '50',
    position: 'relative',
  },
  toggleSwitchEnabled: {
    backgroundColor: colors.surface + '40',
    borderColor: colors.surface,
  },
  toggleSwitchDisabled: {
    backgroundColor: colors.surface + '20',
    borderColor: colors.surface + '30',
  },
  toggleThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  toggleThumbEnabled: {
    right: 2,
    backgroundColor: colors.surface,
  },
  toggleThumbDisabled: {
    left: 2,
    backgroundColor: colors.surface + 'AA',
  },
  autoUpdateTextContainer: {
    marginLeft: spacing.sm,
    alignItems: 'flex-end',
  },
  autoUpdateLabel: {
    ...typography.caption,
    color: colors.surface + 'CC',
    fontSize: 10,
  },
  autoUpdateStatus: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 11,
  },
});

export default MarketStatusBanner; 