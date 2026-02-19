import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ShoppingList, ShoppingListItem } from '../types';
import { ShoppingListStorage } from './storage';

const { Paths } = FileSystem;

const SHOPLIST_FORMAT_VERSION = 1;

export interface ShoplistFile {
  version: number;
  exportedAt: number;
  list: {
    name: string;
    items: ExportedItem[];
  };
}

// Exported items have no prices — only product identity info
export interface ExportedItem {
  name: string;
  brand: string;
  masterItemId: string;
  variantIndex: number;
}

export class ShareListService {

  // ─── EXPORT ────────────────────────────────────────────────────────────────

  static async exportList(list: ShoppingList): Promise<void> {
    try {
      const exportPayload: ShoplistFile = {
        version: SHOPLIST_FORMAT_VERSION,
        exportedAt: Date.now(),
        list: {
          name: list.name,
          items: list.items.map(item => ({
            name: item.name,
            brand: item.brand,
            masterItemId: item.masterItemId,
            variantIndex: item.variantIndex,
          })),
        },
      };

      // Sanitize filename
      const safeName = list.name
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'Shopping_List';

      const filename = `${safeName}.shoplist`;

      // Use the new File API — write to the cache directory
      const cacheDir = new FileSystem.Directory(Paths.cache);
      if (!cacheDir.exists) {
        cacheDir.create({ intermediates: true });
      }

      const file = new FileSystem.File(cacheDir, filename);
      await file.write(JSON.stringify(exportPayload, null, 2));

      // Check sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      // Open the native share sheet
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: `Share "${list.name}"`,
        UTI: 'com.shoppinglist.shoplist',
      });

      // Clean up temp file
      try {
        if (file.exists) file.delete();
      } catch {
        // Non-critical
      }

    } catch (error: any) {
      if (error?.message === 'Sharing is not available on this device') {
        throw error;
      }
      console.error('Export error:', error);
      throw new Error('Failed to export list. Please try again.');
    }
  }

  // ─── IMPORT ────────────────────────────────────────────────────────────────

  static async importList(): Promise<{ name: string; itemCount: number } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null; // User cancelled
      }

      const asset = result.assets[0];

      // Validate extension
      if (!asset.name.endsWith('.shoplist')) {
        throw new Error('Invalid file type. Please select a .shoplist file.');
      }

      // Read using the new File API
      const file = new FileSystem.File(asset.uri);
      const content = await file.text();

      let parsed: ShoplistFile;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error('This file appears to be corrupted or is not a valid shopping list.');
      }

      // Validate structure
      if (!parsed.version || !parsed.list?.name || !Array.isArray(parsed.list?.items)) {
        throw new Error('This file is not a valid shopping list format.');
      }

      // Version check
      if (parsed.version > SHOPLIST_FORMAT_VERSION) {
        throw new Error('This list was created with a newer version of the app. Please update to import it.');
      }

      // Build the new list — no prices
      const now = Date.now();
      const newList: ShoppingList = {
        id: now.toString(),
        name: `${parsed.list.name} (imported)`,
        createdAt: now,
        updatedAt: now,
        items: parsed.list.items.map((item): ShoppingListItem => ({
          masterItemId: item.masterItemId,
          variantIndex: item.variantIndex,
          name: item.name,
          brand: item.brand,
          lastPrice: 0,
          priceAtAdd: 0,
          averagePrice: 0,
          imageUri: undefined,
          addedAt: now,
        })),
      };

      await ShoppingListStorage.saveList(newList);

      // Clean up
      try {
        if (file.exists) file.delete();
      } catch {
        // Non-critical
      }

      return { name: newList.name, itemCount: newList.items.length };

    } catch (error: any) {
      if (
        error?.message?.includes('Invalid file') ||
        error?.message?.includes('corrupted') ||
        error?.message?.includes('valid shopping') ||
        error?.message?.includes('newer version')
      ) {
        throw error;
      }
      console.error('Import error:', error);
      throw new Error('Failed to import list. Please try again.');
    }
  }
}
