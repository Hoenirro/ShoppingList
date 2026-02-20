// screens/EditMasterItemScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  Alert, ScrollView, StatusBar, Modal, FlatList,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem, BrandVariant } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles } from '../theme/theme';
import { BUILT_IN_CATEGORIES, EMOJI_PALETTE, getCategoryEmoji } from '../utils/categories';

export default function EditMasterItemScreen({ route, navigation }: any) {
  const { itemId, returnTo, listId } = route.params || {};
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const isEditing = !!itemId;

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [variants, setVariants] = useState<BrandVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [originalItem, setOriginalItem] = useState<MasterItem | null>(null);
  const [currentBrand, setCurrentBrand] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentImageUri, setCurrentImageUri] = useState('');

  // Category picker modal
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  // Custom category sub-state
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🛒');

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
    if (item) {
      setOriginalItem(item);
      setProductName(item.name);
      setCategory(item.category);
      setVariants(item.variants || []);
      setSelectedVariantIndex(item.defaultVariantIndex || 0);
    }
  };

  const handleAddVariant = () => {
    if (!currentBrand.trim()) { Alert.alert('Error', 'Enter a brand name'); return; }
    const priceNum = parseFloat(currentPrice);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Error', 'Enter a valid price'); return; }
    const now = Date.now();
    setVariants([...variants, {
      brand: currentBrand.trim(), defaultPrice: priceNum, averagePrice: priceNum,
      priceHistory: [{ price: priceNum, date: now }],
      imageUri: currentImageUri || undefined, createdAt: now, updatedAt: now,
    }]);
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
    updated[selectedVariantIndex] = {
      ...updated[selectedVariantIndex],
      brand: currentBrand.trim(), defaultPrice: priceNum,
      imageUri: currentImageUri || updated[selectedVariantIndex].imageUri, updatedAt: now,
    };
    setVariants(updated);
    Alert.alert('Updated', 'Brand saved');
  };

  const handleDeleteVariant = () => {
    if (variants.length <= 1) { Alert.alert('Cannot Delete', 'Need at least one brand'); return; }
    Alert.alert('Delete Brand', `Delete "${variants[selectedVariantIndex].brand}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (variants[selectedVariantIndex].imageUri)
            await ShoppingListStorage.deleteImageIfExists(variants[selectedVariantIndex].imageUri);
          setVariants(variants.filter((_, i) => i !== selectedVariantIndex));
          setSelectedVariantIndex(0);
        },
      },
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
        await ShoppingListStorage.saveMasterItem({
          ...originalItem, name: productName.trim(), category,
          variants, defaultVariantIndex: Math.min(selectedVariantIndex, variants.length - 1), updatedAt: now,
        });
      } else {
        await ShoppingListStorage.saveMasterItem({
          id: Date.now().toString(), name: productName.trim(), category,
          variants, defaultVariantIndex: 0, createdAt: now, updatedAt: now,
        });
      }
      navigation.goBack();
    } catch (e) { Alert.alert('Error', 'Failed to save'); } finally { setIsSaving(false); }
  };

  const handleSelectBuiltIn = (label: string) => {
    setCategory(label);
    setCategoryModalVisible(false);
    setCustomMode(false);
  };

  const handleSaveCustom = () => {
    if (!customName.trim()) { Alert.alert('Error', 'Enter a category name'); return; }
    setCategory(`${customEmoji} ${customName.trim()}`);
    setCategoryModalVisible(false);
    setCustomMode(false);
    setCustomName('');
  };

  const isNewBrand = selectedVariantIndex === variants.length;

  return (
    <ScrollView style={c.screen} contentContainerStyle={styles.scroll}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Product name */}
      <View style={styles.section}>
        <Text style={c.label}>Product Name *</Text>
        <TextInput
          style={c.input} value={productName} onChangeText={setProductName}
          placeholder="e.g., Milk" placeholderTextColor={theme.placeholder}
        />
      </View>

      {/* Category picker */}
      <View style={styles.section}>
        <Text style={c.label}>Category</Text>
        <TouchableOpacity
          style={[styles.categoryBtn, { backgroundColor: theme.chip, borderColor: theme.border }]}
          onPress={() => { setCustomMode(false); setCategoryModalVisible(true); }}
        >
          <Text style={{ fontSize: 20, marginRight: 8 }}>
            {category ? getCategoryEmoji(category) : '📦'}
          </Text>
          <Text style={[styles.categoryBtnText, { color: category ? theme.text : theme.placeholder }]}>
            {category ?? 'Choose a category (optional)'}
          </Text>
          {category && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); setCategory(undefined); }}
              style={styles.clearCategory}
            >
              <Text style={[styles.clearCategoryText, { color: theme.textSubtle }]}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
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
            <View style={[styles.photo, {
              backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 2,
              borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', borderRadius: 12,
            }]}>
              <Text style={{ fontSize: 28 }}>📷</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={c.label}>Brand Name *</Text>
          <TextInput style={c.input} value={currentBrand} onChangeText={setCurrentBrand}
            placeholder="e.g., Organic Valley" placeholderTextColor={theme.placeholder} />
        </View>
        <View style={styles.section}>
          <Text style={c.label}>Price *</Text>
          <TextInput style={c.input} value={currentPrice} onChangeText={setCurrentPrice}
            placeholder="0.00" placeholderTextColor={theme.placeholder} keyboardType="decimal-pad" />
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

      <TouchableOpacity
        style={[c.primaryButton, { marginTop: 8 }, isSaving && { opacity: 0.5 }]}
        onPress={handleSave} disabled={isSaving}
      >
        <Text style={c.primaryButtonText}>
          {isSaving ? 'Saving…' : isEditing ? 'Update Product' : 'Create Product'}
        </Text>
      </TouchableOpacity>

      {/* ── Category picker modal ── */}
      <Modal visible={categoryModalVisible} transparent animationType="slide" onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={c.modalOverlay}>
          <View style={[c.modalCard, { maxHeight: '80%' }]}>
            {!customMode ? (
              <>
                <Text style={c.modalTitle}>Choose Category</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Built-in options */}
                  <View style={styles.categoryGrid}>
                    {BUILT_IN_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.label}
                        style={[styles.catOption, {
                          backgroundColor: category === cat.label ? theme.chipSelected : theme.chip,
                          borderColor: category === cat.label ? theme.accent : theme.border,
                        }]}
                        onPress={() => handleSelectBuiltIn(cat.label)}
                      >
                        <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                        <Text style={[styles.catOptionText, {
                          color: category === cat.label ? theme.chipSelectedText : theme.chipText,
                        }]}>
                          {cat.label.replace(/^\S+\s/, '')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Custom option */}
                  <TouchableOpacity
                    style={[styles.customBtn, { backgroundColor: theme.chip, borderColor: theme.border }]}
                    onPress={() => setCustomMode(true)}
                  >
                    <Text style={{ fontSize: 20, marginRight: 8 }}>✏️</Text>
                    <Text style={[styles.customBtnText, { color: theme.accent }]}>Create custom category…</Text>
                  </TouchableOpacity>
                </ScrollView>

                <TouchableOpacity style={[c.ghostButton, { marginTop: 14 }]} onPress={() => setCategoryModalVisible(false)}>
                  <Text style={c.ghostButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Custom category creator */
              <>
                <TouchableOpacity onPress={() => setCustomMode(false)} style={styles.backBtn}>
                  <Text style={[styles.backBtnText, { color: theme.accent }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={c.modalTitle}>Custom Category</Text>

                <Text style={c.label}>Name</Text>
                <TextInput
                  style={[c.input, { marginBottom: 16 }]}
                  value={customName} onChangeText={setCustomName}
                  placeholder="e.g., Spices" placeholderTextColor={theme.placeholder}
                  autoFocus
                />

                <Text style={c.label}>Pick an emoji</Text>
                <View style={{ height: 200, marginBottom: 16 }}>
                  <FlatList
                    data={EMOJI_PALETTE}
                    numColumns={8}
                    keyExtractor={(e, i) => `${e}_${i}`}
                    renderItem={({ item: emoji }) => (
                      <TouchableOpacity
                        style={[styles.emojiCell, customEmoji === emoji && { backgroundColor: theme.chipSelected, borderRadius: 8 }]}
                        onPress={() => setCustomEmoji(emoji)}
                      >
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[c.ghostButton, { flex: 1 }]} onPress={() => setCustomMode(false)}>
                    <Text style={c.ghostButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[c.primaryButton, { flex: 1 }]} onPress={handleSaveCustom}>
                    <Text style={c.primaryButtonText}>{customEmoji} Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  section: { marginBottom: 16 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  categoryBtnText: { flex: 1, fontSize: 15 },
  clearCategory: { padding: 4 },
  clearCategoryText: { fontSize: 14 },
  tabsScroll: { marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  brandForm: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  photoBtn: { alignItems: 'center', marginBottom: 16 },
  photo: { width: 100, height: 100, borderRadius: 12 },
  variantBtns: { flexDirection: 'row', gap: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  catOption: {
    width: '30%', alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, gap: 4,
  },
  catOptionText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 12, borderWidth: 1, marginBottom: 4,
  },
  customBtnText: { fontSize: 15, fontWeight: '600' },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  emojiCell: { width: '12.5%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
});
