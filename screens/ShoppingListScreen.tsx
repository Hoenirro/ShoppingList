// screens/ShoppingListScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Alert, StatusBar, Animated, Dimensions, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { ShareListService } from '../utils/shareList';
import { ShoppingList, ShoppingListItem, MasterItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';
import { getCategoryEmoji } from '../utils/categories';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.62;

export default function ShoppingListScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);

  const [list, setList] = useState<ShoppingList | null>(null);

  // ── Panel state ──────────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown

  // ── Item picker state ────────────────────────────────────────────────────
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    loadList();
  }, []));

  const loadList = async () => {
    const lists = await ShoppingListStorage.getAllLists();
    const found = lists.find(l => l.id === listId) || null;
    setList(found);
    if (found) setAddedItemIds(new Set(found.items.map(i => i.masterItemId)));
  };

  const loadMasterItems = async () => {
    setMasterItems(await ShoppingListStorage.getAllMasterItems());
  };

  // ── Panel open/close ─────────────────────────────────────────────────────
  const openPanel = () => {
    loadMasterItems();
    setSearchQuery('');
    setExpandedItemId(null);
    setPanelOpen(true);
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closePanel = () => {
    Animated.spring(panelAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start(() => {
      setPanelOpen(false);
      setSearchQuery('');
      setExpandedItemId(null);
    });
  };

  const togglePanel = () => panelOpen ? closePanel() : openPanel();

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });
  const fabTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -PANEL_HEIGHT], // El FAB se mueve hacia arriba cuando el panel se abre
  });

  // ── List actions ─────────────────────────────────────────────────────────
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
          const updatedList = { ...list, items: list.items.filter(i => i.masterItemId !== item.masterItemId), updatedAt: Date.now() };
          await ShoppingListStorage.saveList(updatedList);
          setList(updatedList);
          setAddedItemIds(new Set(updatedList.items.map(i => i.masterItemId)));
        },
      },
    ]);
  };

  // ── Picker actions ───────────────────────────────────────────────────────
  const handleAddVariant = async (item: MasterItem, variantIndex: number) => {
    await ShoppingListStorage.addMasterItemToList(listId, item.id, variantIndex);
    setExpandedItemId(null);
    await loadList(); // refresh list + addedItemIds
  };

  const handlePlusTap = (item: MasterItem) => {
    if (addedItemIds.has(item.id)) {
      Alert.alert('Already Added', `${item.name} is already in this list`);
      return;
    }
    if (item.variants.length > 1) {
      setExpandedItemId(prev => prev === item.id ? null : item.id);
      return;
    }
    handleAddVariant(item, 0);
  };

  const handlePickerRemove = async (item: MasterItem) => {
    if (!list) return;
    const updatedList = { ...list, items: list.items.filter(i => i.masterItemId !== item.id), updatedAt: Date.now() };
    await ShoppingListStorage.saveList(updatedList);
    setList(updatedList);
    setAddedItemIds(new Set(updatedList.items.map(i => i.masterItemId)));
  };

  // ── Filtered master items ────────────────────────────────────────────────
  const filteredMasterItems = masterItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.variants.some(v => v.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Render: current list item ────────────────────────────────────────────
  const renderListItem = ({ item }: { item: ShoppingListItem }) => {
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

  // ── Render: picker row ───────────────────────────────────────────────────
  const renderPickerItem = ({ item }: { item: MasterItem }) => {
    const isAdded = addedItemIds.has(item.id);
    const isExpanded = expandedItemId === item.id;
    const defaultVariant = item.variants[item.defaultVariantIndex || 0];
    const lowestPrice = item.variants.length > 0 ? Math.min(...item.variants.map(v => v.defaultPrice || 0)) : 0;
    const fallback = getCategoryEmoji(item.category);

    return (
      <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.pickerRow}>
          {/* Thumbnail → edit product */}
          <TouchableOpacity
            onPress={() => {
              closePanel();
              navigation.navigate('EditMasterItem', { itemId: item.id, returnTo: 'SelectMasterItem', listId });
            }}
            activeOpacity={0.7}
          >
            {defaultVariant?.imageUri ? (
              <Image source={{ uri: defaultVariant.imageUri }} style={c.thumbnail} />
            ) : (
              <View style={[c.thumbnail, c.placeholder]}>
                <Text style={{ fontSize: 22 }}>{fallback}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.pickerName, { color: isAdded ? theme.textSubtle : theme.text }]}>{item.name}</Text>
            <Text style={[styles.pickerSub, { color: theme.textMuted }]} numberOfLines={1}>
              {item.variants.map(v => v.brand).join(', ')}
            </Text>
            <Text style={[styles.pickerPrice, { color: theme.accent }]}>From ${lowestPrice.toFixed(2)}</Text>
          </View>

          {/* + / − */}
          <TouchableOpacity
            style={[styles.toggleBtn, {
              backgroundColor: isAdded ? theme.danger + '22' : isExpanded ? theme.accent + '22' : theme.success + '22',
            }]}
            onPress={() => isAdded ? handlePickerRemove(item) : handlePlusTap(item)}
          >
            <Text style={[styles.toggleBtnText, {
              color: isAdded ? theme.danger : isExpanded ? theme.accent : theme.success,
            }]}>
              {isAdded ? '−' : '+'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline brand bubble picker */}
        {isExpanded && (
          <View style={styles.brandPicker}>
            {item.variants.map((v, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.brandBubble, { backgroundColor: theme.chip, borderColor: theme.border }]}
                onPress={() => handleAddVariant(item, i)}
                activeOpacity={0.75}
              >
                <Text style={[styles.brandBubbleName, { color: theme.text }]}>{v.brand}</Text>
                <Text style={[styles.brandBubblePrice, { color: theme.accent }]}>${v.defaultPrice.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!list) return <View style={c.screen} />;

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Header */}
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
          style={[styles.headerBtn, { backgroundColor: theme.accent, ...makeShadow(theme, 'sm') }]}
          onPress={() => navigation.navigate('ActiveList', { listId })}
        >
          <Text style={[styles.headerBtnText, { color: theme.accentText }]}>Shop 🛒</Text>
        </TouchableOpacity>
      </View>

      {/* Current list */}
      <FlatList
        data={list.items}
        renderItem={renderListItem}
        keyExtractor={item => item.masterItemId}
        contentContainerStyle={styles.listContainer}
        onRefresh={loadList}
        refreshing={false}
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🧺</Text>
            <Text style={c.emptyText}>This list is empty</Text>
            <Text style={c.emptySubtext}>Tap + to add items</Text>
          </View>
        }
      />

      {/* Scrim — tap to close panel */}
      {panelOpen && (
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={closePanel}
        />
      )}

      {/* Sliding bottom panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            height: PANEL_HEIGHT,
            transform: [{ translateY: panelTranslateY }],
          },
        ]}
        pointerEvents={panelOpen ? 'auto' : 'none'}
      >
        {/* Panel handle */}
        <View style={[styles.panelHandle, { backgroundColor: theme.divider }]} />

        {/* Search + New */}
        <View style={[styles.panelSearch, { borderBottomColor: theme.divider }]}>
          <TextInput
            style={[c.input, { flex: 1, marginRight: 10 }]}
            placeholder="Search products…"
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={[c.primaryButton, { paddingHorizontal: 14 }]}
            onPress={() => {
              closePanel();
              navigation.navigate('EditMasterItem', { returnTo: 'SelectMasterItem', listId });
            }}
          >
            <Text style={c.primaryButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Master item list */}
        <FlatList
          data={filteredMasterItems}
          keyExtractor={item => item.id}
          renderItem={renderPickerItem}
          contentContainerStyle={styles.pickerList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={[c.emptyContainer, { paddingVertical: 30 }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
              <Text style={c.emptyText}>{searchQuery ? 'No results' : 'No products yet'}</Text>
              <Text style={c.emptySubtext}>Tap "+ New" to create one</Text>
            </View>
          }
        />
      </Animated.View>

      {/* FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ translateY: fabTranslateY }],
            zIndex: 30, // Se mantiene sobre el panel
          },
        ]}
        pointerEvents="box-none" // Permite que los toques pasen a través del contenedor
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent, ...makeShadow(theme, 'lg') }]}
          onPress={togglePanel}
          activeOpacity={0.85}
        >
          <Text style={[styles.fabText, { color: theme.accentText }]}>
            {panelOpen ? '↓' : '+'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  headerBtnText: { fontSize: 13, fontWeight: '700' },
  listContainer: { padding: 14, paddingBottom: 120 },
  fabContainer: { position: 'absolute', bottom: 28, right: 22, alignItems: 'center', justifyContent: 'center' },

  // List items
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  itemBrand: { fontSize: 13, marginBottom: 6 },
  priceRow: { flexDirection: 'row', gap: 6 },
  priceChip: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  // Scrim
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 10 },

  // Panel
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    zIndex: 20,
    overflow: 'hidden',
  },
  panelHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  panelSearch: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  pickerList: { padding: 12, paddingBottom: 40 },

  // Picker rows
  pickerCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  pickerName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pickerSub: { fontSize: 12, marginBottom: 3 },
  pickerPrice: { fontSize: 12, fontWeight: '600' },
  toggleBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  toggleBtnText: { fontSize: 22, fontWeight: '600', lineHeight: 26 },

  // Brand bubbles
  brandPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, paddingLeft: 4 },
  brandBubble: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  brandBubbleName: { fontSize: 13, fontWeight: '600' },
  brandBubblePrice: { fontSize: 12, fontWeight: '500', marginTop: 1 },

  // FAB
  fab: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', zIndex: 30 },
  fabText: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
