"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

type SizeQuantity = {
  size: string;
  quantity: number;
  available?: number;
};

export interface ProjectCartItem {
  sku: string;
  productName: string;
  supplier: string;
  color?: string;
  styleNumber?: string;
  imageUrl?: string;
  sizeBreakdown: SizeQuantity[];
  addedAt: string;
}

interface ProjectCartState {
  items: ProjectCartItem[];
}

type CartAction =
  | { type: "HYDRATE"; payload: ProjectCartState }
  | { type: "ADD"; payload: ProjectCartItem }
  | { type: "UPDATE_SIZE"; payload: { sku: string; size: string; quantity: number } }
  | { type: "REMOVE"; payload: { sku: string } }
  | { type: "CLEAR" };

const STORAGE_KEY = "portal-project-cart";

function mergeSizeBreakdown(existing: SizeQuantity[], incoming: SizeQuantity[]): SizeQuantity[] {
  const map = new Map<string, SizeQuantity>();

  for (const entry of existing) {
    map.set(entry.size, { ...entry });
  }

  for (const entry of incoming) {
    const previous = map.get(entry.size);
    const quantity = entry.quantity + (previous?.quantity ?? 0);
    if (quantity <= 0) {
      map.delete(entry.size);
      continue;
    }
    map.set(entry.size, {
      size: entry.size,
      quantity,
      available: entry.available ?? previous?.available,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));
}

function cartReducer(state: ProjectCartState, action: CartAction): ProjectCartState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "ADD": {
      const existing = state.items.find((item) => item.sku === action.payload.sku);
      if (!existing) {
        return {
          items: [...state.items, action.payload],
        };
      }

      return {
        items: state.items.map((item) =>
          item.sku === action.payload.sku
            ? {
                ...item,
                sizeBreakdown: mergeSizeBreakdown(item.sizeBreakdown, action.payload.sizeBreakdown),
              }
            : item
        ),
      };
    }
    case "UPDATE_SIZE": {
      const { sku, size, quantity } = action.payload;
      return {
        items: state.items
          .map((item) => {
            if (item.sku !== sku) return item;
            const updated = item.sizeBreakdown.map((entry) =>
              entry.size === size ? { ...entry, quantity } : entry
            );
            const filtered = updated.filter((entry) => entry.quantity > 0);
            return { ...item, sizeBreakdown: filtered };
          })
          .filter((item) => item.sizeBreakdown.length > 0),
      };
    }
    case "REMOVE":
      return {
        items: state.items.filter((item) => item.sku !== action.payload.sku),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

interface ProjectCartContextValue extends ProjectCartState {
  addItem: (item: Omit<ProjectCartItem, "addedAt"> & { addedAt?: string }) => void;
  updateSize: (sku: string, size: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
  totalUnits: number;
}

const ProjectCartContext = createContext<ProjectCartContextValue | undefined>(undefined);

export function ProjectCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProjectCartState;
        dispatch({ type: "HYDRATE", payload: parsed });
      }
    } catch (error) {
      console.warn("Failed to load project cart", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist project cart", error);
    }
  }, [state]);

  const addItem = useCallback<ProjectCartContextValue["addItem"]>((item) => {
    const sanitized = item.sizeBreakdown.filter((entry) => entry.quantity > 0);
    if (sanitized.length === 0) return;

    dispatch({
      type: "ADD",
      payload: {
        ...item,
        addedAt: item.addedAt ?? new Date().toISOString(),
        sizeBreakdown: sanitized,
      },
    });
  }, []);

  const updateSize = useCallback<ProjectCartContextValue["updateSize"]>((sku, size, quantity) => {
    dispatch({ type: "UPDATE_SIZE", payload: { sku, size, quantity } });
  }, []);

  const removeItem = useCallback<ProjectCartContextValue["removeItem"]>((sku) => {
    dispatch({ type: "REMOVE", payload: { sku } });
  }, []);

  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const totalUnits = useMemo(
    () => state.items.reduce((sum, item) => sum + item.sizeBreakdown.reduce((subtotal, entry) => subtotal + entry.quantity, 0), 0),
    [state.items]
  );

  const value = useMemo<ProjectCartContextValue>(
    () => ({ ...state, addItem, updateSize, removeItem, clear, totalUnits }),
    [state, addItem, updateSize, removeItem, clear, totalUnits]
  );

  return <ProjectCartContext.Provider value={value}>{children}</ProjectCartContext.Provider>;
}

export function useProjectCart() {
  const context = useContext(ProjectCartContext);
  if (!context) {
    throw new Error("useProjectCart must be used within a ProjectCartProvider");
  }
  return context;
}
