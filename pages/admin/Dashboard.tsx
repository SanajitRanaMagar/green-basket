import React, { useEffect, useState } from 'react';
import { getAllProducts, updateProduct, getAllOrders, deleteProduct } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import { Product, Order } from '../../types';
import { Check, X, ShoppingBag, FileText, ClipboardList, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import FarmerApplications from './FarmerApplications';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'products' | 'orders'>('applications');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [refresh, setRefresh] = useState(0);
  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (activeTab === 'products') loadProducts();
    if (activeTab === 'orders') loadOrders();
    // applications tab handles its own loading in FarmerApplications component
  }, [activeTab, refresh]);

  const loadProducts = async () => {
    const data = await getAllProducts();
    // @ts-ignore: joined data type mismatch
    setAllProducts(data || []);
  };

  const loadOrders = async () => {
    const data = await getAllOrders();
    // @ts-ignore: joined data type mismatch
    setAllOrders(data || []);
  };

  const handleProductStatus = async (id: string, status: 'approved' | 'rejected') => {
    await updateProduct(id, { status });
    setRefresh(r => r + 1);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: `Delete product "${name}"? This action cannot be undone.`,
      type: 'danger',
      okText: 'Delete',
      cancelText: 'Cancel',
    });
    
    if (!confirmed) return;
    
    try {
      await deleteProduct(id);
      toast.showToast('Product deleted successfully', 'success');
      setRefresh(r => r + 1);
    } catch (err: any) {
      toast.showToast(err?.message || 'Failed to delete product', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${badges[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('applications')}
          className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'applications' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          <ClipboardList className="w-5 h-5" /> Farmer Submissions
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          <ShoppingBag className="w-5 h-5" /> Pending Products
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          <FileText className="w-5 h-5" /> All Orders
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">

        {activeTab === 'applications' && (
          <div className="p-6">
            <FarmerApplications />
          </div>
        )}

        {activeTab === 'products' && (
           <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Farmer</th>
                <th className="p-4">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No products.</td></tr>}
              {allProducts.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 flex items-center gap-3">
                    <img src={product.image_url || ''} className="w-10 h-10 bg-gray-200 rounded object-cover" />
                    <div>
                       <div className="font-bold">{product.name}</div>
                       <div className="text-xs text-gray-500">{product.category}</div>
                    </div>
                  </td>
                  {/* @ts-ignore */}
                  <td className="p-4">{product.profiles?.email}</td>
                  <td className="p-4">रु {product.price}</td>
                  <td className="p-4">{statusBadge(product.status)}</td>
                  <td className="p-4 text-right space-x-2">
                    {product.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleProductStatus(product.id, 'approved')}
                          className="text-green-600 hover:bg-green-50 p-1 rounded inline"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleProductStatus(product.id, 'rejected')}
                          className="text-red-600 hover:bg-red-50 p-1 rounded inline"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="text-orange-600 hover:bg-orange-50 p-1 rounded inline"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'orders' && (
           <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Total</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm text-gray-500">{order.display_id ? order.display_id : (order.id.slice(0,8) + '...')}</td>
                  {/* @ts-ignore */}
                  <td className="p-4">{order.profiles?.email || 'Unknown'}</td>
                  <td className="p-4 font-bold">रु {order.total_price}</td>
                  <td className="p-4">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
