// screens/ShoppingListScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { ShareListService } from '../utils/shareList';
import { ShoppingList, ShoppingListItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';
import { getCategoryEmoji } from '../utils/categories';

export default function ShoppingListScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const [list, setList] = useState<ShoppingList | null>(null);

  useFocusEffect(useCallback(() => { loadList(); }, []));

  const loadList = async () => {
    const lists = await ShoppingListStorage.getAllLists();
    setList(lists.find(l => l.id === listId) || null);
  };

  const handleShareList = async () => {
    if (!list) return;
    try { await ShareListService.exportList(list); }
    catch (error: any) { Alert.alert('Share Failed', error.message || 'Could not share this list.'); }
  };

  const handleRemoveItem = (item: ShoppingListItem) => {
    if (!list) return;
    Alert.alert('Remove Item', `Remove "${item.name}" from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updatedList = {
            ...list,
            items: list.items.filter(i => i.masterItemId !== item.masterItemId),
            updatedAt: Date.now(),
          };
          await ShoppingListStorage.saveList(updatedList);
          setList(updatedList);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const fallback = getCategoryEmoji(item.category);
    return (
      <View style={[c.card, styles.itemRow]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditMasterItem', { listId, itemId: item.masterItemId, returnTo: 'ShoppingList' })}
          activeOpacity={0.7}
        >
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={c.thumbnail} />
          ) : (
            <View style={[c.thumbnail, c.placeholder]}>
              <Text style={{ fontSize: 24 }}>{fallback}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.itemBrand, { color: theme.textMuted }]}>{item.brand}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceChip, { color: theme.accent, backgroundColor: theme.chip }]}>
              Last ${item.lastPrice.toFixed(2)}
            </Text>
            <Text style={[styles.priceChip, { color: theme.textMuted, backgroundColor: theme.chip }]}>
              Avg ${item.averagePrice.toFixed(2)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.danger + '22' }]}
          onPress={() => handleRemoveItem(item)}
        >
          <Text style={{ color: theme.danger, fontSize: 18, fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!list) return <View style={c.screen} />;

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{list.name}</Text>
          <Text style={[styles.headerSub, { color: theme.textSubtle }]}>{list.items.length} items</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: theme.accent + '20' }]}
          onPress={handleShareList}
        >
          <Text style={[styles.headerBtnText, { color: theme.accent }]}>↑ Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: theme.chip }]}
          onPress={() => navigation.navigate('SelectMasterItem', { listId })}
        >
          <Text style={[styles.headerBtnText, { color: theme.accent }]}>+ Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: theme.accent, ...makeShadow(theme, 'sm') }]}
          onPress={() => navigation.navigate('ActiveList', { listId })}
        >
          <Text style={[styles.headerBtnText, { color: theme.accentText }]}>Shop 🛒</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list.items}
        renderItem={renderItem}
        keyExtractor={item => item.masterItemId}
        contentContainerStyle={styles.listContainer}
        onRefresh={loadList}
        refreshing={false}
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🧺</Text>
            <Text style={c.emptyText}>This list is empty</Text>
            <Text style={c.emptySubtext}>Tap "+ Add" to add items</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  headerBtnText: { fontSize: 13, fontWeight: '700' },
  listContainer: { padding: 14, paddingBottom: 40 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  itemBrand: { fontSize: 13, marginBottom: 6 },
  priceRow: { flexDirection: 'row', gap: 6 },
  priceChip: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
