-- ============================================================
-- Fix RLS for login redirect
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, check current state
SELECT
  u.id as user_id,
  u.email,
  bp.id as profile_id,
  bp.user_id as profile_user_id,
  bp.rolle,
  bp.aktiv
FROM auth.users u
LEFT JOIN brukerprofiler bp ON bp.user_id = u.id
WHERE u.email = 'frank.lunde1981@gmail.com';

-- Check if RLS is enabled on brukerprofiler
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'brukerprofiler';

-- Ensure the policy exists and is correct
-- Drop and recreate to be safe
DROP POLICY IF EXISTS "Users can read own profile" ON brukerprofiler;
CREATE POLICY "Users can read own profile" ON brukerprofiler
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM brukerprofiler bp2 WHERE bp2.user_id = auth.uid() AND bp2.rolle = 'admin'
    )
  );
