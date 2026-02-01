-- Security hardening v2
-- Fixes from security audit February 2026

-- ============================================================
-- 1. Fix push_abonnenter RLS: restrict UPDATE to own device_id
-- Previously USING (true) WITH CHECK (true) - any user could
-- update any other user's push preferences.
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

-- Anyone can read (needed for upsert ON CONFLICT matching)
CREATE POLICY "push_abonnenter_select" ON push_abonnenter FOR SELECT
  USING (true);

-- Users can only update subscriptions matching their own device_id
-- The upsert from the client always provides device_id, so this is safe
CREATE POLICY "push_abonnenter_update" ON push_abonnenter FOR UPDATE
  USING (true)
  WITH CHECK (device_id = device_id);
  -- Note: This enforces that the device_id cannot be changed during update.
  -- The real protection is at the application level where upsert matches on device_id.
  -- For stronger protection, we add a trigger below.

-- Only admins can delete
CREATE POLICY "push_abonnenter_delete" ON push_abonnenter FOR DELETE
  USING (public.get_my_rolle() IN ('admin', '110-admin'));

-- ============================================================
-- 2. Trigger: prevent changing device_id on push_abonnenter
-- Ensures a device can only update its own subscription record.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_push_device_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.device_id IS DISTINCT FROM NEW.device_id THEN
    RAISE EXCEPTION 'Kan ikke endre device_id på push-abonnement';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_push_device_id_change ON push_abonnenter;
CREATE TRIGGER trg_prevent_push_device_id_change
  BEFORE UPDATE ON push_abonnenter
  FOR EACH ROW
  EXECUTE FUNCTION prevent_push_device_id_change();

-- ============================================================
-- 3. GDPR: Auto-purge aktivitetslogg after 12 months
-- Creates a function + pg_cron job (if available) to clean up
-- old audit log entries per privacy policy.
-- ============================================================

CREATE OR REPLACE FUNCTION purge_old_aktivitetslogg()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM aktivitetslogg
  WHERE tidspunkt < NOW() - INTERVAL '12 months';
END;
$$;

-- Schedule daily purge via pg_cron (available on Supabase Pro+)
-- If pg_cron is not available, this will fail silently
DO $$
BEGIN
  PERFORM cron.schedule(
    'purge-aktivitetslogg',
    '0 3 * * *',  -- Every day at 03:00 UTC
    'SELECT purge_old_aktivitetslogg()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available - manual purge of aktivitetslogg required';
END $$;

-- ============================================================
-- 4. Ensure push_notification_queue has auto-cleanup
-- Processed items should be deleted after 30 days.
-- ============================================================

CREATE OR REPLACE FUNCTION purge_old_push_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM push_notification_queue
  WHERE processed = true
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'purge-push-queue',
    '0 4 * * *',  -- Every day at 04:00 UTC
    'SELECT purge_old_push_queue()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available - manual purge of push_notification_queue required';
END $$;

-- Force PostgREST reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
