// App.tsx
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShoppingListStorage } from './utils/storage';
import WelcomeScreen from './screens/WelcomeScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';
import ActiveListScreen from './screens/ActiveListScreen';
import ItemManagerScreen from './screens/ItemManagerScreen';
import HistoryScreen from './screens/HistoryScreen';
import SessionDetailsScreen from './screens/SessionDetailsScreen';
import EditMasterItemScreen from './screens/EditMasterItemScreen';
import EditListItemScreen from './screens/EditListItemScreen';
import SelectMasterItemScreen from './screens/SelectMasterItemScreen';
import PriceHistoryScreen from './screens/PriceHistoryScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
  async function prepare() {
    try {
      await ShoppingListStorage.initialize();
      await ShoppingListStorage.migrateExistingItems();
      
      // Run cleanup in the background, don't await it
      // This prevents it from blocking app startup
      ShoppingListStorage.cleanupOrphanedImages().catch(error => {
        console.log('Cleanup error (non-critical):', error);
      });
      
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsReady(true);
    }
  }

  prepare();
}, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Welcome"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerShadowVisible: false,
            headerTintColor: '#007AFF',
          }}
        >
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen} 
            options={{ 
              title: 'My Shopping Lists',
              headerLargeTitle: true,
            }}
          />
          <Stack.Screen 
            name="ItemManager" 
            component={ItemManagerScreen} 
            options={{ 
              title: 'Manage Items',
            }}
          />
          <Stack.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ 
              title: 'Shopping History',
            }}
          />
          <Stack.Screen 
            name="SessionDetails" 
            component={SessionDetailsScreen} 
            options={{ 
              title: 'Session Details',
            }}
          />
          <Stack.Screen 
            name="ShoppingList" 
            component={ShoppingListScreen} 
            options={{ 
              title: 'Shopping List',
            }}
          />
          <Stack.Screen 
            name="ActiveList" 
            component={ActiveListScreen} 
            options={{ 
              title: 'Active Shopping',
            }}
          />
          <Stack.Screen 
            name="EditMasterItem" 
            component={EditMasterItemScreen} 
            options={{ 
              title: 'Edit Master Item',
              presentation: 'modal',
            }}
          />
          <Stack.Screen 
            name="EditListItem" 
            component={EditListItemScreen} 
            options={{ 
              title: 'Edit List Item',
              presentation: 'modal',
            }}
          />
          <Stack.Screen 
            name="SelectMasterItem" 
            component={SelectMasterItemScreen} 
            options={{ 
            title: 'Select Item to Add',
          }}
/>
<Stack.Screen 
  name="PriceHistory" 
  component={PriceHistoryScreen} 
  options={{ 
    title: 'Price History',
  }}
/>
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}