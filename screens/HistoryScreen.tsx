// screens/HistoryScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShoppingListStorage } from '../utils/storage';
import { ShoppingSession } from '../types';

export default function HistoryScreen({ navigation }: any) {
  const [sessions, setSessions] = useState<ShoppingSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    // In a real app, you'd load from a sessions file
    // For now, we'll create mock data or load from storage
    const loadedSessions = await ShoppingListStorage.getSessions();
    setSessions(loadedSessions.sort((a, b) => b.date - a.date));
  };

  const renderSession = ({ item }: { item: ShoppingSession }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => navigation.navigate('SessionDetails', { sessionId: item.id })}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionName}>{item.listName}</Text>
        <Text style={styles.sessionDate}>
          {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
        </Text>
      </View>
      
      <View style={styles.sessionDetails}>
        <Text style={styles.itemCount}>
          {item.items.length} items
        </Text>
        <Text style={styles.totalPrice}>
          Total: ${item.total.toFixed(2)}
        </Text>
      </View>
      
      {item.receiptImageUri && (
        <Image source={{ uri: item.receiptImageUri }} style={styles.receiptThumbnail} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shopping history yet</Text>
            <Text style={styles.emptySubtext}>
              Complete a shopping session to see it here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 12,
    color: '#666',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  receiptThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 4,
    marginTop: 12,
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
});