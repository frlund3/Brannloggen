-- Create aktivitetslogg table for tracking all user actions
CREATE TABLE IF NOT EXISTS aktivitetslogg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tidspunkt TIMESTAMPTZ DEFAULT NOW(),
  bruker_id UUID REFERENCES auth.users(id),
  handling TEXT NOT NULL,
  tabell TEXT NOT NULL,
  rad_id UUID,
  hendelse_id UUID,
  hendelse_tittel TEXT,
  detaljer JSONB DEFAULT '{}',
  ip_adresse TEXT
);

-- Enable RLS
ALTER TABLE aktivitetslogg ENABLE ROW LEVEL SECURITY;

-- Admins and 110-admins can read all logs
CREATE POLICY "aktivitetslogg_admin_select" ON aktivitetslogg FOR SELECT USING (
  EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle IN ('admin', '110-admin'))
);

-- Authenticated users can insert their own logs
CREATE POLICY "aktivitetslogg_insert" ON aktivitetslogg FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Index for common queries
CREATE INDEX idx_aktivitetslogg_tidspunkt ON aktivitetslogg(tidspunkt DESC);
CREATE INDEX idx_aktivitetslogg_hendelse ON aktivitetslogg(hendelse_id);
CREATE INDEX idx_aktivitetslogg_bruker ON aktivitetslogg(bruker_id);
CREATE INDEX idx_aktivitetslogg_handling ON aktivitetslogg(handling);

-- Grant permissions
GRANT SELECT ON aktivitetslogg TO authenticated;
GRANT INSERT ON aktivitetslogg TO authenticated;
