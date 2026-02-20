// screens/ActiveListScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, Modal, TextInput, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingListItem, ShoppingSession, ActiveSession } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';
import { getCategoryEmoji } from '../utils/categories';

export default function ActiveListScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);

  const [list, setList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: { checked: boolean; price?: number; checkedAt: number } }>({});
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});

  // Inline price editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [actualTotal, setActualTotal] = useState(0);
  const [actualPaid, setActualPaid] = useState('');
  const [editingActual, setEditingActual] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getItemKey = (item: { masterItemId: string; variantIndex: number }) =>
    `${item.masterItemId}_${item.variantIndex}`;

  useEffect(() => {
    let isMounted = true;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Exit Shopping', 'Save progress and exit?', [
              { text: 'Keep Shopping', style: 'cancel' },
              {
                text: 'Save & Exit',
                onPress: async () => { await saveActiveSessionState(); navigation.navigate('Welcome'); },
              },
            ]);
          }}
          style={{ marginRight: 16 }}
        >
          <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '600' }}>Exit</Text>
        </TouchableOpacity>
      ),
    });
    loadActiveSession();
    const unsubscribe = navigation.addListener('focus', () => { if (isMounted) loadActiveSession(); });
    return () => { isMounted = false; unsubscribe(); };
  }, [navigation]);

  const loadActiveSession = async () => {
    setIsLoading(true);
    try {
      const activeSession = await ShoppingListStorage.getActiveSession();
      const lists = await ShoppingListStorage.getAllLists();
      const currentList = lists.find(l => l.id === listId);
      if (!currentList) { Alert.alert('Error', 'List not found'); setIsLoading(false); return; }
      setList(prev => JSON.stringify(prev) === JSON.stringify(currentList) ? prev : currentList);
      if (activeSession && activeSession.listId === listId) {
        setCheckedItems(activeSession.checkedItems || {});
        const prices: { [key: string]: number } = {};
        Object.entries(activeSession.checkedItems || {}).forEach(([k, v]) => { if (v.price) prices[k] = v.price; });
        setItemPrices(prices);
        setReceiptImage(activeSession.receiptImageUri || null);
      } else {
        setCheckedItems({}); setItemPrices({}); setReceiptImage(null);
        const newSession: ActiveSession = {
          id: Date.now().toString(), listId: currentList.id, listName: currentList.name,
          startTime: Date.now(),
          items: currentList.items.map(item => ({
            masterItemId: item.masterItemId, variantIndex: item.variantIndex,
            name: item.name, brand: item.brand, lastPrice: item.lastPrice,
            checked: false, imageUri: item.imageUri, category: item.category,
          })),
          checkedItems: {},
        };
        await ShoppingListStorage.saveActiveSession(newSession);
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const saveActiveSessionState = async (
    overrideChecked?: typeof checkedItems,
    overridePrices?: typeof itemPrices,
    overrideReceipt?: string | null,
  ) => {
    if (!list) return;
    const ch = overrideChecked ?? checkedItems;
    const pr = overridePrices ?? itemPrices;
    const rc = overrideReceipt !== undefined ? overrideReceipt : receiptImage;
    const session: ActiveSession = {
      id: Date.now().toString(), listId: list.id, listName: list.name, startTime: Date.now(),
      items: list.items.map(item => ({
        masterItemId: item.masterItemId, variantIndex: item.variantIndex,
        name: item.name, brand: item.brand, lastPrice: item.lastPrice,
        checked: ch[getItemKey(item)]?.checked || false,
        price: pr[getItemKey(item)], imageUri: item.imageUri, category: item.category,
      })),
      checkedItems: ch,
      receiptImageUri: rc || undefined,
    };
    await ShoppingListStorage.saveActiveSession(session);
  };

  // ── Tap the price chip → enter inline edit mode ──────────────────────────
  const handlePriceTap = (item: ShoppingListItem) => {
    const key = getItemKey(item);
    if (checkedItems[key]?.checked) return; // can't edit price of checked item
    const current = itemPrices[key] ?? item.lastPrice;
    setEditingKey(key);
    setEditingValue(current > 0 ? current.toFixed(2) : '');
  };

  const handlePriceCommit = async (item: ShoppingListItem) => {
    const key = getItemKey(item);
    const parsed = parseFloat(editingValue);
    const price = isNaN(parsed) || parsed < 0 ? (item.lastPrice || 0) : parsed;
    const newPrices = { ...itemPrices, [key]: price };
    // If already checked, update stored price too
    const newChecked = { ...checkedItems };
    if (newChecked[key]) newChecked[key] = { ...newChecked[key], price };
    setItemPrices(newPrices);
    setCheckedItems(newChecked);
    setEditingKey(null);
    setEditingValue('');
    await saveActiveSessionState(newChecked, newPrices);
  };

  // ── Tap the check circle → toggle checked state ──────────────────────────
  const handleToggleCheck = async (item: ShoppingListItem) => {
    const key = getItemKey(item);
    const isChecked = checkedItems[key]?.checked || false;

    if (isChecked) {
      // Uncheck — remove from checked map
      const newChecked = { ...checkedItems };
      delete newChecked[key];
      setCheckedItems(newChecked);
      await saveActiveSessionState(newChecked, itemPrices);
    } else {
      // Check — record price, add to price history
      const price = itemPrices[key] ?? item.lastPrice;
      const newPrices = { ...itemPrices, [key]: price };
      const newChecked = {
        ...checkedItems,
        [key]: { checked: true, price, checkedAt: Date.now() },
      };
      // Record to price history (session ID backfilled at save time)
      await ShoppingListStorage.addPriceToHistory(
        item.masterItemId, item.variantIndex, price, undefined, list?.name,
      );
      setItemPrices(newPrices);
      setCheckedItems(newChecked);
      await saveActiveSessionState(newChecked, newPrices);
    }
  };

  const handleCompleteShopping = async () => {
    if (!list) return;
    let estimated = 0; let actual = 0;
    list.items.forEach(item => {
      const key = getItemKey(item);
      const price = itemPrices[key] ?? item.lastPrice;
      estimated += price;
      if (checkedItems[key]?.checked) actual += price;
    });
    setEstimatedTotal(estimated); setActualTotal(actual);
    setActualPaid(actual.toFixed(2));
    setCompletionModalVisible(true);
  };

  const handleTakeReceiptPhoto = async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) {
      const saved = await ShoppingListStorage.saveImage(uri, 'receipt');
      setReceiptImage(saved);
      await saveActiveSessionState(undefined, undefined, saved);
    }
  };

  const handleSaveSession = async () => {
    if (!list) return;
    const paid = parseFloat(actualPaid) || actualTotal;
    const sessionId = Date.now().toString();

    const session: ShoppingSession = {
      id: sessionId, listId: list.id, listName: list.name, date: Date.now(),
      total: paid, calculatedTotal: actualTotal, receiptImageUri: receiptImage || undefined,
      items: list.items.map(item => ({
        masterItemId: item.masterItemId, variantIndex: item.variantIndex,
        name: item.name, brand: item.brand,
        price: itemPrices[getItemKey(item)] ?? item.lastPrice,
        checked: checkedItems[getItemKey(item)]?.checked || false,
      })),
    };

    await ShoppingListStorage.saveSession(session);

    // Backfill real session ID into price history records
    for (const item of list.items) {
      const key = getItemKey(item);
      if (checkedItems[key]?.checked && itemPrices[key] !== undefined) {
        await ShoppingListStorage.updateLatestPriceHistorySessionId(
          item.masterItemId, item.variantIndex, sessionId, receiptImage || undefined,
        );
      }
    }

    await ShoppingListStorage.clearActiveSession();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  // ── Sorted: unchecked first, checked at bottom ───────────────────────────
  const unchecked = list?.items.filter(i => !checkedItems[getItemKey(i)]?.checked) ?? [];
  const checked = list?.items.filter(i => checkedItems[getItemKey(i)]?.checked) ?? [];
  const sortedItems = [...unchecked, ...checked];

  const checkedCount = checked.length;
  const totalSoFar = Object.values(itemPrices).reduce((a, b) => a + b, 0);
  const progress = list ? checkedCount / Math.max(list.items.length, 1) : 0;

  const renderItem = ({ item, index }: { item: ShoppingListItem; index: number }) => {
    const key = getItemKey(item);
    const isChecked = checkedItems[key]?.checked || false;
    const price = itemPrices[key] ?? item.lastPrice;
    const isEditing = editingKey === key;
    const fallback = getCategoryEmoji(item.category);

    // Section divider between unchecked and checked
    const showDivider = index === unchecked.length && checked.length > 0 && unchecked.length > 0;

    return (
      <>
        {showDivider && (
          <View style={[styles.sectionDivider, { borderColor: theme.divider }]}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerLabel, { color: theme.textSubtle, backgroundColor: theme.bg }]}>
              Done ({checkedCount})
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>
        )}
        <View style={[
          c.card, styles.itemRow,
          isChecked && { opacity: 0.55, backgroundColor: theme.chip },
        ]}>
          {/* Thumbnail / category fallback */}
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={c.thumbnail} />
          ) : (
            <View style={[c.thumbnail, c.placeholder]}>
              <Text style={{ fontSize: 24 }}>{fallback}</Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={[
              styles.itemName,
              { color: isChecked ? theme.textSubtle : theme.text },
              isChecked && styles.strikethrough,
            ]}>
              {item.name}
            </Text>
            <Text style={[styles.itemBrand, { color: theme.textMuted }]}>{item.brand}</Text>

            {/* Inline price — tap to edit */}
            <TouchableOpacity
              onPress={() => handlePriceTap(item)}
              activeOpacity={isChecked ? 1 : 0.6}
              disabled={isChecked}
            >
              {isEditing ? (
                <TextInput
                  style={[styles.priceInput, {
                    color: theme.accent,
                    borderColor: theme.accent,
                    backgroundColor: theme.inputBg,
                  }]}
                  value={editingValue}
                  onChangeText={setEditingValue}
                  keyboardType="decimal-pad"
                  autoFocus
                  selectTextOnFocus
                  onBlur={() => handlePriceCommit(item)}
                  onSubmitEditing={() => handlePriceCommit(item)}
                />
              ) : (
                <View style={[styles.priceChip, { backgroundColor: theme.chip }]}>
                  <Text style={[styles.priceChipText, { color: isChecked ? theme.textSubtle : theme.accent }]}>
                    ${(price || 0).toFixed(2)}
                  </Text>
                  {!isChecked && (
                    <Text style={[styles.priceEditHint, { color: theme.textSubtle }]}> ✎</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Check button */}
          <TouchableOpacity
            style={[
              styles.checkBtn,
              {
                backgroundColor: isChecked ? theme.success : 'transparent',
                borderColor: isChecked ? theme.success : theme.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => handleToggleCheck(item)}
            activeOpacity={0.7}
          >
            {isChecked && (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>✓</Text>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  if (isLoading || !list) {
    return (
      <View style={[c.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.textMuted, fontSize: 15 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Progress header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{list.name}</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {checkedCount} / {list.items.length} · ${(totalSoFar || 0).toFixed(2)}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.chip }]}>
            <View style={[styles.progressFill, {
              backgroundColor: theme.success,
              width: `${progress * 100}%` as any,
            }]} />
          </View>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: theme.chip }]}
            onPress={() => navigation.navigate('ShoppingList', { listId })}
          >
            <Text style={[styles.smallBtnText, { color: theme.accent }]}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: theme.success }]}
            onPress={handleCompleteShopping}
          >
            <Text style={[styles.smallBtnText, { color: '#fff' }]}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sortedItems}
        renderItem={renderItem}
        keyExtractor={item => getItemKey(item)}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🧺</Text>
            <Text style={c.emptyText}>No items yet</Text>
            <TouchableOpacity
              style={[c.primaryButton, { marginTop: 16, paddingHorizontal: 24 }]}
              onPress={() => navigation.navigate('ShoppingList', { listId })}
            >
              <Text style={c.primaryButtonText}>Add Items</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Completion Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={completionModalVisible}
        onRequestClose={() => setCompletionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={c.modalOverlay}
        >
          <View style={[c.modalCard, { maxHeight: '85%' }]}>
            <Text style={c.modalTitle}>🛍️ Trip Summary</Text>

            <View style={[styles.summaryBox, { backgroundColor: theme.chip, borderColor: theme.border }]}>
              <View style={c.spaceBetween}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Estimated</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>${(estimatedTotal || 0).toFixed(2)}</Text>
              </View>
              <View style={c.divider} />
              <View style={c.spaceBetween}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Actually paid</Text>
                {editingActual ? (
                  <TextInput
                    style={[styles.paidInput, { color: theme.accent, borderColor: theme.accent }]}
                    value={actualPaid}
                    onChangeText={setActualPaid}
                    keyboardType="decimal-pad"
                    autoFocus
                    onBlur={() => setEditingActual(false)}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditingActual(true)}>
                    <Text style={[styles.summaryValue, { color: theme.accent }]}>
                      ${parseFloat(actualPaid || '0').toFixed(2)} ✎ no tax
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={c.divider} />
              <View style={c.spaceBetween}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Difference</Text>
                <Text style={[styles.summaryValue, {
                  color: parseFloat(actualPaid || '0') <= estimatedTotal ? theme.success : theme.danger,
                }]}>
                  {parseFloat(actualPaid || '0') <= estimatedTotal ? '−' : '+'}
                  ${Math.abs(estimatedTotal - parseFloat(actualPaid || '0')).toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.itemSummary, { color: theme.textSubtle }]}>
                {checkedCount} of {list.items.length} items purchased
              </Text>
            </View>

            <TouchableOpacity
              style={[c.ghostButton, { marginBottom: 10 }]}
              onPress={handleTakeReceiptPhoto}
            >
              <Text style={[c.ghostButtonText, { color: theme.accent }]}>
                {receiptImage ? '📸 Retake Receipt' : '📷 Add Receipt Photo'}
              </Text>
            </TouchableOpacity>

            {receiptImage && (
              <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
            )}

            <View style={styles.completionBtns}>
              <TouchableOpacity
                style={[c.ghostButton, { flex: 1 }]}
                onPress={() => setCompletionModalVisible(false)}
              >
                <Text style={c.ghostButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[c.primaryButton, { flex: 1, backgroundColor: theme.success }]}
                onPress={handleSaveSession}
              >
                <Text style={c.primaryButtonText}>Finish & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  headerSub: { fontSize: 13, marginBottom: 8 },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  smallBtnText: { fontSize: 13, fontWeight: '700' },
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 8,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    textTransform: 'uppercase', paddingHorizontal: 6,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  strikethrough: { textDecorationLine: 'line-through' },
  itemBrand: { fontSize: 12, marginBottom: 6 },
  priceChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  priceChipText: { fontSize: 14, fontWeight: '700' },
  priceEditHint: { fontSize: 12 },
  priceInput: {
    fontSize: 15, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1.5, minWidth: 80,
  },
  checkBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', marginLeft: 10,
  },
  summaryBox: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  itemSummary: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  paidInput: {
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    fontSize: 18, fontWeight: '700', minWidth: 90, textAlign: 'right',
  },
  receiptPreview: { width: '100%', height: 80, borderRadius: 10, marginBottom: 14 },
  completionBtns: { flexDirection: 'row', gap: 10 },
});
