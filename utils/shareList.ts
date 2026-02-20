// utils/shareList.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ShoppingList, ShoppingListItem } from '../types';
import { ShoppingListStorage } from './storage';

const { Paths } = FileSystem;

const SHOPLIST_FORMAT_VERSION = 2;

export interface ShoplistFile {
  version: number;
  exportedAt: number;
  list: {
    name: string;
    items: ExportedItem[];
  };
}

export interface ExportedItem {
  name: string;
  brand: string;
  masterItemId: string;
  variantIndex: number;
  category?: string;
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
            category: item.category,
          })),
        },
      };

      const safeName = list.name
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'Shopping_List';

      const filename = `${safeName}.shoplist`;
      const cacheDir = new FileSystem.Directory(Paths.cache);
      if (!cacheDir.exists) cacheDir.create({ intermediates: true });

      const file = new FileSystem.File(cacheDir, filename);
      await file.write(JSON.stringify(exportPayload, null, 2));

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) throw new Error('Sharing is not available on this device');

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: `Share "${list.name}"`,
        UTI: 'com.shoppinglist.shoplist',
      });

      try { if (file.exists) file.delete(); } catch { /* non-critical */ }

    } catch (error: any) {
      if (error?.message === 'Sharing is not available on this device') throw error;
      console.error('Export error:', error);
      throw new Error('Failed to export list. Please try again.');
    }
  }

  // ─── SHARED PARSE + SAVE LOGIC ────────────────────────────────────────────

  private static async parseAndSave(content: string): Promise<{ name: string; itemCount: number }> {
    let parsed: ShoplistFile;
    try { parsed = JSON.parse(content); }
    catch { throw new Error('This file appears to be corrupted or is not a valid shopping list.'); }

    if (!parsed.version || !parsed.list?.name || !Array.isArray(parsed.list?.items)) {
      throw new Error('This file is not a valid shopping list format.');
    }

    if (parsed.version > SHOPLIST_FORMAT_VERSION) {
      throw new Error('This list was created with a newer version of the app. Please update to import it.');
    }

    const now = Date.now();

    const masterItemMap = await ShoppingListStorage.findOrCreateMasterItemsFromImport(
      parsed.list.items.map(i => ({
        name: i.name,
        brand: i.brand,
        category: i.category,
      }))
    );

    const newList: ShoppingList = {
      id: now.toString(),
      name: `${parsed.list.name} (imported)`,
      createdAt: now,
      updatedAt: now,
      items: parsed.list.items.map((item): ShoppingListItem => {
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

    await ShoppingListStorage.saveList(newList);
    return { name: newList.name, itemCount: newList.items.length };
  }

  // ─── IMPORT VIA DOCUMENT PICKER (↓ Import button) ─────────────────────────

  static async importList(): Promise<{ name: string; itemCount: number } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      if (!asset.name.endsWith('.shoplist')) {
        throw new Error('Invalid file type. Please select a .shoplist file.');
      }

      const file = new FileSystem.File(asset.uri);
      const content = await file.text();
      const importResult = await ShareListService.parseAndSave(content);

      try { if (file.exists) file.delete(); } catch { /* non-critical */ }

      return importResult;

    } catch (error: any) {
      if (
        error?.message?.includes('Invalid file') ||
        error?.message?.includes('corrupted') ||
        error?.message?.includes('valid shopping') ||
        error?.message?.includes('newer version')
      ) throw error;
      console.error('Import (picker) error:', error);
      throw new Error('Failed to import list. Please try again.');
    }
  }

  // ─── IMPORT FROM URI (OS opens the app with a file) ───────────────────────
  // Android sends content:// URIs, iOS sends file:// URIs.
  // This is called from App.tsx via Linking.getInitialURL / Linking events.

  static async importFromUri(uri: string): Promise<{ name: string; itemCount: number } | null> {
    try {
      const decoded = decodeURIComponent(uri);

      // Safety check — only process .shoplist files
      if (!decoded.toLowerCase().includes('.shoplist')) return null;

      let content: string;

      if (uri.startsWith('content://')) {
        // Android: content URI — must copy to cache first, then read as text
        const destPath = `${Paths.cache}import_${Date.now()}.shoplist`;
        await FileSystem.copyAsync({ from: uri, to: destPath });
        const destFile = new FileSystem.File(destPath);
        content = await destFile.text();
        try { destFile.delete(); } catch { /* non-critical */ }

      } else if (uri.startsWith('file://')) {
        // iOS or Android file URI — read directly
        const file = new FileSystem.File(uri);
        content = await file.text();

      } else {
        throw new Error('Cannot read file from this location.');
      }

      return await ShareListService.parseAndSave(content);

    } catch (error: any) {
      if (
        error?.message?.includes('Invalid file') ||
        error?.message?.includes('corrupted') ||
        error?.message?.includes('valid shopping') ||
        error?.message?.includes('newer version') ||
        error?.message?.includes('Cannot read')
      ) throw error;
      console.error('importFromUri error:', error);
      throw new Error('Failed to open the shopping list file. Please try again.');
    }
  }
}
