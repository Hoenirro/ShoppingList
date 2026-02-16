// screens/EditListItemScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingListItem, MasterItem } from '../types';

export default function EditListItemScreen({ route, navigation }: any) {
  const { listId, listItemId, masterItemId } = route.params;
  const [list, setList] = useState<ShoppingList | null>(null);
  const [listItem, setListItem] = useState<ShoppingListItem | null>(null);
  const [masterItem, setMasterItem] = useState<MasterItem | null>(null);
  
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load the shopping list
    const lists = await ShoppingListStorage.getAllLists();
    const currentList = lists.find(l => l.id === listId);
    setList(currentList || null);

    if (currentList && listItemId) {
      // Editing existing list item
      const item = currentList.items.find(i => i.masterItemId === listItemId);
      if (item) {
        setListItem(item);
        setName(item.name);
        setBrand(item.brand);
        setPrice(item.lastPrice.toString());
        setImageUri(item.imageUri || '');
      }
    } else if (masterItemId) {
      // Adding new item from master catalog
      const masterItems = await ShoppingListStorage.getAllMasterItems();
      const master = masterItems.find(i => i.id === masterItemId);
      if (master) {
        setMasterItem(master);
        setName(master.name);
        setBrand(master.brand);
        setPrice(master.defaultPrice.toString());
        setImageUri(master.imageUri || '');
      }
    }
  };

  const handleTakePhoto = async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) {
      const savedUri = await ShoppingListStorage.saveImage(uri, 'product');
      setImageUri(savedUri);
    }
  };

  const handleSave = async () => {
    if (isSaving || !list) return;
    
    if (!name.trim() || !brand.trim() || !price.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setIsSaving(true);

    try {
      const updatedItems = [...list.items];

      if (listItem) {
        // Update existing list item
        const index = updatedItems.findIndex(i => i.masterItemId === listItem.masterItemId);
        if (index !== -1) {
          updatedItems[index] = {
            ...listItem,
            name: name.trim(),
            brand: brand.trim(),
            lastPrice: priceNum,
            imageUri: imageUri || listItem.imageUri,
          };
        }
      } else if (masterItem) {
        // Add new item to list from master catalog
        const newListItem: ShoppingListItem = {
          masterItemId: masterItem.id,
          name: name.trim(),
          brand: brand.trim(),
          lastPrice: priceNum,
          priceAtAdd: priceNum,
          averagePrice: masterItem.averagePrice,
          imageUri: imageUri || masterItem.imageUri,
          addedAt: Date.now(),
        };
        updatedItems.push(newListItem);
      }

      const updatedList = {
        ...list,
        items: updatedItems,
        updatedAt: Date.now(),
      };

      await ShoppingListStorage.saveList(updatedList);
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving list item:', error);
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!list || !listItem) return;

    Alert.alert(
      'Remove Item',
      `Remove "${listItem.name}" from this shopping list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = list.items.filter(i => i.masterItemId !== listItem.masterItemId);
            const updatedList = {
              ...list,
              items: updatedItems,
              updatedAt: Date.now(),
            };
            await ShoppingListStorage.saveList(updatedList);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity style={styles.imageContainer} onPress={handleTakePhoto}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>📷</Text>
              <Text style={styles.imagePlaceholderLabel}>Take Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Milk"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Brand *</Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g., Organic Valley"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price for this trip *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.disabledButton]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save to List'}
            </Text>
          </TouchableOpacity>

          {listItem && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Remove from List</Text>
            </TouchableOpacity>
          )}
        </View>

        {masterItem && (
          <Text style={styles.note}>
            ℹ️ This item is from your master catalog. Changes here only affect this shopping list.
          </Text>
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
  form: {
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 40,
    marginBottom: 8,
  },
  imagePlaceholderLabel: {
    fontSize: 14,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  note: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
});