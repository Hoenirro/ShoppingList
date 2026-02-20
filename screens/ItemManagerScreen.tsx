// screens/ItemManagerScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, TextInput, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles } from '../theme/theme';
import { getCategoryEmoji } from '../utils/categories';

export default function ItemManagerScreen({ navigation }: any) {
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(useCallback(() => { loadItems(); }, []));

  const loadItems = async () => setItems(await ShoppingListStorage.getAllMasterItems());

  const handleDeleteItem = (item: MasterItem) => {
    Alert.alert('Delete Product', `Delete "${item.name}" and all its brands?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await ShoppingListStorage.deleteMasterItem(item.id); loadItems(); },
      },
    ]);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.variants.some(v => v.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item }: { item: MasterItem }) => {
    const defaultVariant = item.variants[item.defaultVariantIndex || 0];
    const lowestPrice = Math.min(...item.variants.map(v => v.defaultPrice || 0));
    const avgPrice = item.variants.reduce((s, v) => s + (v.averagePrice || 0), 0) / item.variants.length;
    const fallback = getCategoryEmoji(item.category);

    return (
      <View style={[c.card, styles.itemRow]}>
        <TouchableOpacity onPress={() => navigation.navigate('PriceHistory', { masterItemId: item.id, itemName: item.name })}>
          {defaultVariant?.imageUri ? (
            <Image source={{ uri: defaultVariant.imageUri }} style={c.thumbnail} />
          ) : (
            <View style={[c.thumbnail, c.placeholder]}>
              <Text style={{ fontSize: 24 }}>{fallback}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.itemSub, { color: theme.textMuted }]}>
            {item.category ? `${item.category} · ` : ''}{item.variants.length} brand{item.variants.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceTag, { color: theme.accent, backgroundColor: theme.chip }]}>
              From ${lowestPrice.toFixed(2)}
            </Text>
            <Text style={[styles.priceTag, { color: theme.textMuted, backgroundColor: theme.chip }]}>
              Avg ${avgPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.success + '22' }]}
            onPress={() => navigation.navigate('PriceHistory', { masterItemId: item.id, itemName: item.name })}
          >
            <Text style={{ fontSize: 14 }}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.chip }]}
            onPress={() => navigation.navigate('EditMasterItem', { itemId: item.id, returnTo: 'ItemManager' })}
          >
            <Text style={{ color: theme.textMuted, fontSize: 14 }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.danger + '22' }]}
            onPress={() => handleDeleteItem(item)}
          >
            <Text style={{ fontSize: 14 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <TextInput
          style={[c.input, { flex: 1, marginRight: 10 }]}
          placeholder="Search items or brands…"
          placeholderTextColor={theme.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[c.primaryButton, { paddingHorizontal: 16 }]}
          onPress={() => navigation.navigate('EditMasterItem', { returnTo: 'ItemManager' })}
        >
          <Text style={c.primaryButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
            <Text style={c.emptyText}>{searchQuery ? 'No results' : 'No products yet'}</Text>
            <Text style={c.emptySubtext}>{searchQuery ? 'Try a different search' : 'Tap "+ New" to create one'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  itemSub: { fontSize: 12, marginBottom: 6 },
  priceRow: { flexDirection: 'row', gap: 6 },
  priceTag: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actions: { flexDirection: 'column', gap: 6, marginLeft: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
