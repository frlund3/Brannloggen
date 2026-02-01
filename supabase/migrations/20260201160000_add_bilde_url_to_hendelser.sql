-- Add bilde_url directly on hendelser table
-- This is the main image for the incident, visible to everyone
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS bilde_url TEXT;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
