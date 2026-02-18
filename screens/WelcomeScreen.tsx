// screens/WelcomeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingList, ActiveSession } from '../types';

export default function WelcomeScreen({ navigation }: any) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadLists();
      checkActiveSession();
    }, [])
  );

  const checkActiveSession = async () => {
    const session = await ShoppingListStorage.getActiveSession();
    setActiveSession(session);
  };

  const loadLists = async () => {
    const loadedLists = await ShoppingListStorage.getAllLists();
    setLists(loadedLists);
  };

  const createNewList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    const newList: ShoppingList = {
      id: Date.now().toString(),
      name: newListName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
    };

    await ShoppingListStorage.saveList(newList);
    setNewListName('');
    setModalVisible(false);
    loadLists();
  };

  const deleteList = (listId: string, listName: string) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ShoppingListStorage.deleteList(listId);
            loadLists();
          },
        },
      ]
    );
  };

  const renderList = ({ item }: { item: ShoppingList }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => navigation.navigate('ShoppingList', { listId: item.id })}
    >
      <View style={styles.listInfo}>
        <Text style={styles.listName}>{item.name}</Text>
        <Text style={styles.listMeta}>
          {item.items.length} items • Last updated: {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteList(item.id, item.name)}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('ItemManager')}
        >
          <Text style={styles.navButtonText}>📋 Manage Items</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.navButtonText}>📊 History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lists}
        renderItem={renderList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <>
            {/* Active Session Card - Placed here, outside of renderList */}
            {activeSession && (
  <View style={styles.activeSessionWrapper}>
    <TouchableOpacity
      style={styles.activeSessionCard}
      onPress={() => navigation.navigate('ActiveList', { listId: activeSession.listId })}
    >
      <View style={styles.activeSessionHeader}>
        <Text style={styles.activeSessionTitle}>🛒 Active Shopping</Text>
        <Text style={styles.activeSessionName}>{activeSession.listName}</Text>
      </View>
      <View style={styles.activeSessionProgress}>
        <Text style={styles.activeSessionStats}>
          {Object.keys(activeSession.checkedItems).length} / {activeSession.items.length} items
        </Text>
        <Text style={styles.activeSessionResume}>Tap to resume →</Text>
      </View>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={styles.clearActiveButton}
      onPress={() => {
        Alert.alert(
          'Clear Active Shopping',
          `Are you sure you want to cancel "${activeSession.listName}"?\n\nThis will discard all progress and not save to history.`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                await ShoppingListStorage.clearActiveSession();
                setActiveSession(null);
              }
            }
          ]
        );
      }}
    >
      <Text style={styles.clearActiveButtonText}>✕ Cancel</Text>
    </TouchableOpacity>
  </View>
)}
            
            {/* Section Title */}
            <Text style={styles.sectionTitle}>Your Shopping Lists</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shopping lists yet</Text>
            <Text style={styles.emptySubtext}>Tap the button below to create one</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Shopping List</Text>
            <TextInput
              style={styles.input}
              placeholder="List name"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewListName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createNewList}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  activeSessionWrapper: {
  marginBottom: 20,
  position: 'relative',
},
clearActiveButton: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: 'rgba(255,255,255,0.3)',
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 16,
},
clearActiveButtonText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listMeta: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  // Active Session Styles
  activeSessionCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeSessionHeader: {
    marginBottom: 8,
  },
  activeSessionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 4,
  },
  activeSessionName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  activeSessionProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeSessionStats: {
    color: '#fff',
    fontSize: 14,
  },
  activeSessionResume: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});