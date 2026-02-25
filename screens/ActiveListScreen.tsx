// screens/ActiveListScreen.tsx (refactored)
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StatusBar, Platform,
  UIManager,
} from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles } from '../theme/theme';

// Hooks
import { useActiveListSession } from '../hooks/useActiveListSession';
import { usePendingChecks } from '../hooks/usePendingChecks';
import { useItemMovement } from '../hooks/useItemMovement';
import { usePriceEditing } from '../hooks/usePriceEditing';
import { useCompletionModal } from '../hooks/useCompletionModal';

// Components
import { ShoppingListRow } from '../components/ShoppingListRow';
import { ProgressHeader } from '../components/ProgressHeader';
import { CompletionModal } from '../components/CompletionModal';

export default function ActiveListScreen({ route, navigation }: any) {
  const { listId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);

  // Custom hooks
  const {
    list,
    checkedItems,
    itemPrices,
    receiptImage,
    isLoading,
    checkedItemsRef,
    itemPricesRef,
    listRef,
    getItemKey,
    loadActiveSession,
    updateCheckedItems,
    updateItemPrice,
    updateReceiptImage,
    setCheckedItems,
    setItemPrices,
  } = useActiveListSession(listId);

  const { pendingChecks, startPendingCheck, cancelPendingCheck, clearAllPending } = usePendingChecks();
  const { movingItems, animateMovement } = useItemMovement();
  const { editingKey, editingValue, startEditing, stopEditing, updateEditingValue } = usePriceEditing();

  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [expandedItemBrandId, setExpandedItemBrandId] = useState<string | null>(null);

  const {
    completionModalVisible,
    estimatedTotal,
    actualPaid,
    editingActual,
    checkedCount,
    openModal,
    closeModal,
    startEditingActual,
    stopEditingActual,
    updateActualPaid,
  } = useCompletionModal(list, checkedItems, itemPrices, getItemKey);

  // Derived data
  const unchecked = useMemo(() => 
    list?.items.filter(i => !checkedItems[getItemKey(i)]?.checked) ?? [],
    [list, checkedItems, getItemKey]
  );
  const checked = useMemo(() => 
    list?.items.filter(i => checkedItems[getItemKey(i)]?.checked) ?? [],
    [list, checkedItems, getItemKey]
  );
  const sortedItems = useMemo(() => [...unchecked, ...checked], [unchecked, checked]);
  const totalSoFar = useMemo(() => 
    Object.values(itemPrices).reduce((a, b) => a + b, 0),
    [itemPrices]
  );
  const progress = useMemo(() => 
    list ? checkedCount / Math.max(list.items.length, 1) : 0,
    [list, checkedCount]
  );

  // Effects
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={async () => {
            await ShoppingListStorage.saveActiveSession({
              listId: listRef.current!.id,
              listName: listRef.current!.name,
              startTime: Date.now(),
              items: listRef.current!.items,
              checkedItems: checkedItemsRef.current,
              itemPrices: itemPricesRef.current,
              receiptImageUri: receiptImage || undefined,
            } as any);
            navigation.navigate('Welcome');
          }}
          style={{ marginRight: 16 }}
        >
          <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '600' }}>Exit</Text>
        </TouchableOpacity>
      ),
    });

    loadActiveSession();
    ShoppingListStorage.getAllMasterItems().then(setMasterItems);
    const unsubscribe = navigation.addListener('focus', loadActiveSession);

    return () => {
      unsubscribe();
      clearAllPending();
    };
  }, [navigation, listId, theme]);

  // Handlers
  const handleToggleCheck = useCallback((item: any) => {
    const key = getItemKey(item);
    const isChecked = checkedItemsRef.current[key]?.checked || false;
    const pending = pendingChecks[key];

    if (isChecked) {
      animateMovement(key).then(async () => {
        const newChecked = { ...checkedItemsRef.current };
        delete newChecked[key];
        setCheckedItems(newChecked);
        await ShoppingListStorage.saveActiveSession({
          listId: listRef.current!.id,
          listName: listRef.current!.name,
          items: listRef.current!.items,
          checkedItems: newChecked,
          itemPrices: itemPricesRef.current,
          receiptImageUri: receiptImage || undefined,
        } as any);
      });
      return;
    }

    if (pending) {
      cancelPendingCheck(key);
      return;
    }

    startPendingCheck(key, 1000, async () => {
  const price = itemPricesRef.current[key] ?? item.lastPrice;
  
  await animateMovement(key);
  
  const newPrices = { ...itemPricesRef.current, [key]: price };
  const newChecked = { 
    ...checkedItemsRef.current, 
    [key]: { checked: true, price, checkedAt: Date.now() } 
  };
  
  setItemPrices(newPrices);
  setCheckedItems(newChecked);

  await ShoppingListStorage.saveActiveSession({
    listId: listRef.current!.id,
    listName: listRef.current!.name,
    items: listRef.current!.items,
    checkedItems: newChecked,
    itemPrices: newPrices,
    receiptImageUri: receiptImage || undefined,
  } as any);
});
  }, [getItemKey, animateMovement, startPendingCheck, cancelPendingCheck]);

  const handleSwitchVariant = useCallback(async (item: any, newVariantIndex: number) => {
    if (!listRef.current) return;
    const master = masterItems.find((m: MasterItem) => m.id === item.masterItemId);
    if (!master) return;
    const newVariant = master.variants[newVariantIndex];
    if (!newVariant) return;

    const updatedItems = listRef.current.items.map((i: any) =>
      i.masterItemId === item.masterItemId ? {
        ...i,
        variantIndex: newVariantIndex,
        brand: newVariant.brand,
        imageUri: newVariant.imageUri ?? i.imageUri,
        lastPrice: newVariant.defaultPrice ?? i.lastPrice,
        averagePrice: newVariant.averagePrice ?? i.averagePrice,
      } : i
    );
    const updatedList = { ...listRef.current, items: updatedItems, updatedAt: Date.now() };

    await ShoppingListStorage.saveList(updatedList);
    await ShoppingListStorage.saveActiveSession({
      listId: updatedList.id,
      listName: updatedList.name,
      items: updatedItems,
      checkedItems: checkedItemsRef.current,
      itemPrices: itemPricesRef.current,
      receiptImageUri: receiptImage || undefined,
    } as any);

    setExpandedItemBrandId(null);
    loadActiveSession();
  }, [masterItems, listRef, checkedItemsRef, itemPricesRef, receiptImage, loadActiveSession]);

  const handlePriceTap = useCallback((item: any) => {
    const key = getItemKey(item);
    if (checkedItems[key]?.checked) return;
    const current = itemPrices[key] ?? item.lastPrice;
    startEditing(key, current);
  }, [getItemKey, checkedItems, itemPrices, startEditing]);

  const handlePriceCommit = useCallback(async (item: any) => {
    const key = getItemKey(item);
    const parsed = parseFloat(editingValue);
    const price = isNaN(parsed) || parsed < 0 ? (item.lastPrice || 0) : parsed;
    
    const newPrices = updateItemPrice(key, price);
    const newChecked = { ...checkedItems };
    if (newChecked[key]) newChecked[key] = { ...newChecked[key], price };
    
    setCheckedItems(newChecked);
    stopEditing();
    await ShoppingListStorage.saveActiveSession({
      listId: listRef.current!.id,
      listName: listRef.current!.name,
      items: listRef.current!.items,
      checkedItems: newChecked,
      itemPrices: newPrices,
      receiptImageUri: receiptImage || undefined,
    } as any);
  }, [getItemKey, editingValue, updateItemPrice, checkedItems, stopEditing]);

  const handleEditItem = useCallback((item: any) => {
    navigation.navigate('EditMasterItem', { 
      itemId: item.masterItemId, 
      returnTo: 'ActiveList', 
      listId 
    });
  }, [navigation, listId]);

  const handleCompleteShopping = useCallback(() => {
    openModal();
  }, [openModal]);

  const handleTakeReceiptPhoto = useCallback(async () => {
    const uri = await ShoppingListStorage.pickImage();
    if (uri) {
      const saved = await ShoppingListStorage.saveImage(uri, 'receipt');
      updateReceiptImage(saved);
    }
  }, [updateReceiptImage]);

  const handleSaveSession = useCallback(async () => {
    if (!list) return;
    
    const paid = parseFloat(actualPaid) || estimatedTotal;
    const sessionId = Date.now().toString();

    const session = {
      id: sessionId,
      listId: list.id,
      listName: list.name,
      date: Date.now(),
      total: paid,
      calculatedTotal: estimatedTotal,
      receiptImageUri: receiptImage || undefined,
      items: list.items.map(item => ({
        masterItemId: item.masterItemId,
        variantIndex: item.variantIndex,
        name: item.name,
        brand: item.brand,
        price: itemPrices[getItemKey(item)] ?? item.lastPrice,
        checked: checkedItems[getItemKey(item)]?.checked || false,
      })),
    };

    await ShoppingListStorage.saveSession(session);

    // Update prices on master items and stamp session ID
    for (const item of list.items) {
      const key = getItemKey(item);
      const price = itemPrices[key];
      if (checkedItems[key]?.checked && price !== undefined) {
        await ShoppingListStorage.addPriceToHistory(
          item.masterItemId, item.variantIndex, price, sessionId, list.name,
        );
        await ShoppingListStorage.updateLatestPriceHistorySessionId(
          item.masterItemId, item.variantIndex, sessionId, receiptImage || undefined,
        );
      }
    }

    // Write the actual paid prices back to the shopping list so lastPrice is fresh next trip
    const updatedList = {
      ...list,
      updatedAt: Date.now(),
      items: list.items.map(item => {
        const key = getItemKey(item);
        const price = itemPrices[key];
        return price !== undefined ? { ...item, lastPrice: price } : item;
      }),
    };
    await ShoppingListStorage.saveList(updatedList);

    await ShoppingListStorage.clearActiveSession(list.id);
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }, [list, actualPaid, estimatedTotal, receiptImage, itemPrices, checkedItems, getItemKey, navigation]);

  // Render item
  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const key = getItemKey(item);
    const isChecked = checkedItems[key]?.checked || false;
    const isPending = !!pendingChecks[key];
    const pendingProgress = pendingChecks[key]?.progress;
    const price = itemPrices[key] ?? item.lastPrice;
    const isEditing = editingKey === key;
    const showDivider = index === unchecked.length && checked.length > 0 && unchecked.length > 0;
    const isMoving = !!movingItems[key];
    const moveAnim = movingItems[key];
    const master = masterItems.find((m: MasterItem) => m.id === item.masterItemId);
    const isExpanded = expandedItemBrandId === item.masterItemId;

    return (
      <View>
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
          onToggleCheck={() => handleToggleCheck(item)}
          onPriceTap={() => handlePriceTap(item)}
          onPriceChange={updateEditingValue}
          onPriceCommit={() => handlePriceCommit(item)}
          onEditItem={() => handleEditItem(item)}
          isMoving={isMoving}
          moveAnim={moveAnim}
          masterItem={master}
          isBrandExpanded={isExpanded}
          onBrandTap={() => setExpandedItemBrandId(prev => prev === item.masterItemId ? null : item.masterItemId)}
          onSwitchBrand={(variantIndex) => handleSwitchVariant(item, variantIndex)}
        />
      </View>
    );
  }, [
    checkedItems, pendingChecks, itemPrices, editingKey, editingValue,
    unchecked.length, checked.length, checkedCount, movingItems,
    masterItems, expandedItemBrandId,
    theme, c, handleToggleCheck, handlePriceTap, handlePriceCommit,
    handleEditItem, handleSwitchVariant, updateEditingValue, getItemKey
  ]);

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

      <ProgressHeader
        listName={list.name}
        checkedCount={checkedCount}
        totalItems={list.items.length}
        totalSoFar={totalSoFar}
        progress={progress}
        theme={theme}
        c={c}
        onAddPress={() => navigation.navigate('ShoppingList', { listId })}
        onDonePress={handleCompleteShopping}
      />

      <FlatList
        data={sortedItems}
        renderItem={renderItem}
        keyExtractor={item => getItemKey(item)}
        extraData={[checkedItems, pendingChecks, itemPrices, editingKey, movingItems, expandedItemBrandId]}
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

      <CompletionModal
        visible={completionModalVisible}
        onClose={closeModal}
        estimatedTotal={estimatedTotal}
        actualTotal={estimatedTotal} // You might want to track this separately
        actualPaid={actualPaid}
        editingActual={editingActual}
        checkedCount={checkedCount}
        totalItems={list.items.length}
        receiptImage={receiptImage}
        theme={theme}
        c={c}
        onStartEditingActual={startEditingActual}
        onStopEditingActual={stopEditingActual}
        onUpdateActualPaid={updateActualPaid}
        onTakeReceiptPhoto={handleTakeReceiptPhoto}
        onSaveSession={handleSaveSession}
      />
    </View>
  );
}