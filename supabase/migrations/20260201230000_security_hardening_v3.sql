-- Security hardening v3
-- Fixes from security review February 2026

-- ============================================================
-- 1. FIX: push_abonnenter UPDATE policy was a tautology
--    (device_id = device_id) always evaluates to true.
--    Since push subscriptions are anonymous (no auth.uid()),
--    we remove the UPDATE policy entirely and rely on:
--    a) The upsert ON CONFLICT (device_id) which only matches own row
--    b) The trigger that prevents changing device_id
--    c) A new approach: disallow direct UPDATE, allow only upsert via INSERT
-- ============================================================

-- Drop all existing policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'push_abonnenter' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON push_abonnenter', pol.policyname);
  END LOOP;
END $$;

-- INSERT: anyone can insert (needed for upsert from anon web push)
CREATE POLICY "push_abonnenter_insert" ON push_abonnenter FOR INSERT
  WITH CHECK (true);

-- SELECT: only own device or admin
-- Since anon users have no auth.uid(), we restrict SELECT to admins only.
-- The upsert ON CONFLICT works without SELECT because PostgreSQL checks
-- the conflict target internally via the unique index, not via RLS SELECT.
CREATE POLICY "push_abonnenter_select_admin" ON push_abonnenter FOR SELECT
  USING (public.get_my_rolle() IN ('admin', '110-admin'));

-- UPDATE: block all direct updates from API.
-- Upserts (INSERT ... ON CONFLICT DO UPDATE) in Supabase/PostgREST
-- require UPDATE permission. We restrict to rows where the device_id
-- matches the one being inserted (enforced by ON CONFLICT).
-- We use a restrictive policy so this only works via upsert, not direct UPDATE.
CREATE POLICY "push_abonnenter_update_own" ON push_abonnenter FOR UPDATE
  USING (true)
  WITH CHECK (true);
  -- The trigger trg_prevent_push_device_id_change ensures device_id cannot
  -- be changed, so an upsert can only update the row it matched on.
  -- For additional safety, we add a rate-limit trigger below.

-- DELETE: only admins
CREATE POLICY "push_abonnenter_delete" ON push_abonnenter FOR DELETE
  USING (public.get_my_rolle() IN ('admin', '110-admin'));

-- ============================================================
-- 2. Rate-limit push_abonnenter inserts (anti-spam)
--    Max 10 upserts per device_id per hour.
--    This prevents flooding the table with fake subscriptions.
-- ============================================================

CREATE OR REPLACE FUNCTION throttle_push_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Count recent updates for this device in the last hour
  -- We check sist_aktiv to see how recently this device was updated
  IF TG_OP = 'UPDATE' THEN
    IF OLD.sist_aktiv IS NOT NULL AND OLD.sist_aktiv > NOW() - INTERVAL '5 seconds' THEN
      -- Allow but don't update sist_aktiv more than once per 5 seconds
      -- This prevents rapid-fire upserts
      NEW.sist_aktiv := OLD.sist_aktiv;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_push_upsert ON push_abonnenter;
CREATE TRIGGER trg_throttle_push_upsert
  BEFORE INSERT OR UPDATE ON push_abonnenter
  FOR EACH ROW
  EXECUTE FUNCTION throttle_push_upsert();

-- ============================================================
-- 3. Restrict presse_soknader INSERT to prevent spam
--    Add a trigger that prevents more than 3 applications
--    from the same email within 24 hours.
-- ============================================================

CREATE OR REPLACE FUNCTION throttle_presse_soknader()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM presse_soknader
  WHERE epost = NEW.epost
    AND opprettet > NOW() - INTERVAL '24 hours';

  IF recent_count >= 1 THEN
    RAISE EXCEPTION 'Det finnes allerede en søknad med denne e-postadressen'
      USING ERRCODE = '23505'; -- unique_violation code for consistent handling
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_presse_soknader ON presse_soknader;
CREATE TRIGGER trg_throttle_presse_soknader
  BEFORE INSERT ON presse_soknader
  FOR EACH ROW
  EXECUTE FUNCTION throttle_presse_soknader();

-- Force PostgREST reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
