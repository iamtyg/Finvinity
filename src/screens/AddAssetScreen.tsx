import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-date-picker';
// import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { AssetCategory, TransactionType } from '../types';
import { getAssetSuggestions } from '../services/marketData';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/styles';
import { formatCurrency } from '../utils/calculations';
import AssetSuggestionsComponent from '../components/AssetSuggestionsComponent';

interface AddAssetScreenProps {
  navigation: any;
}

const AddAssetScreen: React.FC<AddAssetScreenProps> = ({ navigation }) => {
  const { addAsset, addTransaction, loading } = usePortfolio();
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Initial transaction fields
  const [initialAmount, setInitialAmount] = useState('');
  const [initialPrice, setInitialPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  const categories = [
    {
      key: AssetCategory.STOCKS,
      label: 'Stocks',
      icon: 'trending-up',
      color: '#3B82F6',
      description: 'Individual company stocks',
    },
    {
      key: AssetCategory.CRYPTOCURRENCY,
      label: 'Cryptocurrency',
      icon: 'logo-bitcoin',
      color: '#F59E0B',
      description: 'Digital currencies',
    },
    {
      key: AssetCategory.FOREIGN_CURRENCY,
      label: 'Foreign Currency',
      icon: 'card',
      color: '#10B981',
      description: 'International currencies',
    },
    {
      key: AssetCategory.GOLD,
      label: 'Gold & Precious Metals',
      icon: 'diamond',
      color: '#EAB308',
      description: 'Precious metals and commodities',
    },
    {
      key: AssetCategory.MUTUAL_FUNDS,
      label: 'Mutual Funds',
      icon: 'pie-chart',
      color: '#8B5CF6',
      description: 'Diversified investment funds',
    },
  ];

  // Helper function to format decimal input to max 2 decimal places
  const formatDecimalInput = (value: string, maxDecimals: number = 2): string => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('').substring(0, maxDecimals);
    }
    
    if (parts.length === 2) {
      return parts[0] + '.' + parts[1].substring(0, maxDecimals);
    }
    
    return cleaned;
  };

  const handleAmountChange = (value: string) => {
    const formattedValue = formatDecimalInput(value, 2);
    setInitialAmount(formattedValue);
  };

  const handlePriceChange = (value: string) => {
    const formattedValue = formatDecimalInput(value, 2);
    setInitialPrice(formattedValue);
  };

  const handleAddAsset = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select an asset category');
      return;
    }

    if (!assetName.trim()) {
      Alert.alert('Error', 'Please enter an asset name');
      return;
    }

    if (!assetSymbol.trim()) {
      Alert.alert('Error', 'Please enter an asset symbol');
      return;
    }

    if (!initialAmount.trim() || isNaN(parseFloat(initialAmount))) {
      Alert.alert('Error', 'Please enter a valid initial amount');
      return;
    }

    if (!initialPrice.trim() || isNaN(parseFloat(initialPrice))) {
      Alert.alert('Error', 'Please enter a valid purchase price');
      return;
    }

    try {
      const newAsset = await addAsset(assetName.trim(), assetSymbol.trim(), selectedCategory);
      
      // Add the initial transaction
      addTransaction(
        newAsset.id,
        TransactionType.BUY,
        parseFloat(initialAmount),
        parseFloat(initialPrice),
        purchaseDate.toISOString().split('T')[0],
        notes.trim() || 'Initial purchase'
      );

      Alert.alert('Success', 'Asset and initial transaction added successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add asset. Please try again.');
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setAssetSymbol(suggestion);
    setShowSuggestions(false);
  };

  const renderCategoryCard = (category: any) => (
    <TouchableOpacity
      key={category.key}
      style={[
        styles.categoryCard,
        selectedCategory === category.key && styles.selectedCategoryCard,
      ]}
      onPress={() => {
        setSelectedCategory(category.key);
        setShowSuggestions(true);
      }}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Text style={{ fontSize: 24, color: 'white' }}>
          {category.key === AssetCategory.STOCKS ? '📈' : 
           category.key === AssetCategory.CRYPTOCURRENCY ? '₿' :
           category.key === AssetCategory.FOREIGN_CURRENCY ? '💱' :
           category.key === AssetCategory.GOLD ? '🥇' : '📊'}
        </Text>
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryLabel}>{category.label}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>
      </View>
      {selectedCategory === category.key && (
        <Text style={{ fontSize: 24, color: colors.primary }}>✅</Text>
      )}
    </TouchableOpacity>
  );

  const renderSuggestions = () => {
    if (!selectedCategory || !showSuggestions) return null;

    return (
      <AssetSuggestionsComponent 
        category={selectedCategory} 
        onSuggestionPress={handleSuggestionPress}
      />
    );
  };

  const calculateTotalInvestment = () => {
    const amount = parseFloat(initialAmount) || 0;
    const price = parseFloat(initialPrice) || 0;
    return amount * price;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Asset</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Asset Category</Text>
          <Text style={styles.sectionDescription}>
            Choose the type of asset you want to add to your portfolio
          </Text>
          {categories.map(renderCategoryCard)}
        </View>

        {selectedCategory && (
          <>
            {renderSuggestions()}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Asset Details</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Asset Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={assetName}
                  onChangeText={setAssetName}
                  placeholder="e.g., Apple Inc."
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Symbol/Ticker</Text>
                <TextInput
                  style={styles.textInput}
                  value={assetSymbol}
                  onChangeText={setAssetSymbol}
                  placeholder="e.g., AAPL"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Initial Purchase Details</Text>
              <Text style={styles.sectionDescription}>
                Enter the details of your initial purchase
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount/Quantity</Text>
                <TextInput
                  style={styles.textInput}
                  value={initialAmount}
                  onChangeText={handleAmountChange}
                  placeholder="e.g., 10"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Purchase Price per Unit</Text>
                <TextInput
                  style={styles.textInput}
                  value={initialPrice}
                  onChangeText={handlePriceChange}
                  placeholder="e.g., 150.00"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Purchase Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {purchaseDate.toLocaleDateString()}
                  </Text>
                  <Text style={{ fontSize: 16, color: colors.textSecondary }}>📅</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this purchase..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {(initialAmount && initialPrice) && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Investment Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Investment:</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(calculateTotalInvestment())}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Quantity:</Text>
                    <Text style={styles.summaryValue}>{initialAmount}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Price per Unit:</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(parseFloat(initialPrice) || 0)}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!assetName.trim() || !assetSymbol.trim() || !initialAmount.trim() || !initialPrice.trim()) && styles.disabledButton,
                ]}
                onPress={handleAddAsset}
                disabled={loading || !assetName.trim() || !assetSymbol.trim() || !initialAmount.trim() || !initialPrice.trim()}
              >
                {loading ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.addButtonText}>Add Asset & Purchase</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <DatePicker
        modal
        open={showDatePicker}
        date={purchaseDate}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(date) => {
          setShowDatePicker(false);
          setPurchaseDate(date);
        }}
        onCancel={() => {
          setShowDatePicker(false);
        }}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  selectedCategoryCard: {
    borderColor: colors.primary,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  categoryDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  suggestionsTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
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
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  disabledButton: {
    backgroundColor: colors.textLight,
  },
  addButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});

export default AddAssetScreen; 