import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, TextInput, Modal, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { ShareListService } from '../utils/shareList';
import { ShoppingList, ActiveSession } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { makeCommonStyles, makeShadow } from '../theme/theme';

export default function WelcomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const c = makeCommonStyles(theme);

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Inline rename state: which list is being renamed + current edit value
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [allLists, allSessions] = await Promise.all([
      ShoppingListStorage.getAllLists(),
      ShoppingListStorage.getAllActiveSessions(),
    ]);
    setLists(allLists);
    setActiveSessions(allSessions);
  };

  const createNewList = async () => {
    if (!newListName.trim()) { Alert.alert('Error', 'Please enter a list name'); return; }
    await ShoppingListStorage.saveList({
      id: Date.now().toString(),
      name: newListName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
    });
    setNewListName('');
    setModalVisible(false);
    loadData();
  };

  // ── Inline rename ──────────────────────────────────────────────────────────
  const startRename = (list: ShoppingList) => {
    setRenamingId(list.id);
    setRenameValue(list.name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = async (listId: string) => {
    if (renameValue.trim()) {
      await ShoppingListStorage.renameList(listId, renameValue.trim());
    }
    setRenamingId(null);
    loadData();
  };

  // ── Delete with active session guard ──────────────────────────────────────
  const deleteList = async (listId: string, listName: string) => {
    const isActive = await ShoppingListStorage.isListActivelyBeingShopped(listId);
    if (isActive) {
      Alert.alert(
        'List In Use',
        `"${listName}" has an active shopping trip. Cancel the trip before deleting?`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Trip & Delete', style: 'destructive',
            onPress: async () => {
              await ShoppingListStorage.clearActiveSession(listId);
              await ShoppingListStorage.deleteList(listId);
              loadData();
            },
          },
        ]
      );
      return;
    }
    Alert.alert('Delete List', `Delete "${listName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await ShoppingListStorage.deleteList(listId); loadData(); },
      },
    ]);
  };

  const handleShareList = async (list: ShoppingList) => {
    try { await ShareListService.exportList(list); }
    catch (error: any) { Alert.alert('Share Failed', error.message || 'Could not share this list.'); }
  };

  const handleImportList = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const result = await ShareListService.importList();
      if (result) {
        Alert.alert(
          '✅ List Imported!',
          `"${result.name}" was imported with ${result.itemCount} item${result.itemCount !== 1 ? 's' : ''}.\n\nPrices are not included — you'll fill those in as you shop.`,
          [{ text: 'Got it', onPress: loadData }]
        );
      }
    } catch (error: any) {
      Alert.alert('Import Failed', error.message || 'Could not import this list.');
    } finally {
      setIsImporting(false);
    }
  };

  const renderActiveSession = (session: ActiveSession) => (
    <View key={session.listId} style={styles.activeSessionWrapper}>
      <TouchableOpacity
        style={[styles.activeSessionCard, { backgroundColor: theme.success, ...makeShadow(theme, 'md') }]}
        onPress={() => navigation.navigate('ActiveList', { listId: session.listId })}
        activeOpacity={0.85}
      >
        <View>
          <Text style={styles.activeSessionLabel}>🛒 ACTIVE SHOPPING</Text>
          <Text style={styles.activeSessionName}>{session.listName}</Text>
        </View>
        <View>
          <Text style={styles.activeSessionStats}>
            {Object.keys(session.checkedItems).length} / {session.items.length}
          </Text>
          <Text style={styles.activeSessionResume}>Tap to resume →</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.clearActiveBtn, { backgroundColor: theme.danger + '22', borderColor: theme.danger + '44' }]}
        onPress={() => {
          Alert.alert('Cancel Shopping', `Cancel trip for "${session.listName}"? Progress will be lost.`, [
            { text: 'Keep', style: 'cancel' },
            {
              text: 'Cancel Trip', style: 'destructive',
              onPress: async () => { await ShoppingListStorage.clearActiveSession(session.listId); loadData(); },
            },
          ]);
        }}
      >
        <Text style={[styles.clearActiveBtnText, { color: theme.danger }]}>✕ Cancel trip</Text>
      </TouchableOpacity>
    </View>
  );

  const renderList = ({ item }: { item: ShoppingList }) => {
    const isRenaming = renamingId === item.id;
    const isActive = activeSessions.some(s => s.listId === item.id);

    return (
      <TouchableOpacity
        style={[c.card, styles.listItem]}
        onPress={() => navigation.navigate('ShoppingList', { listId: item.id })}
        activeOpacity={0.75}
      >
        <View style={[styles.listIconBox, { backgroundColor: isActive ? theme.success + '33' : theme.chip }]}>
          <Text style={{ fontSize: 22 }}>{isActive ? '🛒' : '📋'}</Text>
        </View>

        <View style={styles.listInfo}>
          {isRenaming ? (
            <TextInput
              ref={renameInputRef}
              style={[styles.renameInput, { color: theme.text, borderColor: theme.accent, backgroundColor: theme.inputBg }]}
              value={renameValue}
              onChangeText={setRenameValue}
              onBlur={() => commitRename(item.id)}
              onSubmitEditing={() => commitRename(item.id)}
              selectTextOnFocus
              returnKeyType="done"
            />
          ) : (
            <Text style={[styles.listName, { color: theme.text }]}>{item.name}</Text>
          )}
          <Text style={[styles.listMeta, { color: theme.textSubtle }]}>
            {item.items.length} items · {new Date(item.updatedAt).toLocaleDateString()}
            {isActive ? ' · 🟢 Shopping' : ''}
          </Text>
        </View>

        {/* Rename button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.accent + '20' }]}
          onPress={() => isRenaming ? commitRename(item.id) : startRename(item)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.actionBtnText, { color: theme.accent }]}>{isRenaming ? '✓' : '✎'}</Text>
        </TouchableOpacity>

        {/* Share button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.accent + '20', marginLeft: 6 }]}
          onPress={() => handleShareList(item)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.actionBtnText, { color: theme.accent }]}>↑</Text>
        </TouchableOpacity>

        {/* Delete button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.danger + '20', marginLeft: 6 }]}
          onPress={() => deleteList(item.id, item.name)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.actionBtnText, { color: theme.danger }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={c.screen}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* Top nav bar */}
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
        <TouchableOpacity style={[styles.navPill, { backgroundColor: theme.chip }]} onPress={() => navigation.navigate('ItemManager')}>
          <Text style={[styles.navPillText, { color: theme.accent }]}>📦 Items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navPill, { backgroundColor: theme.chip }]} onPress={() => navigation.navigate('History')}>
          <Text style={[styles.navPillText, { color: theme.accent }]}>📊 History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navPill, { backgroundColor: theme.chip }]} onPress={() => navigation.navigate('Theme')}>
          <Text style={[styles.navPillText, { color: theme.accent }]}>🎨 Theme</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lists}
        renderItem={renderList}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* Active sessions — one card per active trip */}
            {activeSessions.map(renderActiveSession)}

            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={c.sectionTitle}>Your Lists</Text>
              <TouchableOpacity
                style={[styles.importBtn, { backgroundColor: theme.chip, borderColor: theme.border }]}
                onPress={handleImportList}
                disabled={isImporting}
              >
                <Text style={[styles.importBtnText, { color: theme.accent }]}>
                  {isImporting ? 'Importing…' : '↓ Import'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={c.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🛍️</Text>
            <Text style={c.emptyText}>No shopping lists yet</Text>
            <Text style={c.emptySubtext}>Tap + to create one or ↓ Import to receive one</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent, ...makeShadow(theme, 'lg') }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.fabText, { color: theme.accentText }]}>+</Text>
      </TouchableOpacity>

      {/* Create List Modal */}
      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={c.modalOverlay}>
          <View style={c.modalCard}>
            <Text style={c.modalTitle}>New Shopping List</Text>
            <TextInput
              style={[c.input, { marginBottom: 20 }]}
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor={theme.placeholder}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              onSubmitEditing={createNewList}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[c.ghostButton, { flex: 1, marginRight: 8 }]} onPress={() => { setModalVisible(false); setNewListName(''); }}>
                <Text style={c.ghostButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[c.primaryButton, { flex: 1, marginLeft: 8 }]} onPress={createNewList}>
                <Text style={c.primaryButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  navPill: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  navPillText: { fontSize: 12, fontWeight: '700' },
  listContainer: { padding: 16, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  importBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  importBtnText: { fontSize: 13, fontWeight: '700' },
  listItem: { flexDirection: 'row', alignItems: 'center' },
  listIconBox: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listInfo: { flex: 1 },
  listName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  listMeta: { fontSize: 12 },
  renameInput: {
    fontSize: 15, fontWeight: '600', borderBottomWidth: 1.5,
    paddingVertical: 2, paddingHorizontal: 0, marginBottom: 3,
  },
  actionBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  activeSessionWrapper: { marginBottom: 12 },
  activeSessionCard: { borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  activeSessionLabel: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, opacity: 0.9, marginBottom: 4 },
  activeSessionName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  activeSessionStats: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'right' },
  activeSessionResume: { color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.85, textAlign: 'right' },
  clearActiveBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  clearActiveBtnText: { fontSize: 13, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 28, right: 22, width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  fabText: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
  modalButtons: { flexDirection: 'row' },
});
