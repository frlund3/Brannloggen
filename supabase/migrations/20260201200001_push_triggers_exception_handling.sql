-- HOTFIX: Push trigger errors must NEVER block hendelse/oppdatering creation.
-- All push trigger functions now catch and log exceptions instead of propagating them.
-- Also fixes pg_net call signature.

-- ── 1. fn_queue_push_hendelse: queue push on hendelse insert/update ──
CREATE OR REPLACE FUNCTION fn_queue_push_hendelse()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
      VALUES (NEW.id::text, 'ny_hendelse', jsonb_build_object(
        'tittel', NEW.tittel,
        'sted', NEW.sted,
        'status', NEW.status,
        'alvorlighetsgrad', NEW.alvorlighetsgrad,
        'kategori_id', NEW.kategori_id,
        'fylke_id', NEW.fylke_id,
        'brannvesen_id', NEW.brannvesen_id
      ));
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
        VALUES (NEW.id::text, 'status_endring', jsonb_build_object(
          'tittel', NEW.tittel,
          'gammel_status', OLD.status,
          'ny_status', NEW.status
        ));
      END IF;
      IF NEW.presse_tekst IS NOT NULL AND OLD.presse_tekst IS DISTINCT FROM NEW.presse_tekst THEN
        INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
        VALUES (NEW.id::text, 'pressemelding', jsonb_build_object(
          'tittel', NEW.tittel,
          'presse_tekst', LEFT(NEW.presse_tekst, 200),
          'hendelse_id', NEW.id
        ));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_queue_push_hendelse failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. fn_queue_push_oppdatering: queue push on oppdatering insert ──
CREATE OR REPLACE FUNCTION fn_queue_push_oppdatering()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.hendelse_id::text, 'oppdatering', jsonb_build_object(
      'tekst', NEW.tekst,
      'hendelse_id', NEW.hendelse_id
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_queue_push_oppdatering failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 3. fn_queue_push_presseoppdatering ──
CREATE OR REPLACE FUNCTION fn_queue_push_presseoppdatering()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.hendelse_id::text, 'presseoppdatering', jsonb_build_object(
      'tekst', NEW.tekst,
      'hendelse_id', NEW.hendelse_id
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_queue_push_presseoppdatering failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 4. fn_process_push_queue: call edge function via pg_net ──
-- pg_net's http_post uses positional args, not named.
-- Signature: net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_ms int)
CREATE OR REPLACE FUNCTION fn_process_push_queue()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
  _request_id bigint;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO _supabase_url
      FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
    SELECT decrypted_secret INTO _service_role_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

    IF _supabase_url IS NOT NULL AND _service_role_key IS NOT NULL THEN
      SELECT net.http_post(
        url := _supabase_url || '/functions/v1/send-push',
        body := '{}'::jsonb,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || _service_role_key,
          'Content-Type', 'application/json',
          'apikey', _service_role_key
        )
      ) INTO _request_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_process_push_queue failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
