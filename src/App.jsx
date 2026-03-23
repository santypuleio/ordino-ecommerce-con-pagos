import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ShopPage from "./pages/ShopPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutStatusPage from "./pages/CheckoutStatusPage.jsx";
import { CartProvider } from "./cart/CartContext.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <CartProvider>
        <Routes>
          <Route path="/" element={<ShopPage />} />
          <Route path="/producto/:id" element={<ProductPage />} />
          <Route path="/carrito" element={<CartPage />} />

          <Route path="/checkout/success" element={<CheckoutStatusPage status="success" />} />
          <Route path="/checkout/pending" element={<CheckoutStatusPage status="pending" />} />
          <Route path="/checkout/failure" element={<CheckoutStatusPage status="failure" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </div>
  );
}