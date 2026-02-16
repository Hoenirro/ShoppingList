// types.ts
export interface PriceRecord {
  price: number;
  date: number;
  listId?: string;        // Which shopping list this price came from
  listName?: string;       // Name of the list for context
  receiptImageUri?: string; // Optional receipt image for this purchase
}

export interface MasterItem {
  id: string;
  name: string;
  brand: string;
  defaultPrice: number;     // Last price or user-set default
  averagePrice: number;      // Calculated from price history
  priceHistory: PriceRecord[]; // Array of all prices with dates
  imageUri?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingListItem {
  masterItemId: string;
  name: string;              // Snapshot at time of adding
  brand: string;             // Snapshot at time of adding
  lastPrice: number;         // Last price paid (from master item)
  averagePrice: number;      // Average price (from master item)
  priceAtAdd: number;        // Price when added to this list (for reference)
  imageUri?: string;         // Can have custom image for this list
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
  total: number;           // Actual paid amount (editable)
  calculatedTotal?: number; // Calculated from items (for reference)
  receiptImageUri?: string;
  items: {
    masterItemId: string;
    name: string;
    price: number;
    checked: boolean;
  }[];
}

export type RootStackParamList = {
  Welcome: undefined;
  ItemManager: undefined;
  ShoppingList: { listId: string };
  ActiveList: { listId: string };
  SelectMasterItem: { listId: string };
  EditMasterItem: { itemId?: string; returnTo?: string; listId?: string };
  EditListItem: { listId: string; listItemId?: string; masterItemId?: string };
  PriceHistory: { masterItemId: string; itemName: string }; // New screen
  History: undefined;
  SessionDetails: { sessionId: string };
};