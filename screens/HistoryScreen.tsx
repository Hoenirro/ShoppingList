// screens/HistoryScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, Modal, StatusBar, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingSession } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles } from '../theme/theme';

const PRESETS = [
  { label: 'Last 7 days',   days: 7 },
  { label: 'Last 30 days',  days: 30 },
  { label: 'Last 90 days',  days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year',     days: 365 },
  { label: 'All time',      days: 0 },
];

export default function HistoryScreen({ navigation }: any) {
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const [sessions, setSessions] = useState<ShoppingSession[]>([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(1); // default: last 30 days

  useFocusEffect(useCallback(() => {
    ShoppingListStorage.getSessions().then(s => setSessions(s.sort((a, b) => b.date - a.date)));
  }, []));

  const handleShare = async () => {
    const preset = PRESETS[selectedPreset];
    const cutoff = preset.days === 0 ? 0 : Date.now() - preset.days * 24 * 60 * 60 * 1000;
    const filtered = sessions.filter(s => s.date >= cutoff);

    if (filtered.length === 0) {
      Alert.alert('No trips', `No shopping trips found for "${preset.label}".`);
      return;
    }

    const dateLabel = preset.days === 0
      ? `All time (${filtered.length} trips)`
      : `${preset.label} (${filtered.length} trips)`;

    const lines = filtered.map(s => {
      const date = new Date(s.date).toLocaleDateString();
      return `${date}  ${s.listName}  $${s.total.toFixed(2)}`;
    });

    const grandTotal = filtered.reduce((sum, s) => sum + s.total, 0);

    const text = [
      '🛒 SHOPPING HISTORY',
      dateLabel,
      '--------------------------------',
      ...lines,
      '--------------------------------',
      `TOTAL   $${grandTotal.toFixed(2)}`,
    ].join('\n');

    setShareModalVisible(false);
    try {
      await Share.share({ message: text, title: 'Shopping History' });
    } catch (e) {
      Alert.alert('Error', 'Could not share history.');
    }
  };

  const renderSession = ({ item }: { item: ShoppingSession }) => (
    <TouchableOpacity
      style={[c.card, styles.row]}
      onPress={() => navigation.navigate('SessionDetails', { sessionId: item.id })}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.chip }]}>
        <Text style={{ fontSize: 22 }}>🧾</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sessionName, { color: theme.text }]}>{item.listName}</Text>
        <Text style={[styles.sessionDate, { color: theme.textSubtle }]}>
          {new Date(item.date).toLocaleDateString()} · {item.items.length} items
        </Text>
      </View>
      <Text style={[styles.total, { color: theme.accent }]}>${item.total.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Top bar with Share button */}
      {sessions.length > 0 && (
        <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
          <Text style={[styles.topBarTitle, { color: theme.textSubtle }]}>
            {sessions.length} trip{sessions.length !== 1 ? 's' : ''} total
          </Text>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: theme.accent }]}
            onPress={() => setShareModalVisible(true)}
          >
            <Text style={[styles.shareBtnText, { color: theme.accentText }]}>↑ Share History</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
            <Text style={c.emptyText}>No history yet</Text>
            <Text style={c.emptySubtext}>Complete a shopping trip to see it here</Text>
          </View>
        }
      />

      {/* Date range picker modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={c.modalOverlay}>
          <View style={c.modalCard}>
            <Text style={c.modalTitle}>📤 Share History</Text>
            <Text style={[styles.modalSub, { color: theme.textSubtle }]}>
              Choose the date range to include:
            </Text>

            {PRESETS.map((preset, index) => {
              const isSelected = selectedPreset === index;
              const cutoff = preset.days === 0 ? 0 : Date.now() - preset.days * 24 * 60 * 60 * 1000;
              const count = sessions.filter(s => s.date >= cutoff).length;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.presetRow,
                    { borderColor: theme.border },
                    isSelected && { backgroundColor: theme.accent + '18', borderColor: theme.accent },
                  ]}
                  onPress={() => setSelectedPreset(index)}
                >
                  <View style={[styles.radioOuter, { borderColor: isSelected ? theme.accent : theme.border }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />}
                  </View>
                  <Text style={[styles.presetLabel, { color: isSelected ? theme.accent : theme.text, fontWeight: isSelected ? '700' : '500' }]}>
                    {preset.label}
                  </Text>
                  <Text style={[styles.presetCount, { color: theme.textSubtle }]}>
                    {count} trip{count !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={[styles.modalButtons, { marginTop: 20 }]}>
              <TouchableOpacity
                style={[c.ghostButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShareModalVisible(false)}
              >
                <Text style={c.ghostButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[c.primaryButton, { flex: 1, marginLeft: 8 }]}
                onPress={handleShare}
              >
                <Text style={c.primaryButtonText}>Share ↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  topBarTitle: { fontSize: 13 },
  shareBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  shareBtnText: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sessionName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  sessionDate: { fontSize: 12 },
  total: { fontSize: 17, fontWeight: '700' },
  modalSub: { fontSize: 13, marginBottom: 14, marginTop: -4 },
  presetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 12 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  presetLabel: { flex: 1, fontSize: 15 },
  presetCount: { fontSize: 12 },
  modalButtons: { flexDirection: 'row' },
});
