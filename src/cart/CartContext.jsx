/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const CartContext = createContext(null);

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function loadInitialState() {
  const raw = localStorage.getItem("ordino_cart_v1");
  const parsed = raw ? safeParse(raw, null) : null;
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
    return parsed;
  }
  return { items: [] };
}

function persistState(state) {
  localStorage.setItem("ordino_cart_v1", JSON.stringify(state));
}

function clampQty(qty) {
  const n = Number(qty || 0);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const item = action.item;
      const qty = clampQty(action.quantity ?? 1);

      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: clampQty(i.quantity + qty) } : i
          ),
        };
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            id: item.id,
            title: item.title,
            unit_price: item.unit_price,
            picture_url: item.picture_url,
            quantity: qty,
          },
        ],
      };
    }
    case "SET_QTY": {
      const { id, quantity } = action;
      return {
        ...state,
        items: state.items.map((i) => (i.id === id ? { ...i, quantity: clampQty(quantity) } : i)),
      };
    }
    case "REMOVE_ITEM": {
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    }
    case "CLEAR": {
      return { items: [] };
    }
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitialState);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const api = useMemo(() => {
    const totalQty = state.items.reduce((acc, i) => acc + clampQty(i.quantity), 0);
    const totalAmount = state.items.reduce((acc, i) => acc + (Number(i.unit_price) || 0) * clampQty(i.quantity), 0);

    return {
      items: state.items,
      totalQty,
      totalAmount,
      addItem: (item, quantity) => dispatch({ type: "ADD_ITEM", item, quantity }),
      setQty: (id, quantity) => dispatch({ type: "SET_QTY", id, quantity }),
      removeItem: (id) => dispatch({ type: "REMOVE_ITEM", id }),
      clear: () => dispatch({ type: "CLEAR" }),
    };
  }, [state.items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}

