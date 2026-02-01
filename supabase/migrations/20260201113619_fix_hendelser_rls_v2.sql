-- V2: Ensure get_my_rolle() and get_my_sentral_ids() exist,
-- then completely recreate hendelser + hendelsesoppdateringer policies.
-- Previous migrations may have failed silently.

-- =============================================
-- STEP 1: Recreate SECURITY DEFINER functions
-- =============================================

CREATE OR REPLACE FUNCTION public.get_my_rolle()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rolle FROM brukerprofiler WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_sentral_ids()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sentral_ids, '{}') FROM brukerprofiler WHERE user_id = auth.uid() LIMIT 1;
$$;

-- =============================================
-- STEP 2: Drop ALL policies on hendelser
-- =============================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hendelser'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.hendelser', pol.policyname);
  END LOOP;
END $$;

-- =============================================
-- STEP 3: Create hendelser policies
-- =============================================

-- Public read
CREATE POLICY "Anyone can read hendelser"
  ON public.hendelser FOR SELECT
  USING (true);

-- Admin full access
CREATE POLICY "Admins can manage hendelser"
  ON public.hendelser FOR ALL
  USING (public.get_my_rolle() = 'admin')
  WITH CHECK (public.get_my_rolle() = 'admin');

-- Operators / 110-admins INSERT (scoped to sentraler)
CREATE POLICY "Operators can insert hendelser"
  ON public.hendelser FOR INSERT
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM public.sentraler s
      WHERE s.id = ANY(public.get_my_sentral_ids())
      AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

-- Operators / 110-admins UPDATE (scoped to sentraler)
CREATE POLICY "Operators can update hendelser"
  ON public.hendelser FOR UPDATE
  USING (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM public.sentraler s
      WHERE s.id = ANY(public.get_my_sentral_ids())
      AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
    )
  )
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM public.sentraler s
      WHERE s.id = ANY(public.get_my_sentral_ids())
      AND hendelser.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

-- =============================================
-- STEP 4: Drop ALL policies on hendelsesoppdateringer
-- =============================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hendelsesoppdateringer'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.hendelsesoppdateringer', pol.policyname);
  END LOOP;
END $$;

-- =============================================
-- STEP 5: Create hendelsesoppdateringer policies
-- =============================================

CREATE POLICY "Anyone can read oppdateringer"
  ON public.hendelsesoppdateringer FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage oppdateringer"
  ON public.hendelsesoppdateringer FOR ALL
  USING (public.get_my_rolle() = 'admin')
  WITH CHECK (public.get_my_rolle() = 'admin');

CREATE POLICY "Operators can insert oppdateringer"
  ON public.hendelsesoppdateringer FOR INSERT
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM public.hendelser h
      JOIN public.sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

CREATE POLICY "Operators can update oppdateringer"
  ON public.hendelsesoppdateringer FOR UPDATE
  USING (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM public.hendelser h
      JOIN public.sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  )
  WITH CHECK (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM public.hendelser h
      JOIN public.sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );

CREATE POLICY "Operators can delete oppdateringer"
  ON public.hendelsesoppdateringer FOR DELETE
  USING (
    public.get_my_rolle() IN ('operator', '110-admin')
    AND EXISTS (
      SELECT 1 FROM public.hendelser h
      JOIN public.sentraler s ON s.id = ANY(public.get_my_sentral_ids())
      WHERE h.id = hendelsesoppdateringer.hendelse_id
      AND h.brannvesen_id = ANY(s.brannvesen_ids)
    )
  );
