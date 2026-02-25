// components/ProgressHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ProgressHeaderProps {
  listName: string;
  checkedCount: number;
  totalItems: number;
  totalSoFar: number;
  progress: number;
  theme: any;
  c: any;
  onAddPress: () => void;
  onDonePress: () => void;
}

export const ProgressHeader = ({
  listName,
  checkedCount,
  totalItems,
  totalSoFar,
  progress,
  theme,
  c,
  onAddPress,
  onDonePress,
}: ProgressHeaderProps) => {
  return (
    <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{listName}</Text>
        <Text style={[styles.headerSub, { color: theme.textMuted }]}>
          {checkedCount} / {totalItems} · ${(totalSoFar || 0).toFixed(2)}
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
          onPress={onAddPress}
        >
          <Text style={[styles.smallBtnText, { color: theme.accent }]}>+ Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: theme.success }]}
          onPress={onDonePress}
        >
          <Text style={[styles.smallBtnText, { color: '#fff' }]}>Done ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { padding: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  headerSub: { fontSize: 13, marginBottom: 8 },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  smallBtnText: { fontSize: 13, fontWeight: '700' },
});