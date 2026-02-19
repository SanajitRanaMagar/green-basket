import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../context/AlertContext';
import { checkout, getOrdersForCustomer, deleteOrder } from '../../services/api';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../../types';

const Cart: React.FC = () => {
  const { items, updateItem, removeItem, total, clear } = useCart();
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { alert } = useAlert();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user.id) {
      loadCheckoutHistory();
    }
  }, [session?.user.id]);

  const loadCheckoutHistory = async () => {
    if (!session?.user.id) return;
    try {
      const orders = await getOrdersForCustomer(session.user.id);
      setHistory(orders || []);
    } catch (err) {
      console.error('Failed to load checkout history', err);
    }
  };

  const handleCheckout = async () => {
    if (!session?.user.id) return;
    setIsCheckingOut(true);
    try {
      await checkout(session.user.id, items, total);
      clear();
      await alert({
        title: 'Order Placed',
        message: 'Your order has been placed successfully!',
        type: 'success',
      });
      loadCheckoutHistory();
    } catch (err) {
      console.error(err);
      await alert({
        title: 'Checkout Failed',
        message: 'An error occurred during checkout. Please try again.',
        type: 'danger',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: number) => {
    const confirmed = await confirm({
      title: 'Delete Order',
      message: `Are you sure you want to delete order #${orderNumber}? This action cannot be undone.`,
      type: 'danger',
      okText: 'Delete',
      cancelText: 'Keep',
    });
    
    if (!confirmed) return;
    
    setDeletingId(orderId);
    try {
      await deleteOrder(orderId);
      showToast('Order deleted successfully', 'success');
      setHistory(history.filter(o => o.id !== orderId));
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to delete order', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllHistory = async () => {
    const confirmed = await confirm({
      title: 'Delete All History',
      message: 'Are you sure you want to permanently delete your entire checkout history? This action cannot be undone.',
      type: 'danger',
      okText: 'Delete All',
      cancelText: 'Cancel',
    });
    
    if (!confirmed) return;
    
    setDeletingId('all');
    try {
      for (const order of history) {
        await deleteOrder(order.id);
      }
      showToast('All checkout history deleted successfully', 'success');
      setHistory([]);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to delete history', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (items.length === 0 && history.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-600">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Looks like you haven't added anything yet.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-md">
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {items.length > 0 && (
        <>
          <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart Items */}
            <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
              {items.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row items-center gap-4 py-6 border-b last:border-0">
                  <img 
                    src={item.product?.image_url || 'https://picsum.photos/100'} 
                    alt={item.product?.name}
                    className="w-20 h-20 object-cover rounded-md"
                  />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-lg">{item.product?.name}</h3>
                    <p className="text-gray-500 text-sm">{item.product?.category}</p>
                    <p className="text-primary font-bold mt-1">रु {item.product?.price}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateItem(item.id, item.quantity - 1)}
                      className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button 
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-80 h-fit bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              <div className="flex justify-between mb-2 text-gray-600">
                <span>Subtotal</span>
                <span>रु {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-4 text-gray-600">
                <span>Taxes (0%)</span>
                <span>रु 0.00</span>
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-xl mb-6">
                <span>Total</span>
                <span>रु {total.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full bg-primary text-white py-3 rounded-md font-bold hover:bg-green-800 transition disabled:opacity-50"
              >
                {isCheckingOut ? 'Processing...' : 'Checkout'}
              </button>
              <button onClick={() => clear()} className="w-full mt-3 text-red-500 text-sm hover:underline">
                Empty Cart
              </button>
            </div>
          </div>
        </>
      )}

      {/* Checkout History */}
      {history.length > 0 && (
        <div className="mt-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Checkout History</h2>
            <button
              onClick={handleDeleteAllHistory}
              disabled={deletingId === 'all'}
              className="text-red-600 hover:text-red-800 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deletingId === 'all' ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
          <div className="space-y-4">
            {history.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Order #{order.display_id}</h3>
                    <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">रु {order.total_price}</p>
                      <p className="text-sm text-gray-600">{order.total_quantity} items</p>
                    </div>
                    <button
                      onClick={() => handleDeleteOrder(order.id, order.display_id)}
                      disabled={deletingId === order.id}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  {order.items && order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 py-3 border-b last:border-0">
                      <img 
                        src={item.image_url || 'https://picsum.photos/60'} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded bg-gray-100"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × रु {item.price_at_purchase}</p>
                      </div>
                      <p className="font-bold">रु {(item.price_at_purchase * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
