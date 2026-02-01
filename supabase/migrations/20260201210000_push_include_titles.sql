-- Include hendelse title AND geographic data in oppdatering/presse push payloads
-- so push notifications show the hendelse name + respect area filters.

-- ── 1. fn_queue_push_oppdatering: now includes hendelse title + geo data ──
CREATE OR REPLACE FUNCTION fn_queue_push_oppdatering()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  _h RECORD;
BEGIN
  BEGIN
    SELECT tittel, fylke_id, brannvesen_id, kategori_id
      INTO _h FROM hendelser WHERE id = NEW.hendelse_id;

    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.hendelse_id::text, 'oppdatering', jsonb_build_object(
      'tekst', NEW.tekst,
      'hendelse_id', NEW.hendelse_id,
      'tittel', COALESCE(_h.tittel, 'Ukjent hendelse'),
      'fylke_id', _h.fylke_id,
      'brannvesen_id', _h.brannvesen_id,
      'kategori_id', _h.kategori_id
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_queue_push_oppdatering failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. fn_queue_push_presseoppdatering: now includes hendelse title + geo data ──
CREATE OR REPLACE FUNCTION fn_queue_push_presseoppdatering()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  _h RECORD;
BEGIN
  BEGIN
    SELECT tittel, fylke_id, brannvesen_id, kategori_id
      INTO _h FROM hendelser WHERE id = NEW.hendelse_id;

    INSERT INTO push_notification_queue (hendelse_id, event_type, payload)
    VALUES (NEW.hendelse_id::text, 'presseoppdatering', jsonb_build_object(
      'tekst', NEW.tekst,
      'hendelse_id', NEW.hendelse_id,
      'tittel', COALESCE(_h.tittel, 'Ukjent hendelse'),
      'fylke_id', _h.fylke_id,
      'brannvesen_id', _h.brannvesen_id,
      'kategori_id', _h.kategori_id
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_queue_push_presseoppdatering failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
