-- Add postnummer and poststed columns to hendelser
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS postnummer TEXT;
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS poststed TEXT;
