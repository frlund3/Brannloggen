-- Fix: push_abonnenter SELECT policy was too restrictive
-- The v3 migration restricted SELECT to admins only, but PostgREST
-- needs SELECT permission for upsert (INSERT ... ON CONFLICT) to work.
-- Without SELECT, anonymous web push subscriptions fail with 401.
--
-- Fix: Allow SELECT for all users. The data (device tokens) is not
-- exploitable without VAPID keys, and this is needed for the upsert pattern.

DROP POLICY IF EXISTS "push_abonnenter_select_admin" ON push_abonnenter;

CREATE POLICY "push_abonnenter_select" ON push_abonnenter FOR SELECT
  USING (true);

-- Force PostgREST reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
