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
import { MasterItem } from '../types';

export default function ItemManagerScreen({ navigation }: any) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    const loadedItems = await ShoppingListStorage.getAllMasterItems();
    setItems(loadedItems);
  };

  const handleEditItem = (item?: MasterItem) => {
    navigation.navigate('EditMasterItem', { 
      itemId: item?.id,
      returnTo: 'ItemManager'
    });
  };

  const handleDeleteItem = (item: MasterItem) => {
  Alert.alert(
    'Delete Item',
    `Are you sure you want to delete "${item.name}" from your master catalog?\n\nThis will NOT remove it from existing shopping lists.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await ShoppingListStorage.deleteMasterItem(item.id);
          loadItems();
        },
      },
    ]
  );
};

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: MasterItem }) => (
    <View style={styles.itemContainer}>
    <TouchableOpacity
      onPress={() => navigation.navigate('PriceHistory', { 
        masterItemId: item.id, 
        itemName: item.name 
      })}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
          <Text style={styles.placeholderText}>📷</Text>
        </View>
      )}
    </TouchableOpacity>
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemBrand}>{item.brand}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Default: </Text>
          <Text style={styles.priceValue}>${item.defaultPrice.toFixed(2)}</Text>
          <Text style={styles.priceLabel}>  Avg: </Text>
          <Text style={styles.priceValue}>${item.averagePrice.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
  <TouchableOpacity
    style={[styles.actionButton, styles.historyButton]}
    onPress={() => navigation.navigate('PriceHistory', { 
      masterItemId: item.id, 
      itemName: item.name 
    })}
  >
    <Text style={styles.historyButtonText}>📊</Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={[styles.actionButton, styles.editButton]}
    onPress={() => handleEditItem(item)}
  >
    <Text style={styles.editButtonText}>✎</Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={[styles.actionButton, styles.deleteButton]}
    onPress={() => handleDeleteItem(item)}
  >
    <Text style={styles.deleteButtonText}>🗑</Text>
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
          placeholderTextColor="#999"
        />
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleEditItem()}
        >
          <Text style={styles.addButtonText}>+ Create New Master Item</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No master items yet</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Create your first master item!'}
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
    color: '#333',
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
  historyButton: {
  backgroundColor: '#4CAF50',
},
historyButtonText: {
  fontSize: 18,
  color: '#fff',
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
    color: '#333',
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
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#f0f0f0',
  },
  editButtonText: {
    fontSize: 18,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
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