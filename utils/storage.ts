// utils/storage.ts
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ShoppingList, ShoppingListItem, ShoppingSession, MasterItem, PriceRecord, ActiveSession, BrandVariant } from '../types';
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

  static async addBrandVariant(masterItemId: string, variant: Omit<BrandVariant, 'createdAt' | 'updatedAt' | 'priceHistory'>): Promise<void> {
  try {
    const items = await this.getAllMasterItems();
    const itemIndex = items.findIndex(i => i.id === masterItemId);
    
    if (itemIndex === -1) return;
    
    const item = items[itemIndex];
    const now = Date.now();
    
    const newVariant: BrandVariant = {
      ...variant,
      priceHistory: [{
        price: variant.defaultPrice,
        date: now
      }],
      createdAt: now,
      updatedAt: now
    };
    
    item.variants.push(newVariant);
    item.updatedAt = now;
    
    await this.saveMasterItem(item);
  } catch (error) {
    console.error('Error adding brand variant:', error);
    throw error;
  }
}

static async updateBrandVariant(masterItemId: string, variantIndex: number, updates: Partial<BrandVariant>): Promise<void> {
  try {
    const items = await this.getAllMasterItems();
    const itemIndex = items.findIndex(i => i.id === masterItemId);
    
    if (itemIndex === -1) return;
    
    const item = items[itemIndex];
    if (variantIndex >= item.variants.length) return;
    
    const variant = item.variants[variantIndex];
    const now = Date.now();
    
    // If price changed, add to price history
    if (updates.defaultPrice && updates.defaultPrice !== variant.defaultPrice) {
      variant.priceHistory.push({
        price: updates.defaultPrice,
        date: now
      });
      
      // Recalculate average
      const total = variant.priceHistory.reduce((sum, record) => sum + record.price, 0);
      variant.averagePrice = total / variant.priceHistory.length;
    }
    
    // Update other fields
    if (updates.brand) variant.brand = updates.brand;
    if (updates.imageUri !== undefined) variant.imageUri = updates.imageUri;
    if (updates.defaultPrice) variant.defaultPrice = updates.defaultPrice;
    
    variant.updatedAt = now;
    item.updatedAt = now;
    
    await this.saveMasterItem(item);
  } catch (error) {
    console.error('Error updating brand variant:', error);
    throw error;
  }
}

static async deleteBrandVariant(masterItemId: string, variantIndex: number): Promise<void> {
  try {
    const items = await this.getAllMasterItems();
    const itemIndex = items.findIndex(i => i.id === masterItemId);
    
    if (itemIndex === -1) return;
    
    const item = items[itemIndex];
    if (variantIndex >= item.variants.length) return;
    
    // Delete the variant's image if it exists
    const variant = item.variants[variantIndex];
    if (variant.imageUri) {
      await this.deleteImageIfExists(variant.imageUri);
    }
    
    // Remove the variant
    item.variants.splice(variantIndex, 1);
    
    // Adjust default variant index if needed
    if (item.defaultVariantIndex >= item.variants.length) {
      item.defaultVariantIndex = Math.max(0, item.variants.length - 1);
    }
    
    item.updatedAt = Date.now();
    
    await this.saveMasterItem(item);
  } catch (error) {
    console.error('Error deleting brand variant:', error);
    throw error;
  }
}

static async addPriceToVariantHistory(
  masterItemId: string, 
  variantIndex: number, 
  price: number, 
  listId?: string, 
  listName?: string, 
  receiptImageUri?: string
): Promise<void> {
  try {
    const items = await this.getAllMasterItems();
    const itemIndex = items.findIndex(i => i.id === masterItemId);
    
    if (itemIndex === -1) return;
    
    const item = items[itemIndex];
    if (variantIndex >= item.variants.length) return;
    
    const variant = item.variants[variantIndex];
    
    // Add new price record
    const newRecord: PriceRecord = {
      price,
      date: Date.now(),
      listId,
      listName,
      receiptImageUri
    };
    
    variant.priceHistory.push(newRecord);
    
    // Recalculate average
    const total = variant.priceHistory.reduce((sum, record) => sum + record.price, 0);
    variant.averagePrice = total / variant.priceHistory.length;
    
    // Update default price to latest
    variant.defaultPrice = price;
    variant.updatedAt = Date.now();
    item.updatedAt = Date.now();
    
    await this.saveMasterItem(item);
  } catch (error) {
    console.error('Error adding price to variant history:', error);
    throw error;
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
    // First get the item to get all variant images
    const items = await this.getAllMasterItems();
    const item = items.find(i => i.id === itemId);
    
    if (item) {
      // Delete all variant images
      for (const variant of item.variants) {
        if (variant.imageUri) {
          await this.deleteImageIfExists(variant.imageUri);
        }
      }
    }
    
    // Then delete the item file
    const file = new FileSystem.File(MASTER_ITEMS_DIR, `${itemId}.json`);
    if (file.exists) {
      file.delete();
      console.log('Deleted master item:', itemId);
    }
  } catch (error) {
    console.error('Error deleting master item:', error);
  }
}

  static async addMasterItemToList(listId: string, masterItemId: string, variantIndex: number = 0): Promise<void> {
  const lists = await this.getAllLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return;

  const masterItems = await this.getAllMasterItems();
  const masterItem = masterItems.find(i => i.id === masterItemId);
  if (!masterItem) return;
  
  // Ensure variant index is valid
  const safeVariantIndex = Math.min(variantIndex, masterItem.variants.length - 1);
  const variant = masterItem.variants[safeVariantIndex];

  // Check if this specific variant already exists in list
  const existingItem = list.items.find(
    i => i.masterItemId === masterItemId && i.variantIndex === safeVariantIndex
  );
  
  if (existingItem) {
    console.log('Item variant already in list');
    return;
  }

  const newListItem: ShoppingListItem = {
    masterItemId: masterItem.id,
    variantIndex: safeVariantIndex,
    name: masterItem.name,
    brand: variant.brand,
    lastPrice: variant.defaultPrice,
    averagePrice: variant.averagePrice,
    priceAtAdd: variant.defaultPrice,
    imageUri: variant.imageUri,
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

  static async addPriceToHistory(
  masterItemId: string, 
  variantIndex: number,
  price: number, 
  listId?: string, 
  listName?: string, 
  receiptImageUri?: string
): Promise<void> {
  try {
    const items = await this.getAllMasterItems();
    const itemIndex = items.findIndex(i => i.id === masterItemId);
    
    if (itemIndex === -1) {
      console.error('Master item not found:', masterItemId);
      return;
    }

    const item = items[itemIndex];
    
    // Ensure variant index is valid
    if (variantIndex >= item.variants.length) {
      console.error('Invalid variant index:', variantIndex);
      return;
    }
    
    const variant = item.variants[variantIndex];
    
    // Initialize priceHistory if it doesn't exist
    if (!variant.priceHistory) {
      variant.priceHistory = [];
    }
    
    // Add new price record
    const newRecord: PriceRecord = {
      price,
      date: Date.now(),
      listId,
      listName,
      receiptImageUri
    };
    
    variant.priceHistory.push(newRecord);
    
    // Recalculate average
    const total = variant.priceHistory.reduce((sum, record) => sum + record.price, 0);
    variant.averagePrice = total / variant.priceHistory.length;
    
    // Update default price to latest
    variant.defaultPrice = price;
    variant.updatedAt = Date.now();
    item.updatedAt = Date.now();
    
    // Save the updated item
    await this.saveMasterItem(item);
    
    console.log(`Price history updated for ${item.name} - ${variant.brand}: $${price}`);
  } catch (error) {
    console.error('Error adding price to history:', error);
    throw error;
  }
}

// ─── Called after session is saved to backfill the real session ID ───────────
  static async updateLatestPriceHistorySessionId(
    masterItemId: string,
    variantIndex: number,
    sessionId: string,
    receiptImageUri?: string,
  ): Promise<void> {
    try {
      const items = await this.getAllMasterItems();
      const item = items.find(i => i.id === masterItemId);
      if (!item) return;

      const variant = item.variants[variantIndex];
      if (!variant || !variant.priceHistory?.length) return;

      // The latest record is the one we just added during this shopping trip —
      // it has no listId yet, so we stamp it with the session ID now
      const latest = variant.priceHistory[variant.priceHistory.length - 1];
      if (!latest.listId) {
        latest.listId = sessionId;
        if (receiptImageUri) latest.receiptImageUri = receiptImageUri;
        item.updatedAt = Date.now();
        await this.saveMasterItem(item);
      }
    } catch (error) {
      console.error('Error updating price history session ID:', error);
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
    
    // Get all valid image URIs from master item variants
    const masterItems = await this.getAllMasterItems();
    const validMasterItemImages = new Set<string>();
    
    masterItems.forEach(item => {
      item.variants.forEach(variant => {
        if (variant.imageUri) {
          validMasterItemImages.add(variant.imageUri);
        }
      });
    });
    
    // Get all valid image URIs from shopping list items
    const lists = await this.getAllLists();
    const validListItemImages = new Set<string>();
    
    lists.forEach(list => {
      list.items.forEach(item => {
        if (item.imageUri) {
          validListItemImages.add(item.imageUri);
        }
      });
    });
    
    // Get all valid receipt images from sessions
    const sessions = await this.getSessions();
    const validReceiptImages = new Set(
      sessions
        .map(session => session.receiptImageUri)
        .filter(uri => uri !== undefined) as string[]
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
      // Check if this is an old-style item (has brand property directly)
      const oldItem = item as any;
      
      if (oldItem.brand && !item.variants) {
        // This is an old single-brand item, convert to new structure
        console.log('Converting old item to new structure:', oldItem.name);
        
        const now = Date.now();
        const newVariants: BrandVariant[] = [{
          brand: oldItem.brand || 'Default',
          defaultPrice: oldItem.defaultPrice || 0,
          averagePrice: oldItem.averagePrice || 0,
          priceHistory: oldItem.priceHistory || [{
            price: oldItem.defaultPrice || 0,
            date: oldItem.createdAt || now
          }],
          imageUri: oldItem.imageUri,
          createdAt: oldItem.createdAt || now,
          updatedAt: oldItem.updatedAt || now
        }];
        
        // Create new structure item
        const newItem: MasterItem = {
          id: item.id,
          name: item.name,
          variants: newVariants,
          defaultVariantIndex: 0,
          createdAt: item.createdAt,
          updatedAt: now
        };
        
        // Save the converted item
        await this.saveMasterItem(newItem);
        needsUpdate = true;
        console.log('Converted item:', item.name);
      } 
      // For new-style items, just ensure each variant has priceHistory
      else if (item.variants) {
        let itemNeedsUpdate = false;
        
        for (const variant of item.variants) {
          if (!variant.priceHistory || variant.priceHistory.length === 0) {
            // Initialize price history for this variant
            variant.priceHistory = [{
              price: variant.defaultPrice,
              date: variant.createdAt || Date.now()
            }];
            variant.averagePrice = variant.defaultPrice;
            variant.updatedAt = Date.now();
            itemNeedsUpdate = true;
          }
        }
        
        if (itemNeedsUpdate) {
          item.updatedAt = Date.now();
          await this.saveMasterItem(item);
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      console.log('Migration completed successfully');
    } else {
      console.log('No migration needed');
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