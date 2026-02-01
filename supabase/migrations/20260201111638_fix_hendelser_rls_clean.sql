-- Clean rewrite of ALL hendelser RLS policies.
-- Previous migration may have left conflicting policies.
-- Drop everything and recreate using SECURITY DEFINER helpers.

-- Drop ALL existing policies on hendelser
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'hendelser' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON hendelser', pol.policyname);
  END LOOP;
END $$;

-- 1. Public read
CREATE POLICY "Anyone can read hendelser"
  ON hendelser FOR SELECT
  USING (true);

-- 2. Admin full access (admin only)
CREATE POLICY "Admins can manage hendelser"
  ON hendelser FOR ALL
  USING (public.get_my_rolle() = 'admin')
  WITH CHECK (public.get_my_rolle() = 'admin');

-- 3. Operators / 110-admins can INSERT for their sentraler
CREATE POLICY "Operators can insert hendelser"
  ON hendelser FOR INSERT
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM sentraler s
      WHERE s.id = ANY(public.get_my_sentral_ids())
      AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

-- 4. Operators / 110-admins can UPDATE for their sentraler
CREATE POLICY "Operators can update hendelser"
  ON hendelser FOR UPDATE
  USING (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM sentraler s
      WHERE s.id = ANY(public.get_my_sentral_ids())
      AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
    )
  )
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM sentraler s
      WHERE s.id = ANY(public.get_my_sentral_ids())
      AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

-- Also clean rewrite hendelsesoppdateringer to be safe
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'hendelsesoppdateringer' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON hendelsesoppdateringer', pol.policyname);
  END LOOP;
END $$;

-- 1. Public read
CREATE POLICY "Anyone can read oppdateringer"
  ON hendelsesoppdateringer FOR SELECT
  USING (true);

-- 2. Admin full access
CREATE POLICY "Admins can manage oppdateringer"
  ON hendelsesoppdateringer FOR ALL
  USING (public.get_my_rolle() = 'admin')
  WITH CHECK (public.get_my_rolle() = 'admin');

-- 3. Operators / 110-admins can INSERT
CREATE POLICY "Operators can insert oppdateringer"
  ON hendelsesoppdateringer FOR INSERT
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM hendelser h
      JOIN sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

-- 4. Operators / 110-admins can UPDATE
CREATE POLICY "Operators can update oppdateringer"
  ON hendelsesoppdateringer FOR UPDATE
  USING (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM hendelser h
      JOIN sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  )
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM hendelser h
      JOIN sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

-- 5. Operators / 110-admins can DELETE
CREATE POLICY "Operators can delete oppdateringer"
  ON hendelsesoppdateringer FOR DELETE
  USING (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM hendelser h
      JOIN sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );
