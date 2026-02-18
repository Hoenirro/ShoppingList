// screens/PriceHistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem, PriceRecord } from '../types';

export default function PriceHistoryScreen({ route, navigation }: any) {
  const { masterItemId, itemName } = route.params;
  const [item, setItem] = useState<MasterItem | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  useEffect(() => {
    loadItem();
  }, []);

  const loadItem = async () => {
    const items = await ShoppingListStorage.getAllMasterItems();
    const foundItem = items.find(i => i.id === masterItemId);
    setItem(foundItem || null);
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const selectedVariant = item.variants[selectedVariantIndex];
  
  if (!selectedVariant) {
    return (
      <View style={styles.container}>
        <Text>No variants found</Text>
      </View>
    );
  }

  // Calculate statistics for selected variant
  const prices = selectedVariant.priceHistory?.map(p => p.price) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const averagePrice = prices.length > 0 
    ? prices.reduce((a, b) => a + b, 0) / prices.length 
    : 0;
  
  // Get last purchase
  const lastPurchase = selectedVariant.priceHistory?.[selectedVariant.priceHistory.length - 1];

  // Sort history by date (newest first)
  const sortedHistory = [...(selectedVariant.priceHistory || [])].sort((a, b) => b.date - a.date);

  const renderVariantSelector = () => {
    if (item.variants.length <= 1) return null;

    return (
      <View style={styles.variantSelector}>
        <Text style={styles.variantLabel}>Select Brand:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantScroll}>
          {item.variants.map((variant, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.variantChip,
                selectedVariantIndex === index && styles.selectedVariantChip
              ]}
              onPress={() => setSelectedVariantIndex(index)}
            >
              <Text style={[
                styles.variantChipText,
                selectedVariantIndex === index && styles.selectedVariantChipText
              ]}>
                {variant.brand}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.itemName}>{item.name}</Text>
        {renderVariantSelector()}
      </View>

      {/* Last Purchase Section */}
      {lastPurchase && (
        <View style={styles.lastPurchaseContainer}>
          <Text style={styles.sectionTitle}>Last Purchase - {selectedVariant.brand}</Text>
          <View style={styles.lastPurchaseCard}>
            <View style={styles.lastPurchaseRow}>
              <Text style={styles.lastPurchaseLabel}>Date:</Text>
              <Text style={styles.lastPurchaseValue}>
                {new Date(lastPurchase.date).toLocaleDateString()} at{' '}
                {new Date(lastPurchase.date).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.lastPurchaseRow}>
              <Text style={styles.lastPurchaseLabel}>Price:</Text>
              <Text style={styles.lastPurchasePrice}>
                ${(lastPurchase.price || 0).toFixed(2)}
              </Text>
            </View>
            {lastPurchase.listName && (
              <View style={styles.lastPurchaseRow}>
                <Text style={styles.lastPurchaseLabel}>List:</Text>
                <Text style={styles.lastPurchaseList}>{lastPurchase.listName}</Text>
              </View>
            )}
            {lastPurchase.receiptImageUri && (
              <TouchableOpacity 
                style={styles.receiptButton}
                onPress={() => {
                  if (lastPurchase.listId) {
                    navigation.navigate('SessionDetails', { sessionId: lastPurchase.listId });
                  }
                }}
              >
                <Text style={styles.receiptButtonText}>View Receipt 🧾</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={styles.statValue}>${averagePrice.toFixed(2)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Min</Text>
          <Text style={[styles.statValue, styles.minPrice]}>${minPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Max</Text>
          <Text style={[styles.statValue, styles.maxPrice]}>${maxPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Full History */}
      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>Price History - {selectedVariant.brand}</Text>
        
        {sortedHistory.length === 0 ? (
          <Text style={styles.noHistory}>No price history yet</Text>
        ) : (
          sortedHistory.map((record, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>
                  {new Date(record.date).toLocaleDateString()}
                </Text>
                <Text style={styles.historyTime}>
                  {new Date(record.date).toLocaleTimeString()}
                </Text>
                {record.listName && (
                  <Text style={styles.historyList}>{record.listName}</Text>
                )}
              </View>
              
              <View style={styles.historyRight}>
                <Text style={styles.historyPrice}>${(record.price || 0).toFixed(2)}</Text>
                {record.receiptImageUri && (
                  <TouchableOpacity
                    onPress={() => {
                      if (record.listId) {
                        navigation.navigate('SessionDetails', { sessionId: record.listId });
                      }
                    }}
                  >
                    <Text style={styles.receiptIcon}>🧾</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  variantSelector: {
    width: '100%',
  },
  variantLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  variantScroll: {
    flexDirection: 'row',
  },
  variantChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedVariantChip: {
    backgroundColor: '#007AFF',
  },
  variantChipText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedVariantChipText: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  lastPurchaseContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  lastPurchaseCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
  },
  lastPurchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lastPurchaseLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  lastPurchaseValue: {
    fontSize: 14,
    color: '#333',
  },
  lastPurchasePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  lastPurchaseList: {
    fontSize: 14,
    color: '#007AFF',
  },
  receiptButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  receiptButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
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
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  minPrice: {
    color: '#4CAF50',
  },
  maxPrice: {
    color: '#ff3b30',
  },
  historyContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    marginBottom: 16,
  },
  noHistory: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historyList: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 12,
  },
  receiptIcon: {
    fontSize: 20,
  },
});