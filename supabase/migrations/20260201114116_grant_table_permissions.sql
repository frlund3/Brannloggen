-- Grant table-level permissions to anon and authenticated roles.
-- Without these, PostgREST returns 403 even when RLS policies allow the operation.
-- Supabase requires explicit GRANTs for the API to work.

-- Reference tables: read-only for everyone
GRANT SELECT ON public.fylker TO anon, authenticated;
GRANT SELECT ON public.kommuner TO anon, authenticated;
GRANT SELECT ON public.brannvesen TO anon, authenticated;
GRANT SELECT ON public.kategorier TO anon, authenticated;
GRANT SELECT ON public.sentraler TO anon, authenticated;

-- Admin write on reference tables
GRANT INSERT, UPDATE, DELETE ON public.fylker TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kommuner TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brannvesen TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kategorier TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sentraler TO authenticated;

-- Hendelser: public read, authenticated write
GRANT SELECT ON public.hendelser TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hendelser TO authenticated;

-- Hendelsesoppdateringer: public read, authenticated write
GRANT SELECT ON public.hendelsesoppdateringer TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hendelsesoppdateringer TO authenticated;

-- Hendelsesbilder: public read, authenticated write
GRANT SELECT ON public.hendelsesbilder TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hendelsesbilder TO authenticated;

-- Interne notater: authenticated only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interne_notater TO authenticated;

-- Brukerprofiler: authenticated read/write
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brukerprofiler TO authenticated;

-- Bruker følger: authenticated
GRANT SELECT, INSERT, DELETE ON public.bruker_følger TO authenticated;

-- Push preferanser: authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_preferanser TO authenticated;

-- Audit log: authenticated read (insert via trigger)
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;

-- Push abonnenter: everyone can read/write (for web push subscriptions)
GRANT SELECT, INSERT, UPDATE ON public.push_abonnenter TO anon, authenticated;
GRANT DELETE ON public.push_abonnenter TO authenticated;

-- Presse soknader: anon can insert, authenticated can manage
GRANT INSERT ON public.presse_soknader TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.presse_soknader TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant execute on our security definer functions
GRANT EXECUTE ON FUNCTION public.get_my_rolle() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_sentral_ids() TO anon, authenticated;
