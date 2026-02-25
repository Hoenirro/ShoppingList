// hooks/useCompletionModal.ts
import { useState, useCallback, useMemo } from 'react';
import { ShoppingList, ShoppingListItem } from '../types';

export const useCompletionModal = (
  list: ShoppingList | null,
  checkedItems: { [key: string]: any },
  itemPrices: { [key: string]: number },
  getItemKey: (item: ShoppingListItem) => string
) => {
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [actualTotal, setActualTotal] = useState(0);
  const [actualPaid, setActualPaid] = useState('');
  const [editingActual, setEditingActual] = useState(false);

  const calculateTotals = useCallback(() => {
    if (!list) return { estimated: 0, actual: 0 };
    
    let estimated = 0;
    let actual = 0;
    
    list.items.forEach(item => {
      const key = getItemKey(item);
      const price = itemPrices[key] ?? item.lastPrice;
      estimated += price;
      if (checkedItems[key]?.checked) actual += price;
    });
    
    return { estimated, actual };
  }, [list, itemPrices, checkedItems, getItemKey]);

  const openModal = useCallback(() => {
    const { estimated, actual } = calculateTotals();
    setEstimatedTotal(estimated);
    setActualTotal(actual);
    setActualPaid(actual.toFixed(2));
    setCompletionModalVisible(true);
  }, [calculateTotals]);

  const closeModal = useCallback(() => {
    setCompletionModalVisible(false);
  }, []);

  const startEditingActual = useCallback(() => {
    setEditingActual(true);
  }, []);

  const stopEditingActual = useCallback(() => {
    setEditingActual(false);
  }, []);

  const updateActualPaid = useCallback((value: string) => {
    setActualPaid(value);
  }, []);

  const checkedCount = useMemo(() => 
    list ? list.items.filter(i => checkedItems[getItemKey(i)]?.checked).length : 0,
    [list, checkedItems, getItemKey]
  );

  return {
    completionModalVisible,
    estimatedTotal,
    actualTotal,
    actualPaid,
    editingActual,
    checkedCount,
    openModal,
    closeModal,
    startEditingActual,
    stopEditingActual,
    updateActualPaid,
  };
};