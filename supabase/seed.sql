-- Seed data for Brannloggen
-- Reference data for Norwegian fire department incident logging system
-- Generated from static TypeScript data files

-- ============================================================================
-- 0. Create missing tables / update schema if needed
-- ============================================================================

-- Sentraler table (may not exist in older deployments)
CREATE TABLE IF NOT EXISTS sentraler (
  id TEXT PRIMARY KEY,
  navn TEXT NOT NULL,
  kort_navn TEXT NOT NULL,
  fylke_ids TEXT[] NOT NULL DEFAULT '{}',
  brannvesen_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sentraler
ALTER TABLE sentraler ENABLE ROW LEVEL SECURITY;

-- RLS policies (use DO block to avoid errors if they already exist)
DO $$ BEGIN
  CREATE POLICY "Anyone can read sentraler" ON sentraler FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage sentraler" ON sentraler FOR ALL USING (
    EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update brukerprofiler role check if needed (add 110-admin and presse)
-- This is safe to re-run - it drops and recreates the constraint
DO $$ BEGIN
  ALTER TABLE brukerprofiler DROP CONSTRAINT IF EXISTS brukerprofiler_rolle_check;
  ALTER TABLE brukerprofiler ADD CONSTRAINT brukerprofiler_rolle_check
    CHECK (rolle IN ('admin', '110-admin', 'operator', 'presse', 'public'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add sentral_ids column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE brukerprofiler ADD COLUMN IF NOT EXISTS sentral_ids TEXT[] NOT NULL DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add epost column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE brukerprofiler ADD COLUMN IF NOT EXISTS epost TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update hendelser status check to include 'deaktivert'
DO $$ BEGIN
  ALTER TABLE hendelser DROP CONSTRAINT IF EXISTS hendelser_status_check;
  ALTER TABLE hendelser ADD CONSTRAINT hendelser_status_check
    CHECK (status IN ('pågår', 'avsluttet', 'deaktivert'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add presse_tekst column for dedicated press messages on incidents
DO $$ BEGIN
  ALTER TABLE hendelser ADD COLUMN presse_tekst TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Make opprettet_av nullable so we can seed demo hendelser without auth users
DO $$ BEGIN
  ALTER TABLE hendelser ALTER COLUMN opprettet_av DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE hendelsesoppdateringer ALTER COLUMN opprettet_av DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Push abonnenter table (anonymous device push subscribers)
CREATE TABLE IF NOT EXISTS push_abonnenter (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('iOS', 'Android', 'Web')),
  push_token TEXT NOT NULL,
  push_aktiv BOOLEAN DEFAULT TRUE,
  sentral_ids TEXT[] DEFAULT '{}',
  fylke_ids TEXT[] DEFAULT '{}',
  kategori_ids TEXT[] DEFAULT '{}',
  kun_pågående BOOLEAN DEFAULT FALSE,
  registrert TIMESTAMPTZ DEFAULT NOW(),
  sist_aktiv TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_abonnenter ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read push_abonnenter" ON push_abonnenter FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage push_abonnenter" ON push_abonnenter FOR ALL USING (
    EXISTS (SELECT 1 FROM brukerprofiler WHERE user_id = auth.uid() AND rolle IN ('admin', '110-admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. Fylker (15 rows)
-- ============================================================================
INSERT INTO fylker (id, navn, nummer) VALUES
  ('f-03', 'Oslo', '03'),
  ('f-11', 'Rogaland', '11'),
  ('f-15', 'Møre og Romsdal', '15'),
  ('f-18', 'Nordland', '18'),
  ('f-31', 'Østfold', '31'),
  ('f-32', 'Akershus', '32'),
  ('f-33', 'Buskerud', '33'),
  ('f-34', 'Innlandet', '34'),
  ('f-39', 'Vestfold', '39'),
  ('f-40', 'Telemark', '40'),
  ('f-42', 'Agder', '42'),
  ('f-46', 'Vestland', '46'),
  ('f-50', 'Trøndelag', '50'),
  ('f-55', 'Troms', '55'),
  ('f-56', 'Finnmark', '56')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. Sentraler (12 rows)
-- ============================================================================
INSERT INTO sentraler (id, navn, kort_navn, fylke_ids, brannvesen_ids) VALUES
  ('s-finnmark', 'Finnmark 110-sentral', 'Finnmark 110', ARRAY['f-56'], ARRAY[]::text[]),
  ('s-troms', 'Tromsø, 110-sentral', 'Tromsø 110', ARRAY['f-55'], ARRAY[]::text[]),
  ('s-nordland', 'Salten Brann IKS (110 Nordland)', '110 Nordland', ARRAY['f-18'], ARRAY[]::text[]),
  ('s-trondelag', 'Midt-Norge 110-sentral IKS', 'Midt-Norge 110', ARRAY['f-50'], ARRAY['bv-trondheim']),
  ('s-more', 'Møre og Romsdal 110-sentral Ålesund KF', 'MR 110 Ålesund', ARRAY['f-15'], ARRAY[]::text[]),
  ('s-vestland', '110 Vest (Bergen brannvesen)', '110 Vest', ARRAY['f-46'], ARRAY['bv-bergen']),
  ('s-rogaland', '110 Sør-Vest IKS', '110 Sør-Vest', ARRAY['f-11'], ARRAY[]::text[]),
  ('s-agder', '110 Agder IKS', '110 Agder', ARRAY['f-42'], ARRAY['bv-kristiansand']),
  ('s-sorost', 'Sørøst 110 IKS', 'Sørøst 110', ARRAY['f-39', 'f-40', 'f-33'], ARRAY['bv-vestfold', 'bv-sandefjord', 'bv-larvik', 'bv-drammen', 'bv-kongsberg', 'bv-ringerike', 'bv-modum', 'bv-hallingdal', 'bv-sigdal', 'bv-numedal']),
  ('s-oslo', 'Oslo brann- og redningsetat (110 Oslo)', '110 Oslo', ARRAY['f-03'], ARRAY['bv-oslo']),
  ('s-ost', 'Øst 110-sentral IKS', 'Øst 110', ARRAY['f-32', 'f-31'], ARRAY['bv-asker', 'bv-nedre-romerike', 'bv-ovre-romerike', 'bv-nordre-follo', 'bv-nesodden', 'bv-frogn', 'bv-follo', 'bv-aurskog', 'bv-nittedal', 'bv-fredrikstad', 'bv-sarpsborg', 'bv-halden', 'bv-moss', 'bv-indre-ostfold']),
  ('s-innlandet', 'Alarmsentral Brann Innlandet IKS', 'Innlandet 110', ARRAY['f-34'], ARRAY['bv-hamar', 'bv-ringsaker', 'bv-lillehammer', 'bv-gjovik', 'bv-kongsvinger', 'bv-elverum', 'bv-trysil', 'bv-nord-osterdal', 'bv-midt-hedmark', 'bv-midt-gudbrandsdal', 'bv-nord-gudbrandsdal', 'bv-valdres', 'bv-land'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Kategorier (57 rows)
-- ============================================================================
INSERT INTO kategorier (id, navn, ikon, farge, beskrivelse) VALUES
  ('kat-aba', 'ABA (Automatisk Brannalarm)', 'Bell', '#9CA3AF', 'Automatisk brannalarm utløst'),
  ('kat-andre-oppdrag', 'Andre oppdrag/assistanse', 'Wrench', '#475569', 'Andre oppdrag og assistanse'),
  ('kat-beredskap', 'Beredskap', 'Shield', '#1D4ED8', 'Beredskapsoppdrag'),
  ('kat-bergning', 'Bergning/innatauing', 'Truck', '#6366F1', 'Bergning eller innatauing av kjøretøy'),
  ('kat-bistand-andre', 'Bistand andre', 'Handshake', '#0891B2', 'Bistand til andre etater'),
  ('kat-bistand-politi-akutt', 'Bistand politi - Akutt', 'Siren', '#7C3AED', 'Akutt bistand til politi'),
  ('kat-bistand-politi-ikke-akutt', 'Bistand politi - Ikke akutt', 'Shield', '#8B5CF6', 'Ikke-akutt bistand til politi'),
  ('kat-brann-annet', 'Brann annet', 'Flame', '#F59E0B', 'Brann i container, avfall eller annet'),
  ('kat-brann-gjenoppblussing', 'Brann gjenoppblussing', 'Flame', '#EA580C', 'Gjenoppblussing etter tidligere brann'),
  ('kat-brann-bygning', 'Brann i bygning', 'Flame', '#DC2626', 'Brann i bolig, næringsbygg eller annen bygning'),
  ('kat-brann-bat', 'Brann i Båt', 'Flame', '#B91C1C', 'Brann i båt eller fartøy'),
  ('kat-brann-gress', 'Brann i gress/lyng', 'Flame', '#D97706', 'Brann i gress, lyng eller kratt'),
  ('kat-brann-kjøretøy', 'Brann i kjøretøy', 'Car', '#EA580C', 'Brann i bil, buss, lastebil eller annet kjøretøy'),
  ('kat-brann-luftfartøy', 'Brann i luftfartøy', 'Plane', '#DC2626', 'Brann i fly eller helikopter'),
  ('kat-brann-skorstein', 'Brann i skorstein', 'Flame', '#B45309', 'Brann i skorstein eller pipe'),
  ('kat-brann-skog', 'Brann i skog', 'TreePine', '#D97706', 'Brann i skog eller utmark'),
  ('kat-brann-bane', 'Brann i bane', 'Flame', '#DC2626', 'Brann på jernbane eller T-bane'),
  ('kat-brann-tog', 'Brann i tog', 'Train', '#DC2626', 'Brann i tog'),
  ('kat-brann-trikk', 'Brann i trikk', 'Train', '#DC2626', 'Brann i trikk'),
  ('kat-cbrne', 'CBRNE', 'Biohazard', '#E11D48', 'Kjemisk, biologisk, radiologisk, nukleær eller eksplosiv hendelse'),
  ('kat-cbrne-sjø', 'CBRNE sjø', 'Biohazard', '#BE123C', 'CBRNE-hendelse på sjø'),
  ('kat-kjøretøy-vann', 'Kjøretøy i vann', 'Car', '#0891B2', 'Kjøretøy havnet i vann'),
  ('kat-dyreoppdrag', 'Dyreoppdrag', 'Bug', '#65A30D', 'Redning eller assistanse med dyr'),
  ('kat-ecall', 'eCall', 'Phone', '#6366F1', 'Automatisk nødanrop fra kjøretøy'),
  ('kat-eksplosjon', 'Eksplosjon', 'AlertTriangle', '#DC2626', 'Eksplosjon'),
  ('kat-forurensning', 'Forurensning', 'Biohazard', '#4F46E5', 'Oljeutslipp, kjemikalieutslipp eller annen forurensning'),
  ('kat-heisalarm', 'Heisalarm', 'ArrowUpDown', '#475569', 'Person fast i heis'),
  ('kat-helseoppdrag-akutt', 'Helseoppdrag - Akutt', 'Heart', '#E11D48', 'Akutt helseoppdrag, førsteinnsats'),
  ('kat-helseoppdrag-ikke-akutt', 'Helseoppdrag - Ikke Akutt', 'Heart', '#F43F5E', 'Ikke-akutt helseoppdrag'),
  ('kat-hendelse-tunnel', 'Hendelse i tunnel', 'AlertTriangle', '#7C3AED', 'Hendelse i tunnel'),
  ('kat-hendelse-vann', 'Hendelse på vann', 'Waves', '#0891B2', 'Hendelse på vann eller sjø'),
  ('kat-innbruddsalarm', 'Innbruddsalarm', 'ShieldAlert', '#6B7280', 'Innbruddsalarm utløst'),
  ('kat-kontroll', 'Kontroll etter henvendelse', 'Search', '#2563EB', 'Kontroll etter henvendelse eller melding'),
  ('kat-naturhendelse', 'Naturhendelse', 'CloudLightning', '#7C3AED', 'Flom, storm eller annen naturhendelse'),
  ('kat-naturhendelse-skred', 'Naturhendelse skred/ras', 'Mountain', '#6D28D9', 'Jordskred, steinras, snøskred'),
  ('kat-overflateredning', 'Overflateredning', 'LifeBuoy', '#0D9488', 'Redning fra overflate på vann'),
  ('kat-rits', 'RITS', 'Anchor', '#1E40AF', 'Redningsinnsats til sjøs'),
  ('kat-restverdiredning', 'Restverdiredning', 'ShieldCheck', '#1D4ED8', 'Sikring av restverdier etter hendelse'),
  ('kat-røykvarsler', 'Røykvarsler', 'Bell', '#9CA3AF', 'Røykvarsler utløst'),
  ('kat-tauredning', 'Tauredning', 'LifeBuoy', '#059669', 'Redning med tau fra høyde eller dybde'),
  ('kat-trafikkulykke', 'Trafikkulykke', 'CarFront', '#7C3AED', 'Trafikkulykke med personskade'),
  ('kat-trafikkuhell', 'Trafikkuhell', 'Car', '#8B5CF6', 'Trafikkuhell uten alvorlig personskade'),
  ('kat-ulykke-luftfartøy', 'Ulykke luftfartøy', 'Plane', '#DC2626', 'Ulykke med fly eller helikopter'),
  ('kat-ulykke-bane', 'Ulykke bane', 'Train', '#7C3AED', 'Ulykke på jernbane eller T-bane'),
  ('kat-ulykke-redning', 'Ulykke/Redning', 'LifeBuoy', '#0D9488', 'Ulykke eller redningsoppdrag'),
  ('kat-øvelser', 'Øvelser brannvesen', 'ClipboardCheck', '#65A30D', 'Planlagte øvelser for brannvesen'),
  ('kat-person-elv', 'Person i elv', 'Waves', '#0891B2', 'Person havnet i elv'),
  ('kat-person-vann', 'Person i vann', 'Waves', '#0E7490', 'Person havnet i vann'),
  ('kat-person-vann-ubekreftet', 'Person i vann ubekreftet', 'Waves', '#155E75', 'Ubekreftet melding om person i vann'),
  ('kat-ulykke-tog', 'Ulykke tog', 'Train', '#7C3AED', 'Ulykke med tog'),
  ('kat-ulykke-trikk', 'Ulykke trikk', 'Train', '#7C3AED', 'Ulykke med trikk'),
  ('kat-mistenkelig-røyk', 'Mistenkelig røyk/lukt', 'Cloud', '#6B7280', 'Melding om mistenkelig røyk eller lukt'),
  ('kat-vannlekkasje', 'Vannlekkasje utvendig', 'Droplets', '#0284C7', 'Utvendig vannlekkasje'),
  ('kat-luftsportulykke', 'Luftsportulykke', 'Plane', '#DC2626', 'Ulykke med paraglider, hangglider eller lignende'),
  ('kat-person-under-vann', 'Person under vann', 'Waves', '#164E63', 'Person under vann, dykkerulykke'),
  ('kat-person-overflaten', 'Person i overflaten', 'Waves', '#0891B2', 'Person observert i vannoverflaten'),
  ('kat-bygningskollaps', 'Bygningskollaps', 'AlertTriangle', '#DC2626', 'Hel eller delvis kollaps av bygning')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Kommuner (355 rows)
-- ============================================================================
INSERT INTO kommuner (id, navn, nummer, fylke_id) VALUES
  -- Oslo (03)
  ('k-0301', 'Oslo', '0301', 'f-03'),

  -- Rogaland (11)
  ('k-1101', 'Eigersund', '1101', 'f-11'),
  ('k-1103', 'Stavanger', '1103', 'f-11'),
  ('k-1106', 'Haugesund', '1106', 'f-11'),
  ('k-1108', 'Sandnes', '1108', 'f-11'),
  ('k-1111', 'Sokndal', '1111', 'f-11'),
  ('k-1112', 'Lund', '1112', 'f-11'),
  ('k-1114', 'Bjerkreim', '1114', 'f-11'),
  ('k-1119', 'Hå', '1119', 'f-11'),
  ('k-1120', 'Klepp', '1120', 'f-11'),
  ('k-1121', 'Time', '1121', 'f-11'),
  ('k-1122', 'Gjesdal', '1122', 'f-11'),
  ('k-1124', 'Sola', '1124', 'f-11'),
  ('k-1127', 'Randaberg', '1127', 'f-11'),
  ('k-1130', 'Strand', '1130', 'f-11'),
  ('k-1133', 'Hjelmeland', '1133', 'f-11'),
  ('k-1134', 'Suldal', '1134', 'f-11'),
  ('k-1135', 'Sauda', '1135', 'f-11'),
  ('k-1144', 'Kvitsøy', '1144', 'f-11'),
  ('k-1145', 'Bokn', '1145', 'f-11'),
  ('k-1146', 'Tysvær', '1146', 'f-11'),
  ('k-1149', 'Karmøy', '1149', 'f-11'),
  ('k-1151', 'Utsira', '1151', 'f-11'),
  ('k-1160', 'Vindafjord', '1160', 'f-11'),

  -- Møre og Romsdal (15)
  ('k-1505', 'Kristiansund', '1505', 'f-15'),
  ('k-1506', 'Molde', '1506', 'f-15'),
  ('k-1508', 'Ålesund', '1508', 'f-15'),
  ('k-1511', 'Vanylven', '1511', 'f-15'),
  ('k-1514', 'Sande', '1514', 'f-15'),
  ('k-1515', 'Herøy', '1515', 'f-15'),
  ('k-1516', 'Ulstein', '1516', 'f-15'),
  ('k-1517', 'Hareid', '1517', 'f-15'),
  ('k-1520', 'Ørsta', '1520', 'f-15'),
  ('k-1525', 'Stranda', '1525', 'f-15'),
  ('k-1528', 'Sykkylven', '1528', 'f-15'),
  ('k-1531', 'Sula', '1531', 'f-15'),
  ('k-1532', 'Giske', '1532', 'f-15'),
  ('k-1535', 'Vestnes', '1535', 'f-15'),
  ('k-1539', 'Rauma', '1539', 'f-15'),
  ('k-1547', 'Aukra', '1547', 'f-15'),
  ('k-1554', 'Averøy', '1554', 'f-15'),
  ('k-1557', 'Gjemnes', '1557', 'f-15'),
  ('k-1560', 'Tingvoll', '1560', 'f-15'),
  ('k-1563', 'Sunndal', '1563', 'f-15'),
  ('k-1566', 'Surnadal', '1566', 'f-15'),
  ('k-1573', 'Smøla', '1573', 'f-15'),
  ('k-1576', 'Aure', '1576', 'f-15'),
  ('k-1577', 'Volda', '1577', 'f-15'),
  ('k-1578', 'Fjord', '1578', 'f-15'),
  ('k-1579', 'Hustadvika', '1579', 'f-15'),

  -- Nordland (18)
  ('k-1804', 'Bodø', '1804', 'f-18'),
  ('k-1806', 'Narvik', '1806', 'f-18'),
  ('k-1811', 'Bindal', '1811', 'f-18'),
  ('k-1812', 'Sømna', '1812', 'f-18'),
  ('k-1813', 'Brønnøy', '1813', 'f-18'),
  ('k-1815', 'Vega', '1815', 'f-18'),
  ('k-1816', 'Vevelstad', '1816', 'f-18'),
  ('k-1818', 'Herøy', '1818', 'f-18'),
  ('k-1820', 'Alstahaug', '1820', 'f-18'),
  ('k-1822', 'Leirfjord', '1822', 'f-18'),
  ('k-1824', 'Vefsn', '1824', 'f-18'),
  ('k-1825', 'Grane', '1825', 'f-18'),
  ('k-1826', 'Hattfjelldal', '1826', 'f-18'),
  ('k-1827', 'Dønna', '1827', 'f-18'),
  ('k-1828', 'Nesna', '1828', 'f-18'),
  ('k-1832', 'Hemnes', '1832', 'f-18'),
  ('k-1833', 'Rana', '1833', 'f-18'),
  ('k-1834', 'Lurøy', '1834', 'f-18'),
  ('k-1835', 'Træna', '1835', 'f-18'),
  ('k-1836', 'Rødøy', '1836', 'f-18'),
  ('k-1837', 'Meløy', '1837', 'f-18'),
  ('k-1838', 'Gildeskål', '1838', 'f-18'),
  ('k-1839', 'Beiarn', '1839', 'f-18'),
  ('k-1840', 'Saltdal', '1840', 'f-18'),
  ('k-1841', 'Fauske', '1841', 'f-18'),
  ('k-1845', 'Sørfold', '1845', 'f-18'),
  ('k-1848', 'Steigen', '1848', 'f-18'),
  ('k-1851', 'Lødingen', '1851', 'f-18'),
  ('k-1853', 'Evenes', '1853', 'f-18'),
  ('k-1856', 'Røst', '1856', 'f-18'),
  ('k-1857', 'Værøy', '1857', 'f-18'),
  ('k-1859', 'Flakstad', '1859', 'f-18'),
  ('k-1860', 'Vestvågøy', '1860', 'f-18'),
  ('k-1865', 'Vågan', '1865', 'f-18'),
  ('k-1866', 'Hadsel', '1866', 'f-18'),
  ('k-1867', 'Bø', '1867', 'f-18'),
  ('k-1868', 'Øksnes', '1868', 'f-18'),
  ('k-1870', 'Sortland', '1870', 'f-18'),
  ('k-1871', 'Andøy', '1871', 'f-18'),
  ('k-1874', 'Moskenes', '1874', 'f-18'),
  ('k-1875', 'Hamarøy', '1875', 'f-18'),

  -- Østfold (31)
  ('k-3101', 'Halden', '3101', 'f-31'),
  ('k-3103', 'Moss', '3103', 'f-31'),
  ('k-3105', 'Sarpsborg', '3105', 'f-31'),
  ('k-3107', 'Fredrikstad', '3107', 'f-31'),
  ('k-3110', 'Hvaler', '3110', 'f-31'),
  ('k-3112', 'Råde', '3112', 'f-31'),
  ('k-3114', 'Våler', '3114', 'f-31'),
  ('k-3116', 'Skiptvet', '3116', 'f-31'),
  ('k-3118', 'Indre Østfold', '3118', 'f-31'),
  ('k-3120', 'Rakkestad', '3120', 'f-31'),
  ('k-3122', 'Marker', '3122', 'f-31'),
  ('k-3124', 'Aremark', '3124', 'f-31'),

  -- Akershus (32)
  ('k-3201', 'Bærum', '3201', 'f-32'),
  ('k-3203', 'Asker', '3203', 'f-32'),
  ('k-3205', 'Lillestrøm', '3205', 'f-32'),
  ('k-3207', 'Nordre Follo', '3207', 'f-32'),
  ('k-3209', 'Ullensaker', '3209', 'f-32'),
  ('k-3212', 'Nesodden', '3212', 'f-32'),
  ('k-3214', 'Frogn', '3214', 'f-32'),
  ('k-3216', 'Vestby', '3216', 'f-32'),
  ('k-3218', 'Ås', '3218', 'f-32'),
  ('k-3220', 'Enebakk', '3220', 'f-32'),
  ('k-3222', 'Lørenskog', '3222', 'f-32'),
  ('k-3224', 'Rælingen', '3224', 'f-32'),
  ('k-3226', 'Aurskog-Høland', '3226', 'f-32'),
  ('k-3228', 'Nes', '3228', 'f-32'),
  ('k-3230', 'Gjerdrum', '3230', 'f-32'),
  ('k-3232', 'Nannestad', '3232', 'f-32'),
  ('k-3234', 'Eidsvoll', '3234', 'f-32'),
  ('k-3236', 'Hurdal', '3236', 'f-32'),
  ('k-3238', 'Nittedal', '3238', 'f-32'),
  ('k-3240', 'Lunner', '3240', 'f-32'),
  ('k-3242', 'Jevnaker', '3242', 'f-32'),

  -- Buskerud (33)
  ('k-3301', 'Drammen', '3301', 'f-33'),
  ('k-3303', 'Kongsberg', '3303', 'f-33'),
  ('k-3305', 'Ringerike', '3305', 'f-33'),
  ('k-3310', 'Hole', '3310', 'f-33'),
  ('k-3312', 'Lier', '3312', 'f-33'),
  ('k-3314', 'Øvre Eiker', '3314', 'f-33'),
  ('k-3316', 'Modum', '3316', 'f-33'),
  ('k-3318', 'Krødsherad', '3318', 'f-33'),
  ('k-3320', 'Flå', '3320', 'f-33'),
  ('k-3322', 'Nesbyen', '3322', 'f-33'),
  ('k-3324', 'Gol', '3324', 'f-33'),
  ('k-3326', 'Hemsedal', '3326', 'f-33'),
  ('k-3328', 'Ål', '3328', 'f-33'),
  ('k-3330', 'Hol', '3330', 'f-33'),
  ('k-3332', 'Sigdal', '3332', 'f-33'),
  ('k-3334', 'Flesberg', '3334', 'f-33'),
  ('k-3336', 'Rollag', '3336', 'f-33'),
  ('k-3338', 'Nore og Uvdal', '3338', 'f-33'),

  -- Innlandet (34)
  ('k-3401', 'Kongsvinger', '3401', 'f-34'),
  ('k-3403', 'Hamar', '3403', 'f-34'),
  ('k-3405', 'Lillehammer', '3405', 'f-34'),
  ('k-3407', 'Gjøvik', '3407', 'f-34'),
  ('k-3411', 'Ringsaker', '3411', 'f-34'),
  ('k-3412', 'Løten', '3412', 'f-34'),
  ('k-3413', 'Stange', '3413', 'f-34'),
  ('k-3414', 'Nord-Odal', '3414', 'f-34'),
  ('k-3415', 'Sør-Odal', '3415', 'f-34'),
  ('k-3416', 'Eidskog', '3416', 'f-34'),
  ('k-3417', 'Grue', '3417', 'f-34'),
  ('k-3418', 'Åsnes', '3418', 'f-34'),
  ('k-3419', 'Våler', '3419', 'f-34'),
  ('k-3420', 'Elverum', '3420', 'f-34'),
  ('k-3421', 'Trysil', '3421', 'f-34'),
  ('k-3422', 'Åmot', '3422', 'f-34'),
  ('k-3423', 'Stor-Elvdal', '3423', 'f-34'),
  ('k-3424', 'Rendalen', '3424', 'f-34'),
  ('k-3425', 'Engerdal', '3425', 'f-34'),
  ('k-3426', 'Tolga', '3426', 'f-34'),
  ('k-3427', 'Tynset', '3427', 'f-34'),
  ('k-3428', 'Alvdal', '3428', 'f-34'),
  ('k-3429', 'Folldal', '3429', 'f-34'),
  ('k-3430', 'Os', '3430', 'f-34'),
  ('k-3431', 'Dovre', '3431', 'f-34'),
  ('k-3432', 'Lesja', '3432', 'f-34'),
  ('k-3433', 'Skjåk', '3433', 'f-34'),
  ('k-3434', 'Lom', '3434', 'f-34'),
  ('k-3435', 'Vågå', '3435', 'f-34'),
  ('k-3436', 'Nord-Fron', '3436', 'f-34'),
  ('k-3437', 'Sel', '3437', 'f-34'),
  ('k-3438', 'Sør-Fron', '3438', 'f-34'),
  ('k-3439', 'Ringebu', '3439', 'f-34'),
  ('k-3440', 'Øyer', '3440', 'f-34'),
  ('k-3441', 'Gausdal', '3441', 'f-34'),
  ('k-3442', 'Østre Toten', '3442', 'f-34'),
  ('k-3443', 'Vestre Toten', '3443', 'f-34'),
  ('k-3446', 'Gran', '3446', 'f-34'),
  ('k-3447', 'Søndre Land', '3447', 'f-34'),
  ('k-3448', 'Nordre Land', '3448', 'f-34'),
  ('k-3449', 'Sør-Aurdal', '3449', 'f-34'),
  ('k-3450', 'Etnedal', '3450', 'f-34'),
  ('k-3451', 'Nord-Aurdal', '3451', 'f-34'),
  ('k-3452', 'Vestre Slidre', '3452', 'f-34'),
  ('k-3453', 'Øystre Slidre', '3453', 'f-34'),
  ('k-3454', 'Vang', '3454', 'f-34'),

  -- Vestfold (39)
  ('k-3901', 'Horten', '3901', 'f-39'),
  ('k-3903', 'Holmestrand', '3903', 'f-39'),
  ('k-3905', 'Tønsberg', '3905', 'f-39'),
  ('k-3907', 'Sandefjord', '3907', 'f-39'),
  ('k-3909', 'Larvik', '3909', 'f-39'),
  ('k-3911', 'Færder', '3911', 'f-39'),

  -- Telemark (40)
  ('k-4001', 'Porsgrunn', '4001', 'f-40'),
  ('k-4003', 'Skien', '4003', 'f-40'),
  ('k-4005', 'Notodden', '4005', 'f-40'),
  ('k-4010', 'Siljan', '4010', 'f-40'),
  ('k-4012', 'Bamble', '4012', 'f-40'),
  ('k-4014', 'Kragerø', '4014', 'f-40'),
  ('k-4016', 'Drangedal', '4016', 'f-40'),
  ('k-4018', 'Nome', '4018', 'f-40'),
  ('k-4020', 'Midt-Telemark', '4020', 'f-40'),
  ('k-4022', 'Seljord', '4022', 'f-40'),
  ('k-4024', 'Hjartdal', '4024', 'f-40'),
  ('k-4026', 'Tinn', '4026', 'f-40'),
  ('k-4028', 'Kviteseid', '4028', 'f-40'),
  ('k-4030', 'Nissedal', '4030', 'f-40'),
  ('k-4032', 'Fyresdal', '4032', 'f-40'),
  ('k-4034', 'Tokke', '4034', 'f-40'),
  ('k-4036', 'Vinje', '4036', 'f-40'),

  -- Agder (42)
  ('k-4201', 'Risør', '4201', 'f-42'),
  ('k-4202', 'Grimstad', '4202', 'f-42'),
  ('k-4203', 'Arendal', '4203', 'f-42'),
  ('k-4204', 'Kristiansand', '4204', 'f-42'),
  ('k-4205', 'Lindesnes', '4205', 'f-42'),
  ('k-4206', 'Farsund', '4206', 'f-42'),
  ('k-4207', 'Flekkefjord', '4207', 'f-42'),
  ('k-4211', 'Gjerstad', '4211', 'f-42'),
  ('k-4212', 'Vegårshei', '4212', 'f-42'),
  ('k-4213', 'Tvedestrand', '4213', 'f-42'),
  ('k-4214', 'Froland', '4214', 'f-42'),
  ('k-4215', 'Lillesand', '4215', 'f-42'),
  ('k-4216', 'Birkenes', '4216', 'f-42'),
  ('k-4217', 'Åmli', '4217', 'f-42'),
  ('k-4218', 'Iveland', '4218', 'f-42'),
  ('k-4219', 'Evje og Hornnes', '4219', 'f-42'),
  ('k-4220', 'Bygland', '4220', 'f-42'),
  ('k-4221', 'Valle', '4221', 'f-42'),
  ('k-4222', 'Bykle', '4222', 'f-42'),
  ('k-4223', 'Vennesla', '4223', 'f-42'),
  ('k-4224', 'Åseral', '4224', 'f-42'),
  ('k-4225', 'Lyngdal', '4225', 'f-42'),
  ('k-4226', 'Hægebostad', '4226', 'f-42'),
  ('k-4227', 'Kvinesdal', '4227', 'f-42'),
  ('k-4228', 'Sirdal', '4228', 'f-42'),

  -- Vestland (46)
  ('k-4601', 'Bergen', '4601', 'f-46'),
  ('k-4602', 'Kinn', '4602', 'f-46'),
  ('k-4611', 'Etne', '4611', 'f-46'),
  ('k-4612', 'Sveio', '4612', 'f-46'),
  ('k-4613', 'Bømlo', '4613', 'f-46'),
  ('k-4614', 'Stord', '4614', 'f-46'),
  ('k-4615', 'Fitjar', '4615', 'f-46'),
  ('k-4616', 'Tysnes', '4616', 'f-46'),
  ('k-4617', 'Kvinnherad', '4617', 'f-46'),
  ('k-4618', 'Ullensvang', '4618', 'f-46'),
  ('k-4619', 'Eidfjord', '4619', 'f-46'),
  ('k-4620', 'Ulvik', '4620', 'f-46'),
  ('k-4621', 'Voss', '4621', 'f-46'),
  ('k-4622', 'Kvam', '4622', 'f-46'),
  ('k-4623', 'Samnanger', '4623', 'f-46'),
  ('k-4624', 'Bjørnafjorden', '4624', 'f-46'),
  ('k-4625', 'Austevoll', '4625', 'f-46'),
  ('k-4626', 'Øygarden', '4626', 'f-46'),
  ('k-4627', 'Askøy', '4627', 'f-46'),
  ('k-4628', 'Vaksdal', '4628', 'f-46'),
  ('k-4629', 'Modalen', '4629', 'f-46'),
  ('k-4630', 'Osterøy', '4630', 'f-46'),
  ('k-4631', 'Alver', '4631', 'f-46'),
  ('k-4632', 'Austrheim', '4632', 'f-46'),
  ('k-4633', 'Fedje', '4633', 'f-46'),
  ('k-4634', 'Masfjorden', '4634', 'f-46'),
  ('k-4635', 'Gulen', '4635', 'f-46'),
  ('k-4636', 'Solund', '4636', 'f-46'),
  ('k-4637', 'Hyllestad', '4637', 'f-46'),
  ('k-4638', 'Høyanger', '4638', 'f-46'),
  ('k-4639', 'Vik', '4639', 'f-46'),
  ('k-4640', 'Sogndal', '4640', 'f-46'),
  ('k-4641', 'Aurland', '4641', 'f-46'),
  ('k-4642', 'Lærdal', '4642', 'f-46'),
  ('k-4643', 'Årdal', '4643', 'f-46'),
  ('k-4644', 'Luster', '4644', 'f-46'),
  ('k-4645', 'Askvoll', '4645', 'f-46'),
  ('k-4646', 'Fjaler', '4646', 'f-46'),
  ('k-4647', 'Sunnfjord', '4647', 'f-46'),
  ('k-4648', 'Bremanger', '4648', 'f-46'),
  ('k-4649', 'Stad', '4649', 'f-46'),
  ('k-4650', 'Gloppen', '4650', 'f-46'),
  ('k-4651', 'Stryn', '4651', 'f-46'),

  -- Trøndelag (50)
  ('k-5001', 'Trondheim', '5001', 'f-50'),
  ('k-5006', 'Steinkjer', '5006', 'f-50'),
  ('k-5007', 'Namsos', '5007', 'f-50'),
  ('k-5014', 'Frøya', '5014', 'f-50'),
  ('k-5020', 'Osen', '5020', 'f-50'),
  ('k-5021', 'Oppdal', '5021', 'f-50'),
  ('k-5022', 'Rennebu', '5022', 'f-50'),
  ('k-5025', 'Røros', '5025', 'f-50'),
  ('k-5026', 'Holtålen', '5026', 'f-50'),
  ('k-5027', 'Midtre Gauldal', '5027', 'f-50'),
  ('k-5028', 'Melhus', '5028', 'f-50'),
  ('k-5029', 'Skaun', '5029', 'f-50'),
  ('k-5031', 'Malvik', '5031', 'f-50'),
  ('k-5032', 'Selbu', '5032', 'f-50'),
  ('k-5033', 'Tydal', '5033', 'f-50'),
  ('k-5034', 'Meråker', '5034', 'f-50'),
  ('k-5035', 'Stjørdal', '5035', 'f-50'),
  ('k-5036', 'Frosta', '5036', 'f-50'),
  ('k-5037', 'Levanger', '5037', 'f-50'),
  ('k-5038', 'Verdal', '5038', 'f-50'),
  ('k-5041', 'Snåsa', '5041', 'f-50'),
  ('k-5042', 'Lierne', '5042', 'f-50'),
  ('k-5043', 'Røyrvik', '5043', 'f-50'),
  ('k-5044', 'Namsskogan', '5044', 'f-50'),
  ('k-5045', 'Grong', '5045', 'f-50'),
  ('k-5046', 'Høylandet', '5046', 'f-50'),
  ('k-5047', 'Overhalla', '5047', 'f-50'),
  ('k-5049', 'Flatanger', '5049', 'f-50'),
  ('k-5050', 'Leka', '5050', 'f-50'),
  ('k-5051', 'Inderøy', '5051', 'f-50'),
  ('k-5052', 'Indre Fosen', '5052', 'f-50'),
  ('k-5053', 'Heim', '5053', 'f-50'),
  ('k-5054', 'Hitra', '5054', 'f-50'),
  ('k-5055', 'Ørland', '5055', 'f-50'),
  ('k-5056', 'Åfjord', '5056', 'f-50'),
  ('k-5057', 'Orkland', '5057', 'f-50'),
  ('k-5058', 'Nærøysund', '5058', 'f-50'),

  -- Troms (55)
  ('k-5501', 'Tromsø', '5501', 'f-55'),
  ('k-5503', 'Harstad', '5503', 'f-55'),
  ('k-5510', 'Kvæfjord', '5510', 'f-55'),
  ('k-5512', 'Tjeldsund', '5512', 'f-55'),
  ('k-5514', 'Ibestad', '5514', 'f-55'),
  ('k-5516', 'Gratangen', '5516', 'f-55'),
  ('k-5518', 'Lavangen', '5518', 'f-55'),
  ('k-5520', 'Bardu', '5520', 'f-55'),
  ('k-5522', 'Salangen', '5522', 'f-55'),
  ('k-5524', 'Målselv', '5524', 'f-55'),
  ('k-5526', 'Sørreisa', '5526', 'f-55'),
  ('k-5528', 'Dyrøy', '5528', 'f-55'),
  ('k-5530', 'Senja', '5530', 'f-55'),
  ('k-5532', 'Balsfjord', '5532', 'f-55'),
  ('k-5534', 'Karlsøy', '5534', 'f-55'),
  ('k-5536', 'Lyngen', '5536', 'f-55'),
  ('k-5538', 'Storfjord', '5538', 'f-55'),
  ('k-5540', 'Kåfjord', '5540', 'f-55'),
  ('k-5542', 'Skjervøy', '5542', 'f-55'),
  ('k-5544', 'Nordreisa', '5544', 'f-55'),
  ('k-5546', 'Kvænangen', '5546', 'f-55'),

  -- Finnmark (56)
  ('k-5601', 'Alta', '5601', 'f-56'),
  ('k-5603', 'Hammerfest', '5603', 'f-56'),
  ('k-5605', 'Sør-Varanger', '5605', 'f-56'),
  ('k-5607', 'Vadsø', '5607', 'f-56'),
  ('k-5610', 'Karasjok', '5610', 'f-56'),
  ('k-5612', 'Kautokeino', '5612', 'f-56'),
  ('k-5614', 'Loppa', '5614', 'f-56'),
  ('k-5616', 'Hasvik', '5616', 'f-56'),
  ('k-5618', 'Måsøy', '5618', 'f-56'),
  ('k-5620', 'Nordkapp', '5620', 'f-56'),
  ('k-5622', 'Porsanger', '5622', 'f-56'),
  ('k-5624', 'Lebesby', '5624', 'f-56'),
  ('k-5626', 'Gamvik', '5626', 'f-56'),
  ('k-5628', 'Tana', '5628', 'f-56'),
  ('k-5630', 'Berlevåg', '5630', 'f-56'),
  ('k-5632', 'Båtsfjord', '5632', 'f-56'),
  ('k-5634', 'Vardø', '5634', 'f-56'),
  ('k-5636', 'Nesseby', '5636', 'f-56')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Brannvesen (144 rows)
-- ============================================================================
INSERT INTO brannvesen (id, navn, kort_navn, fylke_id, kommune_ids) VALUES
  -- Oslo / Akershus
  ('bv-oslo', 'Oslo brann- og redningsetat', 'Oslo brann', 'f-03', ARRAY['k-0301']),
  ('bv-asker', 'Asker og Bærum brann og redning IKS', 'Asker og Bærum brann', 'f-32', ARRAY['k-3201', 'k-3203']),
  ('bv-nedre-romerike', 'Nedre Romerike brann- og redningsvesen IKS', 'NRBR', 'f-32', ARRAY['k-3205', 'k-3222', 'k-3224', 'k-3228']),
  ('bv-ovre-romerike', 'Øvre Romerike brann og redning IKS', 'ØRBR', 'f-32', ARRAY['k-3209', 'k-3230', 'k-3232', 'k-3234', 'k-3236']),
  ('bv-nordre-follo', 'Nordre Follo brannvesen', 'Nordre Follo brann', 'f-32', ARRAY['k-3207']),
  ('bv-nesodden', 'Nesodden brann- og redningsvesen', 'Nesodden brann', 'f-32', ARRAY['k-3212']),
  ('bv-frogn', 'Frogn brannvesen', 'Frogn brann', 'f-32', ARRAY['k-3214']),
  ('bv-follo', 'Follo brannvesen IKS', 'Follo brann', 'f-32', ARRAY['k-3216', 'k-3218', 'k-3220']),
  ('bv-aurskog', 'Aurskog-Høland brannvesen', 'Aurskog-Høland brann', 'f-32', ARRAY['k-3226']),
  ('bv-nittedal', 'Nittedal brann- og redningsvesen', 'Nittedal brann', 'f-32', ARRAY['k-3238']),

  -- Østfold
  ('bv-fredrikstad', 'Fredrikstad brann- og redningskorps', 'Fredrikstad brann', 'f-31', ARRAY['k-3107', 'k-3110']),
  ('bv-sarpsborg', 'Sarpsborg brann- og feiervesen', 'Sarpsborg brann', 'f-31', ARRAY['k-3105']),
  ('bv-halden', 'Halden brannvesen', 'Halden brann', 'f-31', ARRAY['k-3101']),
  ('bv-moss', 'Moss brann og redning', 'Moss brann', 'f-31', ARRAY['k-3103', 'k-3112']),
  ('bv-indre-ostfold', 'Indre Østfold brann og redning IKS', 'Indre Østfold brann', 'f-31', ARRAY['k-3114', 'k-3116', 'k-3118', 'k-3120', 'k-3122', 'k-3124']),

  -- Buskerud
  ('bv-drammen', 'Drammensregionens brannvesen IKS', 'Drammen brann', 'f-33', ARRAY['k-3301', 'k-3312', 'k-3314']),
  ('bv-kongsberg', 'Kongsberg brann- og redningstjeneste', 'Kongsberg brann', 'f-33', ARRAY['k-3303']),
  ('bv-ringerike', 'Ringerike brann- og redningstjeneste', 'Ringerike brann', 'f-33', ARRAY['k-3305', 'k-3310']),
  ('bv-modum', 'Modum brann- og redningsvesen', 'Modum brann', 'f-33', ARRAY['k-3316', 'k-3318']),
  ('bv-hallingdal', 'Hallingdal brann- og redningsteneste IKS', 'Hallingdal brann', 'f-33', ARRAY['k-3320', 'k-3322', 'k-3324', 'k-3326', 'k-3328', 'k-3330']),
  ('bv-sigdal', 'Sigdal brannvesen', 'Sigdal brann', 'f-33', ARRAY['k-3332']),
  ('bv-numedal', 'Numedal brann- og redningsvesen', 'Numedal brann', 'f-33', ARRAY['k-3334', 'k-3336', 'k-3338']),

  -- Innlandet
  ('bv-hamar', 'Hamar brannvesen', 'Hamar brann', 'f-34', ARRAY['k-3403']),
  ('bv-ringsaker', 'Ringsaker brannvesen', 'Ringsaker brann', 'f-34', ARRAY['k-3411']),
  ('bv-lillehammer', 'Lillehammer region brannvesen', 'Lillehammer brann', 'f-34', ARRAY['k-3405', 'k-3440', 'k-3441']),
  ('bv-gjovik', 'Gjøvik brann og redning', 'Gjøvik brann', 'f-34', ARRAY['k-3407', 'k-3442', 'k-3443']),
  ('bv-kongsvinger', 'Kongsvinger brannvesen', 'Kongsvinger brann', 'f-34', ARRAY['k-3401', 'k-3414', 'k-3415', 'k-3416', 'k-3417']),
  ('bv-elverum', 'Elverum brann og redning', 'Elverum brann', 'f-34', ARRAY['k-3420', 'k-3412', 'k-3413']),
  ('bv-trysil', 'Trysil brannvesen', 'Trysil brann', 'f-34', ARRAY['k-3421', 'k-3425']),
  ('bv-nord-osterdal', 'Nord-Østerdal brann og redning IKS', 'Nord-Østerdal brann', 'f-34', ARRAY['k-3426', 'k-3427', 'k-3428', 'k-3429', 'k-3430']),
  ('bv-midt-hedmark', 'Midt-Hedmark brann- og redningsvesen IKS', 'Midt-Hedmark brann', 'f-34', ARRAY['k-3418', 'k-3419', 'k-3422', 'k-3423', 'k-3424']),
  ('bv-midt-gudbrandsdal', 'Midt-Gudbrandsdal brannvesen', 'Midt-Gudbrandsdal brann', 'f-34', ARRAY['k-3436', 'k-3437', 'k-3438', 'k-3439']),
  ('bv-nord-gudbrandsdal', 'Nord-Gudbrandsdal brannvesen', 'Nord-Gudbrandsdal brann', 'f-34', ARRAY['k-3431', 'k-3432', 'k-3433', 'k-3434', 'k-3435']),
  ('bv-valdres', 'Valdres brann- og redningstjeneste IKS', 'Valdres brann', 'f-34', ARRAY['k-3449', 'k-3450', 'k-3451', 'k-3452', 'k-3453', 'k-3454']),
  ('bv-land', 'Land brannvesen', 'Land brann', 'f-34', ARRAY['k-3446', 'k-3447', 'k-3448']),

  -- Vestfold
  ('bv-vestfold', 'Vestfold interkommunale brannvesen', 'VIB', 'f-39', ARRAY['k-3901', 'k-3903', 'k-3905', 'k-3911']),
  ('bv-sandefjord', 'Sandefjord brann- og redningsvesen', 'Sandefjord brann', 'f-39', ARRAY['k-3907']),
  ('bv-larvik', 'Larvik brannvesen', 'Larvik brann', 'f-39', ARRAY['k-3909']),

  -- Telemark
  ('bv-grenland', 'Grenland brann og redning IKS', 'Grenland brann', 'f-40', ARRAY['k-4001', 'k-4003', 'k-4010', 'k-4012']),
  ('bv-notodden', 'Notodden brann- og redningstjeneste', 'Notodden brann', 'f-40', ARRAY['k-4005', 'k-4024']),
  ('bv-kragerø', 'Kragerø brannvesen', 'Kragerø brann', 'f-40', ARRAY['k-4014', 'k-4016']),
  ('bv-midt-telemark', 'Midt-Telemark brannvesen', 'Midt-Telemark brann', 'f-40', ARRAY['k-4018', 'k-4020', 'k-4022']),
  ('bv-vest-telemark', 'Vest-Telemark brannvesen', 'Vest-Telemark brann', 'f-40', ARRAY['k-4026', 'k-4028', 'k-4030', 'k-4032', 'k-4034', 'k-4036']),

  -- Agder
  ('bv-kristiansand', 'Kristiansandsregionen brann og redning IKS', 'KBR', 'f-42', ARRAY['k-4204', 'k-4223', 'k-4215', 'k-4216', 'k-4202']),
  ('bv-arendal', 'Arendal brannvesen', 'Arendal brann', 'f-42', ARRAY['k-4203', 'k-4214']),
  ('bv-setesdal', 'Setesdal brannvesen IKS', 'Setesdal brann', 'f-42', ARRAY['k-4218', 'k-4219', 'k-4220', 'k-4221', 'k-4222']),
  ('bv-lister', 'Lister brannvesen', 'Lister brann', 'f-42', ARRAY['k-4206', 'k-4225', 'k-4226', 'k-4227', 'k-4228']),
  ('bv-flekkefjord', 'Flekkefjord brannvesen', 'Flekkefjord brann', 'f-42', ARRAY['k-4207']),
  ('bv-lindesnes', 'Lindesnes brannvesen', 'Lindesnes brann', 'f-42', ARRAY['k-4205', 'k-4224']),
  ('bv-risør', 'Risør brannvesen', 'Risør brann', 'f-42', ARRAY['k-4201', 'k-4211']),
  ('bv-tvedestrand', 'Tvedestrand brannvesen', 'Tvedestrand brann', 'f-42', ARRAY['k-4213', 'k-4212']),
  ('bv-amli', 'Åmli brannvesen', 'Åmli brann', 'f-42', ARRAY['k-4217']),
  ('bv-kvinesdal', 'Kvinesdal brannvesen', 'Kvinesdal brann', 'f-42', ARRAY['k-4227']),

  -- Rogaland
  ('bv-rogaland', 'Rogaland brann og redning IKS', 'RBR', 'f-11', ARRAY['k-1103', 'k-1108', 'k-1124', 'k-1127', 'k-1130', 'k-1122']),
  ('bv-haugesund', 'Haugesund brannvesen', 'Haugesund brann', 'f-11', ARRAY['k-1106']),
  ('bv-karmoy', 'Karmøy brann- og redningsvesen', 'Karmøy brann', 'f-11', ARRAY['k-1149']),
  ('bv-ha', 'Hå brannvesen', 'Hå brann', 'f-11', ARRAY['k-1119']),
  ('bv-klepp', 'Klepp brannvesen', 'Klepp brann', 'f-11', ARRAY['k-1120']),
  ('bv-time', 'Time brannvesen', 'Time brann', 'f-11', ARRAY['k-1121']),
  ('bv-eigersund', 'Eigersund brannvesen', 'Eigersund brann', 'f-11', ARRAY['k-1101', 'k-1111', 'k-1112', 'k-1114']),
  ('bv-tysvær', 'Tysvær brannvesen', 'Tysvær brann', 'f-11', ARRAY['k-1146', 'k-1145']),
  ('bv-vindafjord', 'Vindafjord brannvesen', 'Vindafjord brann', 'f-11', ARRAY['k-1160']),
  ('bv-ryfylke', 'Ryfylke brann- og redningsvesen', 'Ryfylke brann', 'f-11', ARRAY['k-1133', 'k-1134', 'k-1135']),
  ('bv-sauda', 'Sauda brannvesen', 'Sauda brann', 'f-11', ARRAY['k-1135']),

  -- Vestland
  ('bv-bergen', 'Bergen brannvesen', 'Bergen brann', 'f-46', ARRAY['k-4601']),
  ('bv-oygarden', 'Øygarden brann og redning', 'Øygarden brann', 'f-46', ARRAY['k-4626']),
  ('bv-askøy', 'Askøy brannvesen', 'Askøy brann', 'f-46', ARRAY['k-4627']),
  ('bv-nordhordland', 'Nordhordland brann og redning IKS', 'Nordhordland brann', 'f-46', ARRAY['k-4631', 'k-4632', 'k-4633', 'k-4634', 'k-4628', 'k-4629', 'k-4630']),
  ('bv-bjornafjorden', 'Bjørnafjorden brannvesen', 'Bjørnafjorden brann', 'f-46', ARRAY['k-4624', 'k-4623']),
  ('bv-sunnhordland', 'Sunnhordland brann og redning', 'Sunnhordland brann', 'f-46', ARRAY['k-4614', 'k-4615', 'k-4616', 'k-4613', 'k-4611', 'k-4612']),
  ('bv-hardanger', 'Hardanger brann og redning', 'Hardanger brann', 'f-46', ARRAY['k-4617', 'k-4618', 'k-4619', 'k-4620', 'k-4622']),
  ('bv-voss', 'Voss brann og redning', 'Voss brann', 'f-46', ARRAY['k-4621']),
  ('bv-sogndal', 'Sogn brann og redning IKS', 'Sogn brann', 'f-46', ARRAY['k-4640', 'k-4641', 'k-4642', 'k-4643', 'k-4644', 'k-4639']),
  ('bv-sunnfjord', 'Sunnfjord brannvesen', 'Sunnfjord brann', 'f-46', ARRAY['k-4647', 'k-4645', 'k-4646']),
  ('bv-kinn', 'Kinn brannvesen', 'Kinn brann', 'f-46', ARRAY['k-4602']),
  ('bv-nordfjord', 'Nordfjord brann og redning', 'Nordfjord brann', 'f-46', ARRAY['k-4649', 'k-4650', 'k-4651', 'k-4648']),
  ('bv-gulen', 'Gulen brannvesen', 'Gulen brann', 'f-46', ARRAY['k-4635', 'k-4636', 'k-4637', 'k-4638']),
  ('bv-austevoll', 'Austevoll brannvesen', 'Austevoll brann', 'f-46', ARRAY['k-4625']),

  -- Møre og Romsdal
  ('bv-alesund', 'Ålesund brannvesen', 'Ålesund brann', 'f-15', ARRAY['k-1508', 'k-1531', 'k-1532']),
  ('bv-molde', 'Molde brann- og redningstjeneste', 'Molde brann', 'f-15', ARRAY['k-1506', 'k-1547']),
  ('bv-kristiansund', 'Kristiansund brannvesen', 'Kristiansund brann', 'f-15', ARRAY['k-1505', 'k-1554', 'k-1557']),
  ('bv-orsta-volda', 'Ørsta/Volda brannvesen', 'Ørsta/Volda brann', 'f-15', ARRAY['k-1520', 'k-1577']),
  ('bv-ulstein', 'Ulstein brannvesen', 'Ulstein brann', 'f-15', ARRAY['k-1516', 'k-1517']),
  ('bv-herøy-mr', 'Herøy brannvesen', 'Herøy brann', 'f-15', ARRAY['k-1515', 'k-1514']),
  ('bv-vestnes', 'Vestnes brannvesen', 'Vestnes brann', 'f-15', ARRAY['k-1535']),
  ('bv-rauma', 'Rauma brannvesen', 'Rauma brann', 'f-15', ARRAY['k-1539']),
  ('bv-sunndal', 'Sunndal brannvesen', 'Sunndal brann', 'f-15', ARRAY['k-1563']),
  ('bv-surnadal', 'Surnadal brannvesen', 'Surnadal brann', 'f-15', ARRAY['k-1566']),
  ('bv-sykkylven', 'Sykkylven brannvesen', 'Sykkylven brann', 'f-15', ARRAY['k-1528']),
  ('bv-stranda', 'Stranda brannvesen', 'Stranda brann', 'f-15', ARRAY['k-1525', 'k-1578']),
  ('bv-hustadvika', 'Hustadvika brannvesen', 'Hustadvika brann', 'f-15', ARRAY['k-1579']),
  ('bv-vanylven', 'Vanylven brannvesen', 'Vanylven brann', 'f-15', ARRAY['k-1511']),
  ('bv-tingvoll', 'Tingvoll brannvesen', 'Tingvoll brann', 'f-15', ARRAY['k-1560']),
  ('bv-smola-aure', 'Smøla og Aure brannvesen', 'Smøla/Aure brann', 'f-15', ARRAY['k-1573', 'k-1576']),

  -- Trøndelag
  ('bv-trondheim', 'Trøndelag brann- og redningstjeneste IKS', 'TBRT', 'f-50', ARRAY['k-5001', 'k-5028', 'k-5029', 'k-5031', 'k-5052']),
  ('bv-stjordal', 'Stjørdal brannvesen', 'Stjørdal brann', 'f-50', ARRAY['k-5035', 'k-5034', 'k-5036']),
  ('bv-levanger', 'Levanger brannvesen', 'Levanger brann', 'f-50', ARRAY['k-5037', 'k-5038']),
  ('bv-steinkjer', 'Steinkjer brannvesen', 'Steinkjer brann', 'f-50', ARRAY['k-5006', 'k-5041', 'k-5051']),
  ('bv-namsos', 'Namdal brann- og redningsvesen', 'Namdal brann', 'f-50', ARRAY['k-5007', 'k-5044', 'k-5045', 'k-5046', 'k-5047', 'k-5058']),
  ('bv-oppdal', 'Oppdal brannvesen', 'Oppdal brann', 'f-50', ARRAY['k-5021', 'k-5022']),
  ('bv-roros', 'Røros brannvesen', 'Røros brann', 'f-50', ARRAY['k-5025', 'k-5026']),
  ('bv-gauldal', 'Gauldal brannvesen', 'Gauldal brann', 'f-50', ARRAY['k-5027']),
  ('bv-selbu', 'Selbu brannvesen', 'Selbu brann', 'f-50', ARRAY['k-5032', 'k-5033']),
  ('bv-fosen', 'Fosen brann og redning', 'Fosen brann', 'f-50', ARRAY['k-5055', 'k-5056', 'k-5020']),
  ('bv-orkland', 'Orkland brannvesen', 'Orkland brann', 'f-50', ARRAY['k-5057', 'k-5053']),
  ('bv-hitra-froya', 'Hitra-Frøya brannvesen', 'Hitra-Frøya brann', 'f-50', ARRAY['k-5054', 'k-5014']),
  ('bv-flatanger', 'Flatanger brannvesen', 'Flatanger brann', 'f-50', ARRAY['k-5049', 'k-5050']),
  ('bv-lierne', 'Lierne brannvesen', 'Lierne brann', 'f-50', ARRAY['k-5042', 'k-5043']),

  -- Nordland
  ('bv-bodo', 'Bodø brann og redning', 'Bodø brann', 'f-18', ARRAY['k-1804', 'k-1838', 'k-1839']),
  ('bv-narvik', 'Ofoten brann IKS', 'Ofoten brann', 'f-18', ARRAY['k-1806', 'k-1853']),
  ('bv-rana', 'Rana brannvesen', 'Rana brann', 'f-18', ARRAY['k-1833', 'k-1832']),
  ('bv-vefsn', 'Vefsn brannvesen', 'Vefsn brann', 'f-18', ARRAY['k-1824', 'k-1825', 'k-1826']),
  ('bv-bronnoysund', 'Brønnøy brannvesen', 'Brønnøy brann', 'f-18', ARRAY['k-1813', 'k-1812', 'k-1811']),
  ('bv-alstahaug', 'Alstahaug brannvesen', 'Alstahaug brann', 'f-18', ARRAY['k-1820', 'k-1822', 'k-1827', 'k-1828']),
  ('bv-salangen', 'Salangen brannvesen', 'Salangen brann', 'f-18', ARRAY['k-1840', 'k-1841', 'k-1845']),
  ('bv-sortland', 'Sortland brannvesen', 'Sortland brann', 'f-18', ARRAY['k-1870', 'k-1868', 'k-1871']),
  ('bv-lofoten', 'Lofoten brannvesen', 'Lofoten brann', 'f-18', ARRAY['k-1860', 'k-1865', 'k-1859', 'k-1856', 'k-1857', 'k-1874']),
  ('bv-hadsel', 'Hadsel brannvesen', 'Hadsel brann', 'f-18', ARRAY['k-1866', 'k-1867']),
  ('bv-vega', 'Vega brannvesen', 'Vega brann', 'f-18', ARRAY['k-1815', 'k-1816']),
  ('bv-herøy-n', 'Herøy brannvesen (Nordland)', 'Herøy brann N', 'f-18', ARRAY['k-1818']),
  ('bv-steigen', 'Steigen brannvesen', 'Steigen brann', 'f-18', ARRAY['k-1848']),
  ('bv-lodingen', 'Lødingen brannvesen', 'Lødingen brann', 'f-18', ARRAY['k-1851']),
  ('bv-hamaroy', 'Hamarøy brannvesen', 'Hamarøy brann', 'f-18', ARRAY['k-1875']),
  ('bv-meloy', 'Meløy brannvesen', 'Meløy brann', 'f-18', ARRAY['k-1837', 'k-1836']),
  ('bv-luroy-traena', 'Lurøy og Træna brannvesen', 'Lurøy/Træna brann', 'f-18', ARRAY['k-1834', 'k-1835']),

  -- Troms
  ('bv-tromso', 'Tromsø brann og redning', 'Tromsø brann', 'f-55', ARRAY['k-5501', 'k-5532', 'k-5534']),
  ('bv-harstad', 'Harstad brannvesen', 'Harstad brann', 'f-55', ARRAY['k-5503', 'k-5510', 'k-5512']),
  ('bv-senja', 'Senja brannvesen', 'Senja brann', 'f-55', ARRAY['k-5530', 'k-5526', 'k-5528']),
  ('bv-salangen-t', 'Salangen-Lavangen brannvesen', 'Salangen-Lavangen brann', 'f-55', ARRAY['k-5522', 'k-5518', 'k-5516', 'k-5514']),
  ('bv-bardu', 'Bardu brannvesen', 'Bardu brann', 'f-55', ARRAY['k-5520', 'k-5524']),
  ('bv-lyngen', 'Lyngen brannvesen', 'Lyngen brann', 'f-55', ARRAY['k-5536', 'k-5538', 'k-5540']),
  ('bv-nord-troms', 'Nord-Troms brann og redning', 'Nord-Troms brann', 'f-55', ARRAY['k-5542', 'k-5544', 'k-5546']),

  -- Finnmark
  ('bv-alta', 'Alta brann- og redningskorps', 'Alta brann', 'f-56', ARRAY['k-5601', 'k-5614']),
  ('bv-hammerfest', 'Hammerfest brann og redning', 'Hammerfest brann', 'f-56', ARRAY['k-5603', 'k-5616', 'k-5618']),
  ('bv-sor-varanger', 'Sør-Varanger brannvesen', 'Sør-Varanger brann', 'f-56', ARRAY['k-5605']),
  ('bv-vadso', 'Vadsø brannvesen', 'Vadsø brann', 'f-56', ARRAY['k-5607', 'k-5636']),
  ('bv-nordkapp', 'Nordkapp brannvesen', 'Nordkapp brann', 'f-56', ARRAY['k-5620']),
  ('bv-porsanger', 'Porsanger brannvesen', 'Porsanger brann', 'f-56', ARRAY['k-5622', 'k-5624']),
  ('bv-tana', 'Tana brannvesen', 'Tana brann', 'f-56', ARRAY['k-5628', 'k-5626']),
  ('bv-berlevag', 'Berlevåg brannvesen', 'Berlevåg brann', 'f-56', ARRAY['k-5630']),
  ('bv-batsfjord', 'Båtsfjord brannvesen', 'Båtsfjord brann', 'f-56', ARRAY['k-5632']),
  ('bv-vardo', 'Vardø brannvesen', 'Vardø brann', 'f-56', ARRAY['k-5634']),
  ('bv-karasjok', 'Karasjok brannvesen', 'Karasjok brann', 'f-56', ARRAY['k-5610']),
  ('bv-kautokeino', 'Kautokeino brannvesen', 'Kautokeino brann', 'f-56', ARRAY['k-5612'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Hendelser (12 demo incidents)
-- ============================================================================
INSERT INTO hendelser (id, brannvesen_id, kommune_id, fylke_id, kategori_id, tittel, beskrivelse, sted, status, alvorlighetsgrad, opprettet_av, opprettet_tidspunkt, oppdatert_tidspunkt, avsluttet_tidspunkt, latitude, longitude) VALUES
  ('a0000001-0001-4000-8000-000000000001', 'bv-bergen', 'k-4601', 'f-46', 'kat-brann-bygning',
   'Brann: Bergen, Sandviken',
   'Melding om brann i leilighetsbygg i Sandviken. Røykutvikling fra 3. etasje. Alle beboere er evakuert. Brannvesenet jobber med slokking.',
   'Sandviksveien 42, Sandviken', 'pågår', 'høy', NULL,
   NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '10 minutes', NULL, 60.4055, 5.3275),

  ('a0000001-0002-4000-8000-000000000002', 'bv-trondheim', 'k-5001', 'f-50', 'kat-trafikkulykke',
   'Trafikkulykke: Trondheim, E6 Heimdal',
   'Trafikkulykke mellom to personbiler på E6 ved Heimdal. Brannvesenet bistår med frigjøring av person fra kjøretøy.',
   'E6 Heimdal, retning sør', 'pågår', 'høy', NULL,
   NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '5 minutes', NULL, 63.3539, 10.3526),

  ('a0000001-0003-4000-8000-000000000003', 'bv-oslo', 'k-0301', 'f-03', 'kat-mistenkelig-røyk',
   'Røykutvikling: Oslo, Grünerløkka',
   'Melding om røykutvikling fra kjeller i boligblokk på Grünerløkka. Brannvesenet undersøker.',
   'Thorvald Meyers gate 28, Grünerløkka', 'pågår', 'middels', NULL,
   NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NULL, 59.9228, 10.7591),

  ('a0000001-0004-4000-8000-000000000004', 'bv-rogaland', 'k-1103', 'f-11', 'kat-brann-kjøretøy',
   'Brann i kjøretøy: Stavanger, Forus',
   'Bilbrann på parkeringsplass ved Forus. Elbil i full fyr. Brannvesenet er på stedet.',
   'Forusbeen 35, Forus', 'avsluttet', 'middels', NULL,
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', 58.8924, 5.7288),

  ('a0000001-0005-4000-8000-000000000005', 'bv-kristiansand', 'k-4204', 'f-42', 'kat-brann-bygning',
   'Brann: Kristiansand, Lund',
   'Melding om brann i enebolig på Lund. Kraftig røykutvikling. Beboere evakuert.',
   'Lundsiden 15, Lund', 'pågår', 'kritisk', NULL,
   NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '20 minutes', NULL, 58.1599, 7.9956),

  ('a0000001-0006-4000-8000-000000000006', 'bv-bodo', 'k-1804', 'f-18', 'kat-naturhendelse',
   'Naturhendelse: Bodø, Sentrum',
   'Melding om takplater som løsner i sterk vind i Bodø sentrum. Brannvesenet sikrer området.',
   'Sjøgata, Bodø sentrum', 'avsluttet', 'middels', NULL,
   NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', 67.2804, 14.4049),

  ('a0000001-0007-4000-8000-000000000007', 'bv-tromso', 'k-5501', 'f-55', 'kat-person-vann',
   'Vanredning: Tromsø, Kvaløya',
   'Båt i nød utenfor Kvaløya. Brannvesenets redningsbåt er sendt ut sammen med Redningsselskapet.',
   'Farvannet utenfor Kvaløya', 'avsluttet', 'høy', NULL,
   NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours', 69.6789, 18.9551),

  ('a0000001-0008-4000-8000-000000000008', 'bv-drammen', 'k-3301', 'f-33', 'kat-forurensning',
   'Akutt forurensning: Drammen, Holmen',
   'Melding om oljeutslipp fra industriområde på Holmen. Brannvesenet iverksetter tiltak for å begrense spredning.',
   'Holmen industriområde, Drammen', 'pågår', 'høy', NULL,
   NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '30 minutes', NULL, 59.7440, 10.2045),

  ('a0000001-0009-4000-8000-000000000009', 'bv-alesund', 'k-1508', 'f-15', 'kat-brann-skog',
   'Gressbrann: Ålesund, Hessa',
   'Melding om gressbrann på Hessa. Brannvesenet er på stedet.',
   'Hessafjellveien, Hessa', 'avsluttet', 'lav', NULL,
   NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5.5 hours', NOW() - INTERVAL '5.5 hours', 62.4689, 6.1230),

  ('a0000001-0010-4000-8000-000000000010', 'bv-grenland', 'k-4003', 'f-40', 'kat-andre-oppdrag',
   'Teknisk assistanse: Skien, Sentrum',
   'Heisnodstopp i forretningsbygg i Skien sentrum. To personer sitter fast.',
   'Landmannstorget 2, Skien', 'avsluttet', 'lav', NULL,
   NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3.5 hours', NOW() - INTERVAL '3.5 hours', 59.2094, 9.6085),

  ('a0000001-0011-4000-8000-000000000011', 'bv-alta', 'k-5601', 'f-56', 'kat-brann-skorstein',
   'Skorsteinsbrann: Alta, Sentrum',
   'Melding om skorsteinsbrann i bolighus i Alta sentrum. Brannvesenet er på vei.',
   'Bossekopveien 12, Alta', 'pågår', 'middels', NULL,
   NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes', NULL, 69.9689, 23.2716),

  ('a0000001-0012-4000-8000-000000000012', 'bv-lillehammer', 'k-3405', 'f-34', 'kat-cbrne',
   'Farlig gods: Lillehammer, E6',
   'Lastebil med farlig gods har veltet på E6 ved Lillehammer. Gasslekkasje fra tank. Området evakueres.',
   'E6 Lillehammer nord', 'pågår', 'kritisk', NULL,
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '15 minutes', NULL, 61.1153, 10.4662)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. Hendelsesoppdateringer (updates for demo incidents)
-- ============================================================================
INSERT INTO hendelsesoppdateringer (id, hendelse_id, tekst, opprettet_av, opprettet_tidspunkt) VALUES
  -- h-001 Bergen brann
  ('b0000001-0001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001',
   'Brannvesenet er på stedet med 3 enheter. Synlig flamme fra vindu i 3. etasje.', NULL, NOW() - INTERVAL '35 minutes'),
  ('b0000001-0002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001',
   'Brannen er under kontroll. Etterslokking pågår. Ingen personskader meldt.', NULL, NOW() - INTERVAL '10 minutes'),

  -- h-002 Trondheim trafikkulykke
  ('b0000001-0003-4000-8000-000000000003', 'a0000001-0002-4000-8000-000000000002',
   'En person frigjort fra kjøretøy og overlevert til ambulanse. Veien er stengt i begge retninger.', NULL, NOW() - INTERVAL '5 minutes'),

  -- h-004 Stavanger bilbrann
  ('b0000001-0004-4000-8000-000000000004', 'a0000001-0004-4000-8000-000000000004',
   'Brannen er slukket. Bilen er totalskadet. Ingen personskader. Brannårsak undersøkes.', NULL, NOW() - INTERVAL '2 hours'),

  -- h-005 Kristiansand brann
  ('b0000001-0005-4000-8000-000000000005', 'a0000001-0005-4000-8000-000000000005',
   'Brannvesenet er på stedet med full utrykking. Brannen har spredd seg til 2. etasje.', NULL, NOW() - INTERVAL '50 minutes'),
  ('b0000001-0006-4000-8000-000000000006', 'a0000001-0005-4000-8000-000000000005',
   'Nabobygg evakueres som sikkerhetstiltak. Ingen personskader meldt.', NULL, NOW() - INTERVAL '35 minutes'),
  ('b0000001-0007-4000-8000-000000000007', 'a0000001-0005-4000-8000-000000000005',
   'Brannen er under kontroll. Etterslokking og kontroll av nabobygg pågår.', NULL, NOW() - INTERVAL '20 minutes'),

  -- h-006 Bodø naturhendelse
  ('b0000001-0008-4000-8000-000000000008', 'a0000001-0006-4000-8000-000000000006',
   'Takplatene er sikret. Området er gjenåpnet for ferdsel.', NULL, NOW() - INTERVAL '4 hours'),

  -- h-007 Tromsø vanredning
  ('b0000001-0009-4000-8000-000000000009', 'a0000001-0007-4000-8000-000000000007',
   'To personer tatt opp fra båt. Båten slepes til kai. Ingen personskader.', NULL, NOW() - INTERVAL '7 hours'),

  -- h-008 Drammen forurensning
  ('b0000001-0010-4000-8000-000000000010', 'a0000001-0008-4000-8000-000000000008',
   'Lenser er lagt ut for å hindre spredning til elva. IUA er varslet.', NULL, NOW() - INTERVAL '60 minutes'),
  ('b0000001-0011-4000-8000-000000000011', 'a0000001-0008-4000-8000-000000000008',
   'Utslippet er begrenset. Opprydding pågår i samarbeid med kommunen.', NULL, NOW() - INTERVAL '30 minutes'),

  -- h-009 Ålesund gressbrann
  ('b0000001-0012-4000-8000-000000000012', 'a0000001-0009-4000-8000-000000000009',
   'Gressbrannen er slukket. Begrenset område berørt. Trolig påtent.', NULL, NOW() - INTERVAL '5.5 hours'),

  -- h-010 Skien heisnodstopp
  ('b0000001-0013-4000-8000-000000000013', 'a0000001-0010-4000-8000-000000000010',
   'Personene er frigjort fra heisen. Ingen skader.', NULL, NOW() - INTERVAL '3.5 hours'),

  -- h-012 Lillehammer farlig gods
  ('b0000001-0014-4000-8000-000000000014', 'a0000001-0012-4000-8000-000000000012',
   'Evakuering av 200 meter radius iverksatt. E6 stengt i begge retninger.', NULL, NOW() - INTERVAL '100 minutes'),
  ('b0000001-0015-4000-8000-000000000015', 'a0000001-0012-4000-8000-000000000012',
   'Spesialist på farlig gods er på vei fra Oslo. Lekkasjepunktet er identifisert.', NULL, NOW() - INTERVAL '60 minutes'),
  ('b0000001-0016-4000-8000-000000000016', 'a0000001-0012-4000-8000-000000000012',
   'Lekkasjen er tettet midlertidig. Evakueringsgrensen opprettholdes inntil videre.', NULL, NOW() - INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. Push-abonnenter (18 demo anonymous push subscribers)
-- ============================================================================
INSERT INTO push_abonnenter (id, device_id, platform, push_token, push_aktiv, sentral_ids, fylke_ids, kategori_ids, kun_pågående, registrert, sist_aktiv) VALUES
  ('ps-1', 'dev-a1b2c3', 'iOS', 'ExponentPushToken[abc123]', true,
   ARRAY['s-vestland'], ARRAY['f-46'], ARRAY['kat-brann-bygning', 'kat-brann-annet'], false,
   '2025-01-10 08:30:00+00', '2025-01-30 23:45:00+00'),
  ('ps-2', 'dev-d4e5f6', 'Android', 'ExponentPushToken[def456]', true,
   ARRAY['s-oslo', 's-ost'], ARRAY['f-03', 'f-32'], ARRAY[]::TEXT[], true,
   '2025-01-12 14:20:00+00', '2025-01-30 22:10:00+00'),
  ('ps-3', 'dev-g7h8i9', 'iOS', 'ExponentPushToken[ghi789]', true,
   ARRAY['s-vestland'], ARRAY['f-46'], ARRAY[]::TEXT[], false,
   '2025-01-14 09:00:00+00', '2025-01-30 20:30:00+00'),
  ('ps-4', 'dev-j0k1l2', 'Web', 'web-push-token-jkl012', true,
   ARRAY['s-oslo', 's-ost'], ARRAY['f-03', 'f-32', 'f-31'], ARRAY['kat-brann-bygning', 'kat-trafikkulykke'], true,
   '2025-01-15 11:30:00+00', '2025-01-30 21:15:00+00'),
  ('ps-5', 'dev-m3n4o5', 'iOS', 'ExponentPushToken[mno345]', false,
   ARRAY['s-trondelag'], ARRAY['f-50'], ARRAY[]::TEXT[], false,
   '2025-01-16 16:00:00+00', '2025-01-29 14:00:00+00'),
  ('ps-6', 'dev-p6q7r8', 'Android', 'ExponentPushToken[pqr678]', true,
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY['kat-brann-bygning', 'kat-trafikkulykke', 'kat-cbrne'], false,
   '2025-01-17 08:00:00+00', '2025-01-30 23:50:00+00'),
  ('ps-7', 'dev-s9t0u1', 'Web', 'web-push-token-stu901', true,
   ARRAY['s-oslo', 's-vestland', 's-trondelag'], ARRAY['f-03', 'f-46', 'f-50'], ARRAY['kat-brann-bygning'], true,
   '2025-01-18 12:00:00+00', '2025-01-30 19:00:00+00'),
  ('ps-8', 'dev-v2w3x4', 'iOS', 'ExponentPushToken[vwx234]', false,
   ARRAY['s-agder'], ARRAY['f-42'], ARRAY[]::TEXT[], false,
   '2025-01-19 10:30:00+00', '2025-01-20 10:00:00+00'),
  ('ps-9', 'dev-y5z6a7', 'Android', 'ExponentPushToken[yza567]', true,
   ARRAY['s-sorost'], ARRAY['f-39', 'f-40', 'f-33'], ARRAY['kat-brann-bygning', 'kat-brann-annet'], false,
   '2025-01-20 09:00:00+00', '2025-01-30 18:30:00+00'),
  ('ps-10', 'dev-b8c9d0', 'iOS', 'ExponentPushToken[bcd890]', true,
   ARRAY['s-vestland', 's-rogaland'], ARRAY['f-46', 'f-11'], ARRAY[]::TEXT[], false,
   '2025-01-21 13:00:00+00', '2025-01-30 22:45:00+00'),
  ('ps-11', 'dev-e1f2g3', 'Web', 'web-push-token-efg123', false,
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], false,
   '2025-01-22 07:30:00+00', '2025-01-25 12:00:00+00'),
  ('ps-12', 'dev-h4i5j6', 'Android', 'ExponentPushToken[hij456]', true,
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY['kat-brann-bygning', 'kat-trafikkulykke', 'kat-cbrne', 'kat-brann-annet'], false,
   '2025-01-23 15:00:00+00', '2025-01-30 23:30:00+00'),
  ('ps-13', 'dev-k7l8m9', 'iOS', 'ExponentPushToken[klm789]', true,
   ARRAY['s-innlandet'], ARRAY['f-34'], ARRAY[]::TEXT[], false,
   '2025-01-24 11:00:00+00', '2025-01-30 17:00:00+00'),
  ('ps-14', 'dev-n0o1p2', 'Web', 'web-push-token-nop012', true,
   ARRAY['s-agder', 's-rogaland'], ARRAY['f-42', 'f-11'], ARRAY['kat-brann-bygning'], true,
   '2025-01-25 08:00:00+00', '2025-01-30 20:00:00+00'),
  ('ps-15', 'dev-q3r4s5', 'Android', 'ExponentPushToken[qrs345]', true,
   ARRAY['s-trondelag', 's-more'], ARRAY['f-50', 'f-15'], ARRAY[]::TEXT[], false,
   '2025-01-26 10:30:00+00', '2025-01-30 21:30:00+00'),
  ('ps-16', 'dev-t6u7v8', 'iOS', 'ExponentPushToken[tuv678]', true,
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], false,
   '2025-01-27 14:00:00+00', '2025-01-30 23:00:00+00'),
  ('ps-17', 'dev-w9x0y1', 'Android', 'ExponentPushToken[wxy901]', false,
   ARRAY['s-nordland'], ARRAY['f-18'], ARRAY[]::TEXT[], false,
   '2025-01-28 09:00:00+00', '2025-01-28 15:00:00+00'),
  ('ps-18', 'dev-z2a3b4', 'iOS', 'ExponentPushToken[zab234]', true,
   ARRAY['s-oslo'], ARRAY['f-03'], ARRAY['kat-brann-bygning', 'kat-trafikkulykke'], true,
   '2025-01-29 12:00:00+00', '2025-01-30 22:00:00+00')
ON CONFLICT DO NOTHING;
