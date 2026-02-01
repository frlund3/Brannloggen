-- Fix recursive RLS on brukerprofiler
-- The previous migration caused infinite recursion because policies on brukerprofiler
-- referenced brukerprofiler itself. Fix: use a SECURITY DEFINER function that bypasses RLS.

-- Step 1: Create a helper function that bypasses RLS to check user role
CREATE OR REPLACE FUNCTION public.get_my_rolle()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rolle FROM brukerprofiler WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 2: Drop the recursive policies from previous migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brukerprofiler' AND policyname = 'Admins can view all profiles') THEN
    DROP POLICY "Admins can view all profiles" ON brukerprofiler;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brukerprofiler' AND policyname = '110-admins can view scoped profiles') THEN
    DROP POLICY "110-admins can view scoped profiles" ON brukerprofiler;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brukerprofiler' AND policyname = 'Users can view own profile') THEN
    DROP POLICY "Users can view own profile" ON brukerprofiler;
  END IF;
  -- Also drop legacy policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brukerprofiler' AND policyname = 'Users can read own profile') THEN
    DROP POLICY "Users can read own profile" ON brukerprofiler;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brukerprofiler' AND policyname = 'select_own_profile') THEN
    DROP POLICY "select_own_profile" ON brukerprofiler;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brukerprofiler' AND policyname = 'Admins can manage profiles') THEN
    DROP POLICY "Admins can manage profiles" ON brukerprofiler;
  END IF;
END $$;

-- Step 3: Recreate policies using the SECURITY DEFINER function (no recursion)
-- Users can always see their own profile
CREATE POLICY "Users can view own profile"
  ON brukerprofiler
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see ALL profiles
CREATE POLICY "Admins can view all profiles"
  ON brukerprofiler
  FOR SELECT
  USING (public.get_my_rolle() = 'admin');

-- 110-admins can see all profiles (scoping done in app)
CREATE POLICY "110-admins can view all profiles"
  ON brukerprofiler
  FOR SELECT
  USING (public.get_my_rolle() = '110-admin');

-- Admins can insert/update/delete profiles
CREATE POLICY "Admins can manage profiles"
  ON brukerprofiler
  FOR ALL
  USING (public.get_my_rolle() IN ('admin', '110-admin'))
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON brukerprofiler
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 4: Also update policies on other tables that reference brukerprofiler
-- These also suffer from recursion since they query brukerprofiler which triggers its RLS

-- Fix kategorier admin policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kategorier' AND policyname = 'Admins can manage kategorier') THEN
    DROP POLICY "Admins can manage kategorier" ON kategorier;
  END IF;
END $$;
CREATE POLICY "Admins can manage kategorier"
  ON kategorier
  FOR ALL
  USING (public.get_my_rolle() IN ('admin', '110-admin'))
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin'));

-- Fix brannvesen admin policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brannvesen' AND policyname = 'Admins can manage brannvesen') THEN
    DROP POLICY "Admins can manage brannvesen" ON brannvesen;
  END IF;
END $$;
CREATE POLICY "Admins can manage brannvesen"
  ON brannvesen
  FOR ALL
  USING (public.get_my_rolle() IN ('admin', '110-admin'))
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin'));

-- Fix sentraler admin policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentraler' AND policyname = 'Admins can manage sentraler') THEN
    DROP POLICY "Admins can manage sentraler" ON sentraler;
  END IF;
END $$;
CREATE POLICY "Admins can manage sentraler"
  ON sentraler
  FOR ALL
  USING (public.get_my_rolle() IN ('admin', '110-admin'))
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin'));
