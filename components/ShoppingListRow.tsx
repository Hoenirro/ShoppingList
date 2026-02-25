// components/ShoppingListRow.tsx
import React, { memo } from 'react';
import {
  View, Text, TouchableOpacity, Image, TextInput, Animated, StyleSheet
} from 'react-native';
import { getCategoryEmoji } from '../utils/categories';

interface ShoppingListRowProps {
  item: any;
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
  onToggleCheck: () => void;
  onPriceTap: () => void;
  onPriceChange: (v: string) => void;
  onPriceCommit: () => void;
  onEditItem: () => void;
  isMoving?: boolean;
  moveAnim?: Animated.Value;
  onBrandTap?: () => void;
  isBrandExpanded?: boolean;
  masterItem?: any; 
  onSwitchBrand?: (variantIndex: number) => void;
}

export const ShoppingListRow = memo(({
  item,
  isChecked,
  isPending,
  pendingProgress,
  price,
  isEditing,
  editingValue,
  showDivider,
  checkedCount,
  theme,
  c,
  onToggleCheck,
  onPriceTap,
  onPriceChange,
  onPriceCommit,
  onEditItem,
  isMoving,
  moveAnim,
  onBrandTap,
  isBrandExpanded,
  masterItem,
  onSwitchBrand,
}: ShoppingListRowProps) => {
  const fallback = getCategoryEmoji(item.category);
  
  const animatedStyle = moveAnim ? {
    transform: [{
      translateY: moveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, isChecked ? -60 : 60],
      }),
    }],
    opacity: moveAnim.interpolate({
      inputRange: [0, 0.3, 0.7, 1],
      outputRange: [1, 0.8, 0.8, 0],
    }),
  } : {};

    const hasMultipleBrands = (masterItem?.variants?.length ?? 0) > 1;

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
        <TouchableOpacity
          onPress={onEditItem}
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
          <TouchableOpacity 
            onPress={onBrandTap} 
            disabled={isChecked || !hasMultipleBrands}
            activeOpacity={0.6}
          >
            <Text style={[styles.itemBrand, { color: hasMultipleBrands && !isChecked ? theme.accent : theme.textMuted }]}>
              {item.brand}{hasMultipleBrands && !isChecked ? ' ↕' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onPriceTap} activeOpacity={isChecked ? 1 : 0.6} disabled={isChecked}>
            {isEditing ? (
              <TextInput
                style={[styles.priceInput, { color: theme.accent, borderColor: theme.accent, backgroundColor: theme.inputBg }]}
                value={editingValue}
                onChangeText={onPriceChange}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                onBlur={onPriceCommit}
                onSubmitEditing={onPriceCommit}
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

        <TouchableOpacity style={styles.checkBtnWrap} onPress={onToggleCheck} activeOpacity={0.7}>
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
      {isBrandExpanded && masterItem && !isChecked && (
        <View style={styles.brandBubbles}>
          {masterItem.variants.map((v: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={[styles.brandBubble, {
                backgroundColor: i === item.variantIndex ? theme.chipSelected : theme.chip,
                borderColor: i === item.variantIndex ? theme.accent : theme.border,
              }]}
              onPress={() => onSwitchBrand?.(i)}
            >
              <Text style={[styles.brandBubbleName, { color: theme.text }]}>{v.brand}</Text>
              {v.defaultPrice > 0 && (
                <Text style={[styles.brandBubblePrice, { color: theme.accent }]}>${v.defaultPrice.toFixed(2)}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
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

  // Brand bubbles
  brandBubbles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 4 },
  brandPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, paddingLeft: 4 },
  brandBubble: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  brandBubbleName: { fontSize: 13, fontWeight: '600' },
  brandBubblePrice: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  
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
});