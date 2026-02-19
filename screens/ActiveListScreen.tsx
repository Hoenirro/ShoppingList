// screens/ActiveListScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, Modal, TextInput, StatusBar,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingListItem, ShoppingSession, ActiveSession } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';

export default function ActiveListScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);

  const [list, setList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: { checked: boolean; price?: number; checkedAt: number } }>({});
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [actualTotal, setActualTotal] = useState(0);
  const [actualPaid, setActualPaid] = useState('');
  const [editingActual, setEditingActual] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getItemKey = (item: ShoppingListItem) => `${item.masterItemId}_${item.variantIndex}`;

  useEffect(() => {
    let isMounted = true;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Exit Shopping', 'Save progress and exit?', [
              { text: 'Keep Shopping', style: 'cancel' },
              { text: 'Save & Exit', onPress: async () => { await saveActiveSessionState(); navigation.navigate('Welcome'); } },
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
        Object.entries(activeSession.checkedItems || {}).forEach(([key, value]) => { if (value.price) prices[key] = value.price; });
        setItemPrices(prices);
        setReceiptImage(activeSession.receiptImageUri || null);
      } else {
        setCheckedItems({}); setItemPrices({}); setReceiptImage(null);
        const newSession: ActiveSession = {
          id: Date.now().toString(), listId: currentList.id, listName: currentList.name,
          startTime: Date.now(),
          items: currentList.items.map(item => ({ masterItemId: item.masterItemId, variantIndex: item.variantIndex, name: item.name, brand: item.brand, lastPrice: item.lastPrice, checked: false, imageUri: item.imageUri })),
          checkedItems: {},
        };
        await ShoppingListStorage.saveActiveSession(newSession);
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const saveActiveSessionState = async (newChecked?: typeof checkedItems, newPrices?: typeof itemPrices) => {
    if (!list) return;
    const ch = newChecked || checkedItems;
    const pr = newPrices || itemPrices;
    const session: ActiveSession = {
      id: Date.now().toString(), listId: list.id, listName: list.name, startTime: Date.now(),
      items: list.items.map(item => ({ masterItemId: item.masterItemId, variantIndex: item.variantIndex, name: item.name, brand: item.brand, lastPrice: item.lastPrice, checked: ch[getItemKey(item)]?.checked || false, price: pr[getItemKey(item)], imageUri: item.imageUri })),
      checkedItems: ch, receiptImageUri: receiptImage || undefined,
    };
    await ShoppingListStorage.saveActiveSession(session);
  };

  const handleItemPress = (item: ShoppingListItem) => {
    setSelectedItem(item);
    setPriceInput(itemPrices[getItemKey(item)]?.toString() || item.lastPrice.toString());
    setPriceModalVisible(true);
  };

  const handlePriceSubmit = async () => {
    if (!selectedItem || !list) return;
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) { Alert.alert('Error', 'Please enter a valid price'); return; }
    const itemKey = getItemKey(selectedItem);
    // Pass undefined for listId here — we'll update price history with the
    // real session ID once the session is saved at the end of shopping
    await ShoppingListStorage.addPriceToHistory(selectedItem.masterItemId, selectedItem.variantIndex, price, undefined, list.name, receiptImage || undefined);
    const newChecked = { ...checkedItems, [itemKey]: { checked: true, price, checkedAt: Date.now() } };
    const newPrices = { ...itemPrices, [itemKey]: price };
    setCheckedItems(newChecked); setItemPrices(newPrices);
    await saveActiveSessionState(newChecked, newPrices);
    setPriceModalVisible(false); setSelectedItem(null); setPriceInput('');
  };

  const handleTakeReceiptPhoto = async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) { const saved = await ShoppingListStorage.saveImage(uri, 'receipt'); setReceiptImage(saved); await saveActiveSessionState(); }
  };

  const handleCompleteShopping = async () => {
    if (!list) return;
    let estimated = 0; let actual = 0;
    list.items.forEach(item => {
      const key = getItemKey(item);
      const price = itemPrices[key] || item.lastPrice;
      estimated += price;
      if (checkedItems[key]?.checked) actual += price;
    });
    setEstimatedTotal(estimated); setActualTotal(actual); setActualPaid(actual.toFixed(2));
    setCompletionModalVisible(true);
  };

  const handleSaveSession = async () => {
    if (!list) return;
    const paid = parseFloat(actualPaid) || actualTotal;

    // Generate session ID once — used for both the session and price history records
    const sessionId = Date.now().toString();

    const session: ShoppingSession = {
      id: sessionId, listId: list.id, listName: list.name, date: Date.now(),
      total: paid, calculatedTotal: actualTotal, receiptImageUri: receiptImage || undefined,
      items: list.items.map(item => ({ masterItemId: item.masterItemId, variantIndex: item.variantIndex, name: item.name, brand: item.brand, price: itemPrices[getItemKey(item)] || item.lastPrice, checked: checkedItems[getItemKey(item)]?.checked || false })),
    };

    await ShoppingListStorage.saveSession(session);

    // Now go back and update price history records for all checked items
    // with the real session ID so "View Trip" links work correctly
    for (const item of list.items) {
      const key = getItemKey(item);
      const checked = checkedItems[key]?.checked;
      const price = itemPrices[key];
      if (checked && price !== undefined) {
        await ShoppingListStorage.updateLatestPriceHistorySessionId(
          item.masterItemId,
          item.variantIndex,
          sessionId,
          receiptImage || undefined,
        );
      }
    }

    await ShoppingListStorage.clearActiveSession();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const checkedCount = Object.values(checkedItems).filter(i => i.checked).length;
  const totalSoFar = Object.values(itemPrices).reduce((a, b) => a + b, 0);
  const progress = list ? checkedCount / Math.max(list.items.length, 1) : 0;

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const key = getItemKey(item);
    const isChecked = checkedItems[key]?.checked || false;
    const price = itemPrices[key] || item.lastPrice;
    return (
      <TouchableOpacity
        style={[c.card, styles.itemRow, isChecked && { opacity: 0.55, backgroundColor: theme.chip }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={c.thumbnail} />
        ) : (
          <View style={[c.thumbnail, c.placeholder]}>
            <Text style={{ fontSize: 22 }}>📷</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: isChecked ? theme.textSubtle : theme.text }, isChecked && styles.strikethrough]}>
            {item.name}
          </Text>
          <Text style={[styles.itemBrand, { color: theme.textMuted }]}>{item.brand}</Text>
          <Text style={[styles.itemPrice, { color: theme.accent }]}>${(price || 0).toFixed(2)}</Text>
        </View>
        {isChecked ? (
          <View style={[styles.checkCircle, { backgroundColor: theme.success }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓</Text>
          </View>
        ) : (
          <View style={[styles.checkCircle, { backgroundColor: theme.chip, borderWidth: 2, borderColor: theme.border }]} />
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading || !list) {
    return <View style={[c.screen, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: theme.textMuted, fontSize: 15 }}>Loading…</Text>
    </View>;
  }

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{list.name}</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {checkedCount} / {list.items.length} · ${(totalSoFar || 0).toFixed(2)}
          </Text>
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: theme.chip }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.success, width: `${progress * 100}%` as any }]} />
          </View>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: theme.chip }]} onPress={() => navigation.navigate('SelectMasterItem', { listId })}>
            <Text style={[styles.smallBtnText, { color: theme.accent }]}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: theme.success }]} onPress={handleCompleteShopping}>
            <Text style={[styles.smallBtnText, { color: '#fff' }]}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={list.items}
        renderItem={renderItem}
        keyExtractor={getItemKey}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🧺</Text>
            <Text style={c.emptyText}>No items yet</Text>
            <TouchableOpacity style={[c.primaryButton, { marginTop: 16, paddingHorizontal: 24 }]} onPress={() => navigation.navigate('SelectMasterItem', { listId })}>
              <Text style={c.primaryButtonText}>Add Items</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Price Entry Modal */}
      <Modal animationType="slide" transparent visible={priceModalVisible} onRequestClose={() => setPriceModalVisible(false)}>
        <View style={c.modalOverlay}>
          <View style={c.modalCard}>
            <Text style={c.modalTitle}>Confirm Price</Text>
            <Text style={[styles.modalSub, { color: theme.textMuted }]}>{selectedItem?.name} · {selectedItem?.brand}</Text>
            <TextInput
              style={[c.input, { marginBottom: 20, fontSize: 28, textAlign: 'center', fontWeight: '700', color: theme.accent }]}
              placeholder="0.00"
              placeholderTextColor={theme.placeholder}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[c.ghostButton, { flex: 1 }]} onPress={() => { setPriceModalVisible(false); setSelectedItem(null); }}>
                <Text style={c.ghostButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[c.primaryButton, { flex: 1 }]} onPress={handlePriceSubmit}>
                <Text style={c.primaryButtonText}>✓ Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal animationType="slide" transparent visible={completionModalVisible} onRequestClose={() => setCompletionModalVisible(false)}>
        <View style={c.modalOverlay}>
          <View style={[c.modalCard, { maxHeight: '85%' }]}>
            <Text style={c.modalTitle}>🛍️ Trip Summary</Text>

            <View style={[styles.summaryBox, { backgroundColor: theme.chip, borderColor: theme.border }]}>
              <View style={c.spaceBetween}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Estimated</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>${(estimatedTotal || 0).toFixed(2)}</Text>
              </View>
              <View style={[c.divider]} />
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
                    <Text style={[styles.summaryValue, { color: theme.accent }]}>${parseFloat(actualPaid || '0').toFixed(2)} ✎</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[c.divider]} />
              <View style={c.spaceBetween}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Difference</Text>
                <Text style={[styles.summaryValue, { color: parseFloat(actualPaid || '0') <= estimatedTotal ? theme.success : theme.danger }]}>
                  {parseFloat(actualPaid || '0') <= estimatedTotal ? '−' : '+'}${Math.abs(estimatedTotal - parseFloat(actualPaid || '0')).toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.itemSummary, { color: theme.textSubtle }]}>{checkedCount} of {list.items.length} items purchased</Text>
            </View>

            <TouchableOpacity style={[c.ghostButton, { marginBottom: 10 }]} onPress={handleTakeReceiptPhoto}>
              <Text style={[c.ghostButtonText, { color: theme.accent }]}>{receiptImage ? '📸 Retake Receipt' : '📷 Add Receipt Photo'}</Text>
            </TouchableOpacity>

            {receiptImage && <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />}

            <View style={styles.completionBtns}>
              <TouchableOpacity style={[c.ghostButton, { flex: 1 }]} onPress={() => setCompletionModalVisible(false)}>
                <Text style={c.ghostButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[c.primaryButton, { flex: 1, backgroundColor: theme.success }]} onPress={handleSaveSession}>
                <Text style={c.primaryButtonText}>Finish & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  strikethrough: { textDecorationLine: 'line-through' },
  itemBrand: { fontSize: 12, marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  checkCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 16, marginTop: -8 },
  summaryBox: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  itemSummary: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  paidInput: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 18, fontWeight: '700', minWidth: 90, textAlign: 'right' },
  receiptPreview: { width: '100%', height: 80, borderRadius: 10, marginBottom: 14 },
  completionBtns: { flexDirection: 'row', gap: 10 },
});
