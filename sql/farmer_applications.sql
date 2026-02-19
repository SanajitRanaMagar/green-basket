-- farmer_applications.sql
-- Idempotent SQL to create `farmer_applications` and RLS policies safely

-- 1) Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create enum safely (older Postgres doesn't support CREATE TYPE IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE public.application_status AS ENUM ('pending','approved','rejected');
  END IF;
END$$;

-- 3) Create table (minimal fields)
CREATE TABLE IF NOT EXISTS public.farmer_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  farm_name TEXT NOT NULL,
  farm_type TEXT NOT NULL,
  farm_address JSONB,
  status public.application_status DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_farmer_applications_user_id ON public.farmer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_applications_status ON public.farmer_applications(status);

-- 4) Enable RLS and create policies safely (drop if they already exist)
ALTER TABLE public.farmer_applications ENABLE ROW LEVEL SECURITY;

-- drop existing policies to ensure idempotency
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Farmer insert own application') THEN
    EXECUTE 'DROP POLICY "Farmer insert own application" ON public.farmer_applications';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Farmer select own application') THEN
    EXECUTE 'DROP POLICY "Farmer select own application" ON public.farmer_applications';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Farmer update own application') THEN
    EXECUTE 'DROP POLICY "Farmer update own application" ON public.farmer_applications';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins full access') THEN
    EXECUTE 'DROP POLICY "Admins full access" ON public.farmer_applications';
  END IF;
END$$;

-- Farmer can insert their own application
CREATE POLICY "Farmer insert own application"
ON public.farmer_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Farmer can select their own application
CREATE POLICY "Farmer select own application"
ON public.farmer_applications FOR SELECT
USING (auth.uid() = user_id);

-- Farmer can update their application while pending or rejected
CREATE POLICY "Farmer update own application"
ON public.farmer_applications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (status = 'pending' OR status = 'rejected')
);

-- Admins have full access
CREATE POLICY "Admins full access"
ON public.farmer_applications FOR ALL
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- End of farmer_applications.sql
