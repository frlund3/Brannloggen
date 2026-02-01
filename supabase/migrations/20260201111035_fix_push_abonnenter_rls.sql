-- Fix push_abonnenter RLS so anyone can upsert their own subscription.
-- The current SELECT policy blocks anon users, which breaks upsert.
-- Also fix recursive brukerprofiler reference in admin policies.

-- Drop ALL existing policies on push_abonnenter
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'push_abonnenter' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON push_abonnenter', pol.policyname);
  END LOOP;
END $$;

-- Anyone can SELECT (needed for upsert ON CONFLICT to work)
CREATE POLICY "Anyone can read push_abonnenter"
  ON push_abonnenter FOR SELECT
  USING (true);

-- Anyone can INSERT a new subscription
CREATE POLICY "Anyone can insert push_abonnenter"
  ON push_abonnenter FOR INSERT
  WITH CHECK (true);

-- Anyone can UPDATE (needed for upsert)
CREATE POLICY "Anyone can update push_abonnenter"
  ON push_abonnenter FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admins can delete (cleanup old subscriptions)
CREATE POLICY "Admins can delete push_abonnenter"
  ON push_abonnenter FOR DELETE
  USING (public.get_my_rolle() IN ('admin', '110-admin'));
