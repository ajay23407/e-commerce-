import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Navbar   from './components/Navbar';
import Footer   from './components/Footer';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage   from './pages/OrdersPage';
import AccountPage  from './pages/AccountPage';
import WishlistPage from './pages/WishlistPage';
import AdminLayout  from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts  from './pages/admin/AdminProducts';
import AdminOrders    from './pages/admin/AdminOrders';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminCoupons   from './pages/admin/AdminCoupons';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="spinner spinner-lg spinner-gold" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="spinner spinner-lg spinner-gold" />
    </div>
  );
  if (!user)    return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

const MainLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<MainLayout><HomePage /></MainLayout>} />
      <Route path="/shop"     element={<MainLayout><ShopPage /></MainLayout>} />
      <Route path="/product/:slug" element={<MainLayout><ProductDetailPage /></MainLayout>} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected */}
      <Route path="/checkout" element={<ProtectedRoute><MainLayout><CheckoutPage /></MainLayout></ProtectedRoute>} />
      <Route path="/orders"   element={<ProtectedRoute><MainLayout><OrdersPage /></MainLayout></ProtectedRoute>} />
      <Route path="/account"  element={<ProtectedRoute><MainLayout><AccountPage /></MainLayout></ProtectedRoute>} />
      <Route path="/wishlist" element={<ProtectedRoute><MainLayout><WishlistPage /></MainLayout></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index           element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders"   element={<AdminOrders />} />
        <Route path="users"    element={<AdminUsers />} />
        <Route path="coupons"  element={<AdminCoupons />} />
      </Route>

      <Route path="*" element={<MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <p className="text-8xl font-serif text-gold mb-4">404</p>
          <h1 className="text-3xl font-serif mb-3">Page Not Found</h1>
          <p className="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
          <a href="/" className="btn btn-primary">Return Home</a>
        </div>
      </MainLayout>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 14,
                borderRadius: 2,
                border: '1px solid #E8E7E3',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              },
              success: { iconTheme: { primary: '#C9A84C', secondary: '#fff' } },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
