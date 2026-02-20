import { supabase } from './supabase';
import { Product, CartItem, Order, OrderItem, Profile, FarmerApplication } from '../types';

// --- Products ---

// Cache for approved products to avoid redundant queries
let cachedProducts: Product[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const getApprovedProducts = async (category?: string, search?: string, location?: string) => {
  // Fetch products with their creator info
  let query = supabase
    .from('products')
    .select('*')
    .eq('status', 'approved');

  if (category) query = query.eq('category', category);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data: products, error } = await query;
  if (error) throw error;

  if (!products || products.length === 0) return [];

  // Get farmer information for all products
  const farmerIds = Array.from(new Set(products.map((p: any) => p.created_by).filter(Boolean)));
  
  let farmerData: Record<string, any> = {};
  if (farmerIds.length > 0) {
    try {
      // Fetch farmer profiles and applications IN PARALLEL (not sequentially)
      const [{ data: farmers, error: farmerError }, { data: apps, error: appError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, city, email')
          .in('id', farmerIds),
        supabase
          .from('farmer_applications')
          .select('user_id, farm_address, status')
          .in('user_id', farmerIds)
      ]);
      
      // Map profile data
      if (!farmerError && farmers) {
        farmers.forEach((f: any) => {
          farmerData[f.id] = f;
        });
      }
      
      // Merge application locations
      if (!appError && apps) {
        apps.forEach((app: any) => {
          // Use application location if profile doesn't have city
          if (!farmerData[app.user_id]?.city && app.farm_address?.city) {
            if (!farmerData[app.user_id]) farmerData[app.user_id] = {};
            farmerData[app.user_id].city = app.farm_address.city;
          }
        });
      }
    } catch (err) {
      console.warn('Error fetching farmer data:', err);
    }
  }

  // Map products with farmer location
  let result = products.map((p: any) => ({
    ...p,
    location: p.location || farmerData[p.created_by]?.city || 'Unknown Location'
  }));

  // Filter by location if provided (case-insensitive)
  if (location) {
    result = result.filter(p => 
      p.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  return result as Product[];
};

// New optimized function to load all approved products once (for caching)
export const getAllApprovedProductsWithLocations = async () => {
  const now = Date.now();
  if (cachedProducts && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedProducts;
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'approved');
  
  if (error) throw error;
  if (!products || products.length === 0) {
    cachedProducts = [];
    cacheTimestamp = now;
    return [];
  }

  // Fetch farmer data in parallel
  const farmerIds = Array.from(new Set(products.map((p: any) => p.created_by).filter(Boolean)));
  let farmerData: Record<string, any> = {};
  
  if (farmerIds.length > 0) {
    try {
      const [{ data: farmers }, { data: apps }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, city, email')
          .in('id', farmerIds),
        supabase
          .from('farmer_applications')
          .select('user_id, farm_address, status')
          .in('user_id', farmerIds)
      ]);
      
      if (farmers) {
        farmers.forEach((f: any) => {
          farmerData[f.id] = f;
        });
      }
      
      if (apps) {
        apps.forEach((app: any) => {
          if (!farmerData[app.user_id]?.city && app.farm_address?.city) {
            if (!farmerData[app.user_id]) farmerData[app.user_id] = {};
            farmerData[app.user_id].city = app.farm_address.city;
          }
        });
      }
    } catch (err) {
      console.warn('Error fetching farmer data:', err);
    }
  }

  const result = products.map((p: any) => ({
    ...p,
    location: p.location || farmerData[p.created_by]?.city || 'Unknown Location'
  }));

  cachedProducts = result as Product[];
  cacheTimestamp = now;
  return cachedProducts;
};

export const getFarmerProducts = async (farmerId: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('created_by', farmerId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!data || data.length === 0) return [];

  // Fetch farmer location from profile and applications
  let farmerData: any = {};
  
  try {
    const { data: farmers, error: farmerError } = await supabase
      .from('profiles')
      .select('id, city, email')
      .eq('id', farmerId);
    
    if (!farmerError && farmers && farmers.length > 0) {
      farmerData = farmers[0];
    }
  } catch (err) {
    console.warn('Error fetching farmer profile location:', err);
  }
  
  // Also fetch from farmer_applications to get location from applications
  try {
    const { data: apps, error: appError } = await supabase
      .from('farmer_applications')
      .select('user_id, farm_address')
      .eq('user_id', farmerId);
    
    if (!appError && apps && apps.length > 0 && !farmerData.city && apps[0].farm_address?.city) {
      farmerData.city = apps[0].farm_address.city;
    }
  } catch (err) {
    console.warn('Error fetching farmer application location:', err);
  }

  // Map products with farmer location
  const result = data.map((p: any) => ({
    ...p,
    location: p.location || farmerData.city || 'Unknown Location'
  }));

  return result as Product[];
};

export const createProduct = async (product: Omit<Product, 'id' | 'created_at' | 'status'>) => {
  const { data, error } = await supabase
    .from('products')
    .insert([{ ...product, status: 'pending' }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const uploadProductImage = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage
    .from('products')
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data } = supabase.storage.from('products').getPublicUrl(fileName);
  return data.publicUrl;
};

// --- Cart ---

export const getCart = async (userId: string) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, product:products(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data as CartItem[];
};

export const addToCart = async (userId: string, productId: string, quantity: number) => {
  // Upsert logic: if exists, update quantity, else insert
  // Note: Supabase UPSERT requires a unique constraint. We added UNIQUE(user_id, product_id).
  
  // First check if it exists to calculate new quantity
  const { data: existing } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  let newQty = quantity;
  if (existing) {
    newQty += existing.quantity;
  }

  const { data, error } = await supabase
    .from('cart_items')
    .upsert({ user_id: userId, product_id: productId, quantity: newQty })
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateCartQuantity = async (cartItemId: string, quantity: number) => {
  if (quantity <= 0) {
    return deleteCartItem(cartItemId);
  }
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId);
  if (error) throw error;
};

export const deleteCartItem = async (cartItemId: string) => {
  const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
  if (error) throw error;
};

export const clearCart = async (userId: string) => {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
  if (error) throw error;
};

// --- Orders ---

export const checkout = async (userId: string, cartItems: CartItem[], total: number) => {
  // Try secure RPC first (recommended). If the function doesn't exist
  // (404 / PGRST202) fall back to direct client-side inserts.
  const itemsPayload = cartItems.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
    price_at_purchase: item.product?.price || 0
  }));

  try {
    const { data, error } = await supabase.rpc('place_order', { p_items: itemsPayload, p_total: total });
    if (error) throw error;
    await clearCart(userId);
    return data;
  } catch (err: any) {
    // Detect missing RPC or Not Found (PostgREST 404 / PGRST202)
    const message = err?.message || '';
    const code = err?.code || '';
    if (message.includes('Could not find the function public.place_order') || code === 'PGRST202' || err?.status === 404) {
      // Fallback: attempt client-side inserts. Verify we have an authenticated
      // session and that the session user matches the provided userId. If RLS
      // blocks the insert we'll surface a clear error explaining how to fix it
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUserId = sessionData?.session?.user?.id;
      if (!sessionUserId) {
        throw new Error('No active session found. Please sign in before checkout or create the server-side `place_order` RPC.');
      }
      if (sessionUserId !== userId) {
        throw new Error('Session user does not match provided userId. Please ensure you are logged in as the purchasing user.');
      }

      // Try to insert the order row directly
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ customer_id: userId, total_price: total })
        .select()
        .single();
      if (orderError) {
        const msg = orderError.message || '';
        if (msg.toLowerCase().includes('row violates row-level security') || orderError.code === '42501') {
          throw new Error('Insert blocked by Row Level Security. Create the `place_order` SECURITY DEFINER RPC (see SUPABASE_SETUP.md) or relax the `orders` INSERT policy so customers can create orders.');
        }
        throw orderError;
      }

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.product?.price || 0
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      if (itemsError) {
        const msg = itemsError.message || '';
        if (msg.toLowerCase().includes('row violates row-level security') || itemsError.code === '42501') {
          throw new Error('Inserting order_items blocked by Row Level Security. Ensure `order_items` INSERT policy allows this client-side flow or use the server-side `place_order` RPC.');
        }
        throw itemsError;
      }

      await clearCart(userId);
      return order;
    }

    // Re-throw other errors
    throw err;
  }
};

// --- Admin ---

export const getPendingFarmers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'farmer')
    .eq('status', 'pending');
  if (error) throw error;
  return data as Profile[];
};

export const approveFarmer = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', userId);
  if (error) throw error;
};

export const getPendingProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*, profiles:created_by(email)')
    .eq('status', 'pending');
  if (error) throw error;
  return data; // Returns product with joined profile email
};

export const getAllOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles:customer_id(email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Add sequential numeric display ids for UI (newest = 1)
  const result = (data || []).map((d: any, i: number) => ({ ...d, display_id: i + 1 }));
  return result;
};

export const getOrdersForCustomer = async (customerId: string) => {
  // Include order items and nested product creator profile (farmer contact).
  // Request only email from farmer profiles to avoid errors if phone column missing.
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(quantity, price_at_purchase, product:product_id(id, name, image_url, created_by, profiles:created_by(email))), profiles:customer_id(email)`)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Attach display_id (newest = 1)
  return (data || []).map((d: any, i: number) => ({ ...d, display_id: i + 1 }));
};

// --- Farmer Orders ---
export const getOrdersForFarmer = async (farmerId: string) => {
  // 1. Get all products created by this farmer
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id')
    .eq('created_by', farmerId);
  if (prodError) throw prodError;
  
  if (!products || products.length === 0) return [];
  
  const productIds = products.map(p => p.id);

  // 2. Get all order items for these products with order and product details
  const { data, error } = await supabase
    .from('order_items')
    .select('order_id, quantity, price_at_purchase, product:product_id(id, name, image_url, created_by), order:order_id(id, customer_id, total_price, created_at, status, profiles:customer_id(email))');
  if (error) throw error;

  // 3. Filter client-side to only include items for this farmer's products
  const filtered = (data || []).filter((row: any) => productIds.includes(row.product?.id));

  // 4. Group by order
  const map = new Map<string, any>();
  filtered.forEach((row: any) => {
    const ord = row.order;
    if (!ord) return;
    const id = ord.id;
    if (!map.has(id)) {
      map.set(id, {
        id,
        customer_id: ord.customer_id,
        customer_email: ord.profiles?.email || null,
        total_price: ord.total_price,
        created_at: ord.created_at,
        status: ord.status || 'pending',
        items: [] as any[],
      });
    }
    map.get(id).items.push({
      product_id: row.product?.id,
      name: row.product?.name,
      quantity: row.quantity,
      price_at_purchase: row.price_at_purchase,
      image_url: row.product?.image_url || null,
    });
  });

  const result = Array.from(map.values());
  // sort by created_at ascending (oldest first) so top shows the first order
  result.sort((a: any, b: any) => {
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return da - db;
  });

  // Compute total quantity per order and assign sequential display ids from top-to-bottom
  result.forEach((r: any, idx: number) => {
    const totalQty = (r.items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0);
    r.total_quantity = totalQty;
    r.display_id = idx + 1; // top (oldest) = 1
  });
  return result;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  // Attempt to update and return the updated order row. Use `.select()` so
  // we can detect whether any row was actually changed (helps surface
  // permission / RLS issues where the query succeeds but affects 0 rows).
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .maybeSingle();

  if (error) {
    // Provide a helpful error when `status` column is missing
    if (error.message && error.message.toLowerCase().includes('column') && error.message.toLowerCase().includes('status')) {
      throw new Error('Database does not have `orders.status` column. Run: ALTER TABLE public.orders ADD COLUMN status text DEFAULT \'pending\';');
    }
    throw error;
  }

  // If no row was returned, the update did not affect any rows. This can
  // happen when RLS blocks the update or the id didn't match. Surface a
  // clear error so the caller can react and the UI doesn't incorrectly show
  // a success toast.
  if (!data) {
    // Try to fetch the order to provide a clearer diagnostic message
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr) {
      throw new Error('Update did not modify any order and fetching the order failed: ' + (fetchErr.message || JSON.stringify(fetchErr)));
    }

    if (!order) {
      throw new Error('Update did not modify any order and the order was not found. Check that the provided order id is correct.');
    }

    // If the order exists but the status didn't change, most likely RLS/policy
    // prevented the update. Return a helpful message including current status.
    throw new Error(`Update did not modify any order. Current status: ${order.status ?? 'unknown'}. This is often caused by Row Level Security (RLS) or insufficient permissions for the current user to update this order.`);
  }

  return data as any;
};

export const reduceProductStock = async (productId: string, quantity: number) => {
  // Get the current product to find out its current stock
  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(`Failed to fetch product stock: ${fetchErr.message}`);
  }

  if (!product) {
    throw new Error(`Product with id ${productId} not found`);
  }

  // Calculate new stock (ensure it doesn't go below 0)
  const newStock = Math.max(0, (product.stock_quantity || 0) - quantity);

  // Update the product stock
  const { data: updated, error: updateErr } = await supabase
    .from('products')
    .update({ stock_quantity: newStock })
    .eq('id', productId)
    .select()
    .maybeSingle();

  if (updateErr) {
    throw new Error(`Failed to update product stock: ${updateErr.message}`);
  }

  return updated;
};

export const deductStockForOrder = async (orderId: string) => {
  // Get the order with all its items
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(`Failed to fetch order: ${fetchErr.message}`);
  }

  if (!order) {
    throw new Error(`Order with id ${orderId} not found`);
  }

  if (!order.items || order.items.length === 0) {
    return;
  }

  // Deduct stock for each item in the order
  for (const item of order.items) {
    await reduceProductStock(item.product_id, item.quantity);
  }
};

export const deleteOrder = async (orderId: string) => {
  // Delete an order (and its order_items via CASCADE)
  // Use .select() to verify the delete actually happened
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .select();

  if (error) {
    throw new Error(`Failed to delete order: ${error.message}`);
  }

  // If no rows were deleted, the delete was blocked (likely by RLS)
  if (!data || data.length === 0)  {
    throw new Error('Delete failed: You do not have permission to delete this order. Check RLS policies.');
  }
};


// --- Farmer Applications ---
export const getApplicationForUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('farmer_applications')
    .select('id,user_id,full_name,farm_name,farm_type,phone,farm_address,status,reviewed_by,reviewed_at,created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as FarmerApplication | null;
};

export const upsertApplication = async (payload: any) => {
  // Not all DBs may have a UNIQUE constraint on user_id. To avoid
  // "there is no unique or exclusion constraint matching the ON" errors
  // use a safe select -> insert or update flow.
  if (!payload?.user_id) throw new Error('payload.user_id is required');

  // Check for existing application
  const { data: existing, error: selectError } = await supabase
    .from('farmer_applications')
    .select('*')
    .eq('user_id', payload.user_id)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { data, error } = await supabase
      .from('farmer_applications')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('farmer_applications')
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};

export const getPendingApplications = async () => {
  const { data, error } = await supabase
    .from('farmer_applications')
    .select('id,user_id,full_name,farm_name,farm_type,phone,farm_address,status,created_at,profiles:user_id(email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as FarmerApplication[];
};

export const getApplicationById = async (applicationId: string) => {
  const { data, error } = await supabase
    .from('farmer_applications')
    .select('id,user_id,full_name,farm_name,farm_type,phone,farm_address,status,created_at,profiles:user_id(email)')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data as FarmerApplication | null;
};

export const approveFarmerApplication = async (userId: string, applicationId: string) => {
  try {
    // Get the user's auth session
    const user = await supabase.auth.getUser();
    const adminId = user.data.user?.id;
    
    // Fetch application to get location data
    const { data: appData, error: appFetchError } = await supabase
      .from('farmer_applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    
    if (appFetchError) throw appFetchError;
    if (!appData) throw new Error('Application not found');
    
    // Update application status to approved
    const { error: appUpdateError } = await supabase
      .from('farmer_applications')
      .update({ status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('id', applicationId);
    if (appUpdateError) throw appUpdateError;
    
    // Update profile: set status to active and save location from application
    const location = appData?.farm_address?.city || 'Unknown Location';
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'active', city: location })
      .eq('id', userId);
    if (profileError) throw profileError;
    
    console.log(`✓ Farmer ${userId} approved with location: ${location}`);
  } catch (err: any) {
    console.error('Error approving farmer application:', err);
    throw err;
  }
};

// Sync farmer location from application to profile (fixes "Unknown Location")
export const syncFarmerLocation = async (userId: string) => {
  // Fetch farmer's active application
  const { data: app } = await supabase
    .from('farmer_applications')
    .select('farm_address')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!app?.farm_address?.city) {
    throw new Error('No location found in farmer application');
  }
  
  // Update farmer's profile with city
  const { error } = await supabase
    .from('profiles')
    .update({ city: app.farm_address.city })
    .eq('id', userId);
  
  if (error) throw error;
  return { city: app.farm_address.city };
};

// Debug function to verify farmer location was saved
export const checkFarmerLocationSaved = async (userId: string) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, city, status')
    .eq('id', userId)
    .single();
  
  const { data: app } = await supabase
    .from('farmer_applications')
    .select('user_id, farm_address, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  return {
    profile_city: profile?.city || 'NOT SET',
    profile_status: profile?.status || 'unknown',
    application_city: app?.farm_address?.city || 'NOT SET',
    application_status: app?.status || 'unknown'
  };
};

export const rejectFarmerApplication = async (userId: string, applicationId: string, reviewNotes: string) => {
  // Delete the application record so rejected farmers can resubmit fresh
  // (instead of keeping a rejected status that blocks them)
  const { error } = await supabase
    .from('farmer_applications')
    .delete()
    .eq('id', applicationId);
  if (error) throw error;
  
  // Note: The farmer's profile.status remains 'pending' so they can resubmit.
  // In a future version, you could store rejection history in a separate audit table.
};

// --- Notifications ---

export const saveNotification = async (
  customerId: string,
  orderId: string,
  status: string,
  message: string,
  totalPrice?: number,
  items?: any[],
  farmerContacts?: Array<{ email?: string; phone?: string }>
) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      customer_id: customerId,
      order_id: orderId,
      status,
      message,
      total_price: totalPrice,
      items,
      farmer_contacts: farmerContacts,
      is_read: false
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getCustomerNotifications = async (customerId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
};

export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  if (error) throw error;
};


export const getAllApplications = async () => {
  const { data, error } = await supabase
    .from('farmer_applications')
    .select('id,user_id,full_name,farm_name,farm_type,phone,farm_address,status,created_at,profiles:user_id(email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as FarmerApplication[];
};

export const deleteApplication = async (applicationId: string) => {
  const { error } = await supabase
    .from('farmer_applications')
    .delete()
    .eq('id', applicationId);
  if (error) throw error;
};

export const getAllProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*, profiles:created_by(email)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!data || data.length === 0) return [];

  // Get farmer information for all products
  const farmerIds = Array.from(new Set(data.map((p: any) => p.created_by).filter(Boolean)));
  
  let farmerData: Record<string, any> = {};
  if (farmerIds.length > 0) {
    try {
      // Fetch profiles and applications IN PARALLEL
      const [{ data: farmers }, { data: apps }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, city, email')
          .in('id', farmerIds),
        supabase
          .from('farmer_applications')
          .select('user_id, farm_address')
          .in('user_id', farmerIds)
      ]);
      
      if (farmers) {
        farmers.forEach((f: any) => {
          farmerData[f.id] = f;
        });
      }
      
      if (apps) {
        apps.forEach((app: any) => {
          if (!farmerData[app.user_id]?.city && app.farm_address?.city) {
            if (!farmerData[app.user_id]) farmerData[app.user_id] = {};
            farmerData[app.user_id].city = app.farm_address.city;
          }
        });
      }
    } catch (err) {
      console.warn('Error fetching farmer data for all products:', err);
    }
  }

  // Map products with farmer location
  const result = data.map((p: any) => ({
    ...p,
    location: p.location || farmerData[p.created_by]?.city || 'Unknown Location'
  }));

  return result;
};
