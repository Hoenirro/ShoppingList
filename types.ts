export interface PriceRecord {
  price: number;
  date: number;
  listId?: string;
  listName?: string;
  receiptImageUri?: string;
}

export interface MasterItem {
  id: string;
  name: string;
  variants: BrandVariant[];
  defaultVariantIndex: number;
  category?: string;  // e.g. "🥛 Dairy" — optional
  createdAt: number;
  updatedAt: number;
}

export interface BrandVariant {
  brand: string;
  defaultPrice: number;
  averagePrice: number;
  priceHistory: PriceRecord[];
  imageUri?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingListItem {
  masterItemId: string;
  variantIndex: number;
  name: string;
  brand: string;
  lastPrice: number;
  averagePrice: number;
  priceAtAdd: number;
  imageUri?: string;
  category?: string;  // snapshot from master item
  addedAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: ShoppingListItem[];
}

export interface ShoppingSession {
  id: string;
  listId: string;
  listName: string;
  date: number;
  total: number;
  calculatedTotal?: number;
  receiptImageUri?: string;
  items: {
    masterItemId: string;
    variantIndex: number;
    name: string;
    brand: string;
    price: number;
    checked: boolean;
  }[];
}

export interface ActiveSession {
  id: string;
  listId: string;
  listName: string;
  startTime: number;
  items: {
    masterItemId: string;
    variantIndex: number;
    name: string;
    brand: string;
    lastPrice: number;
    checked: boolean;
    price?: number;
    imageUri?: string;
    category?: string;
  }[];
  checkedItems: {
    [key: string]: {
      checked: boolean;
      price?: number;
      checkedAt: number;
    };
  };
  receiptImageUri?: string;
}

export type RootStackParamList = {
  Welcome: undefined;
  Theme: undefined;
  ItemManager: undefined;
  ShoppingList: { listId: string };
  ActiveList: { listId: string };
  EditMasterItem: { itemId?: string; returnTo?: string; listId?: string; mode?: 'addToList' };
  PriceHistory: { masterItemId: string; itemName: string };
  History: undefined;
  SessionDetails: { sessionId: string };
};
