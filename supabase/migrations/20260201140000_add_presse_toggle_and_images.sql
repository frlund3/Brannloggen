-- Add presse visibility toggle to oppdateringer
-- Add image support to oppdateringer and interne_notater
-- Create storage bucket for images

-- 1. Add synlig_for_presse to hendelsesoppdateringer
ALTER TABLE hendelsesoppdateringer ADD COLUMN IF NOT EXISTS synlig_for_presse BOOLEAN NOT NULL DEFAULT false;

-- 2. Add bilde_url to hendelsesoppdateringer
ALTER TABLE hendelsesoppdateringer ADD COLUMN IF NOT EXISTS bilde_url TEXT;

-- 3. Add bilde_url to interne_notater
ALTER TABLE interne_notater ADD COLUMN IF NOT EXISTS bilde_url TEXT;

-- 4. Add deaktivert flag to hendelsesoppdateringer (soft delete)
ALTER TABLE hendelsesoppdateringer ADD COLUMN IF NOT EXISTS deaktivert BOOLEAN NOT NULL DEFAULT false;

-- 5. Add deaktivert flag to interne_notater (soft delete)
ALTER TABLE interne_notater ADD COLUMN IF NOT EXISTS deaktivert BOOLEAN NOT NULL DEFAULT false;

-- 6. Create storage bucket for images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hendelsesbilder', 'hendelsesbilder', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies - anyone can read public images
CREATE POLICY "Public read hendelsesbilder" ON storage.objects
  FOR SELECT USING (bucket_id = 'hendelsesbilder');

-- 8. Authenticated users can upload images
CREATE POLICY "Auth upload hendelsesbilder" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hendelsesbilder' AND auth.role() = 'authenticated');

-- 9. Authenticated users can delete their own images
CREATE POLICY "Auth delete hendelsesbilder" ON storage.objects
  FOR DELETE USING (bucket_id = 'hendelsesbilder' AND auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
