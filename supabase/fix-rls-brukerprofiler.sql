-- Fix RLS on brukerprofiler - drop and recreate WITHOUT recursion
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies on brukerprofiler
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'brukerprofiler'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON brukerprofiler', pol.policyname);
  END LOOP;
END $$;

-- Simple policy: every authenticated user can read their own profile row
-- No recursion - just compares auth.uid() with the row's user_id
CREATE POLICY "select_own_profile" ON brukerprofiler
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "update_own_profile" ON brukerprofiler
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role (server-side) can do everything
-- Admin operations (manage other users) should go through server-side API routes
-- that use the service_role key, not through client-side queries

-- Ensure RLS is on
ALTER TABLE brukerprofiler ENABLE ROW LEVEL SECURITY;
