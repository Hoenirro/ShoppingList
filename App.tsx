import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
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
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={headerOptions}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'My Lists', headerLargeTitle: true }} />
        <Stack.Screen name="ItemManager" component={ItemManagerScreen} options={{ title: 'Manage Products' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Shopping History' }} />
        <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} options={{ title: 'Trip Details' }} />
        <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Shopping List' }} />
        <Stack.Screen name="ActiveList" component={ActiveListScreen} options={{ title: 'Shopping' }} />
        <Stack.Screen name="EditMasterItem" component={EditMasterItemScreen} options={{ title: 'Product', presentation: 'modal' }} />
        <Stack.Screen name="PriceHistory" component={PriceHistoryScreen} options={{ title: 'Price History' }} />
        <Stack.Screen name="Theme" component={ThemeScreen} options={{ title: '🎨 Themes' }} />
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
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
