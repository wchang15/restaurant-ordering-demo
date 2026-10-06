import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

type CartItem = {
  menuItemId: string;
  name: { en: string; ko: string };
  quantity: number;
  unitPrice: number;
  options?: {
    groupId: string;
    valueId: string;
    group: { en: string; ko: string };
    value: { en: string; ko: string };
    priceDelta: number;
  }[];
  lineTotal: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
};

const memoryStorage = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name) ?? memoryStorage.get(name) ?? null;
    } catch {
      return memoryStorage.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memoryStorage.set(name, value);
    try {
      localStorage.setItem(name, value);
    } catch {
      // Some mobile in-app/private browsers block localStorage.
    }
  },
  removeItem: (name) => {
    memoryStorage.delete(name);
    try {
      localStorage.removeItem(name);
    } catch {
      // Some mobile in-app/private browsers block localStorage.
    }
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item],
        })),

      removeItem: (index) =>
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        })),

      clearCart: () => set({ items: [] }),

      setItems: (items) => set({ items }),
    }),
    {
      name: 'qr-order-cart',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
