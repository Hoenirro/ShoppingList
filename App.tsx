import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShoppingListStorage } from './utils/storage';
import { ThemeProvider, useTheme } from './theme/ThemeContext';

import WelcomeScreen from './screens/WelcomeScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';
import ActiveListScreen from './screens/ActiveListScreen';
import ItemManagerScreen from './screens/ItemManagerScreen';
import HistoryScreen from './screens/HistoryScreen';
import SessionDetailsScreen from './screens/SessionDetailsScreen';
import EditMasterItemScreen from './screens/EditMasterItemScreen';
import PriceHistoryScreen from './screens/PriceHistoryScreen';
import ThemeScreen from './screens/ThemeScreen';
import SelectMasterItemScreen from './screens/SelectMasterItemScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Global error boundary — catches render crashes that would show a white screen ──
interface EBState { hasError: boolean }
class NavigationErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.warn('NavigationErrorBoundary caught:', error); }
  render() {
    if (this.state.hasError) {
      // Reset error state after a tick so the navigator can remount cleanly
      setTimeout(() => this.setState({ hasError: false }), 100);
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F7F4' }}>
          <ActivityIndicator size="large" color="#2E9E60" />
        </View>
      );
    }
    return this.props.children;
  }
}

function AppNavigator() {
  const { theme } = useTheme();

  // Make react-navigation background match the active theme
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.bg,
      card: theme.headerBg,
      text: theme.headerText,
      border: theme.divider,
      primary: theme.accent,
    },
  };

  const headerOptions = {
    headerStyle: { backgroundColor: theme.headerBg },
    headerShadowVisible: false,
    headerTintColor: theme.headerTint,
    headerTitleStyle: { color: theme.headerText, fontWeight: '700' as const },
  };

  const navRef = useRef<any>(null);

  const handleStateChange = useCallback(() => {
    if (!navRef.current) return;
    const state = navRef.current.getRootState();
    if (!state) return;

    // Walk to the deepest active route
    let route = state.routes?.[state.index ?? 0];
    while (route?.state) {
      const nested = route.state;
      route = nested.routes?.[nested.index ?? 0];
    }

    // If no active route found, stack is broken — reset to Welcome
    if (!route?.name) {
      console.warn('Navigation safety net: blank state detected, resetting to Welcome');
      navRef.current.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
  }, []);

  return (
    <NavigationContainer theme={navTheme} ref={navRef} onStateChange={handleStateChange}>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={headerOptions}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'My Lists', headerLargeTitle: true }} />
        <Stack.Screen name="ItemManager" component={ItemManagerScreen} options={{ title: 'Manage Products' }} getId={() => 'ItemManager'} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Shopping History' }} getId={() => 'History'} />
        <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} options={{ title: 'Trip Details' }} />
        <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Shopping List' }} getId={({ params }) => params?.listId ?? 'ShoppingList'} />
        <Stack.Screen name="ActiveList" component={ActiveListScreen} options={{ title: 'Shopping' }} getId={({ params }) => params?.listId ?? 'ActiveList'} />
        <Stack.Screen name="EditMasterItem" component={EditMasterItemScreen} options={{ title: 'Product' }} getId={({ params }) => `edit_${params?.itemId ?? 'new'}_${params?.returnTo ?? ''}`} />
        <Stack.Screen name="PriceHistory" component={PriceHistoryScreen} options={{ title: 'Price History' }} />
        <Stack.Screen name="Theme" component={ThemeScreen} options={{ title: '🎨 Themes' }} getId={() => 'Theme'} />
        <Stack.Screen name="SelectMasterItem" component={SelectMasterItemScreen} options={{ title: 'Add Items' }} getId={({ params }) => params?.listId ?? 'SelectMasterItem'} />
      </Stack.Navigator>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await ShoppingListStorage.initialize();
        await ShoppingListStorage.migrateExistingItems();
        ShoppingListStorage.cleanupOrphanedImages().catch(() => {});
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F7F4' }}>
          <ActivityIndicator size="large" color="#2E9E60" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationErrorBoundary>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </NavigationErrorBoundary>
    </SafeAreaProvider>
  );
}
