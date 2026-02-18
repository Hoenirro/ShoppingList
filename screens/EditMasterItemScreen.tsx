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
import { MasterItem, BrandVariant } from '../types';

export default function EditMasterItemScreen({ route, navigation }: any) {
  const { itemId, returnTo, listId } = route.params || {};
  const [productName, setProductName] = useState('');
  const [variants, setVariants] = useState<BrandVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [originalItem, setOriginalItem] = useState<MasterItem | null>(null);

  // Form state for current variant being edited
  const [currentBrand, setCurrentBrand] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentImageUri, setCurrentImageUri] = useState('');

  const isEditing = !!itemId;

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Product' : 'Create New Product',
    });

    if (isEditing) {
      loadItem();
    }
  }, [itemId, navigation]);

  useEffect(() => {
    // Load selected variant data into form
    if (variants.length > 0 && selectedVariantIndex < variants.length) {
      const variant = variants[selectedVariantIndex];
      setCurrentBrand(variant.brand);
      setCurrentPrice(variant.defaultPrice.toString());
      setCurrentImageUri(variant.imageUri || '');
    } else {
      // Reset form for new variant
      setCurrentBrand('');
      setCurrentPrice('');
      setCurrentImageUri('');
    }
  }, [selectedVariantIndex, variants]);

  const loadItem = async () => {
    const items = await ShoppingListStorage.getAllMasterItems();
    const item = items.find(i => i.id === itemId);
    if (item) {
      setOriginalItem(item);
      setProductName(item.name);
      setVariants(item.variants || []);
      setSelectedVariantIndex(item.defaultVariantIndex || 0);
    }
  };

  const handleTakePhoto = async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) {
      const savedUri = await ShoppingListStorage.saveImage(uri, 'product');
      setCurrentImageUri(savedUri);
    }
  };

  const handleAddVariant = () => {
    if (!currentBrand.trim()) {
      Alert.alert('Error', 'Please enter a brand name');
      return;
    }

    const priceNum = parseFloat(currentPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const now = Date.now();
    const newVariant: BrandVariant = {
      brand: currentBrand.trim(),
      defaultPrice: priceNum,
      averagePrice: priceNum,
      priceHistory: [{
        price: priceNum,
        date: now
      }],
      imageUri: currentImageUri || undefined,
      createdAt: now,
      updatedAt: now
    };

    setVariants([...variants, newVariant]);
    setSelectedVariantIndex(variants.length); // Select the new variant
    
    // Clear form for next variant
    setCurrentBrand('');
    setCurrentPrice('');
    setCurrentImageUri('');
  };

  const handleUpdateVariant = () => {
    if (!currentBrand.trim()) {
      Alert.alert('Error', 'Please enter a brand name');
      return;
    }

    const priceNum = parseFloat(currentPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const updatedVariants = [...variants];
    const now = Date.now();
    
    // Add to price history if price changed
    if (priceNum !== variants[selectedVariantIndex].defaultPrice) {
      updatedVariants[selectedVariantIndex].priceHistory.push({
        price: priceNum,
        date: now
      });
      
      // Recalculate average
      const total = updatedVariants[selectedVariantIndex].priceHistory.reduce(
        (sum, record) => sum + record.price, 0
      );
      updatedVariants[selectedVariantIndex].averagePrice = 
        total / updatedVariants[selectedVariantIndex].priceHistory.length;
    }

    updatedVariants[selectedVariantIndex] = {
      ...updatedVariants[selectedVariantIndex],
      brand: currentBrand.trim(),
      defaultPrice: priceNum,
      imageUri: currentImageUri || updatedVariants[selectedVariantIndex].imageUri,
      updatedAt: now
    };

    setVariants(updatedVariants);
    Alert.alert('Success', 'Brand updated successfully');
  };

  const handleDeleteVariant = () => {
    if (variants.length <= 1) {
      Alert.alert('Cannot Delete', 'Product must have at least one brand');
      return;
    }

    Alert.alert(
      'Delete Brand',
      `Are you sure you want to delete "${variants[selectedVariantIndex].brand}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Delete image if exists
            if (variants[selectedVariantIndex].imageUri) {
              await ShoppingListStorage.deleteImageIfExists(variants[selectedVariantIndex].imageUri);
            }
            
            const newVariants = variants.filter((_, index) => index !== selectedVariantIndex);
            setVariants(newVariants);
            setSelectedVariantIndex(0);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    if (!productName.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    if (variants.length === 0) {
      Alert.alert('Error', 'Please add at least one brand');
      return;
    }

    setIsSaving(true);

    try {
      const now = Date.now();
      
      if (isEditing && originalItem) {
        // Update existing item
        const updatedItem: MasterItem = {
          ...originalItem,
          name: productName.trim(),
          variants,
          defaultVariantIndex: Math.min(selectedVariantIndex, variants.length - 1),
          updatedAt: now,
        };
        await ShoppingListStorage.saveMasterItem(updatedItem);
      } else {
        // Create new item
        const newItem: MasterItem = {
          id: Date.now().toString(),
          name: productName.trim(),
          variants,
          defaultVariantIndex: 0,
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
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const renderVariantTabs = () => (
    <View style={styles.variantTabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {variants.map((variant, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.variantTab,
              selectedVariantIndex === index && styles.selectedVariantTab
            ]}
            onPress={() => setSelectedVariantIndex(index)}
          >
            <Text style={[
              styles.variantTabText,
              selectedVariantIndex === index && styles.selectedVariantTabText
            ]}>
              {variant.brand}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Always show Add Brand tab */}
        <TouchableOpacity
          style={[
            styles.variantTab,
            styles.addVariantTab,
            selectedVariantIndex === variants.length && styles.selectedVariantTab
          ]}
          onPress={() => {
            setSelectedVariantIndex(variants.length);
            setCurrentBrand('');
            setCurrentPrice('');
            setCurrentImageUri('');
          }}
        >
          <Text style={[
            styles.variantTabText,
            styles.addVariantTabText,
            selectedVariantIndex === variants.length && styles.selectedVariantTabText
          ]}>
            + Add Brand
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderVariantActions = () => {
    const isNewBrand = selectedVariantIndex === variants.length;
    
    if (isNewBrand) {
      return (
        <TouchableOpacity
          style={[styles.variantButton, styles.addVariantButton]}
          onPress={handleAddVariant}
        >
          <Text style={styles.variantButtonText}>Add New Brand</Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <View style={styles.variantActionsRow}>
          <TouchableOpacity
            style={[styles.variantButton, styles.updateButton]}
            onPress={handleUpdateVariant}
          >
            <Text style={styles.variantButtonText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.variantButton, styles.deleteVariantButton]}
            onPress={handleDeleteVariant}
          >
            <Text style={styles.variantButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Product Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g., Milk"
          />
        </View>

        <Text style={styles.sectionLabel}>Brands</Text>
        
        {/* Brand Tabs */}
        {renderVariantTabs()}

        {/* Current Brand Form */}
        <View style={styles.variantForm}>
          <TouchableOpacity style={styles.imageContainer} onPress={handleTakePhoto}>
            {currentImageUri ? (
              <Image source={{ uri: currentImageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>📷</Text>
                <Text style={styles.imagePlaceholderLabel}>
                  {currentImageUri ? 'Change Photo' : 'Add Photo'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand Name *</Text>
            <TextInput
              style={styles.input}
              value={currentBrand}
              onChangeText={setCurrentBrand}
              placeholder="e.g., Organic Valley"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price *</Text>
            <TextInput
              style={styles.input}
              value={currentPrice}
              onChangeText={setCurrentPrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Dynamic Action Buttons */}
          {renderVariantActions()}
        </View>

        {/* Save Product Button */}
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </Text>
        </TouchableOpacity>
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
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  variantTabsContainer: {
    marginBottom: 16,
  },
  variantTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  selectedVariantTab: {
    backgroundColor: '#007AFF',
  },
  variantTabText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedVariantTabText: {
    color: '#fff',
  },
  addVariantTab: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addVariantTabText: {
    color: '#4CAF50',
  },
  variantForm: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 30,
    marginBottom: 4,
  },
  imagePlaceholderLabel: {
    fontSize: 12,
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
  variantActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  variantButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  addVariantButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  deleteVariantButton: {
    backgroundColor: '#ff3b30',
  },
  variantButtonText: {
    color: '#fff',
    fontWeight: '600',
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
});