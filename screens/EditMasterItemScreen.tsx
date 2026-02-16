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
  const { itemId, returnTo } = route.params || {};
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (itemId) {
      loadItem();
    }
  }, [itemId]);

  const loadItem = async () => {
    const items = await ShoppingListStorage.getAllMasterItems();
    const item = items.find(i => i.id === itemId);
    if (item) {
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
    const masterItem: MasterItem = {
      id: itemId || Date.now().toString(),
      name: name.trim(),
      brand: brand.trim(),
      defaultPrice: priceNum,
      averagePrice: priceNum,
      priceHistory: [{  // Initialize priceHistory array!
        price: priceNum,
        date: now
      }],
      imageUri: imageUri || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await ShoppingListStorage.saveMasterItem(masterItem);
    
    if (route.params?.returnTo === 'SelectMasterItem' && route.params?.listId) {
      navigation.navigate('SelectMasterItem', { listId: route.params.listId });
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
          <Text style={styles.label}>Default Price *</Text>
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
            {isSaving ? 'Saving...' : 'Save to Master Catalog'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          ✨ This item will be available in ALL your shopping lists
        </Text>
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
  },
  saveButtonText: {
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