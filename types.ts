// types.ts
export interface MasterItem {
  id: string;
  name: string;
  brand: string;
  defaultPrice: number;
  averagePrice: number;
  imageUri?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingListItem {
  masterItemId: string;  // Link to master item
  name: string;          // Snapshot of name at time of adding
  brand: string;         // Snapshot of brand
  lastPrice: number;     // Price paid last time
  averagePrice: number;  // Running average
  imageUri?: string;     // Can have custom image for this list
  addedAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: ShoppingListItem[];  // Now using ShoppingListItem
}

export interface ShoppingSession {
  id: string;
  listId: string;
  listName: string;
  date: number;
  total: number;
  receiptImageUri?: string;
  items: {
    masterItemId: string;
    name: string;
    price: number;
    checked: boolean;
  }[];
}

export interface ActiveSession extends ShoppingSession {
  isActive: boolean;
  checkedItems: {
    [masterItemId: string]: {
      checked: boolean;
      price?: number;
      imageUri?: string;
      checkedAt: number;
    };
  };
}

export type RootStackParamList = {
  Welcome: undefined;
  ItemManager: undefined;
  ShoppingList: { listId: string };
  ActiveList: { listId: string };
  EditMasterItem: { itemId?: string; returnTo?: string; listId?: string };
  EditListItem: { listId: string; listItemId?: string; masterItemId?: string };
  SelectMasterItem: { listId: string };
  
  History: undefined;
  SessionDetails: { sessionId: string };
};