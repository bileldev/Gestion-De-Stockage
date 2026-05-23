# Deployment Guide - Gestion De Stock

## Free Deployment Steps

### Step 1: Set Up Database (Supabase)

1. Go to [Supabase](https://supabase.com) and sign in
2. Create a new project or use your existing one
3. Go to **SQL Editor** → **Create a new query**
4. Copy and paste the entire SQL schema script from below
5. Click **Run** to create all tables

**SQL Schema Script:**
```sql
-- =====================================================
-- GESTION DE STOCK - DATABASE SCHEMA
-- =====================================================

-- Create Profiles table FIRST (referenced by other tables)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admins to read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- WAREHOUSES & BLOCKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read warehouses" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Allow admins to insert warehouses" ON public.warehouses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins to update warehouses" ON public.warehouses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins to delete warehouses" ON public.warehouses FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create Blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(warehouse_id, name)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read blocks" ON public.blocks FOR SELECT USING (true);
CREATE POLICY "Allow admins to insert blocks" ON public.blocks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins to update blocks" ON public.blocks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins to delete blocks" ON public.blocks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- SUPPLIERS & MERCHANDISE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  contact_email TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow admins to modify suppliers" ON public.suppliers 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create Merchandise table
CREATE TABLE IF NOT EXISTS public.merchandise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  unit TEXT DEFAULT 'piece',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.merchandise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read merchandise" ON public.merchandise FOR SELECT USING (true);
CREATE POLICY "Allow admins to insert merchandise" ON public.merchandise FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins to update merchandise" ON public.merchandise FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow admins to delete merchandise" ON public.merchandise FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- PRICING & INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchandise_id UUID NOT NULL REFERENCES public.merchandise(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  price DECIMAL(12, 3) NOT NULL,
  currency TEXT DEFAULT 'TND',
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(merchandise_id, supplier_id, effective_date)
);

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read prices" ON public.prices FOR SELECT USING (true);
CREATE POLICY "Allow admins to modify prices" ON public.prices 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  merchandise_id UUID NOT NULL REFERENCES public.merchandise(id) ON DELETE CASCADE,
  quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(block_id, merchandise_id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow employees to update inventory" ON public.inventory FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'employee' OR role = 'admin'))
);
CREATE POLICY "Allow admins to insert inventory" ON public.inventory FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- OPERATIONS & AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('add', 'remove', 'transfer')),
  merchandise_id UUID NOT NULL REFERENCES public.merchandise(id),
  from_block_id UUID REFERENCES public.blocks(id),
  to_block_id UUID REFERENCES public.blocks(id),
  quantity DECIMAL(12, 3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read operations" ON public.operations FOR SELECT USING (true);
CREATE POLICY "Allow employees to insert operations" ON public.operations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'employee' OR role = 'admin'))
);

-- =====================================================
-- INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  total_amount DECIMAL(12, 3),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ocr_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow employees to insert invoices" ON public.invoices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'employee' OR role = 'admin'))
);
CREATE POLICY "Allow admins to update invoice status" ON public.invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_blocks_warehouse ON public.blocks(warehouse_id);
CREATE INDEX idx_inventory_block ON public.inventory(block_id);
CREATE INDEX idx_inventory_merchandise ON public.inventory(merchandise_id);
CREATE INDEX idx_operations_user ON public.operations(user_id);
CREATE INDEX idx_operations_created ON public.operations(created_at);
CREATE INDEX idx_invoices_supplier ON public.invoices(supplier_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_prices_merchandise ON public.prices(merchandise_id);
```

### Step 2: Get Environment Variables

1. In Supabase, go to **Settings** → **API**
2. Copy your:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Publishable key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Keep these for the next step

### Step 3: Deploy to Vercel (Free)

**Option A: Using v0 Publish Button (Easiest)**
1. Click the **"Publish"** button in top right of v0
2. Follow the Vercel setup wizard
3. Add the Supabase environment variables when prompted

**Option B: Using GitHub**
1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```
5. Deploy!

### Step 4: Enable Authentication

In Supabase Dashboard:
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (default)
3. Go to **URL Configuration** and set:
   - Site URL: `https://your-vercel-domain.vercel.app`
   - Redirect URLs: `https://your-vercel-domain.vercel.app/auth/callback`

### Step 5: Create Initial Users (Demo Data)

Add test suppliers and merchandise through the Admin Dashboard after first login:
- Sign up with an admin email
- Manually promote to admin in Supabase (`profiles` table)
- Create warehouses, blocks, suppliers, merchandise

## Free Tier Limits

| Service | Free Limit |
|---------|-----------|
| **Vercel** | 100GB bandwidth/month, unlimited deployments |
| **Supabase** | 500MB database, 2GB storage, 50MB file uploads |
| **Tesseract.js (OCR)** | Unlimited (runs client-side) |

Everything scales for free within these limits!

## Testing

1. **Employee Features:**
   - Login with employee account
   - Add stock to inventory
   - Upload invoices (try the PDFs you provided)
   - View operations history

2. **Admin Features:**
   - Promote account to admin in Supabase
   - Approve invoices
   - View KPI dashboard
   - Manage merchandise and suppliers

## Support

For issues:
- Check Vercel logs: Dashboard → Project → Deployments → Logs
- Check Supabase logs: Dashboard → Database → Query Performance
- Review environment variables in Vercel Settings → Environment Variables
