import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../context/AlertContext';
import { getFarmerProducts, deleteProduct, createProduct, updateProduct, uploadProductImage, getApplicationForUser, getOrdersForFarmer, updateOrderStatus, deleteOrder, deductStockForOrder } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Product } from '../../types';
import { Edit, Trash2, Plus, Upload, X, Eye } from 'lucide-react';
import FarmerSubmission from '../FarmerSubmission';

const FarmerDashboard: React.FC = () => {
  const { session, profile } = useAuth();
  const { confirm } = useConfirm();
  const { alert } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [farmerOrders, setFarmerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (session?.user.id) {
      loadProducts();
    }
    if (session?.user.id && profile?.role === 'farmer') {
      loadOrders();
    }
  }, [session]);

  // Fetch farmer application when user/profile available
  const [application, setApplication] = useState<any | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);

  useEffect(() => {
    const loadApp = async () => {
      if (!session?.user.id || profile?.role !== 'farmer') return;
      setLoadingApplication(true);
      try {
        const app = await getApplicationForUser(session.user.id);
        setApplication(app || null);
      } catch (err) {
        console.error('Failed to load application', err);
      } finally {
        setLoadingApplication(false);
      }
    };
    loadApp();
  }, [session, profile]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getFarmerProducts(session!.user.id);
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!session?.user.id) return [];
    setLoadingOrders(true);
    try {
      const data = await getOrdersForFarmer(session.user.id);
      setFarmerOrders(data || []);
      return data || [];
    } catch (err) {
      console.error('Failed to load orders for farmer', err);
      toast.showToast('Failed to load orders', 'error');
      return [];
    } finally {
      setLoadingOrders(false);
    }
  };

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const closeSelectedOrder = () => setSelectedOrder(null);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'danger',
      okText: 'Delete',
      cancelText: 'Cancel',
    });
    
    if (!confirmed) return;
    
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      toast.showToast('Product deleted successfully', 'success');
    } catch (err) {
      toast.showToast('Error deleting product', 'error');
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price.toString());
      setStock(product.stock_quantity.toString());
      setCategory(product.category);
    } else {
      setEditingProduct(null);
      setName('');
      setDescription('');
      setPrice('');
      setStock('');
      setCategory('Vegetables');
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - Check for missing fields
    if (!name.trim()) {
      alert({
        title: 'Missing Product Name',
        message: 'Please enter a product name.',
        type: 'danger',
      });
      return;
    }

    if (!description.trim()) {
      alert({
        title: 'Missing Description',
        message: 'Please enter a product description.',
        type: 'danger',
      });
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      alert({
        title: 'Invalid Price',
        message: 'Please enter a valid price greater than 0.',
        type: 'danger',
      });
      return;
    }

    if (!stock || parseInt(stock) <= 0) {
      alert({
        title: 'Invalid Stock Quantity',
        message: 'Please enter a valid stock quantity greater than 0 kg.',
        type: 'danger',
      });
      return;
    }

    // Image validation - Check if image is provided
    const hasExistingImage = editingProduct?.image_url;
    const hasNewImage = imageFile !== null;

    if (!hasExistingImage && !hasNewImage) {
      alert({
        title: 'Missing Product Image',
        message: 'Please upload a product image before saving.',
        type: 'danger',
      });
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = editingProduct?.image_url || null;

      if (imageFile && session?.user.id) {
        imageUrl = await uploadProductImage(imageFile, session.user.id);
      }

      const productData = {
        name,
        description,
        price: parseFloat(price),
        stock_quantity: parseInt(stock),
        category,
        image_url: imageUrl,
        created_by: session!.user.id
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(productData);
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert({
        title: 'Save Failed',
        message: 'Failed to save product. Please try again.',
        type: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (profile?.role === 'farmer' && profile?.status !== 'active') {
    if (loadingApplication) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
          <div>Loading...</div>
        </div>
      );
    }

    // No application yet -> show submission form
    if (!application) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <FarmerSubmission onSubmitted={() => {
            // reload application after submit
            (async () => {
              setLoadingApplication(true);
              try {
                const app = await getApplicationForUser(session!.user.id);
                setApplication(app || null);
              } catch (err) {
                console.error(err);
              } finally {
                setLoadingApplication(false);
              }
            })();
          }} />
        </div>
      );
    }

    // Application exists
    if (application.status === 'pending') {
      return (
        <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
          <div className="max-w-lg">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Submission Pending Review</h1>
            <p className="text-gray-600">Your application was submitted and is currently under review by an administrator.</p>
          </div>
        </div>
      );
    }

    // Fallback: if status is still not active, block access
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
        <div className="max-w-lg">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Account Not Active</h1>
          <p className="text-gray-600">Your farmer account is not yet approved. Please complete your submission.</p>
        </div>
      </div>
    );
  }

  // Double-check: Only active farmers can access the product dashboard
  if (profile?.role === 'farmer' && profile?.status !== 'active') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
        <div className="max-w-lg">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only approved farmers can manage products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">My Farm Products</h1>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-green-700"
        >
          <Plus className="w-5 h-5" /> Add Product
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Product</th>
                <th className="p-4 font-semibold text-gray-600">Category</th>
                <th className="p-4 font-semibold text-gray-600">Price</th>
                <th className="p-4 font-semibold text-gray-600">Stock</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                 <tr>
                   <td colSpan={6} className="p-8 text-center text-gray-500">No products added yet.</td>
                 </tr>
              )}
              {products.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 flex items-center gap-3">
                    <img 
                      src={product.image_url || 'https://picsum.photos/50'} 
                      alt={product.name} 
                      className="w-12 h-12 rounded object-cover bg-gray-200"
                    />
                    <div>
                      <div className="font-bold text-gray-900">{product.name}</div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{product.category}</td>
                  <td className="p-4 font-medium">रु {product.price}</td>
                  <td className="p-4">{product.stock_quantity} kg</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                      ${product.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        product.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`
                    }>
                      {product.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openModal(product)} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required className="w-full border rounded px-3 py-2" placeholder="Enter product description" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input required type="number" step="0.01" className="w-full border rounded px-3 py-2" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock (kg)</label>
                  <input required type="number" className="w-full border rounded px-3 py-2" placeholder="Enter weight in kg" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full border rounded px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
                   <option>Vegetables</option>
                   <option>Fruits</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image <span className="text-red-500">*</span> {editingProduct && '(optional - upload to change)'}
                </label>
                <div className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-gray-50 relative">
                   <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                   <div className="flex flex-col items-center text-gray-500">
                     <Upload className="w-8 h-8 mb-2" />
                     <span className="text-sm">{imageFile ? imageFile.name : (!editingProduct || !editingProduct.image_url ? 'Click to upload image (required)' : 'Click to upload new image or leave empty')}</span>
                   </div>
                </div>
              </div>
              <div className="pt-4">
                <button disabled={submitting} type="submit" className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders (admin-style table for farmer) */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Orders</h2>
        {loadingOrders ? (
          <div className="p-6">Loading orders...</div>
        ) : farmerOrders.length === 0 ? (
          <div className="p-6 text-gray-500">No orders yet.</div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {farmerOrders.map(order => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono text-sm">{order.display_id ? order.display_id : (order.id && order.id.slice ? order.id.slice(0,8) + '...' : order.id)}</td>
                        <td className="p-4 text-sm">{order.customer_email || order.customer_id}</td>
                        <td className="p-4 text-sm">{order.total_quantity ?? '-'}</td>
                        <td className="p-4 font-bold">रु {order.total_price}</td>
                        <td className="p-4">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setSelectedOrder(order)} title="View details" className="text-gray-600 hover:text-gray-800 mr-2">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button onClick={async () => {
                            const confirmed = await confirm({
                              title: 'Delete Order',
                              message: `Delete order ${order.display_id}? This action cannot be undone.`,
                              type: 'danger',
                              okText: 'Delete',
                              cancelText: 'Cancel',
                            });
                            
                            if (!confirmed) return;
                            
                            try {
                              await deleteOrder(order.id);
                              toast.showToast('Order deleted successfully', 'success');
                              const updated = await loadOrders();
                              setFarmerOrders(updated || []);
                            } catch (err: any) {
                              console.error(err);
                              toast.showToast(err?.message || 'Failed to delete order', 'error');
                            }
                          }} title="Delete order" className="text-red-600 hover:text-red-800 mr-2">
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <span className={`inline-block mr-3 px-3 py-1 rounded-full text-sm ${order.status === 'accepted' ? 'bg-green-100 text-green-800' : order.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status || 'pending'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">Order {selectedOrder.display_id ?? selectedOrder.id}</h3>
                <div className="text-sm text-gray-500">{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : ''}</div>
                <div className="text-sm text-gray-700 mt-1 break-all">Customer: {selectedOrder.customer_email || selectedOrder.customer_id}</div>
              </div>
              <div className="flex-shrink-0 flex justify-end">
                <button onClick={closeSelectedOrder} className="text-gray-600 hover:text-gray-800"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                {(selectedOrder.items || []).map((it: any) => (
                  <div key={it.product_id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border-b pb-4">
                    <img src={it.image_url || 'https://picsum.photos/80'} alt={it.name} className="w-20 h-20 rounded object-cover bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 break-words">{it.name}</div>
                      <div className="text-sm text-gray-600 mt-1">Quantity: {it.quantity}</div>
                      <div className="text-sm text-gray-600">Unit price: रु {it.price_at_purchase}</div>
                    </div>
                    <div className="font-bold text-right flex-shrink-0">रु {(it.price_at_purchase || 0) * (it.quantity || 0)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-lg font-bold">Total: रु {selectedOrder.total_price}</div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {selectedOrder.status === 'pending' && (
                    <>
                      <button onClick={async () => {
                        try {
                          // Deduct stock for all items in the order
                          await deductStockForOrder(selectedOrder.id);
                          // Then update order status
                          await updateOrderStatus(selectedOrder.id, 'accepted');
                          toast.showToast('Order accepted and stock updated', 'success');
                          const updated = await loadOrders();
                          const found = (updated || []).find((o: any) => o.id === selectedOrder.id);
                          setSelectedOrder(found || null);
                        } catch (err: any) {
                          console.error(err);
                          toast.showToast(err?.message || 'Failed to update order', 'error');
                        }
                      }} className="bg-green-600 text-white px-4 py-2 rounded">Accept</button>
                      <button onClick={async () => {
                        try {
                          await updateOrderStatus(selectedOrder.id, 'rejected');
                          toast.showToast('Order rejected', 'success');
                          const updated = await loadOrders();
                          const found = (updated || []).find((o: any) => o.id === selectedOrder.id);
                          setSelectedOrder(found || null);
                        } catch (err: any) {
                          console.error(err);
                          toast.showToast(err?.message || 'Failed to update order', 'error');
                        }
                      }} className="bg-red-600 text-white px-4 py-2 rounded">Reject</button>
                    </>
                  )}
                  <button onClick={closeSelectedOrder} className="bg-gray-100 px-4 py-2 rounded">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
