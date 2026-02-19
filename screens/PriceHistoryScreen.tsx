// screens/PriceHistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { MasterItem } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';

export default function PriceHistoryScreen({ route, navigation }: any) {
  const { masterItemId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const [item, setItem] = useState<MasterItem | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  useEffect(() => {
    ShoppingListStorage.getAllMasterItems().then(items => {
      setItem(items.find(i => i.id === masterItemId) || null);
    });
  }, []);

  if (!item) return <View style={c.screen} />;

  const variant = item.variants[selectedVariantIndex];
  if (!variant) return <View style={c.screen}><Text style={{ color: theme.textMuted, margin: 20 }}>No variant found</Text></View>;

  const prices = variant.priceHistory?.map(p => p.price) || [];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const sorted = [...(variant.priceHistory || [])].sort((a, b) => b.date - a.date);
  const last = sorted[0];

  return (
    <ScrollView style={c.screen} contentContainerStyle={styles.scroll}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
        {item.variants.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {item.variants.map((v, i) => (
              <TouchableOpacity key={i} style={[c.chip, i === selectedVariantIndex && c.chipSelected]} onPress={() => setSelectedVariantIndex(i)}>
                <Text style={[c.chipText, i === selectedVariantIndex && c.chipTextSelected]}>{v.brand}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {[
          { label: 'Average', value: avgPrice, color: theme.text },
          { label: 'Lowest', value: minPrice, color: theme.success },
          { label: 'Highest', value: maxPrice, color: theme.danger },
        ].map(s => (
          <View key={s.label} style={styles.statBox}>
            <Text style={[styles.statValue, { color: s.color }]}>${s.value.toFixed(2)}</Text>
            <Text style={[styles.statLabel, { color: theme.textSubtle }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Last purchase */}
      {last && (
        <View style={[c.card, { marginHorizontal: 14 }]}>
          <Text style={[c.sectionTitle, { color: theme.success }]}>Last Purchase</Text>
          <TouchableOpacity
            style={c.spaceBetween}
            onPress={() => last.listId && navigation.navigate('SessionDetails', { sessionId: last.listId })}
            activeOpacity={last.listId ? 0.7 : 1}
          >
            <View>
              <Text style={[styles.lastDate, { color: theme.text }]}>{new Date(last.date).toLocaleDateString()}</Text>
              {last.listName && <Text style={[styles.lastSub, { color: theme.textMuted }]}>{last.listName}</Text>}
              {last.listId && <Text style={[styles.lastSub, { color: theme.accent }]}>Tap to view trip →</Text>}
            </View>
            <Text style={[styles.lastPrice, { color: theme.accent }]}>${last.price.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full history */}
      <View style={[c.card, { marginHorizontal: 14 }]}>
        <Text style={c.sectionTitle}>Price History — {variant.brand}</Text>
        {sorted.length === 0 ? (
          <Text style={[styles.noHistory, { color: theme.textSubtle }]}>No history yet</Text>
        ) : (
          sorted.map((record, i) => {
            const prev = sorted[i + 1];
            const delta = prev ? record.price - prev.price : 0;
            const tappable = !!record.listId;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.historyRow, { borderBottomColor: theme.divider }, tappable && { backgroundColor: theme.chip + '55' }]}
                onPress={() => tappable && navigation.navigate('SessionDetails', { sessionId: record.listId })}
                activeOpacity={tappable ? 0.7 : 1}
              >
                <View>
                  <Text style={[styles.historyDate, { color: theme.text }]}>{new Date(record.date).toLocaleDateString()}</Text>
                  {record.listName && <Text style={[styles.historySub, { color: theme.textMuted }]}>{record.listName}</Text>}
                  {tappable && <Text style={[styles.historySub, { color: theme.accent }]}>View trip →</Text>}
                </View>
                <View style={styles.historyRight}>
                  {delta !== 0 && (
                    <Text style={[styles.delta, { color: delta > 0 ? theme.danger : theme.success }]}>
                      {delta > 0 ? '↑' : '↓'}${Math.abs(delta).toFixed(2)}
                    </Text>
                  )}
                  <Text style={[styles.historyPrice, { color: theme.accent }]}>${record.price.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: { padding: 16, borderBottomWidth: 1 },
  itemName: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, marginHorizontal: 14, marginVertical: 14, borderRadius: 14, borderWidth: 1 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 3 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  lastDate: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  lastSub: { fontSize: 12 },
  lastPrice: { fontSize: 26, fontWeight: '800' },
  noHistory: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  historyDate: { fontSize: 15, fontWeight: '500' },
  historySub: { fontSize: 12, marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  delta: { fontSize: 12, fontWeight: '600' },
  historyPrice: { fontSize: 17, fontWeight: '700' },
});
