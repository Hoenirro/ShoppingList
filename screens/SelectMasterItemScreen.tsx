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
      // Create a Set of composite keys or just masterItemIds for simple check
      // For simplicity, we'll just check if any variant of this item is in the list
      const addedIds = new Set(currentList.items.map(item => item.masterItemId));
      setAddedItemIds(addedIds);
    }
  };

  const loadItems = async () => {
    const loadedItems = await ShoppingListStorage.getAllMasterItems();
    setItems(loadedItems);
  };

  const handleAddItem = async (item: MasterItem) => {
    if (addedItemIds.has(item.id)) {
      Alert.alert('Already Added', `${item.name} is already in this list`);
      return;
    }
    
    // If item has multiple variants, navigate to variant selection
    if (item.variants.length > 1) {
      navigation.navigate('EditListItem', {
        listId,
        masterItemId: item.id,
        variantIndex: 0
      });
      return;
    }
    
    // Otherwise add the default variant
    await ShoppingListStorage.addMasterItemToList(listId, item.id, 0);
    
    // Update local state to show item as added
    setAddedItemIds(prev => new Set(prev).add(item.id));
    
    // Notify parent to refresh if callback exists
    if (route.params?.onGoBack) {
      route.params.onGoBack();
    }
    loadItems();
  };

  const handleRemoveItem = async (item: MasterItem) => {
    Alert.alert(
      'Remove Item',
      `Remove all variants of "${item.name}" from this shopping list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Get current list
            const lists = await ShoppingListStorage.getAllLists();
            const currentList = lists.find(l => l.id === listId);
            
            if (currentList) {
              // Filter out all variants of this item
              const updatedItems = currentList.items.filter(
                listItem => listItem.masterItemId !== item.id
              );
              
              const updatedList = {
                ...currentList,
                items: updatedItems,
                updatedAt: Date.now(),
              };
              
              await ShoppingListStorage.saveList(updatedList);
              
              // Update local state
              setAddedItemIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
              
              // Notify parent to refresh
              if (route.params?.onGoBack) {
                route.params.onGoBack();
              }
              loadItems();
            }
          },
        },
      ]
    );
  };

  const handleCreateNew = () => {
    navigation.navigate('EditMasterItem', { 
      returnTo: 'SelectMasterItem',
      listId: listId
    });
  };

  const filteredItems = items.filter(item => {
    // Search in item name and all variant brands
    const matchesName = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = item.variants.some(v => 
      v.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesName || matchesBrand;
  });

  const renderItem = ({ item }: { item: MasterItem }) => {
    const defaultVariant = item.variants[item.defaultVariantIndex || 0];
    const isAdded = addedItemIds.has(item.id);
    
    // Get all unique brands for display
    const brandList = item.variants.map(v => v.brand).join(', ');
    const lowestPrice = item.variants?.length > 0
  ? Math.min(...item.variants.map(v => v.defaultPrice || 0).filter(p => !isNaN(p)))
  : 0;
    
    return (
      <View style={[styles.itemContainer, isAdded && styles.addedItemContainer]}>
        {/* Show default variant's image */}
        {defaultVariant?.imageUri ? (
          <Image source={{ uri: defaultVariant.imageUri }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}
        
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isAdded && styles.addedText]}>
            {item.name}
          </Text>
          <Text style={[styles.itemBrand, isAdded && styles.addedText]} numberOfLines={1}>
            {brandList}
          </Text>
          <Text style={[styles.itemPrice, isAdded && styles.addedText]}>
  From ${lowestPrice?.toFixed(2) ?? '0.00'}
</Text>
        </View>
        
        {isAdded ? (
          <TouchableOpacity
            style={styles.removeIcon}
            onPress={() => handleRemoveItem(item)}
          >
            <Text style={styles.removeIconText}>−</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addIcon}
            onPress={() => handleAddItem(item)}
          >
            <Text style={styles.addIconText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items or brands..."
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
  addedItemContainer: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  addedText: {
    color: '#999',
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
  removeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIconText: {
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