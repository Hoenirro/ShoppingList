// screens/SessionDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Share, Alert, StatusBar, Modal, Dimensions } from 'react-native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingSession } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SessionDetailsScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);
  const [session, setSession] = useState<ShoppingSession | null>(null);
  const [receiptFullscreen, setReceiptFullscreen] = useState(false);

  useEffect(() => {
    ShoppingListStorage.getSessions().then(sessions => {
      setSession(sessions.find(s => s.id === sessionId) || null);
    });
  }, []);

  const handleShare = async () => {
    if (!session) return;
    try {
      const items = session.items.map(i => `• ${i.name}: $${i.price.toFixed(2)}`).join('\n');
      await Share.share({ message: `${session.listName}\n${new Date(session.date).toLocaleString()}\nTotal: $${session.total.toFixed(2)}\n\n${items}` });
    } catch (e) { Alert.alert('Error', 'Failed to share'); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Session', 'Delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await ShoppingListStorage.deleteSession(sessionId); navigation.goBack(); } },
    ]);
  };

  if (!session) return <View style={c.screen} />;

  const checked = session.items.filter(i => i.checked);
  const unchecked = session.items.filter(i => !i.checked);

  return (
    <ScrollView style={c.screen} contentContainerStyle={styles.scroll}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Total card */}
      <View style={[styles.totalCard, { backgroundColor: theme.accent, ...makeShadow(theme, 'md') }]}>
        <View style={styles.totalCardHeader}>
          <View>
            <Text style={[styles.totalCardTitle, { color: theme.accentText, opacity: 0.85 }]}>{session.listName}</Text>
            <Text style={[styles.totalCardDate, { color: theme.accentText, opacity: 0.65 }]}>{new Date(session.date).toLocaleString()}</Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={[styles.shareBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={{ fontSize: 18 }}>📤</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.totalAmount, { color: theme.accentText }]}>${session.total.toFixed(2)}</Text>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {[
          { label: 'Total', value: session.items.length, color: theme.text },
          { label: 'Purchased', value: checked.length, color: theme.success },
          { label: 'Skipped', value: unchecked.length, color: theme.textSubtle },
        ].map(s => (
          <View key={s.label} style={styles.statBox}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: theme.textSubtle }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Receipt — tap to fullscreen */}
      {session.receiptImageUri && (
        <View style={[c.card, { marginHorizontal: 14 }]}>
          <Text style={[c.sectionTitle, { marginBottom: 10 }]}>Receipt</Text>
          <TouchableOpacity onPress={() => setReceiptFullscreen(true)} activeOpacity={0.85}>
            <Image source={{ uri: session.receiptImageUri }} style={styles.receipt} resizeMode="cover" />
            <View style={[styles.receiptHint, { backgroundColor: theme.chip }]}>
              <Text style={[styles.receiptHintText, { color: theme.textMuted }]}>🔍 Tap to view full size</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Fullscreen receipt modal */}
      <Modal
        visible={receiptFullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptFullscreen(false)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setReceiptFullscreen(false)}
          >
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          {session.receiptImageUri && (
            <Image
              source={{ uri: session.receiptImageUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Items */}
      <View style={[c.card, { marginHorizontal: 14 }]}>
        {checked.length > 0 && (
          <>
            <Text style={[c.sectionTitle, { color: theme.success }]}>✓ Purchased</Text>
            {checked.map(item => (
              <View key={item.masterItemId} style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: theme.accent }]}>${item.price.toFixed(2)}</Text>
              </View>
            ))}
          </>
        )}
        {unchecked.length > 0 && (
          <>
            <Text style={[c.sectionTitle, { color: theme.textSubtle, marginTop: checked.length > 0 ? 16 : 0 }]}>○ Not Purchased</Text>
            {unchecked.map(item => (
              <View key={item.masterItemId} style={[styles.itemRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.itemName, { color: theme.textSubtle, textDecorationLine: 'line-through' }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: theme.textSubtle }]}>${item.price.toFixed(2)}</Text>
              </View>
            ))}
          </>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[c.primaryButton, { marginBottom: 10 }]} onPress={() => navigation.navigate('ShoppingList', { listId: session.listId })}>
          <Text style={c.primaryButtonText}>Use This List Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[c.ghostButton, { borderColor: theme.danger + '66' }]} onPress={handleDelete}>
          <Text style={[c.ghostButtonText, { color: theme.danger }]}>Delete Session</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  totalCard: { margin: 14, borderRadius: 16, padding: 20 },
  totalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  totalCardTitle: { fontSize: 16, fontWeight: '700' },
  totalCardDate: { fontSize: 12, marginTop: 2 },
  shareBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  totalAmount: { fontSize: 40, fontWeight: '800' },
  statsRow: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 14, borderRadius: 14, borderWidth: 1, padding: 16, justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  receipt: { width: '100%', height: 180, borderRadius: 10 },
  receiptHint: { marginTop: 8, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  receiptHintText: { fontSize: 12, fontWeight: '500' },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
  fullscreenClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  itemName: { fontSize: 15 },
  itemPrice: { fontSize: 15, fontWeight: '600' },
  actions: { paddingHorizontal: 14, marginTop: 8 },
});
