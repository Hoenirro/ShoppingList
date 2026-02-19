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
  variantIndex: number; // Which brand variant this is
  name: string; // Snapshot of product name
  brand: string; // Snapshot of brand name
  lastPrice: number;
  averagePrice: number;
  priceAtAdd: number;
  imageUri?: string; // Snapshot of brand image
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
  }[];
  checkedItems: {
    [key: string]: { // key = `${masterItemId}_${variantIndex}`
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
  SelectMasterItem: { listId: string; onGoBack?: () => void };
  EditMasterItem: { itemId?: string; returnTo?: string; listId?: string };
  EditListItem: { listId: string; listItemId?: string; masterItemId?: string };
  PriceHistory: { masterItemId: string; itemName: string };
  History: undefined;
  SessionDetails: { sessionId: string };
};