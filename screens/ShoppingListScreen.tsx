// screens/ShoppingListScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingItem } from '../types';

export default function ShoppingListScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const [list, setList] = useState<ShoppingList | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    const lists = await ShoppingListStorage.getAllLists();
    const foundList = lists.find(l => l.id === listId);
    setList(foundList || null);
  };

  const handleUseList = () => {
    navigation.navigate('ActiveList', { listId });
  };

  const handleEditItem = (item?: ShoppingItem) => {
    navigation.navigate('EditItem', { listId, item });
  };

  const handleAddItem = () => {
    navigation.navigate('EditItem', { listId });
  };

  const handleRemoveItem = (item: ShoppingItem) => {
    if (!list) return;
    
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove "${item.name}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = list.items.filter(i => i.id !== item.id);
            const updatedList = {
              ...list,
              items: updatedItems,
              updatedAt: Date.now(),
            };
            await ShoppingListStorage.saveList(updatedList);
            setList(updatedList);
          },
        },
      ]
    );
  };

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
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveItem(item)}
        >
          <Text style={styles.actionButtonText}>−</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!list) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.listName}>{list.name}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleAddItem}>
            <Text style={styles.iconButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.useButton} onPress={handleUseList}>
            <Text style={styles.useButtonText}>Use</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={list.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in this list</Text>
            <Text style={styles.emptySubtext}>Tap + to add items</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listName: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  useButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  useButtonText: {
    color: '#fff',
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
  removeButton: {
    backgroundColor: '#ff3b30',
  },
  actionButtonText: {
    fontSize: 18,
    color: '#fff',
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