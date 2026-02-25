// screens/ActiveListScreen.tsx
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, Modal, TextInput, StatusBar, KeyboardAvoidingView, Platform, Animated,
  LayoutAnimation, UIManager,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingListItem, ShoppingSession, ActiveSession } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';
import { getCategoryEmoji } from '../utils/categories';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Custom layout animation for smooth item movement
const ITEM_MOVE_ANIMATION = {
  duration: 400,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.7,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Memoized row — only re-renders when its own data changes
// ─────────────────────────────────────────────────────────────────────────────
interface RowProps {
  item: ShoppingListItem;
  isChecked: boolean;
  isPending: boolean;
  pendingProgress: Animated.Value | undefined;
  price: number;
  isEditing: boolean;
  editingValue: string;
  showDivider: boolean;
  checkedCount: number;
  theme: any;
  c: any;
  listId: string;
  onToggleCheck: (item: ShoppingListItem) => void;
  onPriceTap: (item: ShoppingListItem) => void;
  onPriceChange: (v: string) => void;
  onPriceCommit: (item: ShoppingListItem) => void;
  onEditItem: (item: ShoppingListItem) => void;
  isMoving?: boolean;
  moveAnim?: Animated.Value;
}

const ShoppingListRow = memo(({
  item, isChecked, isPending, pendingProgress, price, isEditing, editingValue,
  showDivider, checkedCount, theme, c,
  onToggleCheck, onPriceTap, onPriceChange, onPriceCommit, onEditItem,
  isMoving, moveAnim,
}: RowProps) => {
  const fallback = getCategoryEmoji(item.category);
  
  // Animated style for moving items
  const animatedStyle = moveAnim ? {
    transform: [{
      translateY: moveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, isChecked ? -60 : 60], // Move up when checked, down when unchecked
      }),
    }],
    opacity: moveAnim.interpolate({
      inputRange: [0, 0.3, 0.7, 1],
      outputRange: [1, 0.8, 0.8, 1],
    }),
  } : {};

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
      <Animated.View style={[
        c.card, styles.itemRow,
        isChecked && { opacity: 0.55, backgroundColor: theme.chip },
        isPending && !isChecked && { backgroundColor: theme.success + '14' },
        isMoving && animatedStyle,
      ]}>
        {/* Thumbnail */}
        <TouchableOpacity
          onPress={() => !isChecked && onEditItem(item)}
          activeOpacity={isChecked ? 1 : 0.7}
          disabled={isChecked}
        >
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={[c.thumbnail, isChecked && { opacity: 0.5 }]} />
          ) : (
            <View style={[c.thumbnail, c.placeholder]}>
              <Text style={{ fontSize: 24 }}>{fallback}</Text>
            </View>
          )}
          {!isChecked && (
            <View style={[styles.editBadge, { backgroundColor: theme.accent }]}>
              <Text style={styles.editBadgeText}>✎</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: isChecked ? theme.textSubtle : theme.text }, isChecked && styles.strikethrough]}>
            {item.name}
          </Text>
          <Text style={[styles.itemBrand, { color: theme.textMuted }]}>{item.brand}</Text>

          {/* Inline price */}
          <TouchableOpacity onPress={() => onPriceTap(item)} activeOpacity={isChecked ? 1 : 0.6} disabled={isChecked}>
            {isEditing ? (
              <TextInput
                style={[styles.priceInput, { color: theme.accent, borderColor: theme.accent, backgroundColor: theme.inputBg }]}
                value={editingValue}
                onChangeText={onPriceChange}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                onBlur={() => onPriceCommit(item)}
                onSubmitEditing={() => onPriceCommit(item)}
              />
            ) : (
              <View style={[styles.priceChip, { backgroundColor: theme.chip }]}>
                <Text style={[styles.priceChipText, { color: isChecked ? theme.textSubtle : theme.accent }]}>
                  ${(price || 0).toFixed(2)}
                </Text>
                {!isChecked && <Text style={[styles.priceEditHint, { color: theme.textSubtle }]}> ✎</Text>}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Check button */}
        <TouchableOpacity style={styles.checkBtnWrap} onPress={() => onToggleCheck(item)} activeOpacity={0.7}>
          {isPending && pendingProgress ? (
            <>
              <View style={[styles.checkBtn, { position: 'absolute', borderColor: theme.border, borderWidth: 2, backgroundColor: 'transparent' }]} />
              <Animated.View style={[styles.checkBtn, {
                borderWidth: 2.5,
                borderColor: theme.success,
                backgroundColor: pendingProgress.interpolate({ inputRange: [0, 1], outputRange: ['transparent', theme.success + '33'] }),
                transform: [{ scale: pendingProgress.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [1, 1.12, 1, 1.05] }) }],
              }]}>
                <Text style={{ color: theme.success, fontSize: 14, fontWeight: '700' }}>✕</Text>
              </Animated.View>
            </>
          ) : (
            <View style={[styles.checkBtn, {
              backgroundColor: isChecked ? theme.success : 'transparent',
              borderColor: isChecked ? theme.success : theme.border,
              borderWidth: 2,
            }]}>
              {isChecked && <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>✓</Text>}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
});

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

  // Animation state for moving items
  const [movingItems, setMovingItems] = useState<{ [key: string]: Animated.Value }>({});
  const [pendingMove, setPendingMove] = useState<string | null>(null);

  // key → { timerId, progress Animated.Value 0→1 over 3s }
  const [pendingChecks, setPendingChecks] = useState<{
    [key: string]: { timerId: ReturnType<typeof setTimeout>; progress: Animated.Value };
  }>({});

  // Refs always pointing at latest state
  const checkedItemsRef = useRef(checkedItems);
  const itemPricesRef   = useRef(itemPrices);
  const listRef         = useRef(list);
  useEffect(() => { checkedItemsRef.current = checkedItems; }, [checkedItems]);
  useEffect(() => { itemPricesRef.current   = itemPrices;   }, [itemPrices]);
  useEffect(() => { listRef.current         = list;         }, [list]);

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
    return () => {
      isMounted = false;
      unsubscribe();
      Object.values(pendingChecks).forEach(p => clearTimeout(p.timerId));
    };
  }, [navigation]);

  const loadActiveSession = async () => {
    setIsLoading(true);
    try {
      const [activeSession, lists, masterItems] = await Promise.all([
        ShoppingListStorage.getActiveSession(listId),
        ShoppingListStorage.getAllLists(),
        ShoppingListStorage.getAllMasterItems(),
      ]);

      const currentList = lists.find(l => l.id === listId);
      if (!currentList) { Alert.alert('Error', 'List not found'); setIsLoading(false); return; }

      const masterMap = new Map(masterItems.map((m: any) => [m.id, m]));
      const freshList = {
        ...currentList,
        items: currentList.items.map(item => {
          const master = masterMap.get(item.masterItemId) as any;
          const variant = master?.variants[item.variantIndex] ?? master?.variants[0];
          if (!master || !variant) return item;
          return {
            ...item,
            name: master.name,
            brand: variant.brand,
            imageUri: variant.imageUri ?? item.imageUri,
            category: master.category ?? item.category,
            lastPrice: variant.defaultPrice ?? item.lastPrice,
            averagePrice: variant.averagePrice ?? item.averagePrice,
          };
        }),
      };
      setList(freshList);

      if (activeSession) {
        setCheckedItems(activeSession.checkedItems || {});
        const prices: { [key: string]: number } = {};
        Object.entries(activeSession.checkedItems || {}).forEach(([k, v]: [string, any]) => { if (v.price) prices[k] = v.price; });
        setItemPrices(prices);
        setReceiptImage(activeSession.receiptImageUri || null);
      } else {
        setCheckedItems({}); setItemPrices({}); setReceiptImage(null);
        const newSession: ActiveSession = {
          id: Date.now().toString(), listId: freshList.id, listName: freshList.name,
          startTime: Date.now(),
          items: freshList.items.map(item => ({
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
    if (checkedItems[key]?.checked) return;
    const current = itemPrices[key] ?? item.lastPrice;
    setEditingKey(key);
    setEditingValue(current > 0 ? current.toFixed(2) : '');
  };

  const handlePriceCommit = async (item: ShoppingListItem) => {
    const key = getItemKey(item);
    const parsed = parseFloat(editingValue);
    const price = isNaN(parsed) || parsed < 0 ? (item.lastPrice || 0) : parsed;
    const newPrices = { ...itemPrices, [key]: price };
    const newChecked = { ...checkedItems };
    if (newChecked[key]) newChecked[key] = { ...newChecked[key], price };
    setItemPrices(newPrices);
    setCheckedItems(newChecked);
    setEditingKey(null);
    setEditingValue('');
    await saveActiveSessionState(newChecked, newPrices);
  };

  // ── Animate item movement ─────────────────────────────────────────────────
  const animateItemMovement = async (item: ShoppingListItem, willBeChecked: boolean) => {
    const key = getItemKey(item);
    
    // Create new animation value
    const moveAnim = new Animated.Value(0);
    setMovingItems(prev => ({ ...prev, [key]: moveAnim }));
    
    // Trigger layout animation for smooth list reordering
    LayoutAnimation.configureNext(ITEM_MOVE_ANIMATION);
    
    // Animate the item flying to its new position
    Animated.timing(moveAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // Clean up animation after completion
      setMovingItems(prev => {
        const newMoving = { ...prev };
        delete newMoving[key];
        return newMoving;
      });
    });
  };

  // ── Commit: called when 3s countdown finishes ───────────────────────────────
  const commitCheck = async (item: ShoppingListItem) => {
    const key     = getItemKey(item);
    const prices  = itemPricesRef.current;
    const checked = checkedItemsRef.current;
    const price   = prices[key] ?? item.lastPrice;
    const newPrices  = { ...prices,  [key]: price };
    const newChecked = { ...checked, [key]: { checked: true, price, checkedAt: Date.now() } };
    
    // Animate the item moving down
    await animateItemMovement(item, true);
    
    await ShoppingListStorage.addPriceToHistory(
      item.masterItemId, item.variantIndex, price, undefined, listRef.current?.name,
    );
    
    setItemPrices(newPrices);
    setCheckedItems(newChecked);
    setPendingChecks(prev => { const n = { ...prev }; delete n[key]; return n; });
    await saveActiveSessionState(newChecked, newPrices);
  };

  // ── Tap check circle ─────────────────────────────────────────────────────────
  const handleToggleCheck = (item: ShoppingListItem) => {
    const key       = getItemKey(item);
    const isChecked = checkedItemsRef.current[key]?.checked || false;
    const pending   = pendingChecks[key];

    if (isChecked) {
      // Animate the item moving up before unchecking
      animateItemMovement(item, false).then(() => {
        const newChecked = { ...checkedItemsRef.current };
        delete newChecked[key];
        setCheckedItems(newChecked);
        saveActiveSessionState(newChecked, itemPricesRef.current);
      });
      return;
    }

    if (pending) {
      clearTimeout(pending.timerId);
      pending.progress.stopAnimation();
      setPendingChecks(prev => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }

    // Start countdown
    const progress = new Animated.Value(0);
    Animated.timing(progress, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
    const timerId = setTimeout(() => commitCheck(item), 1000);
    setPendingChecks(prev => ({ ...prev, [key]: { timerId, progress } }));
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

    for (const item of list.items) {
      const key = getItemKey(item);
      if (checkedItems[key]?.checked && itemPrices[key] !== undefined) {
        await ShoppingListStorage.updateLatestPriceHistorySessionId(
          item.masterItemId, item.variantIndex, sessionId, receiptImage || undefined,
        );
      }
    }

    await ShoppingListStorage.clearActiveSession(list.id);
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  // ── Sorted: unchecked first, checked at bottom ───────────────────────────
  const unchecked = list?.items.filter(i => !checkedItems[getItemKey(i)]?.checked) ?? [];
  const checked = list?.items.filter(i => checkedItems[getItemKey(i)]?.checked) ?? [];
  const sortedItems = [...unchecked, ...checked];

  const checkedCount = checked.length;
  const totalSoFar = Object.values(itemPrices).reduce((a, b) => a + b, 0);
  const progress = list ? checkedCount / Math.max(list.items.length, 1) : 0;

  // Stable callbacks
  const handleEditItem = useCallback((item: ShoppingListItem) => {
    navigation.navigate('EditMasterItem', { itemId: item.masterItemId, returnTo: 'ActiveList', listId });
  }, [navigation, listId]);

  const handlePriceChangeText = useCallback((v: string) => setEditingValue(v), []);

  const renderItem = useCallback(({ item, index }: { item: ShoppingListItem; index: number }) => {
    const key             = getItemKey(item);
    const isChecked       = checkedItems[key]?.checked || false;
    const isPending       = !!pendingChecks[key];
    const pendingProgress = pendingChecks[key]?.progress;
    const price           = itemPrices[key] ?? item.lastPrice;
    const isEditing       = editingKey === key;
    const showDivider     = index === unchecked.length && checked.length > 0 && unchecked.length > 0;
    const isMoving        = !!movingItems[key];
    const moveAnim        = movingItems[key];

    return (
      <ShoppingListRow
        item={item}
        isChecked={isChecked}
        isPending={isPending}
        pendingProgress={pendingProgress}
        price={price}
        isEditing={isEditing}
        editingValue={editingValue}
        showDivider={showDivider}
        checkedCount={checkedCount}
        theme={theme}
        c={c}
        listId={listId}
        onToggleCheck={handleToggleCheck}
        onPriceTap={handlePriceTap}
        onPriceChange={handlePriceChangeText}
        onPriceCommit={handlePriceCommit}
        onEditItem={handleEditItem}
        isMoving={isMoving}
        moveAnim={moveAnim}
      />
    );
  }, [checkedItems, pendingChecks, itemPrices, editingKey, editingValue,
      unchecked.length, checked.length, checkedCount, movingItems,
      theme, c, listId, handleToggleCheck, handlePriceTap, 
      handlePriceCommit, handleEditItem, handlePriceChangeText]);

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
        extraData={[checkedItems, pendingChecks, itemPrices, editingKey, movingItems]}
        removeClippedSubviews={false}
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

      {/* Completion Modal (unchanged) */}
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
  editBadge: {
    position: 'absolute', bottom: -2, right: 8,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  editBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
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
  checkBtnWrap: {
    width: 38, height: 38, marginLeft: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  checkBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
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