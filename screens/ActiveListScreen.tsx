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
  const [checkedItems, setCheckedItems] = useState<{[key: string]: { checked: boolean; price?: number; checkedAt: number }}>({});
  const [itemPrices, setItemPrices] = useState<{[key: string]: number}>({});
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [actualTotal, setActualTotal] = useState(0);
  const [actualPaid, setActualPaid] = useState('');
  const [editingActual, setEditingActual] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    loadActiveSession();
  });

  return unsubscribe;
}, [navigation]);

  const loadActiveSession = async () => {
  setIsLoading(true);
  try {
    // First try to load existing active session
    const activeSession = await ShoppingListStorage.getActiveSession();
    
    // Get the latest list data
    const lists = await ShoppingListStorage.getAllLists();
    const currentList = lists.find(l => l.id === listId);
    
    if (!currentList) {
      setIsLoading(false);
      return;
    }
    
    if (activeSession && activeSession.listId === listId) {
      // Restore previous session but merge with current list items
      const mergedCheckedItems = { ...activeSession.checkedItems };
      const mergedItemPrices = { ...itemPrices };
      
      // Ensure all current list items are represented
      currentList.items.forEach(item => {
        if (activeSession.checkedItems[item.masterItemId]) {
          mergedCheckedItems[item.masterItemId] = activeSession.checkedItems[item.masterItemId];
          if (activeSession.checkedItems[item.masterItemId].price) {
            mergedItemPrices[item.masterItemId] = activeSession.checkedItems[item.masterItemId].price!;
          }
        }
      });
      
      setCheckedItems(mergedCheckedItems);
      setItemPrices(mergedItemPrices);
      setList(currentList);
      setReceiptImage(activeSession.receiptImageUri || null);
    } else {
      // Start new session
      setList(currentList);
      setCheckedItems({});
      setItemPrices({});
      setReceiptImage(null);
      
      // Create new active session
      const newSession: ActiveSession = {
        id: Date.now().toString(),
        listId: currentList.id,
        listName: currentList.name,
        startTime: Date.now(),
        items: currentList.items.map(item => ({
          masterItemId: item.masterItemId,
          name: item.name,
          brand: item.brand,
          lastPrice: item.lastPrice,
          checked: false,
          imageUri: item.imageUri
        })),
        checkedItems: {}
      };
      await ShoppingListStorage.saveActiveSession(newSession);
    }
  } catch (error) {
    console.error('Error loading active session:', error);
  } finally {
    setIsLoading(false);
  }
};

  const saveActiveSessionState = async (
  newCheckedItems?: {[key: string]: { checked: boolean; price?: number; checkedAt: number }},
  newItemPrices?: {[key: string]: number}
) => {
  if (!list) return;
  
  const checkedToUse = newCheckedItems || checkedItems;
  const pricesToUse = newItemPrices || itemPrices;
  
  const activeSession: ActiveSession = {
    id: Date.now().toString(),
    listId: list.id,
    listName: list.name,
    startTime: Date.now(),
    items: list.items.map(item => ({
      masterItemId: item.masterItemId,
      name: item.name,
      brand: item.brand,
      lastPrice: item.lastPrice,
      checked: checkedToUse[item.masterItemId]?.checked || false,
      price: pricesToUse[item.masterItemId],
      imageUri: item.imageUri
    })),
    checkedItems: checkedToUse,
    receiptImageUri: receiptImage || undefined
  };
  
  await ShoppingListStorage.saveActiveSession(activeSession);
};

const handleReturnFromAddItems = async () => {
  // Reload the list to get new items
  const lists = await ShoppingListStorage.getAllLists();
  const updatedList = lists.find(l => l.id === listId);
  
  if (updatedList) {
    setList(updatedList);
    
    // Update active session with new items
    const activeSession = await ShoppingListStorage.getActiveSession();
    if (activeSession) {
      // Merge existing checked items with new list
      const updatedCheckedItems = { ...checkedItems };
      const updatedItemPrices = { ...itemPrices };
      
      // Save updated session
      await saveActiveSessionState(updatedCheckedItems, updatedItemPrices);
    }
  }
};

  const handleItemPress = (item: ShoppingListItem) => {
    setSelectedItem(item);
    setPriceInput(itemPrices[item.masterItemId]?.toString() || item.lastPrice.toString());
    setPriceModalVisible(true);
  };

  const handlePriceSubmit = async () => {
  if (!selectedItem || !list) return;

  const price = parseFloat(priceInput);
  if (isNaN(price) || price < 0) {
    Alert.alert('Error', 'Please enter a valid price');
    return;
  }

  // Add to price history
  await ShoppingListStorage.addPriceToHistory(
    selectedItem.masterItemId,
    price,
    list.id,
    list.name,
    receiptImage || undefined
  );

  // Update state
  const newCheckedItems = {
    ...checkedItems,
    [selectedItem.masterItemId]: {
      checked: true,
      price: price,
      checkedAt: Date.now()
    }
  };
  
  const newItemPrices = {
    ...itemPrices,
    [selectedItem.masterItemId]: price
  };

  setCheckedItems(newCheckedItems);
  setItemPrices(newItemPrices);

  // Save active session with updated state
  await saveActiveSessionState(newCheckedItems, newItemPrices);

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
          return { ...i, imageUri: savedUri };
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
      await saveActiveSessionState();
    }
  };

  const handleTakeReceiptPhoto = async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) {
      const savedUri = await ShoppingListStorage.saveImage(uri, 'receipt');
      setReceiptImage(savedUri);
      await saveActiveSessionState();
    }
  };

  const handleCompleteShopping = async () => {
    if (!list) return;

    // Calculate estimated total (all items in list)
    let estimated = 0;
    // Calculate actual total from checked items
    let actual = 0;
    
    list.items.forEach(item => {
      const price = itemPrices[item.masterItemId] || item.lastPrice;
      estimated += price;
      if (checkedItems[item.masterItemId]) {
        actual += price;
      }
    });

    setEstimatedTotal(estimated);
    setActualTotal(actual);
    setActualPaid(actual.toFixed(2));
    setCompletionModalVisible(true);
  };

  const handleSaveSession = async () => {
    if (!list) return;

    const paidAmount = parseFloat(actualPaid) || actualTotal;

    const session: ShoppingSession = {
      id: Date.now().toString(),
      listId: list.id,
      listName: list.name,
      date: Date.now(),
      total: paidAmount,
      calculatedTotal: actualTotal,
      receiptImageUri: receiptImage || undefined,
      items: list.items.map(item => ({
        masterItemId: item.masterItemId,
        name: item.name,
        price: itemPrices[item.masterItemId] || item.lastPrice,
        checked: !!checkedItems[item.masterItemId]?.checked || false
      }))
    };
    
    await ShoppingListStorage.saveSession(session);
    await ShoppingListStorage.clearActiveSession(); // Clear active session
    navigation.navigate('Welcome');
  };

  const handleAddItems = () => {
  navigation.navigate('SelectMasterItem', { 
    listId,
    onGoBack: () => handleReturnFromAddItems() // Pass callback
  });
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.container}>
        <Text>List not found</Text>
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
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddItems}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteShopping}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={list.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.masterItemId}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in this list</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={handleAddItems}
            >
              <Text style={styles.addFirstButtonText}>Add Items</Text>
            </TouchableOpacity>
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
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Estimated Total:</Text>
                <Text style={styles.totalValue}>${estimatedTotal.toFixed(2)}</Text>
              </View>
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Actual Paid:</Text>
                {editingActual ? (
                  <TextInput
                    style={styles.paidInput}
                    value={actualPaid}
                    onChangeText={setActualPaid}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={() => setEditingActual(false)}
                    onSubmitEditing={() => setEditingActual(false)}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditingActual(true)}>
                    <Text style={[styles.totalValue, styles.actualPaidText]}>
                      ${parseFloat(actualPaid || '0').toFixed(2)} ✎
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={[styles.totalRow, styles.differenceRow]}>
                <Text style={styles.totalLabel}>Difference:</Text>
                <Text style={[
                  styles.totalValue,
                  parseFloat(actualPaid || '0') <= estimatedTotal ? styles.savings : styles.overspend
                ]}>
                  {parseFloat(actualPaid || '0') <= estimatedTotal ? '-' : '+'}$
                  {Math.abs(estimatedTotal - parseFloat(actualPaid || '0')).toFixed(2)}
                </Text>
              </View>
              
              <Text style={styles.itemSummary}>
                {checkedCount} of {list.items.length} items purchased
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
                onPress={handleSaveSession}
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addFirstButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 12,
  },
  addFirstButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
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
  headerCompleteButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  headerCompleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  paidInput: {
  borderWidth: 1,
  borderColor: '#007AFF',
  borderRadius: 4,
  paddingHorizontal: 8,
  paddingVertical: 4,
  fontSize: 18,
  fontWeight: '600',
  color: '#007AFF',
  minWidth: 100,
  textAlign: 'right',
},
actualPaidText: {
  color: '#007AFF',
  paddingHorizontal: 8,
  paddingVertical: 4,
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
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  actualTotal: {
    color: '#007AFF',
    fontSize: 20,
  },
  differenceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  savings: {
    color: '#4CAF50',
  },
  overspend: {
    color: '#ff3b30',
  },
  itemSummary: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#999',
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