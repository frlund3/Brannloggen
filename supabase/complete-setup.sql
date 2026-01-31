-- ============================================================
-- BRANNLOGGEN - Complete Database Setup
-- Norwegian Fire Department Incident Tracker
-- ============================================================
--
-- This file should be run in the Supabase SQL Editor to set up
-- the complete database: schema, storage, RLS policies, and
-- all seed data for fylker, kommuner, kategorier, and brannvesen.
--
-- The file is designed to be idempotent where possible:
--   - Tables use CREATE TABLE IF NOT EXISTS
--   - Indexes use CREATE INDEX IF NOT EXISTS
--   - Policies use DO $$ blocks with existence checks
--   - Seed data uses INSERT ... ON CONFLICT (id) DO NOTHING
--   - Triggers use DROP TRIGGER IF EXISTS before CREATE
--   - Functions use CREATE OR REPLACE
--
-- ============================================================


-- ============================================================
-- PART 1: SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Fylker (Counties)
CREATE TABLE IF NOT EXISTS fylker (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  nummer TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kommuner (Municipalities)
CREATE TABLE IF NOT EXISTS kommuner (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  nummer TEXT NOT NULL UNIQUE,
  fylke_id TEXT NOT NULL REFERENCES fylker(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kommuner_fylke ON kommuner(fylke_id);

-- Brannvesen (Fire departments)
CREATE TABLE IF NOT EXISTS brannvesen (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  kort_navn TEXT NOT NULL,
  fylke_id TEXT NOT NULL REFERENCES fylker(id),
  kommune_ids TEXT[] NOT NULL DEFAULT '{}',
  kontakt_epost TEXT,
  kontakt_telefon TEXT,
  aktiv BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brannvesen_fylke ON brannvesen(fylke_id);

-- Hendelseskategorier (Incident categories)
CREATE TABLE IF NOT EXISTS kategorier (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  ikon TEXT NOT NULL,
  farge TEXT NOT NULL,
  beskrivelse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS brukerprofiler (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rolle TEXT NOT NULL CHECK (rolle IN ('admin', 'operator', 'public')) DEFAULT 'public',
  fullt_navn TEXT NOT NULL,
  brannvesen_id TEXT REFERENCES brannvesen(id),
  aktiv BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_brukerprofiler_user ON brukerprofiler(user_id);
CREATE INDEX IF NOT EXISTS idx_brukerprofiler_brannvesen ON brukerprofiler(brannvesen_id);

-- ============================================
-- INCIDENT TABLES
-- ============================================

-- Hendelser (Incidents)
CREATE TABLE IF NOT EXISTS hendelser (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brannvesen_id TEXT NOT NULL REFERENCES brannvesen(id),
  kommune_id TEXT NOT NULL REFERENCES kommuner(id),
  fylke_id TEXT NOT NULL REFERENCES fylker(id),
  kategori_id TEXT NOT NULL REFERENCES kategorier(id),
  tittel TEXT NOT NULL,
  beskrivelse TEXT NOT NULL,
  sted TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pågår', 'avsluttet')) DEFAULT 'pågår',
  alvorlighetsgrad TEXT NOT NULL CHECK (alvorlighetsgrad IN ('lav', 'middels', 'høy', 'kritisk')) DEFAULT 'middels',
  opprettet_av UUID NOT NULL REFERENCES auth.users(id),
  opprettet_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  oppdatert_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avsluttet_tidspunkt TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hendelser_status ON hendelser(status);
CREATE INDEX IF NOT EXISTS idx_hendelser_brannvesen ON hendelser(brannvesen_id);
CREATE INDEX IF NOT EXISTS idx_hendelser_kommune ON hendelser(kommune_id);
CREATE INDEX IF NOT EXISTS idx_hendelser_fylke ON hendelser(fylke_id);
CREATE INDEX IF NOT EXISTS idx_hendelser_kategori ON hendelser(kategori_id);
CREATE INDEX IF NOT EXISTS idx_hendelser_opprettet ON hendelser(opprettet_tidspunkt DESC);

-- Hendelsesoppdateringer (Incident updates - public)
CREATE TABLE IF NOT EXISTS hendelsesoppdateringer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  opprettet_av UUID NOT NULL REFERENCES auth.users(id),
  opprettet_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oppdateringer_hendelse ON hendelsesoppdateringer(hendelse_id);

-- Hendelsesbilder (Incident images - stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS hendelsesbilder (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  bilde_url TEXT NOT NULL,
  bildetekst TEXT,
  lastet_opp_av UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bilder_hendelse ON hendelsesbilder(hendelse_id);

-- Interne notater (Internal notes - SEPARATE from public data)
CREATE TABLE IF NOT EXISTS interne_notater (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  notat TEXT NOT NULL,
  opprettet_av UUID NOT NULL REFERENCES auth.users(id),
  opprettet_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notater_hendelse ON interne_notater(hendelse_id);

-- ============================================
-- USER FEATURE TABLES
-- ============================================

-- Bruker følger hendelse (User follows incident)
CREATE TABLE IF NOT EXISTS bruker_følger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hendelse_id)
);

CREATE INDEX IF NOT EXISTS idx_følger_user ON bruker_følger(user_id);

-- Push-varsler preferanser (Push notification preferences)
CREATE TABLE IF NOT EXISTS push_preferanser (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fylke_ids TEXT[] DEFAULT '{}',
  kommune_ids TEXT[] DEFAULT '{}',
  brannvesen_ids TEXT[] DEFAULT '{}',
  kategori_ids TEXT[] DEFAULT '{}',
  kun_pågående BOOLEAN DEFAULT FALSE,
  push_token TEXT,
  aktiv BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  handling TEXT NOT NULL,
  tabell TEXT NOT NULL,
  rad_id TEXT,
  detaljer JSONB DEFAULT '{}',
  ip_adresse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);


-- ============================================================
-- PART 2: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE fylker ENABLE ROW LEVEL SECURITY;
ALTER TABLE kommuner ENABLE ROW LEVEL SECURITY;
ALTER TABLE brannvesen ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategorier ENABLE ROW LEVEL SECURITY;
ALTER TABLE brukerprofiler ENABLE ROW LEVEL SECURITY;
ALTER TABLE hendelser ENABLE ROW LEVEL SECURITY;
ALTER TABLE hendelsesoppdateringer ENABLE ROW LEVEL SECURITY;
ALTER TABLE hendelsesbilder ENABLE ROW LEVEL SECURITY;
ALTER TABLE interne_notater ENABLE ROW LEVEL SECURITY;
ALTER TABLE bruker_følger ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_preferanser ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read fylker') THEN
    CREATE POLICY "Anyone can read fylker" ON fylker FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read kommuner') THEN
    CREATE POLICY "Anyone can read kommuner" ON kommuner FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read brannvesen') THEN
    CREATE POLICY "Anyone can read brannvesen" ON brannvesen FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read kategorier') THEN
    CREATE POLICY "Anyone can read kategorier" ON kategorier FOR SELECT USING (true);
  END IF;
END $$;

-- Hendelser: Everyone can read, only operators/admins can write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read hendelser') THEN
    CREATE POLICY "Anyone can read hendelser" ON hendelser FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operators can insert hendelser') THEN
    CREATE POLICY "Operators can insert hendelser" ON hendelser FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.rolle IN ('operator', 'admin')
        AND brukerprofiler.aktiv = true
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operators can update own brannvesen hendelser') THEN
    CREATE POLICY "Operators can update own brannvesen hendelser" ON hendelser FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.aktiv = true
        AND (
          brukerprofiler.rolle = 'admin'
          OR (brukerprofiler.rolle = 'operator' AND brukerprofiler.brannvesen_id = hendelser.brannvesen_id)
        )
      )
    );
  END IF;
END $$;

-- Oppdateringer: Public read, operator write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read oppdateringer') THEN
    CREATE POLICY "Anyone can read oppdateringer" ON hendelsesoppdateringer FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operators can insert oppdateringer') THEN
    CREATE POLICY "Operators can insert oppdateringer" ON hendelsesoppdateringer FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.rolle IN ('operator', 'admin')
        AND brukerprofiler.aktiv = true
      )
    );
  END IF;
END $$;

-- Bilder: Public read, operator write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read bilder') THEN
    CREATE POLICY "Anyone can read bilder" ON hendelsesbilder FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operators can insert bilder') THEN
    CREATE POLICY "Operators can insert bilder" ON hendelsesbilder FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.rolle IN ('operator', 'admin')
        AND brukerprofiler.aktiv = true
      )
    );
  END IF;
END $$;

-- Interne notater: ONLY operators from same brannvesen or admins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operators can read own brannvesen notater') THEN
    CREATE POLICY "Operators can read own brannvesen notater" ON interne_notater FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM brukerprofiler bp
        JOIN hendelser h ON h.id = interne_notater.hendelse_id
        WHERE bp.user_id = auth.uid()
        AND bp.aktiv = true
        AND (
          bp.rolle = 'admin'
          OR (bp.rolle = 'operator' AND bp.brannvesen_id = h.brannvesen_id)
        )
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operators can insert notater') THEN
    CREATE POLICY "Operators can insert notater" ON interne_notater FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM brukerprofiler bp
        JOIN hendelser h ON h.id = interne_notater.hendelse_id
        WHERE bp.user_id = auth.uid()
        AND bp.rolle IN ('operator', 'admin')
        AND bp.aktiv = true
        AND (
          bp.rolle = 'admin'
          OR bp.brannvesen_id = h.brannvesen_id
        )
      )
    );
  END IF;
END $$;

-- Brukerprofiler
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own profile') THEN
    CREATE POLICY "Users can read own profile" ON brukerprofiler FOR SELECT USING (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage profiles') THEN
    CREATE POLICY "Admins can manage profiles" ON brukerprofiler FOR ALL USING (
      EXISTS (
        SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON brukerprofiler FOR INSERT WITH CHECK (
      auth.uid() = user_id
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON brukerprofiler FOR UPDATE USING (
      auth.uid() = user_id
    );
  END IF;
END $$;

-- Følger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own follows') THEN
    CREATE POLICY "Users can read own follows" ON bruker_følger FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can follow') THEN
    CREATE POLICY "Users can follow" ON bruker_følger FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can unfollow') THEN
    CREATE POLICY "Users can unfollow" ON bruker_følger FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Push preferanser
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own push prefs') THEN
    CREATE POLICY "Users can read own push prefs" ON push_preferanser FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own push prefs') THEN
    CREATE POLICY "Users can manage own push prefs" ON push_preferanser FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Audit log: Only admins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read audit log') THEN
    CREATE POLICY "Admins can read audit log" ON audit_log FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert audit log') THEN
    CREATE POLICY "System can insert audit log" ON audit_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Admin write access for reference tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage fylker') THEN
    CREATE POLICY "Admins can manage fylker" ON fylker FOR ALL USING (
      EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage kommuner') THEN
    CREATE POLICY "Admins can manage kommuner" ON kommuner FOR ALL USING (
      EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage brannvesen') THEN
    CREATE POLICY "Admins can manage brannvesen" ON brannvesen FOR ALL USING (
      EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage kategorier') THEN
    CREATE POLICY "Admins can manage kategorier" ON kategorier FOR ALL USING (
      EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
    );
  END IF;
END $$;


-- ============================================================
-- PART 3: STORAGE BUCKET FOR IMAGES
-- ============================================================

-- Create the public storage bucket for incident images
INSERT INTO storage.buckets (id, name, public)
VALUES ('hendelsesbilder', 'hendelsesbilder', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Anyone can read/download public images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public read access for hendelsesbilder'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read access for hendelsesbilder"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'hendelsesbilder');
  END IF;
END $$;

-- Storage RLS: Only authenticated operators/admins can upload images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Operators can upload hendelsesbilder'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Operators can upload hendelsesbilder"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'hendelsesbilder'
      AND EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.rolle IN ('operator', 'admin')
        AND brukerprofiler.aktiv = true
      )
    );
  END IF;
END $$;

-- Storage RLS: Operators/admins can update images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Operators can update hendelsesbilder'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Operators can update hendelsesbilder"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'hendelsesbilder'
      AND EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.rolle IN ('operator', 'admin')
        AND brukerprofiler.aktiv = true
      )
    );
  END IF;
END $$;

-- Storage RLS: Only admins can delete images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Admins can delete hendelsesbilder'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Admins can delete hendelsesbilder"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'hendelsesbilder'
      AND EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.rolle = 'admin'
        AND brukerprofiler.aktiv = true
      )
    );
  END IF;
END $$;


-- ============================================================
-- PART 4: FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function to auto-update oppdatert_tidspunkt
CREATE OR REPLACE FUNCTION update_oppdatert_tidspunkt()
RETURNS TRIGGER AS $$
BEGIN
  NEW.oppdatert_tidspunkt = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hendelser_oppdatert ON hendelser;
CREATE TRIGGER hendelser_oppdatert
  BEFORE UPDATE ON hendelser
  FOR EACH ROW
  EXECUTE FUNCTION update_oppdatert_tidspunkt();

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit triggers on critical tables
DROP TRIGGER IF EXISTS audit_hendelser ON hendelser;
CREATE TRIGGER audit_hendelser AFTER INSERT OR UPDATE OR DELETE ON hendelser
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_hendelsesoppdateringer ON hendelsesoppdateringer;
CREATE TRIGGER audit_hendelsesoppdateringer AFTER INSERT OR UPDATE OR DELETE ON hendelsesoppdateringer
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_interne_notater ON interne_notater;
CREATE TRIGGER audit_interne_notater AFTER INSERT OR UPDATE OR DELETE ON interne_notater
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_brukerprofiler ON brukerprofiler;
CREATE TRIGGER audit_brukerprofiler AFTER INSERT OR UPDATE OR DELETE ON brukerprofiler
  FOR EACH ROW EXECUTE FUNCTION log_audit();


-- ============================================================
-- PART 5: SEED DATA
-- ============================================================


-- ------------------------------------------------------------
-- 5.1 Fylker (Counties) - 15 rows
-- ------------------------------------------------------------
INSERT INTO fylker (id, navn, nummer) VALUES
  ('f-03', 'Oslo', '03'),
  ('f-11', 'Rogaland', '11'),
  ('f-15', 'Møre og Romsdal', '15'),
  ('f-18', 'Nordland', '18'),
  ('f-31', 'Østfold', '31'),
  ('f-32', 'Akershus', '32'),
  ('f-33', 'Buskerud', '33'),
  ('f-34', 'Innlandet', '34'),
  ('f-39', 'Vestfold', '39'),
  ('f-40', 'Telemark', '40'),
  ('f-42', 'Agder', '42'),
  ('f-46', 'Vestland', '46'),
  ('f-50', 'Trøndelag', '50'),
  ('f-55', 'Troms', '55'),
  ('f-56', 'Finnmark', '56')
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 5.2 Kategorier (Incident categories) - 20 rows
-- ------------------------------------------------------------
INSERT INTO kategorier (id, navn, ikon, farge, beskrivelse) VALUES
  ('kat-brann-bygning', 'Brann i bygning', 'Flame', '#DC2626', 'Brann i bolig, næringsbygg, offentlig bygning eller annen bygning'),
  ('kat-brann-kjøretøy', 'Brann i kjøretøy', 'Car', '#EA580C', 'Brann i bil, buss, lastebil eller annet kjøretøy'),
  ('kat-brann-skog', 'Skogbrann / gressbrann', 'TreePine', '#D97706', 'Brann i skog, utmark, gress eller kratt'),
  ('kat-brann-annen', 'Annen brann', 'Flame', '#F59E0B', 'Brann i container, avfall, søppel eller annet'),
  ('kat-brann-skorstein', 'Skorsteinsbrann', 'Flame', '#B45309', 'Brann i skorstein eller pipe'),
  ('kat-røykutvikling', 'Røykutvikling', 'Cloud', '#6B7280', 'Melding om røyk uten synlig flamme'),
  ('kat-brannhindrende', 'Brannhindrende tiltak', 'ShieldAlert', '#2563EB', 'Kontroll etter brannalarm, vannskade, bolyst etc.'),
  ('kat-trafikkulykke', 'Trafikkulykke', 'CarFront', '#7C3AED', 'Trafikkulykke med behov for brannvesenets assistanse'),
  ('kat-redning-vann', 'Vanredning', 'Waves', '#0891B2', 'Redning fra vann, drukning, person i sjø/elv/vann'),
  ('kat-redning-høyde', 'Høyderedning', 'Mountain', '#059669', 'Redning fra høyde, klatring, fjellredning'),
  ('kat-redning-annen', 'Annen redning', 'LifeBuoy', '#0D9488', 'Redningsoppdrag som ikke faller under andre kategorier'),
  ('kat-akutt-forurensning', 'Akutt forurensning', 'Biohazard', '#4F46E5', 'Oljeutslipp, kjemikalieutslipp eller annen forurensning'),
  ('kat-farlig-gods', 'Farlig gods', 'AlertTriangle', '#E11D48', 'Hendelse med farlig gods, gasslekkasje eller lignende'),
  ('kat-naturhendelse', 'Naturhendelse', 'CloudLightning', '#7C3AED', 'Flom, ras, storm, jordskred eller annen naturhendelse'),
  ('kat-helseoppdrag', 'Helseoppdrag', 'Heart', '#E11D48', 'Førsteinnsats helse, hjertestarter, assistanse ambulanse'),
  ('kat-dyreredning', 'Dyreredning', 'Bug', '#65A30D', 'Redning av dyr fra brønn, tak, vann etc.'),
  ('kat-teknisk-assistanse', 'Teknisk assistanse', 'Wrench', '#475569', 'Heisnodstopp, vannskade, vindskade, innelåst person etc.'),
  ('kat-sikring', 'Sikring av skadested', 'ShieldCheck', '#1D4ED8', 'Sikring av skadested etter ulykke, eksplosjon etc.'),
  ('kat-unødvendig', 'Unødvendig alarm', 'BellOff', '#9CA3AF', 'Falsk alarm, feilaktig utløst brannalarm'),
  ('kat-annet', 'Annet', 'HelpCircle', '#6B7280', 'Andre hendelser som ikke passer i andre kategorier')
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 5.3 Kommuner (Municipalities) - 356 rows
-- ------------------------------------------------------------

-- Oslo (03) - 1 kommune
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-0301', 'Oslo', '0301', 'f-03')
ON CONFLICT (id) DO NOTHING;

-- Rogaland (11) - 23 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-1101', 'Eigersund', '1101', 'f-11'),
  ('k-1103', 'Stavanger', '1103', 'f-11'),
  ('k-1106', 'Haugesund', '1106', 'f-11'),
  ('k-1108', 'Sandnes', '1108', 'f-11'),
  ('k-1111', 'Sokndal', '1111', 'f-11'),
  ('k-1112', 'Lund', '1112', 'f-11'),
  ('k-1114', 'Bjerkreim', '1114', 'f-11'),
  ('k-1119', 'Hå', '1119', 'f-11'),
  ('k-1120', 'Klepp', '1120', 'f-11'),
  ('k-1121', 'Time', '1121', 'f-11'),
  ('k-1122', 'Gjesdal', '1122', 'f-11'),
  ('k-1124', 'Sola', '1124', 'f-11'),
  ('k-1127', 'Randaberg', '1127', 'f-11'),
  ('k-1130', 'Strand', '1130', 'f-11'),
  ('k-1133', 'Hjelmeland', '1133', 'f-11'),
  ('k-1134', 'Suldal', '1134', 'f-11'),
  ('k-1135', 'Sauda', '1135', 'f-11'),
  ('k-1144', 'Kvitsøy', '1144', 'f-11'),
  ('k-1145', 'Bokn', '1145', 'f-11'),
  ('k-1146', 'Tysvær', '1146', 'f-11'),
  ('k-1149', 'Karmøy', '1149', 'f-11'),
  ('k-1151', 'Utsira', '1151', 'f-11'),
  ('k-1160', 'Vindafjord', '1160', 'f-11')
ON CONFLICT (id) DO NOTHING;

-- Møre og Romsdal (15) - 26 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-1505', 'Kristiansund', '1505', 'f-15'),
  ('k-1506', 'Molde', '1506', 'f-15'),
  ('k-1508', 'Ålesund', '1508', 'f-15'),
  ('k-1511', 'Vanylven', '1511', 'f-15'),
  ('k-1514', 'Sande', '1514', 'f-15'),
  ('k-1515', 'Herøy', '1515', 'f-15'),
  ('k-1516', 'Ulstein', '1516', 'f-15'),
  ('k-1517', 'Hareid', '1517', 'f-15'),
  ('k-1520', 'Ørsta', '1520', 'f-15'),
  ('k-1525', 'Stranda', '1525', 'f-15'),
  ('k-1528', 'Sykkylven', '1528', 'f-15'),
  ('k-1531', 'Sula', '1531', 'f-15'),
  ('k-1532', 'Giske', '1532', 'f-15'),
  ('k-1535', 'Vestnes', '1535', 'f-15'),
  ('k-1539', 'Rauma', '1539', 'f-15'),
  ('k-1547', 'Aukra', '1547', 'f-15'),
  ('k-1554', 'Averøy', '1554', 'f-15'),
  ('k-1557', 'Gjemnes', '1557', 'f-15'),
  ('k-1560', 'Tingvoll', '1560', 'f-15'),
  ('k-1563', 'Sunndal', '1563', 'f-15'),
  ('k-1566', 'Surnadal', '1566', 'f-15'),
  ('k-1573', 'Smøla', '1573', 'f-15'),
  ('k-1576', 'Aure', '1576', 'f-15'),
  ('k-1577', 'Volda', '1577', 'f-15'),
  ('k-1578', 'Fjord', '1578', 'f-15'),
  ('k-1579', 'Hustadvika', '1579', 'f-15')
ON CONFLICT (id) DO NOTHING;

-- Nordland (18) - 41 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-1804', 'Bodø', '1804', 'f-18'),
  ('k-1806', 'Narvik', '1806', 'f-18'),
  ('k-1811', 'Bindal', '1811', 'f-18'),
  ('k-1812', 'Sømna', '1812', 'f-18'),
  ('k-1813', 'Brønnøy', '1813', 'f-18'),
  ('k-1815', 'Vega', '1815', 'f-18'),
  ('k-1816', 'Vevelstad', '1816', 'f-18'),
  ('k-1818', 'Herøy', '1818', 'f-18'),
  ('k-1820', 'Alstahaug', '1820', 'f-18'),
  ('k-1822', 'Leirfjord', '1822', 'f-18'),
  ('k-1824', 'Vefsn', '1824', 'f-18'),
  ('k-1825', 'Grane', '1825', 'f-18'),
  ('k-1826', 'Hattfjelldal', '1826', 'f-18'),
  ('k-1827', 'Dønna', '1827', 'f-18'),
  ('k-1828', 'Nesna', '1828', 'f-18'),
  ('k-1832', 'Hemnes', '1832', 'f-18'),
  ('k-1833', 'Rana', '1833', 'f-18'),
  ('k-1834', 'Lurøy', '1834', 'f-18'),
  ('k-1835', 'Træna', '1835', 'f-18'),
  ('k-1836', 'Rødøy', '1836', 'f-18'),
  ('k-1837', 'Meløy', '1837', 'f-18'),
  ('k-1838', 'Gildeskål', '1838', 'f-18'),
  ('k-1839', 'Beiarn', '1839', 'f-18'),
  ('k-1840', 'Saltdal', '1840', 'f-18'),
  ('k-1841', 'Fauske', '1841', 'f-18'),
  ('k-1845', 'Sørfold', '1845', 'f-18'),
  ('k-1848', 'Steigen', '1848', 'f-18'),
  ('k-1851', 'Lødingen', '1851', 'f-18'),
  ('k-1853', 'Evenes', '1853', 'f-18'),
  ('k-1856', 'Røst', '1856', 'f-18'),
  ('k-1857', 'Værøy', '1857', 'f-18'),
  ('k-1859', 'Flakstad', '1859', 'f-18'),
  ('k-1860', 'Vestvågøy', '1860', 'f-18'),
  ('k-1865', 'Vågan', '1865', 'f-18'),
  ('k-1866', 'Hadsel', '1866', 'f-18'),
  ('k-1867', 'Bø', '1867', 'f-18'),
  ('k-1868', 'Øksnes', '1868', 'f-18'),
  ('k-1870', 'Sortland', '1870', 'f-18'),
  ('k-1871', 'Andøy', '1871', 'f-18'),
  ('k-1874', 'Moskenes', '1874', 'f-18'),
  ('k-1875', 'Hamarøy', '1875', 'f-18')
ON CONFLICT (id) DO NOTHING;

-- Østfold (31) - 12 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-3101', 'Halden', '3101', 'f-31'),
  ('k-3103', 'Moss', '3103', 'f-31'),
  ('k-3105', 'Sarpsborg', '3105', 'f-31'),
  ('k-3107', 'Fredrikstad', '3107', 'f-31'),
  ('k-3110', 'Hvaler', '3110', 'f-31'),
  ('k-3112', 'Råde', '3112', 'f-31'),
  ('k-3114', 'Våler', '3114', 'f-31'),
  ('k-3116', 'Skiptvet', '3116', 'f-31'),
  ('k-3118', 'Indre Østfold', '3118', 'f-31'),
  ('k-3120', 'Rakkestad', '3120', 'f-31'),
  ('k-3122', 'Marker', '3122', 'f-31'),
  ('k-3124', 'Aremark', '3124', 'f-31')
ON CONFLICT (id) DO NOTHING;

-- Akershus (32) - 21 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-3201', 'Bærum', '3201', 'f-32'),
  ('k-3203', 'Asker', '3203', 'f-32'),
  ('k-3205', 'Lillestrøm', '3205', 'f-32'),
  ('k-3207', 'Nordre Follo', '3207', 'f-32'),
  ('k-3209', 'Ullensaker', '3209', 'f-32'),
  ('k-3212', 'Nesodden', '3212', 'f-32'),
  ('k-3214', 'Frogn', '3214', 'f-32'),
  ('k-3216', 'Vestby', '3216', 'f-32'),
  ('k-3218', 'Ås', '3218', 'f-32'),
  ('k-3220', 'Enebakk', '3220', 'f-32'),
  ('k-3222', 'Lørenskog', '3222', 'f-32'),
  ('k-3224', 'Rælingen', '3224', 'f-32'),
  ('k-3226', 'Aurskog-Høland', '3226', 'f-32'),
  ('k-3228', 'Nes', '3228', 'f-32'),
  ('k-3230', 'Gjerdrum', '3230', 'f-32'),
  ('k-3232', 'Nannestad', '3232', 'f-32'),
  ('k-3234', 'Eidsvoll', '3234', 'f-32'),
  ('k-3236', 'Hurdal', '3236', 'f-32'),
  ('k-3238', 'Nittedal', '3238', 'f-32'),
  ('k-3240', 'Lunner', '3240', 'f-32'),
  ('k-3242', 'Jevnaker', '3242', 'f-32')
ON CONFLICT (id) DO NOTHING;

-- Buskerud (33) - 18 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-3301', 'Drammen', '3301', 'f-33'),
  ('k-3303', 'Kongsberg', '3303', 'f-33'),
  ('k-3305', 'Ringerike', '3305', 'f-33'),
  ('k-3310', 'Hole', '3310', 'f-33'),
  ('k-3312', 'Lier', '3312', 'f-33'),
  ('k-3314', 'Øvre Eiker', '3314', 'f-33'),
  ('k-3316', 'Modum', '3316', 'f-33'),
  ('k-3318', 'Krødsherad', '3318', 'f-33'),
  ('k-3320', 'Flå', '3320', 'f-33'),
  ('k-3322', 'Nesbyen', '3322', 'f-33'),
  ('k-3324', 'Gol', '3324', 'f-33'),
  ('k-3326', 'Hemsedal', '3326', 'f-33'),
  ('k-3328', 'Ål', '3328', 'f-33'),
  ('k-3330', 'Hol', '3330', 'f-33'),
  ('k-3332', 'Sigdal', '3332', 'f-33'),
  ('k-3334', 'Flesberg', '3334', 'f-33'),
  ('k-3336', 'Rollag', '3336', 'f-33'),
  ('k-3338', 'Nore og Uvdal', '3338', 'f-33')
ON CONFLICT (id) DO NOTHING;

-- Innlandet (34) - 46 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-3401', 'Kongsvinger', '3401', 'f-34'),
  ('k-3403', 'Hamar', '3403', 'f-34'),
  ('k-3405', 'Lillehammer', '3405', 'f-34'),
  ('k-3407', 'Gjøvik', '3407', 'f-34'),
  ('k-3411', 'Ringsaker', '3411', 'f-34'),
  ('k-3412', 'Løten', '3412', 'f-34'),
  ('k-3413', 'Stange', '3413', 'f-34'),
  ('k-3414', 'Nord-Odal', '3414', 'f-34'),
  ('k-3415', 'Sør-Odal', '3415', 'f-34'),
  ('k-3416', 'Eidskog', '3416', 'f-34'),
  ('k-3417', 'Grue', '3417', 'f-34'),
  ('k-3418', 'Åsnes', '3418', 'f-34'),
  ('k-3419', 'Våler', '3419', 'f-34'),
  ('k-3420', 'Elverum', '3420', 'f-34'),
  ('k-3421', 'Trysil', '3421', 'f-34'),
  ('k-3422', 'Åmot', '3422', 'f-34'),
  ('k-3423', 'Stor-Elvdal', '3423', 'f-34'),
  ('k-3424', 'Rendalen', '3424', 'f-34'),
  ('k-3425', 'Engerdal', '3425', 'f-34'),
  ('k-3426', 'Tolga', '3426', 'f-34'),
  ('k-3427', 'Tynset', '3427', 'f-34'),
  ('k-3428', 'Alvdal', '3428', 'f-34'),
  ('k-3429', 'Folldal', '3429', 'f-34'),
  ('k-3430', 'Os', '3430', 'f-34'),
  ('k-3431', 'Dovre', '3431', 'f-34'),
  ('k-3432', 'Lesja', '3432', 'f-34'),
  ('k-3433', 'Skjåk', '3433', 'f-34'),
  ('k-3434', 'Lom', '3434', 'f-34'),
  ('k-3435', 'Vågå', '3435', 'f-34'),
  ('k-3436', 'Nord-Fron', '3436', 'f-34'),
  ('k-3437', 'Sel', '3437', 'f-34'),
  ('k-3438', 'Sør-Fron', '3438', 'f-34'),
  ('k-3439', 'Ringebu', '3439', 'f-34'),
  ('k-3440', 'Øyer', '3440', 'f-34'),
  ('k-3441', 'Gausdal', '3441', 'f-34'),
  ('k-3442', 'Østre Toten', '3442', 'f-34'),
  ('k-3443', 'Vestre Toten', '3443', 'f-34'),
  ('k-3446', 'Gran', '3446', 'f-34'),
  ('k-3447', 'Søndre Land', '3447', 'f-34'),
  ('k-3448', 'Nordre Land', '3448', 'f-34'),
  ('k-3449', 'Sør-Aurdal', '3449', 'f-34'),
  ('k-3450', 'Etnedal', '3450', 'f-34'),
  ('k-3451', 'Nord-Aurdal', '3451', 'f-34'),
  ('k-3452', 'Vestre Slidre', '3452', 'f-34'),
  ('k-3453', 'Øystre Slidre', '3453', 'f-34'),
  ('k-3454', 'Vang', '3454', 'f-34')
ON CONFLICT (id) DO NOTHING;

-- Vestfold (39) - 6 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-3901', 'Horten', '3901', 'f-39'),
  ('k-3903', 'Holmestrand', '3903', 'f-39'),
  ('k-3905', 'Tønsberg', '3905', 'f-39'),
  ('k-3907', 'Sandefjord', '3907', 'f-39'),
  ('k-3909', 'Larvik', '3909', 'f-39'),
  ('k-3911', 'Færder', '3911', 'f-39')
ON CONFLICT (id) DO NOTHING;

-- Telemark (40) - 17 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-4001', 'Porsgrunn', '4001', 'f-40'),
  ('k-4003', 'Skien', '4003', 'f-40'),
  ('k-4005', 'Notodden', '4005', 'f-40'),
  ('k-4010', 'Siljan', '4010', 'f-40'),
  ('k-4012', 'Bamble', '4012', 'f-40'),
  ('k-4014', 'Kragerø', '4014', 'f-40'),
  ('k-4016', 'Drangedal', '4016', 'f-40'),
  ('k-4018', 'Nome', '4018', 'f-40'),
  ('k-4020', 'Midt-Telemark', '4020', 'f-40'),
  ('k-4022', 'Seljord', '4022', 'f-40'),
  ('k-4024', 'Hjartdal', '4024', 'f-40'),
  ('k-4026', 'Tinn', '4026', 'f-40'),
  ('k-4028', 'Kviteseid', '4028', 'f-40'),
  ('k-4030', 'Nissedal', '4030', 'f-40'),
  ('k-4032', 'Fyresdal', '4032', 'f-40'),
  ('k-4034', 'Tokke', '4034', 'f-40'),
  ('k-4036', 'Vinje', '4036', 'f-40')
ON CONFLICT (id) DO NOTHING;

-- Agder (42) - 25 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-4201', 'Risør', '4201', 'f-42'),
  ('k-4202', 'Grimstad', '4202', 'f-42'),
  ('k-4203', 'Arendal', '4203', 'f-42'),
  ('k-4204', 'Kristiansand', '4204', 'f-42'),
  ('k-4205', 'Lindesnes', '4205', 'f-42'),
  ('k-4206', 'Farsund', '4206', 'f-42'),
  ('k-4207', 'Flekkefjord', '4207', 'f-42'),
  ('k-4211', 'Gjerstad', '4211', 'f-42'),
  ('k-4212', 'Vegårshei', '4212', 'f-42'),
  ('k-4213', 'Tvedestrand', '4213', 'f-42'),
  ('k-4214', 'Froland', '4214', 'f-42'),
  ('k-4215', 'Lillesand', '4215', 'f-42'),
  ('k-4216', 'Birkenes', '4216', 'f-42'),
  ('k-4217', 'Åmli', '4217', 'f-42'),
  ('k-4218', 'Iveland', '4218', 'f-42'),
  ('k-4219', 'Evje og Hornnes', '4219', 'f-42'),
  ('k-4220', 'Bygland', '4220', 'f-42'),
  ('k-4221', 'Valle', '4221', 'f-42'),
  ('k-4222', 'Bykle', '4222', 'f-42'),
  ('k-4223', 'Vennesla', '4223', 'f-42'),
  ('k-4224', 'Åseral', '4224', 'f-42'),
  ('k-4225', 'Lyngdal', '4225', 'f-42'),
  ('k-4226', 'Hægebostad', '4226', 'f-42'),
  ('k-4227', 'Kvinesdal', '4227', 'f-42'),
  ('k-4228', 'Sirdal', '4228', 'f-42')
ON CONFLICT (id) DO NOTHING;

-- Vestland (46) - 43 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-4601', 'Bergen', '4601', 'f-46'),
  ('k-4602', 'Kinn', '4602', 'f-46'),
  ('k-4611', 'Etne', '4611', 'f-46'),
  ('k-4612', 'Sveio', '4612', 'f-46'),
  ('k-4613', 'Bømlo', '4613', 'f-46'),
  ('k-4614', 'Stord', '4614', 'f-46'),
  ('k-4615', 'Fitjar', '4615', 'f-46'),
  ('k-4616', 'Tysnes', '4616', 'f-46'),
  ('k-4617', 'Kvinnherad', '4617', 'f-46'),
  ('k-4618', 'Ullensvang', '4618', 'f-46'),
  ('k-4619', 'Eidfjord', '4619', 'f-46'),
  ('k-4620', 'Ulvik', '4620', 'f-46'),
  ('k-4621', 'Voss', '4621', 'f-46'),
  ('k-4622', 'Kvam', '4622', 'f-46'),
  ('k-4623', 'Samnanger', '4623', 'f-46'),
  ('k-4624', 'Bjørnafjorden', '4624', 'f-46'),
  ('k-4625', 'Austevoll', '4625', 'f-46'),
  ('k-4626', 'Øygarden', '4626', 'f-46'),
  ('k-4627', 'Askøy', '4627', 'f-46'),
  ('k-4628', 'Vaksdal', '4628', 'f-46'),
  ('k-4629', 'Modalen', '4629', 'f-46'),
  ('k-4630', 'Osterøy', '4630', 'f-46'),
  ('k-4631', 'Alver', '4631', 'f-46'),
  ('k-4632', 'Austrheim', '4632', 'f-46'),
  ('k-4633', 'Fedje', '4633', 'f-46'),
  ('k-4634', 'Masfjorden', '4634', 'f-46'),
  ('k-4635', 'Gulen', '4635', 'f-46'),
  ('k-4636', 'Solund', '4636', 'f-46'),
  ('k-4637', 'Hyllestad', '4637', 'f-46'),
  ('k-4638', 'Høyanger', '4638', 'f-46'),
  ('k-4639', 'Vik', '4639', 'f-46'),
  ('k-4640', 'Sogndal', '4640', 'f-46'),
  ('k-4641', 'Aurland', '4641', 'f-46'),
  ('k-4642', 'Lærdal', '4642', 'f-46'),
  ('k-4643', 'Årdal', '4643', 'f-46'),
  ('k-4644', 'Luster', '4644', 'f-46'),
  ('k-4645', 'Askvoll', '4645', 'f-46'),
  ('k-4646', 'Fjaler', '4646', 'f-46'),
  ('k-4647', 'Sunnfjord', '4647', 'f-46'),
  ('k-4648', 'Bremanger', '4648', 'f-46'),
  ('k-4649', 'Stad', '4649', 'f-46'),
  ('k-4650', 'Gloppen', '4650', 'f-46'),
  ('k-4651', 'Stryn', '4651', 'f-46')
ON CONFLICT (id) DO NOTHING;

-- Trøndelag (50) - 37 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-5001', 'Trondheim', '5001', 'f-50'),
  ('k-5006', 'Steinkjer', '5006', 'f-50'),
  ('k-5007', 'Namsos', '5007', 'f-50'),
  ('k-5014', 'Frøya', '5014', 'f-50'),
  ('k-5020', 'Osen', '5020', 'f-50'),
  ('k-5021', 'Oppdal', '5021', 'f-50'),
  ('k-5022', 'Rennebu', '5022', 'f-50'),
  ('k-5025', 'Røros', '5025', 'f-50'),
  ('k-5026', 'Holtålen', '5026', 'f-50'),
  ('k-5027', 'Midtre Gauldal', '5027', 'f-50'),
  ('k-5028', 'Melhus', '5028', 'f-50'),
  ('k-5029', 'Skaun', '5029', 'f-50'),
  ('k-5031', 'Malvik', '5031', 'f-50'),
  ('k-5032', 'Selbu', '5032', 'f-50'),
  ('k-5033', 'Tydal', '5033', 'f-50'),
  ('k-5034', 'Meråker', '5034', 'f-50'),
  ('k-5035', 'Stjørdal', '5035', 'f-50'),
  ('k-5036', 'Frosta', '5036', 'f-50'),
  ('k-5037', 'Levanger', '5037', 'f-50'),
  ('k-5038', 'Verdal', '5038', 'f-50'),
  ('k-5041', 'Snåsa', '5041', 'f-50'),
  ('k-5042', 'Lierne', '5042', 'f-50'),
  ('k-5043', 'Røyrvik', '5043', 'f-50'),
  ('k-5044', 'Namsskogan', '5044', 'f-50'),
  ('k-5045', 'Grong', '5045', 'f-50'),
  ('k-5046', 'Høylandet', '5046', 'f-50'),
  ('k-5047', 'Overhalla', '5047', 'f-50'),
  ('k-5049', 'Flatanger', '5049', 'f-50'),
  ('k-5050', 'Leka', '5050', 'f-50'),
  ('k-5051', 'Inderøy', '5051', 'f-50'),
  ('k-5052', 'Indre Fosen', '5052', 'f-50'),
  ('k-5053', 'Heim', '5053', 'f-50'),
  ('k-5054', 'Hitra', '5054', 'f-50'),
  ('k-5055', 'Ørland', '5055', 'f-50'),
  ('k-5056', 'Åfjord', '5056', 'f-50'),
  ('k-5057', 'Orkland', '5057', 'f-50'),
  ('k-5058', 'Nærøysund', '5058', 'f-50')
ON CONFLICT (id) DO NOTHING;

-- Troms (55) - 21 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-5501', 'Tromsø', '5501', 'f-55'),
  ('k-5503', 'Harstad', '5503', 'f-55'),
  ('k-5510', 'Kvæfjord', '5510', 'f-55'),
  ('k-5512', 'Tjeldsund', '5512', 'f-55'),
  ('k-5514', 'Ibestad', '5514', 'f-55'),
  ('k-5516', 'Gratangen', '5516', 'f-55'),
  ('k-5518', 'Lavangen', '5518', 'f-55'),
  ('k-5520', 'Bardu', '5520', 'f-55'),
  ('k-5522', 'Salangen', '5522', 'f-55'),
  ('k-5524', 'Målselv', '5524', 'f-55'),
  ('k-5526', 'Sørreisa', '5526', 'f-55'),
  ('k-5528', 'Dyrøy', '5528', 'f-55'),
  ('k-5530', 'Senja', '5530', 'f-55'),
  ('k-5532', 'Balsfjord', '5532', 'f-55'),
  ('k-5534', 'Karlsøy', '5534', 'f-55'),
  ('k-5536', 'Lyngen', '5536', 'f-55'),
  ('k-5538', 'Storfjord', '5538', 'f-55'),
  ('k-5540', 'Kåfjord', '5540', 'f-55'),
  ('k-5542', 'Skjervøy', '5542', 'f-55'),
  ('k-5544', 'Nordreisa', '5544', 'f-55'),
  ('k-5546', 'Kvænangen', '5546', 'f-55')
ON CONFLICT (id) DO NOTHING;

-- Finnmark (56) - 18 kommuner
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  ('k-5601', 'Alta', '5601', 'f-56'),
  ('k-5603', 'Hammerfest', '5603', 'f-56'),
  ('k-5605', 'Sør-Varanger', '5605', 'f-56'),
  ('k-5607', 'Vadsø', '5607', 'f-56'),
  ('k-5610', 'Karasjok', '5610', 'f-56'),
  ('k-5612', 'Kautokeino', '5612', 'f-56'),
  ('k-5614', 'Loppa', '5614', 'f-56'),
  ('k-5616', 'Hasvik', '5616', 'f-56'),
  ('k-5618', 'Måsøy', '5618', 'f-56'),
  ('k-5620', 'Nordkapp', '5620', 'f-56'),
  ('k-5622', 'Porsanger', '5622', 'f-56'),
  ('k-5624', 'Lebesby', '5624', 'f-56'),
  ('k-5626', 'Gamvik', '5626', 'f-56'),
  ('k-5628', 'Tana', '5628', 'f-56'),
  ('k-5630', 'Berlevåg', '5630', 'f-56'),
  ('k-5632', 'Båtsfjord', '5632', 'f-56'),
  ('k-5634', 'Vardø', '5634', 'f-56'),
  ('k-5636', 'Nesseby', '5636', 'f-56')
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 5.4 Brannvesen (Fire departments) - 120 rows
-- ------------------------------------------------------------

-- Oslo / Akershus (10 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-oslo', 'Oslo brann- og redningsetat', 'Oslo brann', 'f-03', ARRAY['k-0301']),
  ('bv-asker', 'Asker og Bærum brann og redning IKS', 'Asker og Bærum brann', 'f-32', ARRAY['k-3201', 'k-3203']),
  ('bv-nedre-romerike', 'Nedre Romerike brann- og redningsvesen IKS', 'NRBR', 'f-32', ARRAY['k-3205', 'k-3222', 'k-3224', 'k-3228']),
  ('bv-ovre-romerike', 'Øvre Romerike brann og redning IKS', 'ØRBR', 'f-32', ARRAY['k-3209', 'k-3230', 'k-3232', 'k-3234', 'k-3236']),
  ('bv-nordre-follo', 'Nordre Follo brannvesen', 'Nordre Follo brann', 'f-32', ARRAY['k-3207']),
  ('bv-nesodden', 'Nesodden brann- og redningsvesen', 'Nesodden brann', 'f-32', ARRAY['k-3212']),
  ('bv-frogn', 'Frogn brannvesen', 'Frogn brann', 'f-32', ARRAY['k-3214']),
  ('bv-follo', 'Follo brannvesen IKS', 'Follo brann', 'f-32', ARRAY['k-3216', 'k-3218', 'k-3220']),
  ('bv-aurskog', 'Aurskog-Høland brannvesen', 'Aurskog-Høland brann', 'f-32', ARRAY['k-3226']),
  ('bv-nittedal', 'Nittedal brann- og redningsvesen', 'Nittedal brann', 'f-32', ARRAY['k-3238'])
ON CONFLICT (id) DO NOTHING;

-- Østfold (5 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-fredrikstad', 'Fredrikstad brann- og redningskorps', 'Fredrikstad brann', 'f-31', ARRAY['k-3107', 'k-3110']),
  ('bv-sarpsborg', 'Sarpsborg brann- og feiervesen', 'Sarpsborg brann', 'f-31', ARRAY['k-3105']),
  ('bv-halden', 'Halden brannvesen', 'Halden brann', 'f-31', ARRAY['k-3101']),
  ('bv-moss', 'Moss brann og redning', 'Moss brann', 'f-31', ARRAY['k-3103', 'k-3112']),
  ('bv-indre-ostfold', 'Indre Østfold brann og redning IKS', 'Indre Østfold brann', 'f-31', ARRAY['k-3114', 'k-3116', 'k-3118', 'k-3120', 'k-3122', 'k-3124'])
ON CONFLICT (id) DO NOTHING;

-- Buskerud (7 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-drammen', 'Drammensregionens brannvesen IKS', 'Drammen brann', 'f-33', ARRAY['k-3301', 'k-3312', 'k-3314']),
  ('bv-kongsberg', 'Kongsberg brann- og redningstjeneste', 'Kongsberg brann', 'f-33', ARRAY['k-3303']),
  ('bv-ringerike', 'Ringerike brann- og redningstjeneste', 'Ringerike brann', 'f-33', ARRAY['k-3305', 'k-3310']),
  ('bv-modum', 'Modum brann- og redningsvesen', 'Modum brann', 'f-33', ARRAY['k-3316', 'k-3318']),
  ('bv-hallingdal', 'Hallingdal brann- og redningsteneste IKS', 'Hallingdal brann', 'f-33', ARRAY['k-3320', 'k-3322', 'k-3324', 'k-3326', 'k-3328', 'k-3330']),
  ('bv-sigdal', 'Sigdal brannvesen', 'Sigdal brann', 'f-33', ARRAY['k-3332']),
  ('bv-numedal', 'Numedal brann- og redningsvesen', 'Numedal brann', 'f-33', ARRAY['k-3334', 'k-3336', 'k-3338'])
ON CONFLICT (id) DO NOTHING;

-- Innlandet (13 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-hamar', 'Hamar brannvesen', 'Hamar brann', 'f-34', ARRAY['k-3403']),
  ('bv-ringsaker', 'Ringsaker brannvesen', 'Ringsaker brann', 'f-34', ARRAY['k-3411']),
  ('bv-lillehammer', 'Lillehammer region brannvesen', 'Lillehammer brann', 'f-34', ARRAY['k-3405', 'k-3440', 'k-3441']),
  ('bv-gjovik', 'Gjøvik brann og redning', 'Gjøvik brann', 'f-34', ARRAY['k-3407', 'k-3442', 'k-3443']),
  ('bv-kongsvinger', 'Kongsvinger brannvesen', 'Kongsvinger brann', 'f-34', ARRAY['k-3401', 'k-3414', 'k-3415', 'k-3416', 'k-3417']),
  ('bv-elverum', 'Elverum brann og redning', 'Elverum brann', 'f-34', ARRAY['k-3420', 'k-3412', 'k-3413']),
  ('bv-trysil', 'Trysil brannvesen', 'Trysil brann', 'f-34', ARRAY['k-3421', 'k-3425']),
  ('bv-nord-osterdal', 'Nord-Østerdal brann og redning IKS', 'Nord-Østerdal brann', 'f-34', ARRAY['k-3426', 'k-3427', 'k-3428', 'k-3429', 'k-3430']),
  ('bv-midt-hedmark', 'Midt-Hedmark brann- og redningsvesen IKS', 'Midt-Hedmark brann', 'f-34', ARRAY['k-3418', 'k-3419', 'k-3422', 'k-3423', 'k-3424']),
  ('bv-midt-gudbrandsdal', 'Midt-Gudbrandsdal brannvesen', 'Midt-Gudbrandsdal brann', 'f-34', ARRAY['k-3436', 'k-3437', 'k-3438', 'k-3439']),
  ('bv-nord-gudbrandsdal', 'Nord-Gudbrandsdal brannvesen', 'Nord-Gudbrandsdal brann', 'f-34', ARRAY['k-3431', 'k-3432', 'k-3433', 'k-3434', 'k-3435']),
  ('bv-valdres', 'Valdres brann- og redningstjeneste IKS', 'Valdres brann', 'f-34', ARRAY['k-3449', 'k-3450', 'k-3451', 'k-3452', 'k-3453', 'k-3454']),
  ('bv-land', 'Land brannvesen', 'Land brann', 'f-34', ARRAY['k-3446', 'k-3447', 'k-3448'])
ON CONFLICT (id) DO NOTHING;

-- Vestfold (3 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-vestfold', 'Vestfold interkommunale brannvesen', 'VIB', 'f-39', ARRAY['k-3901', 'k-3903', 'k-3905', 'k-3911']),
  ('bv-sandefjord', 'Sandefjord brann- og redningsvesen', 'Sandefjord brann', 'f-39', ARRAY['k-3907']),
  ('bv-larvik', 'Larvik brannvesen', 'Larvik brann', 'f-39', ARRAY['k-3909'])
ON CONFLICT (id) DO NOTHING;

-- Telemark (5 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-grenland', 'Grenland brann og redning IKS', 'Grenland brann', 'f-40', ARRAY['k-4001', 'k-4003', 'k-4010', 'k-4012']),
  ('bv-notodden', 'Notodden brann- og redningstjeneste', 'Notodden brann', 'f-40', ARRAY['k-4005', 'k-4024']),
  ('bv-kragerø', 'Kragerø brannvesen', 'Kragerø brann', 'f-40', ARRAY['k-4014', 'k-4016']),
  ('bv-midt-telemark', 'Midt-Telemark brannvesen', 'Midt-Telemark brann', 'f-40', ARRAY['k-4018', 'k-4020', 'k-4022']),
  ('bv-vest-telemark', 'Vest-Telemark brannvesen', 'Vest-Telemark brann', 'f-40', ARRAY['k-4026', 'k-4028', 'k-4030', 'k-4032', 'k-4034', 'k-4036'])
ON CONFLICT (id) DO NOTHING;

-- Agder (10 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-kristiansand', 'Kristiansandsregionen brann og redning IKS', 'KBR', 'f-42', ARRAY['k-4204', 'k-4223', 'k-4215', 'k-4216', 'k-4202']),
  ('bv-arendal', 'Arendal brannvesen', 'Arendal brann', 'f-42', ARRAY['k-4203', 'k-4214']),
  ('bv-setesdal', 'Setesdal brannvesen IKS', 'Setesdal brann', 'f-42', ARRAY['k-4218', 'k-4219', 'k-4220', 'k-4221', 'k-4222']),
  ('bv-lister', 'Lister brannvesen', 'Lister brann', 'f-42', ARRAY['k-4206', 'k-4225', 'k-4226', 'k-4227', 'k-4228']),
  ('bv-flekkefjord', 'Flekkefjord brannvesen', 'Flekkefjord brann', 'f-42', ARRAY['k-4207']),
  ('bv-lindesnes', 'Lindesnes brannvesen', 'Lindesnes brann', 'f-42', ARRAY['k-4205', 'k-4224']),
  ('bv-risør', 'Risør brannvesen', 'Risør brann', 'f-42', ARRAY['k-4201', 'k-4211']),
  ('bv-tvedestrand', 'Tvedestrand brannvesen', 'Tvedestrand brann', 'f-42', ARRAY['k-4213', 'k-4212']),
  ('bv-amli', 'Åmli brannvesen', 'Åmli brann', 'f-42', ARRAY['k-4217']),
  ('bv-kvinesdal', 'Kvinesdal brannvesen', 'Kvinesdal brann', 'f-42', ARRAY['k-4227'])
ON CONFLICT (id) DO NOTHING;

-- Rogaland (11 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-rogaland', 'Rogaland brann og redning IKS', 'RBR', 'f-11', ARRAY['k-1103', 'k-1108', 'k-1124', 'k-1127', 'k-1130', 'k-1122']),
  ('bv-haugesund', 'Haugesund brannvesen', 'Haugesund brann', 'f-11', ARRAY['k-1106']),
  ('bv-karmoy', 'Karmøy brann- og redningsvesen', 'Karmøy brann', 'f-11', ARRAY['k-1149']),
  ('bv-ha', 'Hå brannvesen', 'Hå brann', 'f-11', ARRAY['k-1119']),
  ('bv-klepp', 'Klepp brannvesen', 'Klepp brann', 'f-11', ARRAY['k-1120']),
  ('bv-time', 'Time brannvesen', 'Time brann', 'f-11', ARRAY['k-1121']),
  ('bv-eigersund', 'Eigersund brannvesen', 'Eigersund brann', 'f-11', ARRAY['k-1101', 'k-1111', 'k-1112', 'k-1114']),
  ('bv-tysvær', 'Tysvær brannvesen', 'Tysvær brann', 'f-11', ARRAY['k-1146', 'k-1145']),
  ('bv-vindafjord', 'Vindafjord brannvesen', 'Vindafjord brann', 'f-11', ARRAY['k-1160']),
  ('bv-ryfylke', 'Ryfylke brann- og redningsvesen', 'Ryfylke brann', 'f-11', ARRAY['k-1133', 'k-1134', 'k-1135']),
  ('bv-sauda', 'Sauda brannvesen', 'Sauda brann', 'f-11', ARRAY['k-1135'])
ON CONFLICT (id) DO NOTHING;

-- Vestland (14 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-bergen', 'Bergen brannvesen', 'Bergen brann', 'f-46', ARRAY['k-4601']),
  ('bv-oygarden', 'Øygarden brann og redning', 'Øygarden brann', 'f-46', ARRAY['k-4626']),
  ('bv-askøy', 'Askøy brannvesen', 'Askøy brann', 'f-46', ARRAY['k-4627']),
  ('bv-nordhordland', 'Nordhordland brann og redning IKS', 'Nordhordland brann', 'f-46', ARRAY['k-4631', 'k-4632', 'k-4633', 'k-4634', 'k-4628', 'k-4629', 'k-4630']),
  ('bv-bjornafjorden', 'Bjørnafjorden brannvesen', 'Bjørnafjorden brann', 'f-46', ARRAY['k-4624', 'k-4623']),
  ('bv-sunnhordland', 'Sunnhordland brann og redning', 'Sunnhordland brann', 'f-46', ARRAY['k-4614', 'k-4615', 'k-4616', 'k-4613', 'k-4611', 'k-4612']),
  ('bv-hardanger', 'Hardanger brann og redning', 'Hardanger brann', 'f-46', ARRAY['k-4617', 'k-4618', 'k-4619', 'k-4620', 'k-4622']),
  ('bv-voss', 'Voss brann og redning', 'Voss brann', 'f-46', ARRAY['k-4621']),
  ('bv-sogndal', 'Sogn brann og redning IKS', 'Sogn brann', 'f-46', ARRAY['k-4640', 'k-4641', 'k-4642', 'k-4643', 'k-4644', 'k-4639']),
  ('bv-sunnfjord', 'Sunnfjord brannvesen', 'Sunnfjord brann', 'f-46', ARRAY['k-4647', 'k-4645', 'k-4646']),
  ('bv-kinn', 'Kinn brannvesen', 'Kinn brann', 'f-46', ARRAY['k-4602']),
  ('bv-nordfjord', 'Nordfjord brann og redning', 'Nordfjord brann', 'f-46', ARRAY['k-4649', 'k-4650', 'k-4651', 'k-4648']),
  ('bv-gulen', 'Gulen brannvesen', 'Gulen brann', 'f-46', ARRAY['k-4635', 'k-4636', 'k-4637', 'k-4638']),
  ('bv-austevoll', 'Austevoll brannvesen', 'Austevoll brann', 'f-46', ARRAY['k-4625'])
ON CONFLICT (id) DO NOTHING;

-- Møre og Romsdal (16 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-alesund', 'Ålesund brannvesen', 'Ålesund brann', 'f-15', ARRAY['k-1508', 'k-1531', 'k-1532']),
  ('bv-molde', 'Molde brann- og redningstjeneste', 'Molde brann', 'f-15', ARRAY['k-1506', 'k-1547']),
  ('bv-kristiansund', 'Kristiansund brannvesen', 'Kristiansund brann', 'f-15', ARRAY['k-1505', 'k-1554', 'k-1557']),
  ('bv-orsta-volda', 'Ørsta/Volda brannvesen', 'Ørsta/Volda brann', 'f-15', ARRAY['k-1520', 'k-1577']),
  ('bv-ulstein', 'Ulstein brannvesen', 'Ulstein brann', 'f-15', ARRAY['k-1516', 'k-1517']),
  ('bv-herøy-mr', 'Herøy brannvesen', 'Herøy brann', 'f-15', ARRAY['k-1515', 'k-1514']),
  ('bv-vestnes', 'Vestnes brannvesen', 'Vestnes brann', 'f-15', ARRAY['k-1535']),
  ('bv-rauma', 'Rauma brannvesen', 'Rauma brann', 'f-15', ARRAY['k-1539']),
  ('bv-sunndal', 'Sunndal brannvesen', 'Sunndal brann', 'f-15', ARRAY['k-1563']),
  ('bv-surnadal', 'Surnadal brannvesen', 'Surnadal brann', 'f-15', ARRAY['k-1566']),
  ('bv-sykkylven', 'Sykkylven brannvesen', 'Sykkylven brann', 'f-15', ARRAY['k-1528']),
  ('bv-stranda', 'Stranda brannvesen', 'Stranda brann', 'f-15', ARRAY['k-1525', 'k-1578']),
  ('bv-hustadvika', 'Hustadvika brannvesen', 'Hustadvika brann', 'f-15', ARRAY['k-1579']),
  ('bv-vanylven', 'Vanylven brannvesen', 'Vanylven brann', 'f-15', ARRAY['k-1511']),
  ('bv-tingvoll', 'Tingvoll brannvesen', 'Tingvoll brann', 'f-15', ARRAY['k-1560']),
  ('bv-smola-aure', 'Smøla og Aure brannvesen', 'Smøla/Aure brann', 'f-15', ARRAY['k-1573', 'k-1576'])
ON CONFLICT (id) DO NOTHING;

-- Trøndelag (14 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-trondheim', 'Trøndelag brann- og redningstjeneste IKS', 'TBRT', 'f-50', ARRAY['k-5001', 'k-5028', 'k-5029', 'k-5031', 'k-5052']),
  ('bv-stjordal', 'Stjørdal brannvesen', 'Stjørdal brann', 'f-50', ARRAY['k-5035', 'k-5034', 'k-5036']),
  ('bv-levanger', 'Levanger brannvesen', 'Levanger brann', 'f-50', ARRAY['k-5037', 'k-5038']),
  ('bv-steinkjer', 'Steinkjer brannvesen', 'Steinkjer brann', 'f-50', ARRAY['k-5006', 'k-5041', 'k-5051']),
  ('bv-namsos', 'Namdal brann- og redningsvesen', 'Namdal brann', 'f-50', ARRAY['k-5007', 'k-5044', 'k-5045', 'k-5046', 'k-5047', 'k-5058']),
  ('bv-oppdal', 'Oppdal brannvesen', 'Oppdal brann', 'f-50', ARRAY['k-5021', 'k-5022']),
  ('bv-roros', 'Røros brannvesen', 'Røros brann', 'f-50', ARRAY['k-5025', 'k-5026']),
  ('bv-gauldal', 'Gauldal brannvesen', 'Gauldal brann', 'f-50', ARRAY['k-5027']),
  ('bv-selbu', 'Selbu brannvesen', 'Selbu brann', 'f-50', ARRAY['k-5032', 'k-5033']),
  ('bv-fosen', 'Fosen brann og redning', 'Fosen brann', 'f-50', ARRAY['k-5055', 'k-5056', 'k-5020']),
  ('bv-orkland', 'Orkland brannvesen', 'Orkland brann', 'f-50', ARRAY['k-5057', 'k-5053']),
  ('bv-hitra-froya', 'Hitra-Frøya brannvesen', 'Hitra-Frøya brann', 'f-50', ARRAY['k-5054', 'k-5014']),
  ('bv-flatanger', 'Flatanger brannvesen', 'Flatanger brann', 'f-50', ARRAY['k-5049', 'k-5050']),
  ('bv-lierne', 'Lierne brannvesen', 'Lierne brann', 'f-50', ARRAY['k-5042', 'k-5043'])
ON CONFLICT (id) DO NOTHING;

-- Nordland (17 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-bodo', 'Bodø brann og redning', 'Bodø brann', 'f-18', ARRAY['k-1804', 'k-1838', 'k-1839']),
  ('bv-narvik', 'Ofoten brann IKS', 'Ofoten brann', 'f-18', ARRAY['k-1806', 'k-1853']),
  ('bv-rana', 'Rana brannvesen', 'Rana brann', 'f-18', ARRAY['k-1833', 'k-1832']),
  ('bv-vefsn', 'Vefsn brannvesen', 'Vefsn brann', 'f-18', ARRAY['k-1824', 'k-1825', 'k-1826']),
  ('bv-bronnoysund', 'Brønnøy brannvesen', 'Brønnøy brann', 'f-18', ARRAY['k-1813', 'k-1812', 'k-1811']),
  ('bv-alstahaug', 'Alstahaug brannvesen', 'Alstahaug brann', 'f-18', ARRAY['k-1820', 'k-1822', 'k-1827', 'k-1828']),
  ('bv-salangen', 'Salangen brannvesen', 'Salangen brann', 'f-18', ARRAY['k-1840', 'k-1841', 'k-1845']),
  ('bv-sortland', 'Sortland brannvesen', 'Sortland brann', 'f-18', ARRAY['k-1870', 'k-1868', 'k-1871']),
  ('bv-lofoten', 'Lofoten brannvesen', 'Lofoten brann', 'f-18', ARRAY['k-1860', 'k-1865', 'k-1859', 'k-1856', 'k-1857', 'k-1874']),
  ('bv-hadsel', 'Hadsel brannvesen', 'Hadsel brann', 'f-18', ARRAY['k-1866', 'k-1867']),
  ('bv-vega', 'Vega brannvesen', 'Vega brann', 'f-18', ARRAY['k-1815', 'k-1816']),
  ('bv-herøy-n', 'Herøy brannvesen (Nordland)', 'Herøy brann N', 'f-18', ARRAY['k-1818']),
  ('bv-steigen', 'Steigen brannvesen', 'Steigen brann', 'f-18', ARRAY['k-1848']),
  ('bv-lodingen', 'Lødingen brannvesen', 'Lødingen brann', 'f-18', ARRAY['k-1851']),
  ('bv-hamaroy', 'Hamarøy brannvesen', 'Hamarøy brann', 'f-18', ARRAY['k-1875']),
  ('bv-meloy', 'Meløy brannvesen', 'Meløy brann', 'f-18', ARRAY['k-1837', 'k-1836']),
  ('bv-luroy-traena', 'Lurøy og Træna brannvesen', 'Lurøy/Træna brann', 'f-18', ARRAY['k-1834', 'k-1835'])
ON CONFLICT (id) DO NOTHING;

-- Troms (7 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-tromso', 'Tromsø brann og redning', 'Tromsø brann', 'f-55', ARRAY['k-5501', 'k-5532', 'k-5534']),
  ('bv-harstad', 'Harstad brannvesen', 'Harstad brann', 'f-55', ARRAY['k-5503', 'k-5510', 'k-5512']),
  ('bv-senja', 'Senja brannvesen', 'Senja brann', 'f-55', ARRAY['k-5530', 'k-5526', 'k-5528']),
  ('bv-salangen-t', 'Salangen-Lavangen brannvesen', 'Salangen-Lavangen brann', 'f-55', ARRAY['k-5522', 'k-5518', 'k-5516', 'k-5514']),
  ('bv-bardu', 'Bardu brannvesen', 'Bardu brann', 'f-55', ARRAY['k-5520', 'k-5524']),
  ('bv-lyngen', 'Lyngen brannvesen', 'Lyngen brann', 'f-55', ARRAY['k-5536', 'k-5538', 'k-5540']),
  ('bv-nord-troms', 'Nord-Troms brann og redning', 'Nord-Troms brann', 'f-55', ARRAY['k-5542', 'k-5544', 'k-5546'])
ON CONFLICT (id) DO NOTHING;

-- Finnmark (12 brannvesen)
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  ('bv-alta', 'Alta brann- og redningskorps', 'Alta brann', 'f-56', ARRAY['k-5601', 'k-5614']),
  ('bv-hammerfest', 'Hammerfest brann og redning', 'Hammerfest brann', 'f-56', ARRAY['k-5603', 'k-5616', 'k-5618']),
  ('bv-sor-varanger', 'Sør-Varanger brannvesen', 'Sør-Varanger brann', 'f-56', ARRAY['k-5605']),
  ('bv-vadso', 'Vadsø brannvesen', 'Vadsø brann', 'f-56', ARRAY['k-5607', 'k-5636']),
  ('bv-nordkapp', 'Nordkapp brannvesen', 'Nordkapp brann', 'f-56', ARRAY['k-5620']),
  ('bv-porsanger', 'Porsanger brannvesen', 'Porsanger brann', 'f-56', ARRAY['k-5622', 'k-5624']),
  ('bv-tana', 'Tana brannvesen', 'Tana brann', 'f-56', ARRAY['k-5628', 'k-5626']),
  ('bv-berlevag', 'Berlevåg brannvesen', 'Berlevåg brann', 'f-56', ARRAY['k-5630']),
  ('bv-batsfjord', 'Båtsfjord brannvesen', 'Båtsfjord brann', 'f-56', ARRAY['k-5632']),
  ('bv-vardo', 'Vardø brannvesen', 'Vardø brann', 'f-56', ARRAY['k-5634']),
  ('bv-karasjok', 'Karasjok brannvesen', 'Karasjok brann', 'f-56', ARRAY['k-5610']),
  ('bv-kautokeino', 'Kautokeino brannvesen', 'Kautokeino brann', 'f-56', ARRAY['k-5612'])
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SETUP COMPLETE
-- ============================================================
-- Summary:
--   - 15 fylker (counties)
--   - 20 kategorier (incident categories)
--   - 356 kommuner (municipalities)
--   - 120 brannvesen (fire departments)
--   - 1 storage bucket: hendelsesbilder (public read, operator upload)
--   - Full RLS policies for all tables and storage
--   - Audit triggers on critical tables
--   - All seed data uses ON CONFLICT DO NOTHING for idempotency
--   - Admin user: frank.lunde1981@gmail.com (rolle: admin)
-- ============================================================

-- ============================================
-- PART 6: ADMIN USER
-- ============================================

DO $$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO _user_id FROM auth.users WHERE email = 'frank.lunde1981@gmail.com';

  -- Only create if not exists
  IF _user_id IS NULL THEN
    _user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'frank.lunde1981@gmail.com',
      crypt('Flomlys@2025', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"fullt_navn": "Frank Lunde"}',
      'authenticated',
      'authenticated',
      NOW(),
      NOW(),
      '',
      ''
    );

    -- Create identity for email login
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      _user_id,
      _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', 'frank.lunde1981@gmail.com'),
      'email',
      _user_id::text,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Admin user created: frank.lunde1981@gmail.com';
  ELSE
    RAISE NOTICE 'Admin user already exists: frank.lunde1981@gmail.com';
  END IF;

  -- Create or update admin profile
  INSERT INTO brukerprofiler (
    id,
    user_id,
    rolle,
    fullt_navn,
    brannvesen_id,
    aktiv
  ) VALUES (
    gen_random_uuid(),
    _user_id,
    'admin',
    'Frank Lunde',
    NULL,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    rolle = 'admin',
    fullt_navn = 'Frank Lunde',
    aktiv = true;

END $$;
