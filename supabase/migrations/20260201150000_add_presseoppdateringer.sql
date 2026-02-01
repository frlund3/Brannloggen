-- Create separate presseoppdateringer table
-- Press updates are SEPARATE from regular oppdateringer (which are for public)

CREATE TABLE IF NOT EXISTS presseoppdateringer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hendelse_id UUID NOT NULL REFERENCES hendelser(id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  bilde_url TEXT,
  opprettet_av UUID NOT NULL REFERENCES auth.users(id),
  opprettet_tidspunkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deaktivert BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE presseoppdateringer ENABLE ROW LEVEL SECURITY;

-- Everyone can read (press updates are public info for press)
CREATE POLICY "Anyone can read presseoppdateringer"
  ON presseoppdateringer FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Auth can insert presseoppdateringer"
  ON presseoppdateringer FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update
CREATE POLICY "Auth can update presseoppdateringer"
  ON presseoppdateringer FOR UPDATE USING (auth.role() = 'authenticated');

-- Remove synlig_for_presse from hendelsesoppdateringer (no longer needed)
-- We keep the column but it's no longer used in the UI

-- Grant permissions
GRANT ALL ON presseoppdateringer TO authenticated;
GRANT SELECT ON presseoppdateringer TO anon;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
