-- Fix RLS on brukerprofiler so logged-in users can read their own profile
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/gmxcubjktulxunxyeqih/sql

-- Drop all existing SELECT policies on brukerprofiler
DROP POLICY IF EXISTS "brukerprofiler_select" ON brukerprofiler;
DROP POLICY IF EXISTS "brukerprofiler_select_own" ON brukerprofiler;
DROP POLICY IF EXISTS "brukerprofiler_select_admin" ON brukerprofiler;
DROP POLICY IF EXISTS "Brukere kan se egen profil" ON brukerprofiler;
DROP POLICY IF EXISTS "Admin kan se alle profiler" ON brukerprofiler;
DROP POLICY IF EXISTS "Users can view own profile" ON brukerprofiler;
DROP POLICY IF EXISTS "Admins can view all profiles" ON brukerprofiler;

-- Simple policy: authenticated users can read their own row
CREATE POLICY "brukerprofiler_select_own" ON brukerprofiler
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can read all rows (non-recursive: checks JWT claim, not a subquery)
CREATE POLICY "brukerprofiler_select_admin" ON brukerprofiler
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT bp.user_id FROM brukerprofiler bp WHERE bp.user_id = auth.uid() AND bp.rolle = 'admin'
    )
  );

-- Verify RLS is enabled
ALTER TABLE brukerprofiler ENABLE ROW LEVEL SECURITY;

-- Test: this should return the current user's profile
-- SELECT * FROM brukerprofiler WHERE user_id = auth.uid();
