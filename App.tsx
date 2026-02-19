import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AlertProvider } from './context/AlertContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Marketplace from './pages/customer/Marketplace';
import CustomerDashboard from './pages/customer/Dashboard';
import Cart from './pages/customer/Cart';
import FarmerDashboard from './pages/farmer/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import Navbar from './components/Navbar';

// Guards
const ProtectedRoute = ({ 
  allowedRoles, 
  redirectPath = '/login' 
}: { 
  allowedRoles?: string[], 
  redirectPath?: string 
}) => {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!session) return <Navigate to={redirectPath} replace />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const App: React.FC = () => {
  // Safely check for config to prevent runtime crash
  const env = (import.meta as any).env || {};
  const isConfigured = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY;

  if (!isConfigured) {
    return (
      <div className="p-10 text-center bg-red-50 h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-red-700 mb-4">Supabase Configuration Missing</h1>
        <p className="max-w-lg text-gray-700 mb-4">
          The application cannot connect to the backend. <br/>
          Please follow the instructions in <code>SUPABASE_SETUP.md</code> to set up your database and environment variables.
        </p>
        <div className="bg-white p-4 rounded shadow text-left text-sm font-mono">
          <p>VITE_SUPABASE_URL=...</p>
          <p>VITE_SUPABASE_ANON_KEY=...</p>
        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
      <AlertProvider>
        <ToastProvider>
          <NotificationProvider>
            <CartProvider>
              <HashRouter>
                <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
                  <Navbar />
                  <main>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      
                      {/* Home serves as Marketplace for customers */}
                      <Route path="/" element={<Marketplace />} />

                      {/* Customer Routes */}
                      <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/customer" element={<CustomerDashboard />} />
                      </Route>

                      {/* Farmer Routes */}
                      <Route element={<ProtectedRoute allowedRoles={['farmer', 'admin']} />}>
                        <Route path="/farmer" element={<FarmerDashboard />} />
                      </Route>

                      {/* Admin Routes */}
                      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                      </Route>

                      {/* Catch all */}
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </main>
                </div>
              </HashRouter>
            </CartProvider>
          </NotificationProvider>
        </ToastProvider>
      </AlertProvider>
    </ConfirmProvider>
  );
};

export default App;