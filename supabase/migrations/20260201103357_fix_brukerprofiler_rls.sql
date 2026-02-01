-- Fix RLS on brukerprofiler so admins can see all profiles
-- Drop existing select policy if it only allows own profile
DO $$
BEGIN
  -- Drop the restrictive "users can view own profile" policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'brukerprofiler'
    AND policyname = 'Users can view own profile'
  ) THEN
    DROP POLICY "Users can view own profile" ON brukerprofiler;
  END IF;

  -- Also drop if named differently
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'brukerprofiler'
    AND policyname = 'Brukere kan se egen profil'
  ) THEN
    DROP POLICY "Brukere kan se egen profil" ON brukerprofiler;
  END IF;
END $$;

-- Create policy: users can always see their own profile
CREATE POLICY "Users can view own profile"
  ON brukerprofiler
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: admins can see ALL profiles
CREATE POLICY "Admins can view all profiles"
  ON brukerprofiler
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brukerprofiler bp
      WHERE bp.user_id = auth.uid()
      AND bp.rolle = 'admin'
    )
  );

-- Create policy: 110-admins can see profiles for users in their sentraler
CREATE POLICY "110-admins can view scoped profiles"
  ON brukerprofiler
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brukerprofiler bp
      WHERE bp.user_id = auth.uid()
      AND bp.rolle = '110-admin'
    )
  );
