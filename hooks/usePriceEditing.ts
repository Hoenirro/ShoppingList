// hooks/usePriceEditing.ts
import { useState, useCallback } from 'react';

export const usePriceEditing = () => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const startEditing = useCallback((key: string, currentPrice: number) => {
    setEditingKey(key);
    setEditingValue(currentPrice > 0 ? currentPrice.toFixed(2) : '');
  }, []);

  const stopEditing = useCallback(() => {
    setEditingKey(null);
    setEditingValue('');
  }, []);

  const updateEditingValue = useCallback((value: string) => {
    setEditingValue(value);
  }, []);

  return {
    editingKey,
    editingValue,
    startEditing,
    stopEditing,
    updateEditingValue,
  };
};