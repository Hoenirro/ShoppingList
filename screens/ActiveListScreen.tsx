// screens/ActiveListScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingListItem, ShoppingSession, ActiveSession } from '../types';

export default function ActiveListScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const [list, setList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<{[key: string]: boolean}>({});
  const [itemPrices, setItemPrices] = useState<{[key: string]: number}>({});
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    const lists = await ShoppingListStorage.getAllLists();
    const foundList = lists.find(l => l.id === listId);
    setList(foundList || null);
  };

  const handleItemPress = (item: ShoppingListItem) => {
    setSelectedItem(item);
    setPriceInput(item.lastPrice.toString());
    setPriceModalVisible(true);
  };

  const handlePriceSubmit = async () => {
    if (!selectedItem || !list) return;

    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    // Mark item as checked and store price
    setCheckedItems(prev => ({
      ...prev,
      [selectedItem.masterItemId]: true
    }));
    
    setItemPrices(prev => ({
      ...prev,
      [selectedItem.masterItemId]: price
    }));

    // Update item price if changed
    if (price !== selectedItem.lastPrice) {
      const updatedItems = list.items.map(item => {
        if (item.masterItemId === selectedItem.masterItemId) {
          const newAveragePrice = (item.averagePrice * (list.items.length - 1) + price) / list.items.length;
          return {
            ...item,
            lastPrice: price,
            averagePrice: newAveragePrice,
            updatedAt: Date.now(),
          };
        }
        return item;
      });

      const updatedList = {
        ...list,
        items: updatedItems,
        updatedAt: Date.now(),
      };

      await ShoppingListStorage.saveList(updatedList);
      setList(updatedList);
    }

    setPriceModalVisible(false);
    setSelectedItem(null);
    setPriceInput('');
  };

  const handleTakePhoto = async (item: ShoppingListItem) => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri && list) {
      const savedUri = await ShoppingListStorage.saveImage(uri, 'product');
      
      const updatedItems = list.items.map(i => {
        if (i.masterItemId === item.masterItemId) {
          return { ...i, imageUri: savedUri, updatedAt: Date.now() };
        }
        return i;
      });

      const updatedList = {
        ...list,
        items: updatedItems,
        updatedAt: Date.now(),
      };

      await ShoppingListStorage.saveList(updatedList);
      setList(updatedList);
    }
  };

  const handleTakeReceiptPhoto = async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) {
      const savedUri = await ShoppingListStorage.saveImage(uri, 'receipt');
      setReceiptImage(savedUri);
    }
  };

  const handleCompleteShopping = async () => {
    if (!list) return;

    // Calculate total
    let total = 0;
    const sessionItems = list.items.map(item => {
      const price = itemPrices[item.masterItemId] || item.lastPrice;
      total += price;
      return {
        masterItemId: item.masterItemId,
        name: item.name,
        price: price,
        checked: checkedItems[item.masterItemId] || false
      };
    });

    const session: ShoppingSession = {
      id: Date.now().toString(),
      listId: list.id,
      listName: list.name,
      date: Date.now(),
      total,
      receiptImageUri: receiptImage || undefined,
      items: sessionItems
    };

    await ShoppingListStorage.saveSession(session);
    
    Alert.alert(
      'Shopping Complete!',
      `Total: $${total.toFixed(2)}\nSession saved to history.`,
      [{ text: 'OK', onPress: () => navigation.navigate('Welcome') }]
    );
  };

  const getTotalSoFar = () => {
    let total = 0;
    Object.keys(itemPrices).forEach(id => {
      total += itemPrices[id];
    });
    return total;
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const isChecked = checkedItems[item.masterItemId] || false;
    const itemPrice = itemPrices[item.masterItemId] || item.lastPrice;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isChecked && styles.checkedItem]}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleTakePhoto(item)}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
        ) : (
          <TouchableOpacity 
            style={[styles.thumbnail, styles.placeholderThumbnail]}
            onPress={() => handleTakePhoto(item)}
          >
            <Text style={styles.placeholderText}>📷</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isChecked && styles.checkedText]}>
            {item.name}
          </Text>
          <Text style={[styles.itemBrand, isChecked && styles.checkedText]}>
            {item.brand}
          </Text>
          <Text style={[styles.price, isChecked && styles.checkedText]}>
            ${itemPrice.toFixed(2)}
          </Text>
        </View>

        {isChecked && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!list) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const checkedCount = Object.keys(checkedItems).length;
  const totalSoFar = getTotalSoFar();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.listName}>{list.name}</Text>
          <Text style={styles.progress}>
            {checkedCount} / {list.items.length} items • ${totalSoFar.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => setCompletionModalVisible(true)}
        >
          <Text style={styles.completeButtonText}>Complete</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.masterItemId}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in this list</Text>
          </View>
        }
      />

      {/* Price Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={priceModalVisible}
        onRequestClose={() => setPriceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Price</Text>
            <Text style={styles.itemNameModal}>{selectedItem?.name}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPriceModalVisible(false);
                  setSelectedItem(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handlePriceSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={completionModalVisible}
        onRequestClose={() => setCompletionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Shopping</Text>
            
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Items checked: {checkedCount} / {list.items.length}
              </Text>
              <Text style={styles.summaryText}>
                Total: ${totalSoFar.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.receiptButton}
              onPress={handleTakeReceiptPhoto}
            >
              <Text style={styles.receiptButtonText}>
                {receiptImage ? '📸 Retake Receipt Photo' : '📷 Take Receipt Photo'}
              </Text>
            </TouchableOpacity>

            {receiptImage && (
              <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCompletionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.completeButton]}
                onPress={handleCompleteShopping}
              >
                <Text style={styles.completeButtonText}>Finish & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 4,
  },
  progress: {
    fontSize: 14,
    color: '#666',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  completeButtonText: {
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
  checkedItem: {
    opacity: 0.6,
    backgroundColor: '#f8f8f8',
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
  price: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  checkedText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  checkmark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  itemNameModal: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 4,
  },
  receiptButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  receiptPreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 16,
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
});