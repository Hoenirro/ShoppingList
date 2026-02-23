// utils/storage.ts
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ShoppingList, ShoppingListItem, ShoppingSession, MasterItem, PriceRecord, ActiveSession, BrandVariant } from '../types';

const { Paths } = FileSystem;

const LISTS_DIR = new FileSystem.Directory(Paths.document, 'shopping_lists');
const IMAGES_DIR = new FileSystem.Directory(Paths.document, 'images');
const PRODUCTS_IMAGES_DIR = new FileSystem.Directory(IMAGES_DIR, 'products');
const RECEIPTS_IMAGES_DIR = new FileSystem.Directory(IMAGES_DIR, 'receipts');
const SESSIONS_DIR = new FileSystem.Directory(Paths.document, 'sessions');
const MASTER_ITEMS_DIR = new FileSystem.Directory(Paths.document, 'master_items');
// Each active session stored as active_session_<listId>.json
const activeSessionFile = (listId: string) =>
  new FileSystem.File(Paths.document, `active_session_${listId}.json`);
// Legacy single-session file (migrated on first boot)
const LEGACY_ACTIVE_FILE = new FileSystem.File(Paths.document, 'active_session.json');

export class ShoppingListStorage {
  static async initialize() {
    const dirs = [LISTS_DIR, PRODUCTS_IMAGES_DIR, RECEIPTS_IMAGES_DIR, SESSIONS_DIR, MASTER_ITEMS_DIR];
    for (const dir of dirs) {
      try { if (!dir.exists) dir.create({ intermediates: true }); }
      catch (error) { console.error(`Error creating directory ${dir.uri}:`, error); }
    }
    // Migrate legacy single active session file if present
    try {
      if (LEGACY_ACTIVE_FILE.exists) {
        const content = await LEGACY_ACTIVE_FILE.text();
        const session: ActiveSession = JSON.parse(content);
        if (session?.listId) {
          const dest = activeSessionFile(session.listId);
          await dest.write(content);
        }
        LEGACY_ACTIVE_FILE.delete();
      }
    } catch { /* non-critical */ }

    // Seed the default "Basics Basket" list on first install
    await this.seedDefaultList();
  }

  /**
   * On the very first launch, load TheBasicsBasket.shoplist from the app's
   * assets and save it as a real list — no "(imported)" suffix, no dialog.
   * A tiny flag file in the document directory prevents it running again.
   */
  static async seedDefaultList(): Promise<void> {
  try {
    const flagFile = new FileSystem.File(Paths.document, '.seeded_v1');
    if (flagFile.exists) return; // already done

    const parsed = {
      version: 2,
      list: {
        name: "The Basics Basket",
        items: [
          { name: "Milk", brand: "Store Brand", masterItemId: "default_001", variantIndex: 0, category: "🥛 Dairy" },
          { name: "Eggs", brand: "Store Brand", masterItemId: "default_002", variantIndex: 0, category: "🥛 Dairy" },
          { name: "Butter", brand: "Store Brand", masterItemId: "default_003", variantIndex: 0, category: "🥛 Dairy" },
          { name: "Cheddar Cheese", brand: "Store Brand", masterItemId: "default_004", variantIndex: 0, category: "🥛 Dairy" },
          { name: "Greek Yogurt", brand: "Store Brand", masterItemId: "default_005", variantIndex: 0, category: "🥛 Dairy" },
          { name: "Bread", brand: "Store Brand", masterItemId: "default_006", variantIndex: 0, category: "🍞 Bakery" },
          { name: "Chicken Breast", brand: "Store Brand", masterItemId: "default_007", variantIndex: 0, category: "🥩 Meat" },
          { name: "Ground Beef", brand: "Store Brand", masterItemId: "default_008", variantIndex: 0, category: "🥩 Meat" },
          { name: "Salmon Fillets", brand: "Store Brand", masterItemId: "default_009", variantIndex: 0, category: "🥩 Meat" },
          { name: "Bananas", brand: "Fresh", masterItemId: "default_010", variantIndex: 0, category: "🥦 Produce" },
          { name: "Apples", brand: "Fresh", masterItemId: "default_011", variantIndex: 0, category: "🥦 Produce" },
          { name: "Baby Spinach", brand: "Fresh", masterItemId: "default_012", variantIndex: 0, category: "🥦 Produce" },
          { name: "Tomatoes", brand: "Fresh", masterItemId: "default_013", variantIndex: 0, category: "🥦 Produce" },
          { name: "Onions", brand: "Fresh", masterItemId: "default_014", variantIndex: 0, category: "🥦 Produce" },
          { name: "Garlic", brand: "Fresh", masterItemId: "default_015", variantIndex: 0, category: "🥦 Produce" },
          { name: "Potatoes", brand: "Fresh", masterItemId: "default_016", variantIndex: 0, category: "🥦 Produce" },
          { name: "Broccoli", brand: "Fresh", masterItemId: "default_017", variantIndex: 0, category: "🥦 Produce" },
          { name: "Carrots", brand: "Fresh", masterItemId: "default_018", variantIndex: 0, category: "🥦 Produce" },
          { name: "Frozen Peas", brand: "Store Brand", masterItemId: "default_019", variantIndex: 0, category: "🧊 Frozen" },
          { name: "Orange Juice", brand: "Store Brand", masterItemId: "default_020", variantIndex: 0, category: "🥤 Drinks" },
          { name: "Sparkling Water", brand: "Store Brand", masterItemId: "default_021", variantIndex: 0, category: "🥤 Drinks" },
          { name: "Coffee", brand: "Store Brand", masterItemId: "default_022", variantIndex: 0, category: "🥤 Drinks" },
          { name: "Pasta", brand: "Store Brand", masterItemId: "default_023", variantIndex: 0, category: "🥫 Canned / Pantry" },
          { name: "Rice", brand: "Store Brand", masterItemId: "default_024", variantIndex: 0, category: "🥫 Canned / Pantry" },
          { name: "Canned Tomatoes", brand: "Store Brand", masterItemId: "default_025", variantIndex: 0, category: "🥫 Canned / Pantry" },
          { name: "Olive Oil", brand: "Store Brand", masterItemId: "default_026", variantIndex: 0, category: "🥫 Canned / Pantry" },
          { name: "Oats", brand: "Store Brand", masterItemId: "default_027", variantIndex: 0, category: "🥫 Canned / Pantry" },
          { name: "Peanut Butter", brand: "Store Brand", masterItemId: "default_028", variantIndex: 0, category: "🥫 Canned / Pantry" },
          { name: "Dish Soap", brand: "Store Brand", masterItemId: "default_029", variantIndex: 0, category: "🧹 Cleaning" },
          { name: "Laundry Detergent", brand: "Store Brand", masterItemId: "default_030", variantIndex: 0, category: "🧹 Cleaning" },
          { name: "Paper Towels", brand: "Store Brand", masterItemId: "default_031", variantIndex: 0, category: "🧹 Cleaning" },
          { name: "Toilet Paper", brand: "Store Brand", masterItemId: "default_032", variantIndex: 0, category: "🧹 Cleaning" },
          { name: "Shampoo", brand: "Store Brand", masterItemId: "default_033", variantIndex: 0, category: "🧴 Toiletries" },
          { name: "Toothpaste", brand: "Store Brand", masterItemId: "default_034", variantIndex: 0, category: "🧴 Toiletries" },
          { name: "Chips", brand: "Store Brand", masterItemId: "default_035", variantIndex: 0, category: "🍪 Snacks" },
          { name: "Dark Chocolate", brand: "Store Brand", masterItemId: "default_036", variantIndex: 0, category: "🧁 Sweets" },
        ],
      },
    };

    const now = Date.now();

    // Build master items and get resolved IDs (same logic as manual import)
    const masterItemMap = await this.findOrCreateMasterItemsFromImport(
      parsed.list.items.map((i: any) => ({
        name: i.name,
        brand: i.brand,
        category: i.category,
      }))
    );

    const newList: ShoppingList = {
      id: now.toString(),
      name: parsed.list.name, // ← exact name, no suffix
      createdAt: now,
      updatedAt: now,
      items: parsed.list.items.map((item: any): ShoppingListItem => {
        const key = `${item.name.trim()}__${item.brand.trim()}`;
        const resolved = masterItemMap.get(key);
        return {
          masterItemId: resolved?.masterItemId ?? item.masterItemId,
          variantIndex: resolved?.variantIndex ?? item.variantIndex,
          name: item.name,
          brand: item.brand,
          category: item.category,
          lastPrice: 0,
          priceAtAdd: 0,
          averagePrice: 0,
          imageUri: undefined,
          addedAt: now,
        };
      }),
    };

    await this.saveList(newList);

    // Write the flag so this never runs again
    await flagFile.write('1');
  } catch (error) {
    // Non-fatal — app works fine without the seed
    console.warn('seedDefaultList failed:', error);
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
        priceHistory: [{ price: variant.defaultPrice, date: now }],
        createdAt: now,
        updatedAt: now,
      };
      item.variants.push(newVariant);
      item.updatedAt = now;
      await this.saveMasterItem(item);
    } catch (error) { console.error('Error adding brand variant:', error); throw error; }
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
      if (updates.defaultPrice && updates.defaultPrice !== variant.defaultPrice) {
        variant.priceHistory.push({ price: updates.defaultPrice, date: now });
        const total = variant.priceHistory.reduce((sum, record) => sum + record.price, 0);
        variant.averagePrice = total / variant.priceHistory.length;
      }
      if (updates.brand) variant.brand = updates.brand;
      if (updates.imageUri !== undefined) variant.imageUri = updates.imageUri;
      if (updates.defaultPrice) variant.defaultPrice = updates.defaultPrice;
      variant.updatedAt = now;
      item.updatedAt = now;
      await this.saveMasterItem(item);
    } catch (error) { console.error('Error updating brand variant:', error); throw error; }
  }

  // ============= MASTER ITEMS =============

  static async getAllMasterItems(): Promise<MasterItem[]> {
    try {
      if (!MASTER_ITEMS_DIR.exists) return [];
      const files = MASTER_ITEMS_DIR.list();
      const items: MasterItem[] = [];
      for (const file of files) {
        if (file instanceof FileSystem.File && file.name.endsWith('.json')) {
          try {
            const content = await file.text();
            items.push(JSON.parse(content));
          } catch { /* skip corrupt */ }
        }
      }
      return items.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) { console.error('Error getting master items:', error); return []; }
  }

  static async saveMasterItem(item: MasterItem): Promise<void> {
    try {
      if (!MASTER_ITEMS_DIR.exists) MASTER_ITEMS_DIR.create({ intermediates: true });
      const file = new FileSystem.File(MASTER_ITEMS_DIR, `${item.id}.json`);
      await file.write(JSON.stringify(item, null, 2));
    } catch (error) { console.error('Error saving master item:', error); throw error; }
  }

  static async deleteMasterItem(id: string): Promise<void> {
    try {
      const file = new FileSystem.File(MASTER_ITEMS_DIR, `${id}.json`);
      if (file.exists) file.delete();
    } catch (error) { console.error('Error deleting master item:', error); }
  }

  static async findOrCreateMasterItemsFromImport(
    importedItems: { name: string; brand: string; category?: string }[]
  ): Promise<Map<string, { masterItemId: string; variantIndex: number }>> {
    const existingItems = await this.getAllMasterItems();
    const result = new Map<string, { masterItemId: string; variantIndex: number }>();
    const updatedItems = [...existingItems];

    for (const imported of importedItems) {
      const nameKey = imported.name.trim().toLowerCase();
      const brandKey = imported.brand.trim().toLowerCase();
      const mapKey = `${imported.name.trim()}__${imported.brand.trim()}`;

      const existingItem = updatedItems.find(i => i.name.trim().toLowerCase() === nameKey);

      if (!existingItem) {
        // Create new master item
        const now = Date.now();
        const newItem: MasterItem = {
          id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
          name: imported.name.trim(),
          category: imported.category,
          variants: [{
            brand: imported.brand.trim(),
            defaultPrice: 0,
            averagePrice: 0,
            priceHistory: [],
            createdAt: now,
            updatedAt: now,
          }],
          defaultVariantIndex: 0,
          createdAt: now,
          updatedAt: now,
        };
        await this.saveMasterItem(newItem);
        updatedItems.push(newItem);
        result.set(mapKey, { masterItemId: newItem.id, variantIndex: 0 });
      } else {
        const variantIdx = existingItem.variants.findIndex(
          v => v.brand.trim().toLowerCase() === brandKey
        );
        if (variantIdx !== -1) {
          result.set(mapKey, { masterItemId: existingItem.id, variantIndex: variantIdx });
        } else {
          // Add new brand variant
          const now = Date.now();
          existingItem.variants.push({
            brand: imported.brand.trim(),
            defaultPrice: 0,
            averagePrice: 0,
            priceHistory: [],
            createdAt: now,
            updatedAt: now,
          });
          existingItem.updatedAt = now;
          await this.saveMasterItem(existingItem);
          result.set(mapKey, { masterItemId: existingItem.id, variantIndex: existingItem.variants.length - 1 });
        }
      }
    }
    return result;
  }

  // ============= SHOPPING LISTS =============

  static async getAllLists(): Promise<ShoppingList[]> {
    try {
      if (!LISTS_DIR.exists) return [];
      const files = LISTS_DIR.list();
      const lists: ShoppingList[] = [];
      for (const file of files) {
        if (file instanceof FileSystem.File && file.name.endsWith('.json')) {
          try {
            const content = await file.text();
            lists.push(JSON.parse(content));
          } catch { /* skip corrupt */ }
        }
      }
      return lists.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) { console.error('Error getting lists:', error); return []; }
  }

  static async addMasterItemToList(listId: string, masterItemId: string, variantIndex: number = 0): Promise<void> {
    const lists = await this.getAllLists();
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    if (list.items.some(i => i.masterItemId === masterItemId)) return;

    const masterItems = await this.getAllMasterItems();
    const masterItem = masterItems.find(i => i.id === masterItemId);
    if (!masterItem) return;

    const variant = masterItem.variants[variantIndex] || masterItem.variants[0];
    const newItem: ShoppingListItem = {
      masterItemId,
      variantIndex,
      name: masterItem.name,
      brand: variant.brand,
      lastPrice: variant.defaultPrice,
      averagePrice: variant.averagePrice,
      priceAtAdd: variant.defaultPrice,
      imageUri: variant.imageUri,
      category: masterItem.category,
      addedAt: Date.now(),
    };
    await this.saveList({ ...list, items: [...list.items, newItem], updatedAt: Date.now() });
  }

  static async saveList(list: ShoppingList): Promise<void> {
    try {
      const file = new FileSystem.File(LISTS_DIR, `${list.id}.json`);
      if (!LISTS_DIR.exists) LISTS_DIR.create({ intermediates: true });
      await file.write(JSON.stringify(list, null, 2));
    } catch (error) { console.error('Error saving list:', error); throw error; }
  }

  static async renameList(listId: string, newName: string): Promise<void> {
    const lists = await this.getAllLists();
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    await this.saveList({ ...list, name: newName.trim(), updatedAt: Date.now() });
    // Also update the name in any active session for this list
    const session = await this.getActiveSession(listId);
    if (session) {
      await this.saveActiveSession({ ...session, listName: newName.trim() });
    }
  }

  static async deleteList(listId: string): Promise<void> {
    try {
      const lists = await this.getAllLists();
      const list = lists.find(l => l.id === listId);
      if (list) {
        for (const item of list.items) {
          if (item.imageUri) await this.deleteImageIfExists(item.imageUri);
        }
      }
      const file = new FileSystem.File(LISTS_DIR, `${listId}.json`);
      if (file.exists) file.delete();
    } catch (error) { console.error('Error deleting list:', error); }
  }

  // ============= SESSIONS =============

  static async saveSession(session: ShoppingSession): Promise<void> {
    try {
      const file = new FileSystem.File(SESSIONS_DIR, `${session.id}.json`);
      if (!SESSIONS_DIR.exists) SESSIONS_DIR.create({ intermediates: true });
      await file.write(JSON.stringify(session, null, 2));
    } catch (error) { console.error('Error saving session:', error); throw error; }
  }

  static async getSessions(): Promise<ShoppingSession[]> {
    try {
      if (!SESSIONS_DIR.exists) return [];
      const files = SESSIONS_DIR.list();
      const sessions: ShoppingSession[] = [];
      for (const file of files) {
        if (file instanceof FileSystem.File && file.name.endsWith('.json')) {
          try {
            const content = await file.text();
            sessions.push(JSON.parse(content));
          } catch { /* skip corrupt */ }
        }
      }
      return sessions.sort((a, b) => b.date - a.date);
    } catch (error) { console.error('Error getting sessions:', error); return []; }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const file = new FileSystem.File(SESSIONS_DIR, `${sessionId}.json`);
      if (file.exists) file.delete();
    } catch (error) { console.error('Error deleting session:', error); }
  }

  // ============= ACTIVE SESSIONS (multiple, keyed by listId) =============

  static async saveActiveSession(session: ActiveSession): Promise<void> {
    try {
      const file = activeSessionFile(session.listId);
      await file.write(JSON.stringify(session, null, 2));
    } catch (error) { console.error('Error saving active session:', error); throw error; }
  }

  static async getActiveSession(listId: string): Promise<ActiveSession | null> {
    try {
      const file = activeSessionFile(listId);
      if (!file.exists) return null;
      return JSON.parse(await file.text());
    } catch { return null; }
  }

  static async getAllActiveSessions(): Promise<ActiveSession[]> {
    try {
      const docDir = new FileSystem.Directory(Paths.document);
      const files = docDir.list();
      const sessions: ActiveSession[] = [];
      for (const file of files) {
        if (file instanceof FileSystem.File && file.name.startsWith('active_session_') && file.name.endsWith('.json')) {
          try {
            const content = await file.text();
            sessions.push(JSON.parse(content));
          } catch { /* skip corrupt */ }
        }
      }
      return sessions;
    } catch { return []; }
  }

  static async clearActiveSession(listId: string): Promise<void> {
    try {
      const file = activeSessionFile(listId);
      if (file.exists) file.delete();
    } catch (error) { console.error('Error clearing active session:', error); }
  }

  static async isListActivelyBeingShopped(listId: string): Promise<boolean> {
    const session = await this.getActiveSession(listId);
    return session !== null;
  }

  // ============= PRICE HISTORY =============

  static async addPriceToHistory(
    masterItemId: string,
    variantIndex: number,
    price: number,
    listId?: string,
    listName?: string,
  ): Promise<void> {
    try {
      const items = await this.getAllMasterItems();
      const item = items.find(i => i.id === masterItemId);
      if (!item || !item.variants[variantIndex]) return;
      const variant = item.variants[variantIndex];
      const record: PriceRecord = { price, date: Date.now(), listId, listName };
      if (!variant.priceHistory) variant.priceHistory = [];
      variant.priceHistory.push(record);
      const total = variant.priceHistory.reduce((s, r) => s + r.price, 0);
      variant.averagePrice = total / variant.priceHistory.length;
      variant.defaultPrice = price;
      variant.updatedAt = Date.now();
      item.updatedAt = Date.now();
      await this.saveMasterItem(item);
    } catch (error) { console.error('Error adding price to history:', error); }
  }

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

  // ============= MIGRATION =============

  static async migrateExistingItems(): Promise<void> {
    try {
      const items = await this.getAllMasterItems();
      let needsSave = false;
      for (const item of items) {
        for (const variant of item.variants) {
          if (!variant.priceHistory) { variant.priceHistory = []; needsSave = true; }
          if (!variant.averagePrice) {
            variant.averagePrice = variant.priceHistory.length
              ? variant.priceHistory.reduce((s, r) => s + r.price, 0) / variant.priceHistory.length
              : variant.defaultPrice;
            needsSave = true;
          }
          if (!variant.createdAt) { variant.createdAt = item.createdAt || Date.now(); needsSave = true; }
          if (!variant.updatedAt) { variant.updatedAt = item.updatedAt || Date.now(); needsSave = true; }
        }
        if (needsSave) await this.saveMasterItem(item);
      }
    } catch (error) { console.error('Error migrating items:', error); }
  }

  // ============= IMAGES =============

  static async saveImage(uri: string, type: 'product' | 'receipt'): Promise<string> {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}.jpg`;
      const destDir = type === 'product' ? PRODUCTS_IMAGES_DIR : RECEIPTS_IMAGES_DIR;
      if (!destDir.exists) destDir.create({ intermediates: true });
      const manipulated = await ImageManipulator.manipulateAsync(
        uri, [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const srcFile = new FileSystem.File(manipulated.uri);
      const destFile = new FileSystem.File(destDir, filename);
      srcFile.copy(destFile);
      return destFile.uri;
    } catch (error) { console.error('Error saving image:', error); throw error; }
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

  public static async deleteImageIfExists(uri: string): Promise<void> {
    try {
      const file = new FileSystem.File(uri);
      if (file.exists) file.delete();
    } catch { /* non-critical */ }
  }

  static async cleanupOrphanedImages(): Promise<void> {
    try {
      const [lists, masterItems] = await Promise.all([this.getAllLists(), this.getAllMasterItems()]);
      const usedUris = new Set<string>();
      lists.forEach(l => l.items.forEach(i => { if (i.imageUri) usedUris.add(i.imageUri); }));
      masterItems.forEach(m => m.variants.forEach(v => { if (v.imageUri) usedUris.add(v.imageUri); }));
      for (const dir of [PRODUCTS_IMAGES_DIR, RECEIPTS_IMAGES_DIR]) {
        if (!dir.exists) continue;
        const files = dir.list();
        for (const file of files) {
          if (file instanceof FileSystem.File && !usedUris.has(file.uri)) {
            try { file.delete(); } catch { /* non-critical */ }
          }
        }
      }
    } catch (error) { console.error('Error cleaning up images:', error); }
  }
}
