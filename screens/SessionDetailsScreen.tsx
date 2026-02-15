// screens/SessionDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingSession } from '../types';

export default function SessionDetailsScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<ShoppingSession | null>(null);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    const sessions = await ShoppingListStorage.getSessions();
    const foundSession = sessions.find(s => s.id === sessionId);
    setSession(foundSession || null);
  };

  const handleShare = async () => {
    if (!session) return;

    try {
      const itemsList = session.items
        .map(item => `• ${item.name}: $${item.price.toFixed(2)}`)
        .join('\n');

      const message = 
        `Shopping Session: ${session.listName}\n` +
        `Date: ${new Date(session.date).toLocaleString()}\n` +
        `Total: $${session.total.toFixed(2)}\n\n` +
        `Items:\n${itemsList}`;

      await Share.share({
        message,
        title: 'Shopping Session Details',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share session details');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this shopping session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ShoppingListStorage.deleteSession(sessionId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleUseAgain = () => {
    if (!session) return;
    navigation.navigate('ShoppingList', { listId: session.listId });
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading session details...</Text>
      </View>
    );
  }

  const checkedItems = session.items.filter(item => item.checked);
  const uncheckedItems = session.items.filter(item => !item.checked);
  const checkedCount = checkedItems.length;
  const uncheckedCount = uncheckedItems.length;

  return (
    <ScrollView style={styles.container}>
      {/* Header with Date and Total */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.listName}>{session.listName}</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Text style={styles.shareButtonText}>📤</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.date}>
          {new Date(session.date).toLocaleDateString()} at{' '}
          {new Date(session.date).toLocaleTimeString()}
        </Text>
        
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalAmount}>${session.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Receipt Image if available */}
      {session.receiptImageUri && (
        <View style={styles.receiptContainer}>
          <Text style={styles.sectionTitle}>Receipt</Text>
          <TouchableOpacity
            onPress={() => {
              // You could implement a full-screen image viewer here
              Alert.alert('Receipt', 'Would you like to view the receipt?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'View', onPress: () => {} },
              ]);
            }}
          >
            <Image 
              source={{ uri: session.receiptImageUri }} 
              style={styles.receiptImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{session.items.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, styles.checkedCount]}>
            {checkedCount}
          </Text>
          <Text style={styles.statLabel}>Purchased</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, styles.uncheckedCount]}>
            {uncheckedCount}
          </Text>
          <Text style={styles.statLabel}>Skipped</Text>
        </View>
      </View>

      {/* Items List */}
      <View style={styles.itemsContainer}>
        <Text style={styles.sectionTitle}>Items</Text>
        
        {checkedItems.length > 0 && (
          <View style={styles.itemGroup}>
            <Text style={styles.groupLabel}>✓ Purchased</Text>
            {checkedItems.map((item, index) => (
              <View key={item.itemId} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {uncheckedItems.length > 0 && (
          <View style={styles.itemGroup}>
            <Text style={[styles.groupLabel, styles.uncheckedLabel]}>○ Not Purchased</Text>
            {uncheckedItems.map((item, index) => (
              <View key={item.itemId} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, styles.uncheckedItem]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemPrice, styles.uncheckedItem]}>
                    ${item.price.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.useAgainButton]}
          onPress={handleUseAgain}
        >
          <Text style={styles.useAgainButtonText}>Use This List Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Delete Session</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 20,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  totalContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  receiptContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  checkedCount: {
    color: '#4CAF50',
  },
  uncheckedCount: {
    color: '#ff3b30',
  },
  itemsContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    marginBottom: 16,
  },
  itemGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  uncheckedLabel: {
    color: '#999',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    color: '#333',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  uncheckedItem: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  actionButtons: {
    padding: 16,
    paddingTop: 0,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  useAgainButton: {
    backgroundColor: '#007AFF',
  },
  useAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
});