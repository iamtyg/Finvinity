import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AssetCategory } from '../types';
import { getAssetSuggestions } from '../services/marketData';
import { colors, typography, spacing, borderRadius } from '../utils/styles';

interface AssetSuggestionsComponentProps {
  category: AssetCategory;
  onSuggestionPress: (suggestion: string) => void;
}

const AssetSuggestionsComponent: React.FC<AssetSuggestionsComponentProps> = ({
  category,
  onSuggestionPress,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryLabels = {
    [AssetCategory.STOCKS]: 'Stocks',
    [AssetCategory.CRYPTOCURRENCY]: 'Cryptocurrency',
    [AssetCategory.FOREIGN_CURRENCY]: 'Foreign Currency',
    [AssetCategory.GOLD]: 'Gold & Precious Metals',
    [AssetCategory.MUTUAL_FUNDS]: 'Mutual Funds',
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 Fetching live suggestions for ${categoryLabels[category]}...`);
        const results = await getAssetSuggestions(category);
        setSuggestions(results);
        console.log(`✅ Got ${results.length} live suggestions for ${categoryLabels[category]}`);
      } catch (err) {
        console.error('Failed to fetch asset suggestions:', err);
        setError('Failed to load suggestions');
        setSuggestions([]); // Empty array instead of fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [category]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Popular {categoryLabels[category]}...</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching live data from market APIs</Text>
        </View>
      </View>
    );
  }

  if (error || suggestions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Popular {categoryLabels[category]}</Text>
        <Text style={styles.errorText}>
          {error || 'No suggestions available. Try searching for a specific symbol.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Popular {categoryLabels[category]}</Text>
      <View style={styles.suggestionsGrid}>
        {suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            style={styles.suggestionChip}
            onPress={() => onSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    padding: spacing.lg,
    fontStyle: 'italic',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default AssetSuggestionsComponent; 