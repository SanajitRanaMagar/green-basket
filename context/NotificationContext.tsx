import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getOrdersForCustomer, saveNotification, getCustomerNotifications, markNotificationAsRead, deleteNotification } from '../services/api';
import { supabase } from '../services/supabase';
import { useToast } from './ToastContext';

type Notification = {
  id: string;
  order_id: string;
  display_id?: number;
  status: string;
  created_at: string;
  message: string;
  total_price?: number;
  farmer_contacts?: Array<{ email?: string; phone?: string }>;
  items?: Array<{ product_id: string; name?: string; image_url?: string | null; quantity?: number; price_at_purchase?: number }>;
  is_read?: boolean;
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastStatuses = useRef<Record<string, string>>({});
  const shownToasts = useRef<Set<string>>(new Set()); // Track shown toasts to prevent duplicates
  const pollingInProgress = useRef<boolean>(false); // Prevent concurrent polls
  const polling = useRef<number | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    let mounted = true;

    const loadStoredNotifications = async () => {
      try {
        const stored = await getCustomerNotifications(session.user.id);
        if (mounted) {
          // Convert DB notifications to component format
          const converted = stored.map((n: any) => ({
            id: n.id,
            order_id: n.order_id,
            status: n.status,
            created_at: n.created_at,
            message: n.message,
            total_price: n.total_price,
            farmer_contacts: n.farmer_contacts || [],
            items: n.items || [],
            is_read: n.is_read,
          }));
          
          // Deduplicate: keep only the latest notification per order
          const deduped: Record<string, Notification> = {};
          converted.forEach((n: Notification) => {
            const existing = deduped[n.order_id];
            if (!existing || new Date(n.created_at) > new Date(existing.created_at)) {
              deduped[n.order_id] = n;
            }
          });
          
          const dedupedList = Object.values(deduped);
          setNotifications(dedupedList);
          
          // Initialize lastStatuses from stored notifications
          dedupedList.forEach((n: Notification) => {
            if (!lastStatuses.current[n.order_id]) {
              lastStatuses.current[n.order_id] = n.status;
            }
          });
        }
      } catch (err) {
        console.error('Failed to load stored notifications', err);
      }
    };

    const poll = async () => {
      if (pollingInProgress.current) return; // Skip if poll already running
      pollingInProgress.current = true;
      
      try {
        const orders = await getOrdersForCustomer(session.user.id);
        if (!mounted) return;
        // detect status changes
        for (const o of orders) {
          const prev = lastStatuses.current[o.id];
          if (!prev) {
            // new order seen
            lastStatuses.current[o.id] = o.status;
            continue;
          }
          if (prev !== o.status) {
            // status changed
            const baseMsg = `Your order ${o.display_id ?? o.id} is now ${o.status}`;

            // Map order items into a compact structure for display
            const items = Array.isArray(o.order_items)
              ? o.order_items.map((it: any) => ({
                  product_id: it.product?.id,
                  name: it.product?.name,
                  image_url: it.product?.image_url || null,
                  quantity: it.quantity,
                  price_at_purchase: it.price_at_purchase,
                }))
              : [];

            // Collect unique farmer IDs from items and try to fetch profiles (email)
            const farmerIds = Array.from(new Set((o.order_items || []).map((it: any) => it?.product?.created_by).filter(Boolean)));
            const farmerContacts: Array<{ email?: string; phone?: string }> = [];

            if (farmerIds.length > 0) {
              // Fetch email from farmer profiles
              try {
                const { data: profiles, error } = await supabase
                  .from('profiles')
                  .select('id,email')
                  .in('id', farmerIds);
                if (!error && Array.isArray(profiles)) {
                  profiles.forEach((p: any) => {
                    farmerContacts.push({ email: p.email });
                  });
                }
              } catch (fetchErr) {
                // ignore profile fetch errors — notification will still show basic info
                console.error('Failed to fetch farmer profiles for notifications', fetchErr);
              }
            }

            // Build toast and notification object
            let toastMsg = baseMsg;
            if (o.status === 'accepted' && farmerContacts.length > 0) {
              const contactsStr = farmerContacts.map(c => c.email || c.phone).filter(Boolean).join(', ');
              if (contactsStr) toastMsg += `. Farmer contact: ${contactsStr}`;
            }

            // Check if we've already shown this toast to prevent duplicates
            const toastKey = `${o.id}:${o.status}`;
            if (!shownToasts.current.has(toastKey)) {
              toast.showToast(toastMsg, o.status === 'accepted' ? 'success' : 'info');
              shownToasts.current.add(toastKey);
            }
            
            // Save notification to database
            try {
              // Delete old notifications for this order first
              const oldNotifications = notifications.filter(n => n.order_id === o.id);
              for (const oldNotif of oldNotifications) {
                try {
                  await deleteNotification(oldNotif.id);
                } catch (delErr) {
                  console.error('Failed to delete old notification', delErr);
                }
              }
              
              const savedNotification = await saveNotification(
                session.user.id,
                o.id,
                o.status,
                baseMsg,
                o.total_price,
                items,
                farmerContacts
              );
              
              // Add to state and REMOVE old notification for this order
              const newNotif: Notification = {
                id: savedNotification.id,
                order_id: o.id,
                display_id: o.display_id,
                status: o.status,
                created_at: savedNotification.created_at,
                message: baseMsg,
                total_price: o.total_price,
                farmer_contacts: farmerContacts,
                items,
                is_read: false,
              };
              
              if (mounted) {
                // Replace old notification for this order with new one
                setNotifications(prevList => {
                  const filtered = prevList.filter(n => n.order_id !== o.id);
                  return [newNotif, ...filtered];
                });
              }
            } catch (saveErr) {
              console.error('Failed to save notification to database', saveErr);
              // Fallback: still add to memory
              const newNotif: Notification = {
                id: `${o.id}:${Date.now()}`,
                order_id: o.id,
                display_id: o.display_id,
                status: o.status,
                created_at: new Date().toISOString(),
                message: baseMsg,
                total_price: o.total_price,
                farmer_contacts: farmerContacts,
                items,
                is_read: false,
              };
              
              if (mounted) {
                // Replace old notification for this order with new one
                setNotifications(prevList => {
                  const filtered = prevList.filter(n => n.order_id !== o.id);
                  return [newNotif, ...filtered];
                });
              }
            }
            
            lastStatuses.current[o.id] = o.status;
          }
        }
      } catch (err) {
        // ignore polling errors
        console.error('Notification poll error', err);
      } finally {
        pollingInProgress.current = false;
      }
    };

    // initial load of stored notifications
    loadStoredNotifications();
    
    // then poll for new/updated orders
    poll();
    // poll every 10 seconds
    polling.current = window.setInterval(poll, 10000) as unknown as number;

    return () => {
      mounted = false;
      if (polling.current) window.clearInterval(polling.current as number);
    };
  }, [session, toast]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (notificationId: string) => {
    // Update UI immediately
    setNotifications(prevList =>
      prevList.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    
    // Save to database
    try {
      await markNotificationAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
