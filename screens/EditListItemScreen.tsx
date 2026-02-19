import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView, StatusBar } from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingListItem, MasterItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles } from '../theme/theme';

export default function EditListItemScreen({ route, navigation }: any) {
  const { listId, listItemId, masterItemId, variantIndex = 0 } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);

  const [list, setList] = useState<ShoppingList | null>(null);
  const [listItem, setListItem] = useState<ShoppingListItem | null>(null);
  const [masterItem, setMasterItem] = useState<MasterItem | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(variantIndex);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const lists = await ShoppingListStorage.getAllLists();
    const currentList = lists.find(l => l.id === listId);
    setList(currentList || null);
    if (currentList && listItemId) {
      const item = currentList.items.find(i => i.masterItemId === listItemId && i.variantIndex === selectedVariantIndex);
      if (item) { setListItem(item); setName(item.name); setBrand(item.brand); setPrice(item.lastPrice.toString()); setImageUri(item.imageUri || ''); }
    } else if (masterItemId) {
      const masterItems = await ShoppingListStorage.getAllMasterItems();
      const master = masterItems.find(i => i.id === masterItemId);
      if (master) {
        setMasterItem(master);
        const variant = master.variants[selectedVariantIndex] || master.variants[0];
        setName(master.name); setBrand(variant.brand); setPrice(variant.defaultPrice.toString()); setImageUri(variant.imageUri || '');
        setSelectedVariantIndex(master.variants.indexOf(variant));
      }
    }
  };

  const handleSave = async () => {
    if (isSaving || !list) return;
    if (!name.trim() || !brand.trim() || !price.trim()) { Alert.alert('Error', 'Please fill in all fields'); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Error', 'Invalid price'); return; }
    setIsSaving(true);
    try {
      const updatedItems = [...list.items];
      if (listItem) {
        const idx = updatedItems.findIndex(i => i.masterItemId === listItem.masterItemId && i.variantIndex === listItem.variantIndex);
        if (idx !== -1) updatedItems[idx] = { ...listItem, name: name.trim(), brand: brand.trim(), lastPrice: priceNum, imageUri: imageUri || listItem.imageUri };
      } else if (masterItem) {
        const variant = masterItem.variants[selectedVariantIndex];
        updatedItems.push({ masterItemId: masterItem.id, variantIndex: selectedVariantIndex, name: name.trim(), brand: brand.trim(), lastPrice: priceNum, priceAtAdd: priceNum, averagePrice: variant.averagePrice, imageUri: imageUri || variant.imageUri, addedAt: Date.now() });
      }
      await ShoppingListStorage.saveList({ ...list, items: updatedItems, updatedAt: Date.now() });
      navigation.goBack();
    } catch (e) { Alert.alert('Error', 'Failed to save'); } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!list || !listItem) return;
    Alert.alert('Remove Item', `Remove "${listItem.name}" from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await ShoppingListStorage.saveList({ ...list, items: list.items.filter(i => !(i.masterItemId === listItem.masterItemId && i.variantIndex === listItem.variantIndex)), updatedAt: Date.now() });
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={c.screen} contentContainerStyle={styles.scroll}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Photo */}
      <TouchableOpacity style={styles.photoBtn} onPress={async () => {
        const uri = await ShoppingListStorage.pickImage();
        if (uri) { const saved = await ShoppingListStorage.saveImage(uri, 'product'); setImageUri(saved); }
      }}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.photo} /> : (
          <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.chip, borderColor: theme.border }]}>
            <Text style={{ fontSize: 36, marginBottom: 6 }}>📷</Text>
            <Text style={[styles.photoLabel, { color: theme.textMuted }]}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Variant selector */}
      {masterItem && masterItem.variants.length > 1 && (
        <View style={styles.section}>
          <Text style={c.label}>Brand Variant</Text>
          <View style={styles.chips}>
            {masterItem.variants.map((v, i) => (
              <TouchableOpacity key={i} style={[c.chip, i === selectedVariantIndex && c.chipSelected]} onPress={() => { setSelectedVariantIndex(i); setBrand(v.brand); setPrice(v.defaultPrice.toString()); setImageUri(v.imageUri || ''); }}>
                <Text style={[c.chipText, i === selectedVariantIndex && c.chipTextSelected]}>{v.brand}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={c.label}>Item Name *</Text>
        <TextInput style={c.input} value={name} onChangeText={setName} placeholder="e.g., Milk" placeholderTextColor={theme.placeholder} />
      </View>
      <View style={styles.section}>
        <Text style={c.label}>Brand *</Text>
        <TextInput style={c.input} value={brand} onChangeText={setBrand} placeholder="e.g., Organic Valley" placeholderTextColor={theme.placeholder} />
      </View>
      <View style={styles.section}>
        <Text style={c.label}>Price *</Text>
        <TextInput style={c.input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={theme.placeholder} keyboardType="decimal-pad" />
      </View>

      <TouchableOpacity style={[c.primaryButton, { marginTop: 8 }, isSaving && { opacity: 0.5 }]} onPress={handleSave} disabled={isSaving}>
        <Text style={c.primaryButtonText}>{isSaving ? 'Saving…' : 'Save to List'}</Text>
      </TouchableOpacity>
      {listItem && (
        <TouchableOpacity style={[c.dangerButton, { marginTop: 10 }]} onPress={handleDelete}>
          <Text style={c.dangerButtonText}>Remove from List</Text>
        </TouchableOpacity>
      )}
      {masterItem && <Text style={[styles.note, { color: theme.textSubtle }]}>Changes here only affect this shopping list.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  photoBtn: { alignItems: 'center', marginBottom: 24 },
  photo: { width: 140, height: 140, borderRadius: 14 },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' },
  photoLabel: { fontSize: 13 },
  section: { marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  note: { fontSize: 13, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },
});
