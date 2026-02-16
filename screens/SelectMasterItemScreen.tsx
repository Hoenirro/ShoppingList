// screens/SelectMasterItemScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem } from '../types';

export default function SelectMasterItemScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const [items, setItems] = useState<MasterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  useFocusEffect(
  useCallback(() => {
    loadItems();
    loadCurrentListItems();
  }, [])
);

const loadCurrentListItems = async () => {
  const lists = await ShoppingListStorage.getAllLists();
  const currentList = lists.find(l => l.id === listId);
  if (currentList) {
    const addedIds = new Set(currentList.items.map(item => item.masterItemId));
    setAddedItemIds(addedIds);
  }
};

  const loadItems = async () => {
    const loadedItems = await ShoppingListStorage.getAllMasterItems();
    setItems(loadedItems);
  };

  const handleSelectItem = async (item: MasterItem) => {
  if (addedItemIds.has(item.id)) {
    Alert.alert('Already Added', `${item.name} is already in this list`);
    return;
  }

  await ShoppingListStorage.addMasterItemToList(listId, item.id);
  setAddedItemIds(prev => new Set(prev).add(item.id));
  Alert.alert('Success', `${item.name} added to list`, [
    { text: 'OK' }
  ]);
};

  const handleCreateNew = () => {
    navigation.navigate('EditMasterItem', { 
      returnTo: 'SelectMasterItem',
      listId: listId // Pass listId so we know where to return
    });
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: MasterItem }) => {
  const isAdded = addedItemIds.has(item.id);
  
  return (
    <TouchableOpacity
      style={[styles.itemContainer, isAdded && styles.disabledItem]}
      onPress={() => handleSelectItem(item)}
      disabled={isAdded}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
          <Text style={styles.placeholderText}>📷</Text>
        </View>
      )}
      
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, isAdded && styles.disabledText]}>
          {item.name}
        </Text>
        <Text style={[styles.itemBrand, isAdded && styles.disabledText]}>
          {item.brand}
        </Text>
        <Text style={[styles.itemPrice, isAdded && styles.disabledText]}>
          Default: ${item.defaultPrice.toFixed(2)}
        </Text>
      </View>
      
      <View style={[styles.addIcon, isAdded && styles.addedIcon]}>
        <Text style={styles.addIconText}>{isAdded ? '✓' : '+'}</Text>
      </View>
    </TouchableOpacity>
  );
};

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
          style={styles.createButton}
          onPress={handleCreateNew}
        >
          <Text style={styles.createButtonText}>+ Create New Item</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No master items found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Create your first item!'}
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
  disabledItem: {
  opacity: 0.6,
  backgroundColor: '#f8f8f8',
},
disabledText: {
  color: '#999',
},
addedIcon: {
  backgroundColor: '#999',
},
  createButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
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
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
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