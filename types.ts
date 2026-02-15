
export interface ShoppingItem {
  id: string;
  name: string;
  brand: string;
  lastPrice: number;
  averagePrice: number;
  imageUri?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: ShoppingItem[];
}

export interface ShoppingSession {
  id: string;
  listId: string;
  listName: string;
  date: number;
  total: number;
  receiptImageUri?: string;
  items: {
    itemId: string;
    name: string;
    price: number;
    checked: boolean;
  }[];
}

export interface ActiveSession extends ShoppingSession {
  isActive: boolean;
  checkedItems: {
    [itemId: string]: {
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
  EditItem: { listId: string; item?: ShoppingItem; returnTo?: string };
  History: undefined;
  SessionDetails: { sessionId: string };
};