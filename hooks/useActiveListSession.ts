// hooks/useActiveListSession.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ShoppingListItem, ActiveSession } from '../types';

export const useActiveListSession = (listId: string) => {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: { checked: boolean; price?: number; checkedAt: number } }>({});
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number }>({});
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for latest state
  const checkedItemsRef = useRef(checkedItems);
  const itemPricesRef = useRef(itemPrices);
  const listRef = useRef(list);

  useEffect(() => { checkedItemsRef.current = checkedItems; }, [checkedItems]);
  useEffect(() => { itemPricesRef.current = itemPrices; }, [itemPrices]);
  useEffect(() => { listRef.current = list; }, [list]);

  const getItemKey = useCallback((item: { masterItemId: string; variantIndex: number }) => 
    `${item.masterItemId}_${item.variantIndex}`, []);

  const loadActiveSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activeSession, lists, masterItems] = await Promise.all([
        ShoppingListStorage.getActiveSession(listId),
        ShoppingListStorage.getAllLists(),
        ShoppingListStorage.getAllMasterItems(),
      ]);

      const currentList = lists.find(l => l.id === listId);
      if (!currentList) {
        Alert.alert('Error', 'List not found');
        setIsLoading(false);
        return;
      }

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
        Object.entries(activeSession.checkedItems || {}).forEach(([k, v]: [string, any]) => {
          if (v.price) prices[k] = v.price;
        });
        setItemPrices(prices);
        setReceiptImage(activeSession.receiptImageUri || null);
      } else {
        setCheckedItems({});
        setItemPrices({});
        setReceiptImage(null);
        const newSession: ActiveSession = {
          id: Date.now().toString(),
          listId: freshList.id,
          listName: freshList.name,
          startTime: Date.now(),
          items: freshList.items.map(item => ({
            masterItemId: item.masterItemId,
            variantIndex: item.variantIndex,
            name: item.name,
            brand: item.brand,
            lastPrice: item.lastPrice,
            checked: false,
            imageUri: item.imageUri,
            category: item.category,
          })),
          checkedItems: {},
        };
        await ShoppingListStorage.saveActiveSession(newSession);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  const saveActiveSessionState = useCallback(async (
    overrideChecked?: typeof checkedItems,
    overridePrices?: typeof itemPrices,
    overrideReceipt?: string | null,
  ) => {
    if (!list) return;
    const ch = overrideChecked ?? checkedItems;
    const pr = overridePrices ?? itemPrices;
    const rc = overrideReceipt !== undefined ? overrideReceipt : receiptImage;
    const session: ActiveSession = {
      id: Date.now().toString(),
      listId: list.id,
      listName: list.name,
      startTime: Date.now(),
      items: list.items.map(item => ({
        masterItemId: item.masterItemId,
        variantIndex: item.variantIndex,
        name: item.name,
        brand: item.brand,
        lastPrice: item.lastPrice,
        checked: ch[getItemKey(item)]?.checked || false,
        price: pr[getItemKey(item)],
        imageUri: item.imageUri,
        category: item.category,
      })),
      checkedItems: ch,
      receiptImageUri: rc || undefined,
    };
    await ShoppingListStorage.saveActiveSession(session);
  }, [list, checkedItems, itemPrices, receiptImage, getItemKey]);

  const updateCheckedItems = useCallback((
    newCheckedItems: typeof checkedItems,
    newPrices?: typeof itemPrices
  ) => {
    setCheckedItems(newCheckedItems);
    if (newPrices) setItemPrices(newPrices);
    saveActiveSessionState(newCheckedItems, newPrices || itemPrices);
  }, [itemPrices, saveActiveSessionState]);

  const updateItemPrice = useCallback((key: string, price: number) => {
    const newPrices = { ...itemPrices, [key]: price };
    setItemPrices(newPrices);
    return newPrices;
  }, [itemPrices]);

  const updateReceiptImage = useCallback((uri: string | null) => {
    setReceiptImage(uri);
    saveActiveSessionState(undefined, undefined, uri);
  }, [saveActiveSessionState]);

  return {
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
    saveActiveSessionState,
    updateCheckedItems,
    updateItemPrice,
    updateReceiptImage,
    setCheckedItems,
    setItemPrices,
  };
};