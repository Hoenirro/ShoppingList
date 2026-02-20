import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShoppingListStorage } from './utils/storage';
import { ShareListService } from './utils/shareList';
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

// ─── Process an incoming file URI ────────────────────────────────────────────
// Called both on cold launch and warm launch.
// The URI may be a content:// (Android) or file:// (iOS/Android) URI.
async function handleFileUri(uri: string, onSuccess?: () => void): Promise<void> {
  if (!uri) return;

  // Only care about .shoplist files — ignore everything else silently
  const lower = decodeURIComponent(uri).toLowerCase();
  if (!lower.includes('.shoplist')) return;

  try {
    const result = await ShareListService.importFromUri(uri);
    if (result) {
      Alert.alert(
        '✅ List Imported!',
        `"${result.name}" was imported with ${result.itemCount} item${result.itemCount !== 1 ? 's' : ''}.\n\nPrices are not included — you'll fill those in as you shop.`,
        [{ text: 'Got it', onPress: onSuccess }],
      );
    }
  } catch (error: any) {
    Alert.alert('Import Failed', error.message || 'Could not import this list.');
  }
}

// ─── Navigator ───────────────────────────────────────────────────────────────
function AppNavigator({ onNavigatorReady }: { onNavigatorReady: () => void }) {
  const { theme } = useTheme();

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
    <NavigationContainer theme={navTheme} onReady={onNavigatorReady}>
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

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [navigatorReady, setNavigatorReady] = useState(false);

  // Hold any URI that arrives before both app + navigator are ready
  const pendingUri = useRef<string | null>(null);

  // ── 1. Boot: initialise storage, then check for a cold-launch file URI ────
  useEffect(() => {
    async function prepare() {
      try {
        await ShoppingListStorage.initialize();
        await ShoppingListStorage.migrateExistingItems();
        ShoppingListStorage.cleanupOrphanedImages().catch(() => {});

        // Cold launch: was the app opened BY tapping a file?
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          pendingUri.current = initialUrl;
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  // ── 2. Warm launch: app already running, a new file was tapped ────────────
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isReady && navigatorReady) {
        handleFileUri(url);
      } else {
        pendingUri.current = url;
      }
    });
    return () => sub.remove();
  }, [isReady, navigatorReady]);

  // ── 3. Drain the queue once both app AND navigator are mounted ─────────────
  useEffect(() => {
    if (isReady && navigatorReady && pendingUri.current) {
      const uri = pendingUri.current;
      pendingUri.current = null;
      // Brief delay so Welcome screen mounts before the Alert fires
      setTimeout(() => handleFileUri(uri), 600);
    }
  }, [isReady, navigatorReady]);

  // ── Loading splash ─────────────────────────────────────────────────────────
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
        <AppNavigator onNavigatorReady={() => setNavigatorReady(true)} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
