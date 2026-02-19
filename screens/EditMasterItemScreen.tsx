import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView, StatusBar } from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem, BrandVariant } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles } from '../theme/theme';

export default function EditMasterItemScreen({ route, navigation }: any) {
  const { itemId, returnTo, listId } = route.params || {};
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const isEditing = !!itemId;

  const [productName, setProductName] = useState('');
  const [variants, setVariants] = useState<BrandVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [originalItem, setOriginalItem] = useState<MasterItem | null>(null);
  const [currentBrand, setCurrentBrand] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentImageUri, setCurrentImageUri] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Product' : 'Create Product' });
    if (isEditing) loadItem();
  }, [itemId]);

  useEffect(() => {
    if (variants.length > 0 && selectedVariantIndex < variants.length) {
      const v = variants[selectedVariantIndex];
      setCurrentBrand(v.brand); setCurrentPrice(v.defaultPrice.toString()); setCurrentImageUri(v.imageUri || '');
    } else { setCurrentBrand(''); setCurrentPrice(''); setCurrentImageUri(''); }
  }, [selectedVariantIndex, variants]);

  const loadItem = async () => {
    const items = await ShoppingListStorage.getAllMasterItems();
    const item = items.find(i => i.id === itemId);
    if (item) { setOriginalItem(item); setProductName(item.name); setVariants(item.variants || []); setSelectedVariantIndex(item.defaultVariantIndex || 0); }
  };

  const handleAddVariant = () => {
    if (!currentBrand.trim()) { Alert.alert('Error', 'Enter a brand name'); return; }
    const priceNum = parseFloat(currentPrice);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Error', 'Enter a valid price'); return; }
    const now = Date.now();
    setVariants([...variants, { brand: currentBrand.trim(), defaultPrice: priceNum, averagePrice: priceNum, priceHistory: [{ price: priceNum, date: now }], imageUri: currentImageUri || undefined, createdAt: now, updatedAt: now }]);
    setSelectedVariantIndex(variants.length);
  };

  const handleUpdateVariant = () => {
    if (!currentBrand.trim()) { Alert.alert('Error', 'Enter a brand name'); return; }
    const priceNum = parseFloat(currentPrice);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Error', 'Enter a valid price'); return; }
    const updated = [...variants];
    const now = Date.now();
    if (priceNum !== variants[selectedVariantIndex].defaultPrice) {
      updated[selectedVariantIndex].priceHistory.push({ price: priceNum, date: now });
      const total = updated[selectedVariantIndex].priceHistory.reduce((s, r) => s + r.price, 0);
      updated[selectedVariantIndex].averagePrice = total / updated[selectedVariantIndex].priceHistory.length;
    }
    updated[selectedVariantIndex] = { ...updated[selectedVariantIndex], brand: currentBrand.trim(), defaultPrice: priceNum, imageUri: currentImageUri || updated[selectedVariantIndex].imageUri, updatedAt: now };
    setVariants(updated);
    Alert.alert('Updated', 'Brand saved');
  };

  const handleDeleteVariant = () => {
    if (variants.length <= 1) { Alert.alert('Cannot Delete', 'Need at least one brand'); return; }
    Alert.alert('Delete Brand', `Delete "${variants[selectedVariantIndex].brand}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (variants[selectedVariantIndex].imageUri) await ShoppingListStorage.deleteImageIfExists(variants[selectedVariantIndex].imageUri);
        setVariants(variants.filter((_, i) => i !== selectedVariantIndex));
        setSelectedVariantIndex(0);
      }},
    ]);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!productName.trim()) { Alert.alert('Error', 'Enter a product name'); return; }
    if (variants.length === 0) { Alert.alert('Error', 'Add at least one brand'); return; }
    setIsSaving(true);
    try {
      const now = Date.now();
      if (isEditing && originalItem) {
        await ShoppingListStorage.saveMasterItem({ ...originalItem, name: productName.trim(), variants, defaultVariantIndex: Math.min(selectedVariantIndex, variants.length - 1), updatedAt: now });
      } else {
        await ShoppingListStorage.saveMasterItem({ id: Date.now().toString(), name: productName.trim(), variants, defaultVariantIndex: 0, createdAt: now, updatedAt: now });
      }
      if (returnTo === 'SelectMasterItem' && listId) navigation.navigate('SelectMasterItem', { listId });
      else navigation.goBack();
    } catch (e) { Alert.alert('Error', 'Failed to save'); } finally { setIsSaving(false); }
  };

  const isNewBrand = selectedVariantIndex === variants.length;

  return (
    <ScrollView style={c.screen} contentContainerStyle={styles.scroll}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      <View style={styles.section}>
        <Text style={c.label}>Product Name *</Text>
        <TextInput style={c.input} value={productName} onChangeText={setProductName} placeholder="e.g., Milk" placeholderTextColor={theme.placeholder} />
      </View>

      <Text style={c.sectionTitle}>Brands</Text>

      {/* Brand tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {variants.map((v, i) => (
          <TouchableOpacity key={i} style={[c.chip, i === selectedVariantIndex && c.chipSelected]} onPress={() => setSelectedVariantIndex(i)}>
            <Text style={[c.chipText, i === selectedVariantIndex && c.chipTextSelected]}>{v.brand}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[c.chip, { backgroundColor: theme.success + '22', borderWidth: 1, borderColor: theme.success + '55' }, isNewBrand && c.chipSelected]}
          onPress={() => setSelectedVariantIndex(variants.length)}
        >
          <Text style={[c.chipText, { color: theme.success }, isNewBrand && c.chipTextSelected]}>+ Add Brand</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Brand form */}
      <View style={[styles.brandForm, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.photoBtn} onPress={async () => {
          const uri = await ShoppingListStorage.pickImage();
          if (uri) { const saved = await ShoppingListStorage.saveImage(uri, 'product'); setCurrentImageUri(saved); }
        }}>
          {currentImageUri ? <Image source={{ uri: currentImageUri }} style={styles.photo} /> : (
            <View style={[styles.photo, { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', borderRadius: 12 }]}>
              <Text style={{ fontSize: 28 }}>📷</Text>
              <Text style={[{ fontSize: 12, color: theme.textMuted, marginTop: 4 }]}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={c.label}>Brand Name *</Text>
          <TextInput style={c.input} value={currentBrand} onChangeText={setCurrentBrand} placeholder="e.g., Organic Valley" placeholderTextColor={theme.placeholder} />
        </View>
        <View style={styles.section}>
          <Text style={c.label}>Price *</Text>
          <TextInput style={c.input} value={currentPrice} onChangeText={setCurrentPrice} placeholder="0.00" placeholderTextColor={theme.placeholder} keyboardType="decimal-pad" />
        </View>

        {isNewBrand ? (
          <TouchableOpacity style={[c.primaryButton, { backgroundColor: theme.success }]} onPress={handleAddVariant}>
            <Text style={c.primaryButtonText}>Add Brand</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.variantBtns}>
            <TouchableOpacity style={[c.primaryButton, { flex: 1 }]} onPress={handleUpdateVariant}>
              <Text style={c.primaryButtonText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[c.dangerButton, { flex: 1 }]} onPress={handleDeleteVariant}>
              <Text style={c.dangerButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={[c.primaryButton, { marginTop: 8 }, isSaving && { opacity: 0.5 }]} onPress={handleSave} disabled={isSaving}>
        <Text style={c.primaryButtonText}>{isSaving ? 'Saving…' : isEditing ? 'Update Product' : 'Create Product'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  section: { marginBottom: 16 },
  tabsScroll: { marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  brandForm: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  photoBtn: { alignItems: 'center', marginBottom: 16 },
  photo: { width: 100, height: 100, borderRadius: 12 },
  variantBtns: { flexDirection: 'row', gap: 10 },
});
