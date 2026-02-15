// screens/ItemManagerScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingItem } from '../types';

export default function ItemManagerScreen({ navigation }: any) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAllItems();
    }, [])
  );

  const loadAllItems = async () => {
    const lists = await ShoppingListStorage.getAllLists();
    // Get unique items from all lists
    const allItems = lists.flatMap(list => list.items);
    // Remove duplicates by ID (keep the most recent)
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.id, item])).values()
    );
    setItems(uniqueItems.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleEditItem = (item?: ShoppingItem) => {
    navigation.navigate('EditItem', { 
      listId: 'global', 
      item,
      returnTo: 'ItemManager'
    });
  };

  const handleDeleteItem = (item: ShoppingItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}" from all lists?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const lists = await ShoppingListStorage.getAllLists();
            for (const list of lists) {
              const itemIndex = list.items.findIndex(i => i.id === item.id);
              if (itemIndex !== -1) {
                list.items.splice(itemIndex, 1);
                list.updatedAt = Date.now();
                await ShoppingListStorage.saveList(list);
              }
            }
            loadAllItems();
          },
        },
      ]
    );
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={styles.itemContainer}>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
          <Text style={styles.placeholderText}>📷</Text>
        </View>
      )}
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemBrand}>{item.brand}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Last: </Text>
          <Text style={styles.priceValue}>${item.lastPrice.toFixed(2)}</Text>
          <Text style={styles.priceLabel}>  Avg: </Text>
          <Text style={styles.priceValue}>${item.averagePrice.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditItem(item)}
        >
          <Text style={styles.actionButtonText}>✎</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item)}
        >
          <Text style={styles.actionButtonText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleEditItem()}
        >
          <Text style={styles.addButtonText}>+ New Item</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Tap + New Item to create one'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  placeholderThumbnail: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#999',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  actionButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});