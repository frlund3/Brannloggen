-- Create medier (media companies) table (idempotent)
CREATE TABLE IF NOT EXISTS medier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('riksmedia', 'regionavis', 'lokalavis', 'nyhetsbyra', 'tv', 'radio', 'nettavis', 'annet')) DEFAULT 'annet',
  aktiv BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE medier ENABLE ROW LEVEL SECURITY;

-- Everyone can read medier
CREATE POLICY "medier_select" ON medier FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "medier_admin_all" ON medier FOR ALL USING (
  EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle IN ('admin', '110-admin'))
);

-- Add medium_id to brukerprofiler
ALTER TABLE brukerprofiler ADD COLUMN IF NOT EXISTS medium_id UUID REFERENCES medier(id);

-- Add medium_id to presse_soknader
ALTER TABLE presse_soknader ADD COLUMN IF NOT EXISTS medium_id UUID REFERENCES medier(id);

-- Seed Norwegian media companies
INSERT INTO medier (navn, type) VALUES
  ('NRK', 'riksmedia'),
  ('VG', 'riksmedia'),
  ('TV 2', 'tv'),
  ('Aftenposten', 'riksmedia'),
  ('NTB', 'nyhetsbyra'),
  ('BT', 'regionavis'),
  ('Adresseavisen', 'regionavis'),
  ('Dagbladet', 'riksmedia'),
  ('Nettavisen', 'nettavis'),
  ('BA', 'regionavis'),
  ('Avisa Oslo', 'regionavis'),
  ('Fædrelandsvennen', 'regionavis'),
  ('Romerikes Blad', 'lokalavis'),
  ('Budstikka', 'lokalavis'),
  ('Sunnmørsposten', 'regionavis'),
  ('Agderposten', 'regionavis'),
  ('Stavanger Aftenblad', 'regionavis'),
  ('Fredriksstad Blad', 'lokalavis'),
  ('Avisa Nordland', 'regionavis'),
  ('iTromsø', 'lokalavis'),
  ('Haugesunds Avis', 'lokalavis'),
  ('Firda', 'lokalavis'),
  ('Trønder-Avisa', 'regionavis'),
  ('Nidaros', 'lokalavis'),
  ('Drammens Tidende', 'lokalavis'),
  ('Moss Avis', 'lokalavis'),
  ('Nordlys', 'regionavis'),
  ('Tønsbergs Blad', 'lokalavis'),
  ('Telemarksavisa', 'lokalavis'),
  ('Hamar Arbeiderblad', 'lokalavis'),
  ('Bergensavisen', 'regionavis'),
  ('Romsdals Budstikke', 'lokalavis'),
  ('Ringerikes Blad', 'lokalavis'),
  ('Oppland Arbeiderblad', 'regionavis'),
  ('Glåmdalen', 'lokalavis'),
  ('Sarpsborg Arbeiderblad', 'lokalavis'),
  ('Sandefjords Blad', 'lokalavis'),
  ('Varden', 'lokalavis'),
  ('Rana Blad', 'lokalavis'),
  ('Lofotposten', 'lokalavis'),
  ('Helgelendingen', 'lokalavis'),
  ('Fremover', 'lokalavis'),
  ('Avisa Hordaland', 'lokalavis'),
  ('Hallingdølen', 'lokalavis'),
  ('Sogn Avis', 'lokalavis'),
  ('Namdalsavisa', 'lokalavis')
ON CONFLICT (navn) DO NOTHING;

-- Grant permissions
GRANT SELECT ON medier TO anon, authenticated;
GRANT ALL ON medier TO authenticated;
