import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import { ShoppingCart, LogOut, User, Menu, Store, Bell } from 'lucide-react';

const Navbar: React.FC = () => {
  const { session, profile, signOut, isFarmer, isAdmin } = useAuth();
  const { count } = useCart();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-primary text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 font-bold text-xl">
          <img src="/images/greenbasket-logo.png" alt="GreenBasket Logo" className="h-16 w-auto" title="GreenBasket - Fresh Local Organic" />
        </Link>

        <div className="flex items-center space-x-6">
          {session ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="hover:text-accent font-medium">Admin Panel</Link>
              )}
              {isFarmer && (
                <Link to="/farmer" className="hover:text-accent font-medium">My Farm</Link>
              )}
              {!isAdmin && !isFarmer && (
                 <>
                 <Link to="/cart" className="relative hover:text-accent">
                 <ShoppingCart className="w-6 h-6" />
                 {count > 0 && (
                   <span className="absolute -top-2 -right-2 bg-accent text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                     {count}
                   </span>
                 )}
               </Link>
               <Link to="/customer" className="relative hover:text-accent">
                 <Bell className="w-6 h-6" />
                 {unreadCount > 0 && (
                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                     {unreadCount}
                   </span>
                 )}
               </Link>
               </>
              )}
              
              <div className="flex items-center space-x-2 border-l pl-4 border-green-600">
                <User className="w-5 h-5 opacity-75" />
                <span className="text-sm hidden md:block">{profile?.email}</span>
                <button onClick={handleLogout} className="ml-4 p-1 hover:bg-green-700 rounded">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="space-x-4">
              <Link to="/login" className="hover:text-accent">Login</Link>
              <Link to="/register" className="bg-accent text-primary px-4 py-2 rounded-md font-bold hover:bg-yellow-400 transition">
                Join Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
