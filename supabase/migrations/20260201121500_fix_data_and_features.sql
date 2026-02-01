-- ============================================
-- Fix sentraler brannvesen_ids + add kontakt_epost
-- ============================================

-- 1. Add kontakt_epost column to sentraler
ALTER TABLE sentraler ADD COLUMN IF NOT EXISTS kontakt_epost TEXT;

-- 2. Populate brannvesen_ids for all sentraler based on fylke mappings
-- Finnmark 110 (f-56)
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-alta','bv-batsfjord','bv-berlevag','bv-hammerfest','bv-karasjok',
  'bv-kautokeino','bv-nordkapp','bv-porsanger','bv-sor-varanger','bv-tana','bv-vadso','bv-vardo'
] WHERE id = 's-finnmark';

-- Tromsø 110 (f-55)
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-bardu','bv-harstad','bv-lyngen','bv-nord-troms','bv-salangen-t','bv-senja','bv-tromso'
] WHERE id = 's-troms';

-- 110 Nordland (f-18)
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-alstahaug','bv-bodo','bv-bronnoysund','bv-hadsel','bv-hamaroy','bv-heroy-n',
  'bv-lodingen','bv-lofoten','bv-luroy-traena','bv-meloy','bv-narvik','bv-rana',
  'bv-salangen','bv-sortland','bv-steigen','bv-vefsn','bv-vega'
] WHERE id = 's-nordland';

-- Midt-Norge 110 (f-50) - currently only bv-trondheim, add all
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-flatanger','bv-fosen','bv-gauldal','bv-hitra-froya','bv-levanger','bv-lierne',
  'bv-namsos','bv-oppdal','bv-orkland','bv-roros','bv-selbu','bv-steinkjer',
  'bv-stjordal','bv-trondheim'
] WHERE id = 's-trondelag';

-- MR 110 Ålesund (f-15)
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-alesund','bv-heroy-mr','bv-hustadvika','bv-kristiansund','bv-molde',
  'bv-orsta-volda','bv-rauma','bv-smola-aure','bv-stranda','bv-sunndal',
  'bv-surnadal','bv-sykkylven','bv-tingvoll','bv-ulstein','bv-vanylven','bv-vestnes'
] WHERE id = 's-more';

-- 110 Vest / Vestland (f-46) - currently only bv-bergen, add all
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-askoy','bv-austevoll','bv-bergen','bv-bjornafjorden','bv-gulen','bv-hardanger',
  'bv-kinn','bv-nordfjord','bv-nordhordland','bv-oygarden','bv-sogndal',
  'bv-sunnfjord','bv-sunnhordland','bv-voss'
] WHERE id = 's-vestland';

-- 110 Sør-Vest / Rogaland (f-11)
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-eigersund','bv-ha','bv-haugesund','bv-karmoy','bv-klepp','bv-rogaland',
  'bv-ryfylke','bv-sauda','bv-time','bv-tysvaer','bv-vindafjord'
] WHERE id = 's-rogaland';

-- 110 Agder (f-42) - currently only bv-kristiansand, add all
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-amli','bv-arendal','bv-flekkefjord','bv-kristiansand','bv-kvinesdal',
  'bv-lindesnes','bv-lister','bv-risor','bv-setesdal','bv-tvedestrand'
] WHERE id = 's-agder';

-- Sørøst 110 (f-39, f-40, f-33) - missing f-40 (Telemark) brannvesen
UPDATE sentraler SET brannvesen_ids = ARRAY[
  'bv-vestfold','bv-sandefjord','bv-larvik',
  'bv-drammen','bv-kongsberg','bv-ringerike','bv-modum','bv-hallingdal','bv-sigdal','bv-numedal',
  'bv-grenland','bv-kragero','bv-midt-telemark','bv-notodden','bv-vest-telemark'
], fylke_ids = ARRAY['f-39','f-40','f-33']
WHERE id = 's-sorost';

-- Oslo and Øst and Innlandet are already complete, no changes needed
