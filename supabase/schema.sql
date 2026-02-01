-- ============================================
-- BRANNLOGGEN - Complete Database Schema
-- Norwegian Fire Department Incident Tracker
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Fylker (Counties)
CREATE TABLE fylker (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  nummer TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kommuner (Municipalities)
CREATE TABLE kommuner (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  nummer TEXT NOT NULL UNIQUE,
  fylke_id TEXT NOT NULL REFERENCES fylker(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kommuner_fylke ON kommuner(fylke_id);

-- Brannvesen (Fire departments)
CREATE TABLE brannvesen (
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

CREATE INDEX idx_brannvesen_fylke ON brannvesen(fylke_id);

-- Hendelseskategorier (Incident categories)
CREATE TABLE kategorier (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  ikon TEXT NOT NULL,
  farge TEXT NOT NULL,
  beskrivelse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 110-sentraler (Emergency dispatch centers)
CREATE TABLE sentraler (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  kort_navn TEXT NOT NULL,
  fylke_ids TEXT[] NOT NULL DEFAULT '{}',
  brannvesen_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE brukerprofiler (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rolle TEXT NOT NULL CHECK (rolle IN ('admin', '110-admin', 'operator', 'presse', 'public')) DEFAULT 'public',
  fullt_navn TEXT NOT NULL,
  epost TEXT,
  sentral_ids TEXT[] NOT NULL DEFAULT '{}',
  aktiv BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_brukerprofiler_user ON brukerprofiler(user_id);

-- ============================================
-- INCIDENT TABLES
-- ============================================

-- Hendelser (Incidents)
CREATE TABLE hendelser (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brannvesen_id TEXT NOT NULL REFERENCES brannvesen(id),
  kommune_id TEXT NOT NULL REFERENCES kommuner(id),
  fylke_id TEXT NOT NULL REFERENCES fylker(id),
  kategori_id TEXT NOT NULL REFERENCES kategorier(id),
  tittel TEXT NOT NULL,
  beskrivelse TEXT NOT NULL,
  sted TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pågår', 'avsluttet', 'deaktivert')) DEFAULT 'pågår',
  alvorlighetsgrad TEXT NOT NULL CHECK (alvorlighetsgrad IN ('lav', 'middels', 'høy', 'kritisk')) DEFAULT 'middels',
  opprettet_av UUID NOT NULL REFERENCES auth.users(id),
  opprettet_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  oppdatert_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avsluttet_tidspunkt TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hendelser_status ON hendelser(status);
CREATE INDEX idx_hendelser_brannvesen ON hendelser(brannvesen_id);
CREATE INDEX idx_hendelser_kommune ON hendelser(kommune_id);
CREATE INDEX idx_hendelser_fylke ON hendelser(fylke_id);
CREATE INDEX idx_hendelser_kategori ON hendelser(kategori_id);
CREATE INDEX idx_hendelser_opprettet ON hendelser(opprettet_tidspunkt DESC);

-- Hendelsesoppdateringer (Incident updates - public)
CREATE TABLE hendelsesoppdateringer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  opprettet_av UUID NOT NULL REFERENCES auth.users(id),
  opprettet_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oppdateringer_hendelse ON hendelsesoppdateringer(hendelse_id);

-- Hendelsesbilder (Incident images - stored in Supabase Storage)
CREATE TABLE hendelsesbilder (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  bilde_url TEXT NOT NULL,
  bildetekst TEXT,
  lastet_opp_av UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bilder_hendelse ON hendelsesbilder(hendelse_id);

-- Interne notater (Internal notes - SEPARATE from public data)
CREATE TABLE interne_notater (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  notat TEXT NOT NULL,
  opprettet_av UUID NOT NULL REFERENCES auth.users(id),
  opprettet_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notater_hendelse ON interne_notater(hendelse_id);

-- ============================================
-- USER FEATURE TABLES
-- ============================================

-- Bruker følger hendelse (User follows incident)
CREATE TABLE bruker_følger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hendelse_id)
);

CREATE INDEX idx_følger_user ON bruker_følger(user_id);

-- Push-varsler preferanser (Push notification preferences)
CREATE TABLE push_preferanser (
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

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  handling TEXT NOT NULL,
  tabell TEXT NOT NULL,
  rad_id TEXT,
  detaljer JSONB DEFAULT '{}',
  ip_adresse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

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

ALTER TABLE sentraler ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data
CREATE POLICY "Anyone can read fylker" ON fylker FOR SELECT USING (true);
CREATE POLICY "Anyone can read kommuner" ON kommuner FOR SELECT USING (true);
CREATE POLICY "Anyone can read brannvesen" ON brannvesen FOR SELECT USING (true);
CREATE POLICY "Anyone can read kategorier" ON kategorier FOR SELECT USING (true);
CREATE POLICY "Anyone can read sentraler" ON sentraler FOR SELECT USING (true);

-- Hendelser: Everyone can read, only operators/admins can write
CREATE POLICY "Anyone can read hendelser" ON hendelser FOR SELECT USING (true);

CREATE POLICY "Operators can insert hendelser" ON hendelser FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM sentraler s
        WHERE s.id = ANY(bp.sentral_ids)
        AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

CREATE POLICY "Operators can update own brannvesen hendelser" ON hendelser FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM sentraler s
        WHERE s.id = ANY(bp.sentral_ids)
        AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

-- Oppdateringer: Public read, operator/admin write (scoped to sentraler)
CREATE POLICY "Anyone can read oppdateringer" ON hendelsesoppdateringer FOR SELECT USING (true);

CREATE POLICY "Operators can insert oppdateringer" ON hendelsesoppdateringer FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM hendelser h
        JOIN sentraler s ON s.id = ANY(bp.sentral_ids)
        WHERE h.id = hendelsesoppdateringer.hendelse_id
        AND h.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

CREATE POLICY "Operators can update oppdateringer" ON hendelsesoppdateringer FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM hendelser h
        JOIN sentraler s ON s.id = ANY(bp.sentral_ids)
        WHERE h.id = hendelsesoppdateringer.hendelse_id
        AND h.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

CREATE POLICY "Operators can delete oppdateringer" ON hendelsesoppdateringer FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM hendelser h
        JOIN sentraler s ON s.id = ANY(bp.sentral_ids)
        WHERE h.id = hendelsesoppdateringer.hendelse_id
        AND h.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

-- Bilder: Public read, operator/admin write (scoped to sentraler)
CREATE POLICY "Anyone can read bilder" ON hendelsesbilder FOR SELECT USING (true);

CREATE POLICY "Operators can insert bilder" ON hendelsesbilder FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM hendelser h
        JOIN sentraler s ON s.id = ANY(bp.sentral_ids)
        WHERE h.id = hendelsesbilder.hendelse_id
        AND h.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

CREATE POLICY "Operators can delete bilder" ON hendelsesbilder FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM hendelser h
        JOIN sentraler s ON s.id = ANY(bp.sentral_ids)
        WHERE h.id = hendelsesbilder.hendelse_id
        AND h.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

-- Interne notater: ONLY operators/110-admins from same sentraler or admins
CREATE POLICY "Operators can read own brannvesen notater" ON interne_notater FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM hendelser h
        JOIN sentraler s ON s.id = ANY(bp.sentral_ids)
        WHERE h.id = interne_notater.hendelse_id
        AND h.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

CREATE POLICY "Operators can insert notater" ON interne_notater FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM brukerprofiler bp
    WHERE bp.user_id = auth.uid()
    AND bp.aktiv = true
    AND (
      bp.rolle = 'admin'
      OR bp.rolle IN ('operator', '110-admin') AND EXISTS (
        SELECT 1 FROM hendelser h
        JOIN sentraler s ON s.id = ANY(bp.sentral_ids)
        WHERE h.id = interne_notater.hendelse_id
        AND h.brannvesen_id = ANY(s.brannvesen_ids)
      )
    )
  )
);

-- Brukerprofiler
CREATE POLICY "Users can read own profile" ON brukerprofiler FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle IN ('admin', '110-admin')
  )
);

CREATE POLICY "Admins can manage profiles" ON brukerprofiler FOR ALL USING (
  EXISTS (
    SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle IN ('admin', '110-admin')
  )
);

CREATE POLICY "Users can insert own profile" ON brukerprofiler FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update own profile" ON brukerprofiler FOR UPDATE USING (
  auth.uid() = user_id
);

-- Følger
CREATE POLICY "Users can read own follows" ON bruker_følger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can follow" ON bruker_følger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow" ON bruker_følger FOR DELETE USING (auth.uid() = user_id);

-- Push preferanser
CREATE POLICY "Users can read own push prefs" ON push_preferanser FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own push prefs" ON push_preferanser FOR ALL USING (auth.uid() = user_id);

-- Audit log: Only admins
CREATE POLICY "Admins can read audit log" ON audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin'
  )
);
-- Audit log inserts are handled ONLY by the SECURITY DEFINER trigger function log_audit().
-- No direct INSERT policy needed - the trigger bypasses RLS via SECURITY DEFINER.

-- Admin write access for reference tables
CREATE POLICY "Admins can manage fylker" ON fylker FOR ALL USING (
  EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
);
CREATE POLICY "Admins can manage kommuner" ON kommuner FOR ALL USING (
  EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
);
CREATE POLICY "Admins can manage brannvesen" ON brannvesen FOR ALL USING (
  EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
);
CREATE POLICY "Admins can manage kategorier" ON kategorier FOR ALL USING (
  EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
);
CREATE POLICY "Admins can manage sentraler" ON sentraler FOR ALL USING (
  EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
);

-- ============================================
-- STORAGE BUCKET FOR IMAGES
-- ============================================
-- Run in Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('hendelsesbilder', 'hendelsesbilder', true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-update oppdatert_tidspunkt
CREATE OR REPLACE FUNCTION update_oppdatert_tidspunkt()
RETURNS TRIGGER AS $$
BEGIN
  NEW.oppdatert_tidspunkt = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
CREATE TRIGGER audit_hendelser AFTER INSERT OR UPDATE OR DELETE ON hendelser
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_hendelsesoppdateringer AFTER INSERT OR UPDATE OR DELETE ON hendelsesoppdateringer
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_interne_notater AFTER INSERT OR UPDATE OR DELETE ON interne_notater
  FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_brukerprofiler AFTER INSERT OR UPDATE OR DELETE ON brukerprofiler
  FOR EACH ROW EXECUTE FUNCTION log_audit();
