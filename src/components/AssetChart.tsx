import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ChartDataPoint } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/styles';
import { formatCurrency, formatPercentage } from '../utils/calculations';

interface AssetChartProps {
  data: ChartDataPoint[];
  title: string;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  chartType?: 'line' | 'area';
  isPercentageBased?: boolean;
  timeframe?: string;
}

const { width } = Dimensions.get('window');
const chartWidth = width - (spacing.md * 6);

const AssetChart: React.FC<AssetChartProps> = ({
  data,
  title,
  currentValue,
  gainLoss,
  gainLossPercentage,
  chartType = 'line',
  isPercentageBased = false,
  timeframe
}) => {
  const isPositive = gainLoss >= 0;
  
  // Determine chart color based on final performance value
  const finalValue = data.length > 0 ? data[data.length - 1].value : 0;
  const dynamicChartColor = finalValue >= 0 ? colors.success : colors.error;
  
  // Use dynamic color for all chart elements
  const chartColor = dynamicChartColor;

  const percentageTrend = isPercentageBased && data.length > 0 
    ? data[data.length - 1].value >= 0 
    : isPositive;

  const trendColor = percentageTrend ? colors.success : colors.error;

  const formatLabels = () => {
    if (data.length === 0) return [];
    
    // Reduce label density even more to prevent truncation - show max 4 labels
    const maxLabels = Math.min(4, data.length);
    const step = Math.max(1, Math.floor(data.length / (maxLabels - 1)));
    
    return data.map((item, index) => {
      // Show first, evenly spaced middle points, and last labels
      if (index === 0 || index === data.length - 1 || (index % step === 0 && index < data.length - step)) {
        const date = new Date(item.date);
        
        if (timeframe === '1D') {
          // For 1 day: show compact hours (e.g., "9A", "3P")
          return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            hour12: true 
          }).replace(' AM', 'A').replace(' PM', 'P');
        } else if (timeframe === '1W') {
          // For 1 week: show day abbreviations (e.g., "Mon", "Wed", "Fri")
          return date.toLocaleDateString('en-US', { 
            weekday: 'short' 
          });
        } else if (timeframe === '1M') {
          // For 1 month: show compact month/day (e.g., "Jan5", "Jan15")
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }).replace(' ', '');
        } else if (timeframe === '3M' || timeframe === '6M') {
          // For 3-6 months: show compact month/day (e.g., "Jan15", "Mar1")
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }).replace(' ', '');
        } else if (timeframe === 'YTD' || timeframe === '1Y') {
          // For YTD/1Y: show month abbreviation (e.g., "Jan", "Apr", "Jul")
          return date.toLocaleDateString('en-US', { 
            month: 'short' 
          });
        } else if (timeframe === 'ALL') {
          // For ALL: show compact month/year (e.g., "Jan23", "Jul24")
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            year: '2-digit' 
          }).replace(' ', '');
        } else {
          // Default fallback - compact format
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }).replace(' ', '');
        }
      }
      return '';
    });
  };

  const chartData = {
    labels: formatLabels(),
    datasets: [
      {
        data: data.map(d => d.value),
        color: () => dynamicChartColor,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: isPercentageBased ? 1 : 0,
    color: (opacity = 1) => {
      const baseColor = finalValue >= 0 ? '34, 197, 94' : '239, 68, 68';
      return `rgba(${baseColor}, ${opacity})`;
    },
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: borderRadius.md,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: dynamicChartColor,
      fill: dynamicChartColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,3',
      stroke: colors.border,
      strokeOpacity: 0.3,
    },
    formatYLabel: (value: string) => {
      if (isPercentageBased) {
        const numValue = parseFloat(value);
        return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(1)}%`;
      }
      return value;
    },
    propsForVerticalLabels: {
      fontSize: 11,
      fill: colors.textSecondary,
    },
    propsForHorizontalLabels: {
      fontSize: 10,
      fill: colors.textSecondary,
    },
    paddingRight: 25,
    paddingLeft: 25,
  };

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  const range = maxValue - minValue;
  const padding = range * 0.1;
  const chartMin = minValue - padding;
  const chartMax = maxValue + padding;

  const renderPerformanceIndicator = () => {
    if (!isPercentageBased || data.length === 0) return null;

    const latestPerformance = data[data.length - 1].value;
    const isPositivePerf = latestPerformance >= 0;

    return (
      <View style={styles.performanceIndicator}>
        <View style={[
          styles.performanceBadge,
          { backgroundColor: isPositivePerf ? colors.success + '20' : colors.error + '20' }
        ]}>
          <Text style={[
            styles.performanceText,
            { color: isPositivePerf ? colors.success : colors.error }
          ]}>
            {isPositivePerf ? '↗' : '↘'} {formatPercentage(latestPerformance)}
          </Text>
          {timeframe && (
            <Text style={[
              styles.timeframeText,
              { color: isPositivePerf ? colors.success : colors.error }
            ]}>
              {timeframe}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.valueContainer}>
          <Text style={styles.currentValue}>
            {isPercentageBased ? `${timeframe || ''} Performance` : formatCurrency(currentValue)}
          </Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.changeValue, { color: chartColor }]}>
              {formatCurrency(gainLoss)}
            </Text>
            <Text style={[styles.changePercentage, { color: chartColor }]}>
              ({formatPercentage(gainLossPercentage)})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chartContainer}>
        {data.length > 0 && (
          <LineChart
            data={chartData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier={chartType === 'area'}
            style={styles.chart}
            withDots={data.length <= 15}
            withShadow={false}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            fromZero={false}
            yAxisInterval={1}
            segments={4}
            withVerticalLabels={true}
            withHorizontalLabels={true}
          />
        )}
      </View>

      {data.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {(() => {
              const startDate = new Date(data[0].date);
              const endDate = new Date(data[data.length - 1].date);
              
              if (timeframe === '1D') {
                return `${startDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })} - ${endDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}`;
              } else if (timeframe === '1W') {
                return `${startDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })} - ${endDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })}`;
              } else if (timeframe === 'YTD') {
                return `Jan 1, ${endDate.getFullYear()} - ${endDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}`;
              } else if (timeframe === 'ALL') {
                return `${startDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })} - ${endDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric'
                })}`;
              } else {
                // For 1M, 3M, 6M, 1Y
                return `${startDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
                })} - ${endDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}`;
              }
            })()}
          </Text>
          {isPercentageBased && (
            <Text style={styles.footerSubtext}>
              Performance shown as percentage change from start of {timeframe} period
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
  },
  performanceIndicator: {
    alignItems: 'flex-end',
  },
  performanceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  performanceText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  timeframeText: {
    ...typography.caption,
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: 'bold',
  },
  changeContainer: {
    alignItems: 'flex-end',
  },
  changeValue: {
    ...typography.body,
    fontWeight: '600',
  },
  changePercentage: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
    backgroundColor: colors.background + '50',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footerSubtext: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  chart: {
    borderRadius: borderRadius.md,
  },
});

export default AssetChart; 