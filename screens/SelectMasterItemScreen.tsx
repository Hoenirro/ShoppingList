import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Alert, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles } from '../theme/theme';

export default function SelectMasterItemScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    loadItems();
    loadCurrentListItems();
  }, []));

  const loadCurrentListItems = async () => {
    const lists = await ShoppingListStorage.getAllLists();
    const list = lists.find(l => l.id === listId);
    if (list) setAddedItemIds(new Set(list.items.map(i => i.masterItemId)));
  };

  const loadItems = async () => setItems(await ShoppingListStorage.getAllMasterItems());

  const handleAddItem = async (item: MasterItem) => {
    if (addedItemIds.has(item.id)) { Alert.alert('Already Added', `${item.name} is already in this list`); return; }
    if (item.variants.length > 1) { navigation.navigate('EditListItem', { listId, masterItemId: item.id, variantIndex: 0 }); return; }
    await ShoppingListStorage.addMasterItemToList(listId, item.id, 0);
    setAddedItemIds(prev => new Set(prev).add(item.id));
    if (route.params?.onGoBack) route.params.onGoBack();
  };

  const handleRemoveItem = async (item: MasterItem) => {
    Alert.alert('Remove Item', `Remove "${item.name}" from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const lists = await ShoppingListStorage.getAllLists();
          const list = lists.find(l => l.id === listId);
          if (list) {
            await ShoppingListStorage.saveList({ ...list, items: list.items.filter(i => i.masterItemId !== item.id), updatedAt: Date.now() });
            setAddedItemIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
          }
        },
      },
    ]);
  };

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.variants.some(v => v.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item }: { item: MasterItem }) => {
    const isAdded = addedItemIds.has(item.id);
    const defaultVariant = item.variants[item.defaultVariantIndex || 0];
    const lowestPrice = item.variants.length > 0 ? Math.min(...item.variants.map(v => v.defaultPrice || 0)) : 0;

    return (
      <View style={[c.card, styles.row, isAdded && { opacity: 0.7 }]}>
        {defaultVariant?.imageUri ? (
          <Image source={{ uri: defaultVariant.imageUri }} style={c.thumbnail} />
        ) : (
          <View style={[c.thumbnail, c.placeholder]}><Text style={{ fontSize: 22 }}>📦</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: isAdded ? theme.textSubtle : theme.text }]}>{item.name}</Text>
          <Text style={[styles.itemSub, { color: theme.textMuted }]} numberOfLines={1}>
            {item.variants.map(v => v.brand).join(', ')}
          </Text>
          <Text style={[styles.itemPrice, { color: theme.accent }]}>From ${lowestPrice.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: isAdded ? theme.danger + '22' : theme.success + '22' }]}
          onPress={() => isAdded ? handleRemoveItem(item) : handleAddItem(item)}
        >
          <Text style={[styles.toggleBtnText, { color: isAdded ? theme.danger : theme.success }]}>
            {isAdded ? '−' : '+'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <TextInput style={[c.input, { flex: 1, marginRight: 10 }]} placeholder="Search…" placeholderTextColor={theme.placeholder} value={searchQuery} onChangeText={setSearchQuery} />
        <TouchableOpacity style={[c.primaryButton, { paddingHorizontal: 14 }]} onPress={() => navigation.navigate('EditMasterItem', { returnTo: 'SelectMasterItem', listId })}>
          <Text style={c.primaryButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={c.emptyText}>{searchQuery ? 'No results' : 'No products yet'}</Text>
            <Text style={c.emptySubtext}>Create products first in Item Manager</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  itemSub: { fontSize: 12, marginBottom: 4 },
  itemPrice: { fontSize: 13, fontWeight: '600' },
  toggleBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  toggleBtnText: { fontSize: 24, fontWeight: '600', lineHeight: 28 },
});
