// screens/EditMasterItemScreen.tsx
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
import { MasterItem } from '../types';

export default function EditMasterItemScreen({ route, navigation }: any) {
  const { itemId, returnTo, listId } = route.params || {};
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [originalItem, setOriginalItem] = useState<MasterItem | null>(null);

  // Determine if we're editing or creating
  const isEditing = !!itemId;

  useEffect(() => {
    // Set the screen title based on mode
    navigation.setOptions({
      title: isEditing ? 'Edit Item' : 'Create New Item',
    });

    if (isEditing) {
      loadItem();
    }
  }, [itemId, navigation]);

  const loadItem = async () => {
    const items = await ShoppingListStorage.getAllMasterItems();
    const item = items.find(i => i.id === itemId);
    if (item) {
      setOriginalItem(item);
      setName(item.name);
      setBrand(item.brand);
      setPrice(item.defaultPrice.toString());
      setImageUri(item.imageUri || '');
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
    if (isSaving) return;
    
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
      
      if (isEditing && originalItem) {
        // Update existing item
        const updatedItem: MasterItem = {
          ...originalItem,
          name: name.trim(),
          brand: brand.trim(),
          defaultPrice: priceNum,
          imageUri: imageUri || originalItem.imageUri,
          updatedAt: now,
        };
        await ShoppingListStorage.saveMasterItem(updatedItem);
      } else {
        // Create new item
        const newItem: MasterItem = {
          id: Date.now().toString(),
          name: name.trim(),
          brand: brand.trim(),
          defaultPrice: priceNum,
          averagePrice: priceNum,
          priceHistory: [{
            price: priceNum,
            date: now
          }],
          imageUri: imageUri || undefined,
          createdAt: now,
          updatedAt: now,
        };
        await ShoppingListStorage.saveMasterItem(newItem);
      }
      
      // Navigate back appropriately
      if (returnTo === 'SelectMasterItem' && listId) {
        navigation.navigate('SelectMasterItem', { listId });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving master item:', error);
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !originalItem) return;

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${originalItem.name}" from your master catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ShoppingListStorage.deleteMasterItem(originalItem.id);
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
              <Text style={styles.imagePlaceholderLabel}>
                {isEditing ? 'Change Photo' : 'Take Photo'}
              </Text>
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
          <Text style={styles.label}>
            {isEditing ? 'Update Price' : 'Default Price'} *
          </Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete Item</Text>
          </TouchableOpacity>
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
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
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