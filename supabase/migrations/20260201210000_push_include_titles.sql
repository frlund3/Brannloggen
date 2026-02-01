-- Include hendelse title in oppdatering and presse push payloads
-- so push notifications show the hendelse name + update text.

-- ── 1. fn_queue_push_oppdatering: now includes hendelse title ──
CREATE OR REPLACE FUNCTION fn_queue_push_oppdatering()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  _tittel text;
BEGIN
  BEGIN
    SELECT tittel INTO _tittel FROM hendelser WHERE id = NEW.hendelse_id;

    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.hendelse_id::text, 'oppdatering', jsonb_build_object(
      'tekst', NEW.tekst,
      'hendelse_id', NEW.hendelse_id,
      'tittel', COALESCE(_tittel, 'Ukjent hendelse')
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_queue_push_oppdatering failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. fn_queue_push_presseoppdatering: now includes hendelse title ──
CREATE OR REPLACE FUNCTION fn_queue_push_presseoppdatering()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  _tittel text;
BEGIN
  BEGIN
    SELECT tittel INTO _tittel FROM hendelser WHERE id = NEW.hendelse_id;

    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.hendelse_id::text, 'presseoppdatering', jsonb_build_object(
      'tekst', NEW.tekst,
      'hendelse_id', NEW.hendelse_id,
      'tittel', COALESCE(_tittel, 'Ukjent hendelse')
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_queue_push_presseoppdatering failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
