-- Migration: Auto-process push queue + add presse push triggers
--
-- 1. Add presse event types to push_notification_queue
-- 2. Add trigger for presseoppdateringer
-- 3. Add trigger for presse_tekst changes on hendelser
-- 4. Auto-call send-push edge function when queue items are inserted (via pg_net)

-- ── 1. Expand event_type CHECK constraint ───────────────────────────
ALTER TABLE push_notification_queue DROP CONSTRAINT IF EXISTS push_notification_queue_event_type_check;
ALTER TABLE push_notification_queue ADD CONSTRAINT push_notification_queue_event_type_check
  CHECK (event_type IN ('ny_hendelse', 'oppdatering', 'status_endring', 'presseoppdatering', 'pressemelding'));

-- ── 2. Trigger function for presseoppdateringer ─────────────────────
CREATE OR REPLACE FUNCTION fn_queue_push_presseoppdatering()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
  VALUES (NEW.hendelse_id::text, 'presseoppdatering', jsonb_build_object(
    'tekst', NEW.tekst,
    'hendelse_id', NEW.hendelse_id
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_presseoppdatering ON presseoppdateringer;
CREATE TRIGGER trg_push_presseoppdatering
  AFTER INSERT ON presseoppdateringer
  FOR EACH ROW EXECUTE FUNCTION fn_queue_push_presseoppdatering();

-- ── 3. Extend hendelse trigger to catch presse_tekst changes ────────
CREATE OR REPLACE FUNCTION fn_queue_push_hendelse()
RETURNS TRIGGER
SECURITY DEFINER
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
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
      VALUES (NEW.id, 'status_endring', jsonb_build_object(
        'tittel', NEW.tittel,
        'gammel_status', OLD.status,
        'ny_status', NEW.status
      ));
    END IF;
    -- Presse_tekst added or changed (not removed)
    IF NEW.presse_tekst IS NOT NULL AND OLD.presse_tekst IS DISTINCT FROM NEW.presse_tekst THEN
      INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
      VALUES (NEW.id, 'pressemelding', jsonb_build_object(
        'tittel', NEW.tittel,
        'presse_tekst', LEFT(NEW.presse_tekst, 200),
        'hendelse_id', NEW.id
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (function is already replaced)
DROP TRIGGER IF EXISTS trg_push_hendelse ON hendelser;
CREATE TRIGGER trg_push_hendelse
  AFTER INSERT OR UPDATE ON hendelser
  FOR EACH ROW EXECUTE FUNCTION fn_queue_push_hendelse();

-- ── 4. Auto-process queue via pg_net ────────────────────────────────
-- This function fires after any insert into push_notification_queue
-- and calls the send-push edge function via pg_net (async HTTP).
-- pg_net is pre-installed on all Supabase projects.
--
-- PREREQUISITE: Run these in SQL Editor to set up vault secrets:
--
--   SELECT vault.create_secret('https://gmxcubjktulxunxyeqih.supabase.co', 'supabase_url');
--   SELECT vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'service_role_key');

CREATE OR REPLACE FUNCTION fn_process_push_queue()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Read secrets from Supabase vault
  SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO _service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  -- Only proceed if we have the URL and key
  IF _supabase_url IS NOT NULL AND _service_role_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/send-push',
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || _service_role_key,
        'Content-Type', 'application/json'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_push_queue ON push_notification_queue;
CREATE TRIGGER trg_process_push_queue
  AFTER INSERT ON push_notification_queue
  FOR EACH ROW EXECUTE FUNCTION fn_process_push_queue();
