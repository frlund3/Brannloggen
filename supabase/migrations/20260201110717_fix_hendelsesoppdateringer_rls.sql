-- Fix recursive RLS on hendelser and hendelsesoppdateringer
-- These policies query brukerprofiler directly, causing recursion.
-- Rewrite to use get_my_rolle() SECURITY DEFINER function.

-- Also need a helper to get sentral_ids without hitting brukerprofiler RLS
CREATE OR REPLACE FUNCTION public.get_my_sentral_ids()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sentral_ids, '{}') FROM brukerprofiler WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ==================== HENDELSER ====================

-- Drop old policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hendelser' AND policyname = 'Operators can insert hendelser') THEN
    DROP POLICY "Operators can insert hendelser" ON hendelser;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hendelser' AND policyname = 'Operators can update own brannvesen hendelser') THEN
    DROP POLICY "Operators can update own brannvesen hendelser" ON hendelser;
  END IF;
END $$;

-- Admins can insert/update any hendelse
CREATE POLICY "Admins can write hendelser"
  ON hendelser FOR ALL
  USING (public.get_my_rolle() = 'admin')
  WITH CHECK (public.get_my_rolle() = 'admin');

-- Operators and 110-admins can insert hendelser for their sentraler
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

-- Operators and 110-admins can update hendelser for their sentraler
CREATE POLICY "Operators can update hendelser"
  ON hendelser FOR UPDATE
  USING (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM sentraler s
      WHERE s.id = ANY(public.get_my_sentral_ids())
      AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

-- ==================== HENDELSESOPPDATERINGER ====================

-- Drop old policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hendelsesoppdateringer' AND policyname = 'Operators can insert oppdateringer') THEN
    DROP POLICY "Operators can insert oppdateringer" ON hendelsesoppdateringer;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hendelsesoppdateringer' AND policyname = 'Operators can update oppdateringer') THEN
    DROP POLICY "Operators can update oppdateringer" ON hendelsesoppdateringer;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hendelsesoppdateringer' AND policyname = 'Operators can delete oppdateringer') THEN
    DROP POLICY "Operators can delete oppdateringer" ON hendelsesoppdateringer;
  END IF;
END $$;

-- Admins can do anything with oppdateringer
CREATE POLICY "Admins can manage oppdateringer"
  ON hendelsesoppdateringer FOR ALL
  USING (public.get_my_rolle() = 'admin')
  WITH CHECK (public.get_my_rolle() = 'admin');

-- Operators/110-admins can insert oppdateringer for their sentraler's hendelser
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

-- Operators/110-admins can update oppdateringer for their sentraler's hendelser
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
  );

-- Operators/110-admins can delete oppdateringer for their sentraler's hendelser
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
