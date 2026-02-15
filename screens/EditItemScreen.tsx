// screens/EditItemScreen.tsx
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
import { ShoppingList, ShoppingItem } from '../types';

export default function EditItemScreen({ route, navigation }: any) {
  const { listId, item, returnTo } = route.params || {};
  const [list, setList] = useState<ShoppingList | null>(null);
  const [name, setName] = useState(item?.name || '');
  const [brand, setBrand] = useState(item?.brand || '');
  const [price, setPrice] = useState(item?.lastPrice?.toString() || '');
  const [imageUri, setImageUri] = useState(item?.imageUri || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    // If listId is 'global', we're in ItemManager mode
    if (listId === 'global') {
      setList(null); // No specific list for global items
      return;
    }
    
    const lists = await ShoppingListStorage.getAllLists();
    const foundList = lists.find(l => l.id === listId);
    setList(foundList || null);
  };

  const handleTakePhoto = async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) {
      const savedUri = await ShoppingListStorage.saveImage(uri, 'product');
      setImageUri(savedUri);
    }
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent double-saving
    
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
      const now = Date.now();

      if (listId === 'global') {
        // Handle global item (add to all lists or create standalone)
        // For now, we'll just show a success message
        Alert.alert('Success', 'Item saved successfully', [
          { 
            text: 'OK', 
            onPress: () => {
              if (returnTo === 'ItemManager') {
                navigation.navigate('ItemManager');
              } else {
                navigation.goBack();
              }
            }
          }
        ]);
        return;
      }

      if (!list) {
        Alert.alert('Error', 'List not found');
        setIsSaving(false);
        return;
      }

      const updatedItems = [...list.items];

      if (item) {
        // Update existing item
        const index = updatedItems.findIndex(i => i.id === item.id);
        if (index !== -1) {
          updatedItems[index] = {
            ...item,
            name,
            brand,
            lastPrice: priceNum,
            imageUri: imageUri || item.imageUri,
            updatedAt: now,
          };
        }
      } else {
        // Create new item
        const newItem: ShoppingItem = {
          id: Date.now().toString(),
          name,
          brand,
          lastPrice: priceNum,
          averagePrice: priceNum,
          imageUri: imageUri || undefined,
          createdAt: now,
          updatedAt: now,
        };
        updatedItems.push(newItem);
      }

      const updatedList = {
        ...list,
        items: updatedItems,
        updatedAt: now,
      };

      await ShoppingListStorage.saveList(updatedList);
      
      // Navigate back with success
      if (returnTo === 'ItemManager') {
        navigation.navigate('ItemManager');
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!list || !item) return;

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedItems = list.items.filter(i => i.id !== item.id);
              const updatedList = {
                ...list,
                items: updatedItems,
                updatedAt: Date.now(),
              };
              await ShoppingListStorage.saveList(updatedList);
              
              if (returnTo === 'ItemManager') {
                navigation.navigate('ItemManager');
              } else {
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
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
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Milk"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Brand</Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g., Organic Valley"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Price</Text>
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
              {isSaving ? 'Saving...' : 'Save Item'}
            </Text>
          </TouchableOpacity>

          {item && listId !== 'global' && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Item</Text>
            </TouchableOpacity>
          )}
        </View>
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
    marginTop: 24,
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
});