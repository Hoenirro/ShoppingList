// utils/storage.ts
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ShoppingList, ShoppingListItem, ShoppingSession, MasterItem, PriceRecord, ActiveSession } from '../types';
import * as ImageManipulator from 'expo-image-manipulator';

// Use the new Paths API for base directories
const { Paths } = FileSystem;

// Define directory paths using the new Directory class
const LISTS_DIR = new FileSystem.Directory(Paths.document, 'shopping_lists');
const IMAGES_DIR = new FileSystem.Directory(Paths.document, 'images');
const PRODUCTS_IMAGES_DIR = new FileSystem.Directory(IMAGES_DIR, 'products');
const RECEIPTS_IMAGES_DIR = new FileSystem.Directory(IMAGES_DIR, 'receipts');
const SESSIONS_DIR = new FileSystem.Directory(Paths.document, 'sessions');
const MASTER_ITEMS_DIR = new FileSystem.Directory(Paths.document, 'master_items');

export class ShoppingListStorage {
  static async initialize() {
    // Create necessary directories using the new API
    const dirs = [LISTS_DIR, PRODUCTS_IMAGES_DIR, RECEIPTS_IMAGES_DIR, SESSIONS_DIR, MASTER_ITEMS_DIR];
    for (const dir of dirs) {
      try {
        if (!dir.exists) {
          dir.create({ intermediates: true });
        }
      } catch (error) {
        console.error(`Error creating directory ${dir.uri}:`, error);
      }
    }
  }

  static async downsampleImage(uri: string, maxSize: number = 300): Promise<string> {
  try {
    // First, get image dimensions
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        // Resize to max dimension (creates pixelation/downsampling effect)
        { resize: { width: maxSize, height: maxSize } }
      ],
      { 
        compress: 0.5, // Lower compression (0.5 = 50% quality)
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    
    console.log(`Downsampled image from ${uri} to ${manipResult.uri}`);
    return manipResult.uri;
  } catch (error) {
    console.error('Error downsampling image:', error);
    return uri; // Return original if fails
  }
}

  // ============= MASTER ITEMS METHODS =============

  static async getAllMasterItems(): Promise<MasterItem[]> {
    try {
      if (!MASTER_ITEMS_DIR.exists) {
        return [];
      }

      const contents = MASTER_ITEMS_DIR.list();
      const items: MasterItem[] = [];
      
      for (const item of contents) {
        if (item instanceof FileSystem.File && item.uri.endsWith('.json')) {
          const content = await item.text();
          items.push(JSON.parse(content));
        }
      }
      
      return items.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error reading master items:', error);
      return [];
    }
  }

  static async saveMasterItem(item: MasterItem): Promise<void> {
    try {
      const file = new FileSystem.File(MASTER_ITEMS_DIR, `${item.id}.json`);
      
      if (!MASTER_ITEMS_DIR.exists) {
        MASTER_ITEMS_DIR.create({ intermediates: true });
      }
      
      await file.write(JSON.stringify(item, null, 2));
    } catch (error) {
      console.error('Error saving master item:', error);
      throw error;
    }
  }

  static async deleteMasterItem(itemId: string): Promise<void> {
    try {
      // First get the item to get its image URI
      const items = await this.getAllMasterItems();
      const item = items.find(i => i.id === itemId);
      
      if (item?.imageUri) {
        // Delete the associated image
        await this.deleteImageIfExists(item.imageUri);
      }
      
      // Then delete the item file
      const file = new FileSystem.File(MASTER_ITEMS_DIR, `${itemId}.json`);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error('Error deleting master item:', error);
    }
  }

  static async addMasterItemToList(listId: string, masterItemId: string): Promise<void> {
    const lists = await this.getAllLists();
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const masterItems = await this.getAllMasterItems();
    const masterItem = masterItems.find(i => i.id === masterItemId);
    if (!masterItem) return;

    // Check if item already exists in list
    const existingItem = list.items.find(i => i.masterItemId === masterItemId);
    if (existingItem) {
      console.log('Item already in list');
      return;
    }

    const newListItem: ShoppingListItem = {
      masterItemId: masterItem.id,
      name: masterItem.name,
      brand: masterItem.brand,
      lastPrice: masterItem.defaultPrice,
      averagePrice: masterItem.averagePrice,
      priceAtAdd: masterItem.defaultPrice,
      imageUri: masterItem.imageUri,
      addedAt: Date.now()
    };

    list.items.push(newListItem);
    list.updatedAt = Date.now();
    await this.saveList(list);
  }

  // ============= SHOPPING LISTS METHODS =============

  static async getAllLists(): Promise<ShoppingList[]> {
    try {
      if (!LISTS_DIR.exists) {
        return [];
      }

      const contents = LISTS_DIR.list();
      const lists: ShoppingList[] = [];
      
      for (const item of contents) {
        if (item instanceof FileSystem.File && item.uri.endsWith('.json')) {
          const content = await item.text();
          lists.push(JSON.parse(content));
        }
      }
      
      return lists.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error reading lists:', error);
      return [];
    }
  }

  static async saveList(list: ShoppingList): Promise<void> {
    try {
      const file = new FileSystem.File(LISTS_DIR, `${list.id}.json`);
      
      if (!LISTS_DIR.exists) {
        LISTS_DIR.create({ intermediates: true });
      }
      
      await file.write(JSON.stringify(list, null, 2));
    } catch (error) {
      console.error('Error saving list:', error);
      throw error;
    }
  }

  static async deleteList(listId: string): Promise<void> {
    try {
      // First get the list to get all item images
      const lists = await this.getAllLists();
      const list = lists.find(l => l.id === listId);
      
      if (list) {
        // Delete all item images in this list
        for (const item of list.items) {
          if (item.imageUri) {
            await this.deleteImageIfExists(item.imageUri);
          }
        }
      }
      
      // Then delete the list file
      const file = new FileSystem.File(LISTS_DIR, `${listId}.json`);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  }

  // ============= SESSIONS METHODS =============

  static async saveSession(session: ShoppingSession): Promise<void> {
    try {
      const file = new FileSystem.File(SESSIONS_DIR, `${session.id}.json`);
      
      if (!SESSIONS_DIR.exists) {
        SESSIONS_DIR.create({ intermediates: true });
      }
      
      await file.write(JSON.stringify(session, null, 2));
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  static async getSessions(): Promise<ShoppingSession[]> {
    try {
      if (!SESSIONS_DIR.exists) {
        return [];
      }

      const contents = SESSIONS_DIR.list();
      const sessions: ShoppingSession[] = [];
      
      for (const item of contents) {
        if (item instanceof FileSystem.File && item.uri.endsWith('.json')) {
          const content = await item.text();
          sessions.push(JSON.parse(content));
        }
      }
      
      return sessions.sort((a, b) => b.date - a.date);
    } catch (error) {
      console.error('Error reading sessions:', error);
      return [];
    }
  }

  static async getSession(sessionId: string): Promise<ShoppingSession | null> {
    try {
      const file = new FileSystem.File(SESSIONS_DIR, `${sessionId}.json`);
      if (!file.exists) {
        return null;
      }
      
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading session:', error);
      return null;
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    try {
      // First get the session to get receipt image
      const sessions = await this.getSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session?.receiptImageUri) {
        // Delete the receipt image
        await this.deleteImageIfExists(session.receiptImageUri);
      }
      
      // Then delete the session file
      const file = new FileSystem.File(SESSIONS_DIR, `${sessionId}.json`);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  // ============= PRICE HISTORY METHODS =============

  static async addPriceToHistory(masterItemId: string, price: number, listId?: string, listName?: string, receiptImageUri?: string): Promise<void> {
    try {
      const items = await this.getAllMasterItems();
      const itemIndex = items.findIndex(i => i.id === masterItemId);
      
      if (itemIndex === -1) {
        console.error('Master item not found:', masterItemId);
        return;
      }

      const item = items[itemIndex];
      
      // Initialize priceHistory if it doesn't exist
      if (!item.priceHistory) {
        item.priceHistory = [];
      }
      
      // Add new price record
      const newRecord: PriceRecord = {
        price,
        date: Date.now(),
        listId,
        listName,
        receiptImageUri
      };
      
      item.priceHistory.push(newRecord);
      
      // Recalculate average
      const total = item.priceHistory.reduce((sum, record) => sum + record.price, 0);
      item.averagePrice = total / item.priceHistory.length;
      
      // Update default price to latest
      item.defaultPrice = price;
      item.updatedAt = Date.now();
      
      // Save the updated item
      await this.saveMasterItem(item);
      
      console.log('Price history updated for item:', item.name);
    } catch (error) {
      console.error('Error adding price to history:', error);
      throw error;
    }
  }

  static async saveActiveSession(session: ActiveSession): Promise<void> {
  try {
    const file = new FileSystem.File(Paths.document, 'active_session.json');
    await file.write(JSON.stringify(session, null, 2));
  } catch (error) {
    console.error('Error saving active session:', error);
    throw error;
  }
}

static async getActiveSession(): Promise<ActiveSession | null> {
  try {
    const file = new FileSystem.File(Paths.document, 'active_session.json');
    if (!file.exists) {
      return null;
    }
    const content = await file.text();
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading active session:', error);
    return null;
  }
}

static async clearActiveSession(): Promise<void> {
  try {
    const file = new FileSystem.File(Paths.document, 'active_session.json');
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Error clearing active session:', error);
  }
}

  // ============= IMAGE METHODS =============

  static async saveImage(uri: string, type: 'product' | 'receipt'): Promise<string> {
  try {
    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;
    const destDir = type === 'product' ? PRODUCTS_IMAGES_DIR : RECEIPTS_IMAGES_DIR;
    
    // Ensure destination directory exists
    if (!destDir.exists) {
      destDir.create({ intermediates: true });
    }
    
    const destUri = `${destDir.uri}${filename}`;
    
    // Manipulate and save directly to destination
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300, height: 300 } }],
      { 
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    
    // If manipulateAsync saved to a different location, move it
    if (manipResult.uri !== destUri) {
      const tempFile = new FileSystem.File(manipResult.uri);
      const destFile = new FileSystem.File(destUri);
      await tempFile.move(destFile);
    }
    
    // Delete original camera image
    const originalFile = new FileSystem.File(uri);
    if (originalFile.exists) {
      await originalFile.delete();
    }
    
    return destUri;
    
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

  static async pickImage(): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to take photos');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  }

  static async deleteImageIfExists(imageUri: string | undefined) {
    if (!imageUri) return;
    
    try {
      // Check if the file exists
      const file = new FileSystem.File(imageUri);
      if (file.exists) {
        await file.delete();
        console.log('Deleted image:', imageUri);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  // ============= CLEANUP METHOD =============

  static async cleanupOrphanedImages() {
    try {
      console.log('Starting orphaned images cleanup...');
      
      // Get all valid image URIs from master items
      const masterItems = await this.getAllMasterItems();
      const validMasterItemImages = new Set(
        masterItems
          .map(item => item.imageUri)
          .filter(uri => uri !== undefined)
      );
      
      // Get all valid image URIs from shopping list items
      const lists = await this.getAllLists();
      const validListItemImages = new Set(
        lists.flatMap(list => 
          list.items
            .map(item => item.imageUri)
            .filter(uri => uri !== undefined)
        )
      );
      
      // Get all valid receipt images from sessions
      const sessions = await this.getSessions();
      const validReceiptImages = new Set(
        sessions
          .map(session => session.receiptImageUri)
          .filter(uri => uri !== undefined)
      );
      
      // Get all image files from products directory
      if (PRODUCTS_IMAGES_DIR.exists) {
        const productImages = PRODUCTS_IMAGES_DIR.list();
        for (const file of productImages) {
          if (file instanceof FileSystem.File) {
            // If image is not in any valid set, delete it
            if (!validMasterItemImages.has(file.uri) && !validListItemImages.has(file.uri)) {
              console.log('Deleting orphaned product image:', file.uri);
              file.delete();
            }
          }
        }
      }
      
      // Get all image files from receipts directory
      if (RECEIPTS_IMAGES_DIR.exists) {
        const receiptImages = RECEIPTS_IMAGES_DIR.list();
        for (const file of receiptImages) {
          if (file instanceof FileSystem.File) {
            if (!validReceiptImages.has(file.uri)) {
              console.log('Deleting orphaned receipt image:', file.uri);
              file.delete();
            }
          }
        }
      }
      
      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // ============= MIGRATION METHOD =============

  static async migrateExistingItems() {
    try {
      const items = await this.getAllMasterItems();
      let needsUpdate = false;
      
      for (const item of items) {
        if (!item.priceHistory) {
          // Initialize priceHistory with default price
          item.priceHistory = [{
            price: item.defaultPrice || 0,
            date: item.createdAt || Date.now()
          }];
          item.averagePrice = item.defaultPrice || 0;
          needsUpdate = true;
          
          await this.saveMasterItem(item);
          console.log('Migrated item:', item.name);
        }
      }
      
      if (needsUpdate) {
        console.log('Migration completed successfully');
      }
    } catch (error) {
      console.error('Error during migration:', error);
    }
  }

  // ============= UTILITY METHODS =============

  static calculateAveragePrice(items: ShoppingListItem[]): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + item.lastPrice, 0);
    return sum / items.length;
  }
}