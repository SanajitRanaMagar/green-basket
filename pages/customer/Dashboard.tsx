import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Bell, CheckCircle, XCircle, Clock, Check } from 'lucide-react';
import { updateOrderStatus } from '../../services/api';

const CustomerDashboard: React.FC = () => {
  const { notifications, markAsRead } = useNotifications();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notificationsState, setNotificationsState] = useState(notifications);

  useEffect(() => {
    setNotificationsState(notifications);
  }, [notifications]);

  const toggle = (id: string) => {
    setExpanded(prev => prev === id ? null : id);
    if (expanded !== id) {
      markAsRead(id);
    }
  };

  const handleCompleteOrder = async (orderId: string, notificationId: string) => {
    const confirmed = await confirm({
      title: 'Complete Order',
      message: 'Mark this order as completed? Once marked, the order status cannot be changed.',
      type: 'success',
      okText: 'Complete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;
    
    setUpdatingId(notificationId);
    try {
      await updateOrderStatus(orderId, 'completed');
      showToast('Order marked as completed', 'success');
      
      // Update local notification state to reflect the status change immediately
      setNotificationsState(prevState => 
        prevState.map(n => 
          n.order_id === orderId 
            ? { ...n, status: 'completed', message: `Your order ${n.display_id ?? n.id} is now completed` }
            : n
        )
      );
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">✓ Accepted</span>;
    if (status === 'completed') return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">✓ Completed</span>;
    if (status === 'rejected') return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">✗ Rejected</span>;
    return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">⏳ Pending</span>;
  };

  const getStatusColor = (status: string) => {
    if (status === 'accepted') return 'bg-blue-50';
    if (status === 'completed') return 'bg-green-50';
    if (status === 'rejected') return 'bg-red-50';
    return 'bg-yellow-50';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-extrabold">Order Notifications & History</h1>
      </div>
      
      {notifications.length === 0 ? (
        <div className="p-6 bg-white rounded shadow text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No order notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notificationsState.map(n => (
            <article key={n.id} className={`rounded shadow overflow-hidden transition ${getStatusColor(n.status)}`}>
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4 cursor-pointer hover:bg-opacity-50" onClick={() => toggle(n.id)}>
              <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${n.status === 'completed' ? 'bg-green-100' : n.status === 'accepted' ? 'bg-blue-100' : n.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    {n.status === 'completed' && <CheckCircle className="w-6 h-6 text-green-600" />}
                    {n.status === 'accepted' && <CheckCircle className="w-6 h-6 text-blue-600" />}
                    {n.status === 'rejected' && <XCircle className="w-6 h-6 text-red-600" />}
                    {!n.status || (n.status !== 'completed' && n.status !== 'accepted' && n.status !== 'rejected') && <Clock className="w-6 h-6 text-yellow-600" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold mb-1 break-words">{n.message}</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{new Date(n.created_at).toLocaleString()}</div>
                        {n.total_price !== undefined && <div className="font-bold text-primary">Total: रु {n.total_price}</div>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">{statusBadge(n.status)}</div>
                  </div>

                  {expanded === n.id && (
                    <div className="mt-4 border-t pt-4">
                      <div className="grid gap-4">
                        {/* Order Items */}
                        {n.items && n.items.length > 0 ? (
                          <>
                            <div className="font-semibold text-gray-900 mb-2">Order Items ({n.items.length})</div>
                            {n.items.map((it, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pb-3 border-b last:border-0">
                                <img src={it.image_url || 'https://picsum.photos/80'} alt={it.name} className="w-16 h-16 rounded object-cover bg-gray-100 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 break-words">{it.name}</div>
                                  <div className="text-sm text-gray-600">Quantity: {it.quantity}</div>
                                  <div className="text-sm text-gray-600">Unit price: रु {it.price_at_purchase}</div>
                                </div>
                                <div className="font-bold text-right flex-shrink-0">रु {((it.price_at_purchase || 0) * (it.quantity || 0)).toFixed(2)}</div>
                              </div>
                            ))}
                            {n.total_price !== undefined && (
                              <div className="border-t pt-3 mt-3">
                                <div className="text-lg font-bold text-gray-900">Order Total: रु {n.total_price}</div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">No item details available.</div>
                        )}

                        {/* Farmer Contact */}
                        {n.farmer_contacts && n.farmer_contacts.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="font-semibold text-gray-900 mb-2">Farmer Contact Information</div>
                            {n.farmer_contacts.map((f, idx) => (
                              <div key={idx} className="mb-2 text-sm break-all">
                                {f.email && <div><strong>Email:</strong> <a className="text-primary hover:underline" href={`mailto:${f.email}`}>{f.email}</a></div>}
                                {f.phone && <div><strong>Phone:</strong> <a className="text-primary hover:underline" href={`tel:${f.phone}`}>{f.phone}</a></div>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mark as Completed Button */}
                        {n.status === 'accepted' && (
                          <div className="mt-4 pt-4 border-t">
                            <button
                              onClick={() => handleCompleteOrder(n.order_id, n.id)}
                              disabled={updatingId === n.id}
                              className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 transition"
                            >
                              <Check className="w-5 h-5" />
                              {updatingId === n.id ? 'Marking as Completed...' : 'Mark Order as Completed'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
