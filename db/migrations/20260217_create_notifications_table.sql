-- Create notifications table to persist order notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  total_price NUMERIC,
  items JSONB,
  farmer_contacts JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on customer_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);

-- Create index on order_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policy: customers can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = customer_id);

-- RLS policy: allow insert for authenticated users
CREATE POLICY "Users can create notifications for themselves" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- RLS policy: allow update of is_read status
CREATE POLICY "Users can update their notification read status" ON public.notifications
  FOR UPDATE USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- RLS policy: allow delete
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = customer_id);
