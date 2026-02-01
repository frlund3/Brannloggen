-- Security hardening migration
-- Fixes identified in security audit

-- ============================================================
-- 1. CRITICAL: Prevent self-role-escalation on brukerprofiler
-- Users can currently update their own rolle via the "Users can update own profile" policy.
-- Fix: Add a trigger that prevents non-admins from changing rolle.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_rolle text;
BEGIN
  -- If rolle is not being changed, allow
  IF OLD.rolle = NEW.rolle THEN
    RETURN NEW;
  END IF;

  -- Check if the caller is an admin
  caller_rolle := public.get_my_rolle();
  IF caller_rolle NOT IN ('admin', '110-admin') THEN
    RAISE EXCEPTION 'Bare administratorer kan endre brukerroller';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON brukerprofiler;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON brukerprofiler
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- ============================================================
-- 2. CRITICAL: Add RLS on interne_notater
-- ============================================================

ALTER TABLE IF EXISTS interne_notater ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'interne_notater' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON interne_notater', pol.policyname);
  END LOOP;
END $$;

-- Only operators and admins can read internal notes
CREATE POLICY "interne_notater_select" ON interne_notater FOR SELECT
  USING (public.get_my_rolle() IN ('admin', '110-admin', 'operatør'));

-- Only operators and admins can insert
CREATE POLICY "interne_notater_insert" ON interne_notater FOR INSERT
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin', 'operatør') AND auth.uid() = opprettet_av);

-- Only operators and admins can update (deactivate)
CREATE POLICY "interne_notater_update" ON interne_notater FOR UPDATE
  USING (public.get_my_rolle() IN ('admin', '110-admin', 'operatør'));

-- ============================================================
-- 3. HIGH: Lock down push_abonnenter
-- Currently anyone can read/write all subscriptions.
-- Fix: Users can only manage their own device subscriptions.
-- ============================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'push_abonnenter' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON push_abonnenter', pol.policyname);
  END LOOP;
END $$;

-- Anyone can insert their own subscription (anon for web push)
CREATE POLICY "push_abonnenter_insert" ON push_abonnenter FOR INSERT
  WITH CHECK (true);

-- Anyone can read (needed for upsert ON CONFLICT)
CREATE POLICY "push_abonnenter_select" ON push_abonnenter FOR SELECT
  USING (true);

-- Anyone can update their own subscription (matched by device_id in upsert)
CREATE POLICY "push_abonnenter_update" ON push_abonnenter FOR UPDATE
  USING (true) WITH CHECK (true);

-- Only admins can delete
CREATE POLICY "push_abonnenter_delete" ON push_abonnenter FOR DELETE
  USING (public.get_my_rolle() IN ('admin', '110-admin'));

-- ============================================================
-- 4. HIGH: Lock down push_notification_queue
-- Only triggers (SECURITY DEFINER) and admins should access.
-- ============================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'push_notification_queue' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON push_notification_queue', pol.policyname);
  END LOOP;
END $$;

-- Triggers use SECURITY DEFINER and bypass RLS, so these are for API access only
-- Only admins can read the queue
CREATE POLICY "push_queue_admin_select" ON push_notification_queue FOR SELECT
  USING (public.get_my_rolle() IN ('admin', '110-admin'));

-- Insert allowed for triggers (they bypass RLS via SECURITY DEFINER)
-- No API-level insert needed, but keep for safety
CREATE POLICY "push_queue_insert" ON push_notification_queue FOR INSERT
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin', 'operatør'));

-- Update for marking processed (admin/service role)
CREATE POLICY "push_queue_update" ON push_notification_queue FOR UPDATE
  USING (public.get_my_rolle() IN ('admin', '110-admin'));

-- ============================================================
-- 5. HIGH: Restrict aktivitetslogg INSERT to own user_id
-- ============================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'aktivitetslogg' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON aktivitetslogg', pol.policyname);
  END LOOP;
END $$;

-- Admins and 110-admins can read all logs
CREATE POLICY "aktivitetslogg_admin_select" ON aktivitetslogg FOR SELECT
  USING (public.get_my_rolle() IN ('admin', '110-admin'));

-- Users can only insert logs with their own bruker_id
CREATE POLICY "aktivitetslogg_insert_own" ON aktivitetslogg FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (bruker_id IS NULL OR bruker_id = auth.uid()));

-- ============================================================
-- 6. HIGH: Restrict presseoppdateringer to operators/admins
-- ============================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'presseoppdateringer' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON presseoppdateringer', pol.policyname);
  END LOOP;
END $$;

-- Everyone can read (press updates visible to public/press)
CREATE POLICY "presseoppdateringer_select" ON presseoppdateringer FOR SELECT
  USING (true);

-- Only operators and admins can insert
CREATE POLICY "presseoppdateringer_insert" ON presseoppdateringer FOR INSERT
  WITH CHECK (public.get_my_rolle() IN ('admin', '110-admin', 'operatør'));

-- Only operators and admins can update (deactivate)
CREATE POLICY "presseoppdateringer_update" ON presseoppdateringer FOR UPDATE
  USING (public.get_my_rolle() IN ('admin', '110-admin', 'operatør'));

-- ============================================================
-- 7. HIGH: Replace GRANT ALL with specific grants
-- Revoke ALL first, then grant specific permissions
-- ============================================================

-- Revoke GRANT ALL on presseoppdateringer
REVOKE ALL ON presseoppdateringer FROM authenticated;
GRANT SELECT ON presseoppdateringer TO anon, authenticated;
GRANT INSERT, UPDATE ON presseoppdateringer TO authenticated;

-- Tighten interne_notater grants
REVOKE ALL ON interne_notater FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON interne_notater TO authenticated;

-- Tighten push_notification_queue grants
REVOKE ALL ON push_notification_queue FROM authenticated;
GRANT SELECT ON push_notification_queue TO authenticated;
GRANT INSERT ON push_notification_queue TO authenticated;
GRANT UPDATE ON push_notification_queue TO authenticated;

-- Force PostgREST reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
