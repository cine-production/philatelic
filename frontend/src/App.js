import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Pages
import HomePage from "./pages/HomePage";
import MemesPage from "./pages/MemesPage";
import ModernPage from "./pages/ModernPage";
import CustomPage from "./pages/CustomPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import CheckoutCancelPage from "./pages/CheckoutCancelPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminAddProductPage from "./pages/AdminAddProductPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminEditProductPage from "./pages/AdminEditProductPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminOrderPrintPage from "./pages/AdminOrderPrintPage";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col paper-bg">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/memes" element={<MemesPage />} />
                <Route path="/modernes" element={<ModernPage />} />
                <Route path="/personnalise" element={<CustomPage />} />
                <Route path="/produit/:id" element={<ProductDetailPage />} />
                <Route path="/panier" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
                <Route path="/suivi" element={<OrderTrackingPage />} />
                <Route path="/suivi/:trackingCode" element={<OrderTrackingPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/ajouter" element={<AdminAddProductPage />} />
                <Route path="/admin/produits" element={<AdminProductsPage />} />
                <Route path="/admin/produits/:id/modifier" element={<AdminEditProductPage />} />
                <Route path="/admin/categories" element={<AdminCategoriesPage />} />
                <Route path="/admin/commandes" element={<AdminOrdersPage />} />
                <Route path="/admin/commandes/:orderId/imprimer" element={<AdminOrderPrintPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
