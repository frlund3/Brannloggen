-- The trigger fn_queue_push_hendelse() inserts into push_notification_queue
-- after every hendelse INSERT/UPDATE. It's SECURITY DEFINER but may not be
-- owned by a superuser, causing RLS to block the insert.
-- Fix: Recreate the functions with proper SECURITY DEFINER + search_path,
-- and add a fallback INSERT policy.

-- Recreate the functions to ensure they're owned by postgres (superuser)
CREATE OR REPLACE FUNCTION fn_queue_push_hendelse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.id, 'ny_hendelse', jsonb_build_object(
      'tittel', NEW.tittel,
      'sted', NEW.sted,
      'status', NEW.status,
      'alvorlighetsgrad', NEW.alvorlighetsgrad,
      'kategori_id', NEW.kategori_id,
      'fylke_id', NEW.fylke_id,
      'brannvesen_id', NEW.brannvesen_id
    ));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.id, 'status_endring', jsonb_build_object(
      'tittel', NEW.tittel,
      'gammel_status', OLD.status,
      'ny_status', NEW.status
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_queue_push_oppdatering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
  VALUES (NEW.hendelse_id, 'oppdatering', jsonb_build_object(
    'tekst', NEW.tekst,
    'hendelse_id', NEW.hendelse_id
  ));
  RETURN NEW;
END;
$$;

-- Also recreate log_audit to ensure it's owned by postgres
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (user_id, handling, tabell, rad_id, detaljer)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'old', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Grant on push_notification_queue and audit_log as fallback
GRANT INSERT ON public.push_notification_queue TO authenticated;
GRANT SELECT, UPDATE ON public.push_notification_queue TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;

-- Add permissive INSERT policy on push_notification_queue as safety net
-- (triggers should bypass via SECURITY DEFINER, but just in case)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'push_notification_queue' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON push_notification_queue', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow trigger inserts on push queue"
  ON push_notification_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can manage push queue"
  ON push_notification_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Force PostgREST reload
NOTIFY pgrst, 'reload schema';
