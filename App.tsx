import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PortfolioProvider } from './src/context/PortfolioContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import PortfolioScreen from './src/screens/PortfolioScreen';
import AddAssetScreen from './src/screens/AddAssetScreen';
import AssetListScreen from './src/screens/AssetListScreen';
import AssetDetailScreen from './src/screens/AssetDetailScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NewsScreen from './src/screens/NewsScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistoryScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import { colors, spacing, borderRadius, shadows } from './src/utils/styles';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function PortfolioStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="AssetList" component={AssetListScreen} />
      <Stack.Screen name="AddAsset" component={AddAssetScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function AssetsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssetList" component={AssetListScreen} />
      <Stack.Screen name="AddAsset" component={AddAssetScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    </Stack.Navigator>
  );
}

function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
    </Stack.Navigator>
  );
}

function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
    </Stack.Navigator>
  );
}

function NewsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="News" component={NewsScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
    </Stack.Navigator>
  );
}

// Custom tab bar component for enhanced design
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic bottom spacing - make tab bar flush to bottom with minimal safe spacing
  const minBottomSpacing = Platform.OS === 'ios' ? 4 : 6; // Minimal spacing for bottom edge
  const dynamicBottomPadding = Math.max(insets.bottom, minBottomSpacing); // Use only safe area or minimal spacing
  
  return (
    <View style={[styles.tabBarContainer, { paddingBottom: dynamicBottomPadding }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Get appropriate icon and color
          let icon = '';
          let iconColor = isFocused ? colors.primary : colors.textSecondary;

          switch (route.name) {
            case 'PortfolioTab':
              icon = '🏠';
              break;
            case 'AssetsTab':
              icon = '💼';
              break;
            case 'TransactionsTab':
              icon = '📋'; // Changed from ➕ to transaction history icon
              break;
            case 'AnalyticsTab':
              icon = '📊';
              break;
            case 'NewsTab':
              icon = '📰';
              break;
            default:
              icon = '⚫';
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabIcon,
                  { color: iconColor }
                ]}
              >
                {icon}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: iconColor }
                ]}
              >
                {typeof label === 'string' ? label : 'Tab'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="PortfolioTab"
        component={PortfolioStack}
        options={{ tabBarLabel: 'Portfolio' }}
      />
      <Tab.Screen
        name="AssetsTab"
        component={AssetsStack}
        options={{ tabBarLabel: 'Assets' }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{ tabBarLabel: 'Trades' }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsStack}
        options={{ tabBarLabel: 'Analytics' }}
      />
      <Tab.Screen
        name="NewsTab"
        component={NewsStack}
        options={{ tabBarLabel: 'News' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs, // Minimal margin - reduced from spacing.md (16px) to spacing.xs (4px) for flush positioning
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...shadows.lg,
    elevation: 8,
    borderTopWidth: 0, // Remove default border
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 60,
    minHeight: 50, // Increased touch target
    flex: 1, // Make each tab take equal width
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PortfolioProvider>
        <ErrorBoundary>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor={colors.background} />
            <MainTabs />
          </NavigationContainer>
        </ErrorBoundary>
      </PortfolioProvider>
    </GestureHandlerRootView>
  );
} 