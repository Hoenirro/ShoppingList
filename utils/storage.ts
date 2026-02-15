import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ShoppingList, ShoppingItem, ShoppingSession } from '../types';

// Use the new Paths API for base directories
const { Paths } = FileSystem;

// Define directory paths using the new Directory class
const LISTS_DIR = new FileSystem.Directory(Paths.document, 'shopping_lists');
const IMAGES_DIR = new FileSystem.Directory(Paths.document, 'images');
const PRODUCTS_IMAGES_DIR = new FileSystem.Directory(IMAGES_DIR, 'products');
const RECEIPTS_IMAGES_DIR = new FileSystem.Directory(IMAGES_DIR, 'receipts');
const SESSIONS_DIR = new FileSystem.Directory(Paths.document, 'sessions');



export class ShoppingListStorage {
  static async initialize() {
  const dirs = [LISTS_DIR, PRODUCTS_IMAGES_DIR, RECEIPTS_IMAGES_DIR, SESSIONS_DIR];
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
    const file = new FileSystem.File(SESSIONS_DIR, `${sessionId}.json`);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Error deleting session:', error);
  }
}

  static async getAllLists(): Promise<ShoppingList[]> {
    try {
      // Check if directory exists
      if (!LISTS_DIR.exists) {
        return [];
      }

      // List contents using the new API
      const contents = LISTS_DIR.list();
      const lists: ShoppingList[] = [];
      
      for (const item of contents) {
        // Check if it's a File (not a Directory) and ends with .json
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
      await file.write(JSON.stringify(list, null, 2));
    } catch (error) {
      console.error('Error saving list:', error);
      throw error;
    }
  }

  static async deleteList(listId: string): Promise<void> {
    try {
      const file = new FileSystem.File(LISTS_DIR, `${listId}.json`);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  }

  static async saveImage(uri: string, type: 'product' | 'receipt'): Promise<string> {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}.jpg`;
      const destDir = type === 'product' ? PRODUCTS_IMAGES_DIR : RECEIPTS_IMAGES_DIR;
      
      // Create the source file reference
      const sourceFile = new FileSystem.File(uri);
      
      // Create destination file
      const destFile = new FileSystem.File(destDir, filename);
      
      // Copy the file
      await sourceFile.copy(destFile);
      
      return destFile.uri;
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
    mediaTypes: ['images'], // Use array of strings instead of MediaTypeOptions
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled && result.assets.length > 0) {
    return result.assets[0].uri;
  }
  return null;
}
}