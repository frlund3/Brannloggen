-- ============================================================
-- Brannloggen: Add press role + Helge admin user
-- Run this in Supabase SQL Editor
-- ============================================================

-- PART 1: Schema changes for press support
-- ============================================================

-- Add presse_info column to hendelser (press-only information)
ALTER TABLE hendelser ADD COLUMN IF NOT EXISTS presse_info TEXT;

-- Add press fields to brukerprofiler
ALTER TABLE brukerprofiler ADD COLUMN IF NOT EXISTS mediehus TEXT;
ALTER TABLE brukerprofiler ADD COLUMN IF NOT EXISTS telefon TEXT;

-- Update rolle constraint to include 'presse'
ALTER TABLE brukerprofiler DROP CONSTRAINT IF EXISTS brukerprofiler_rolle_check;
ALTER TABLE brukerprofiler ADD CONSTRAINT brukerprofiler_rolle_check
  CHECK (rolle IN ('admin', 'operator', 'presse', 'public'));

-- Add minimum severity to push preferences
ALTER TABLE push_preferanser ADD COLUMN IF NOT EXISTS alvorlighetsgrad_minimum TEXT;

-- RLS: Press can read incidents + presse_info
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Press can read incidents') THEN
    CREATE POLICY "Press can read incidents" ON hendelser FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM brukerprofiler
        WHERE brukerprofiler.user_id = auth.uid()
        AND brukerprofiler.rolle = 'presse'
        AND brukerprofiler.aktiv = true
      )
    );
  END IF;
END $$;

-- RLS: Press can read own profile
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Press can read own profile') THEN
    CREATE POLICY "Press can read own profile" ON brukerprofiler FOR SELECT USING (
      auth.uid() = user_id AND rolle = 'presse'
    );
  END IF;
END $$;

-- RLS: Press can manage own push preferences
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Press can manage push preferences') THEN
    CREATE POLICY "Press can manage push preferences" ON push_preferanser FOR ALL USING (
      auth.uid() = user_id
    );
  END IF;
END $$;

-- PART 2: Create admin user helge.lunde1981@gmail.com
-- ============================================================

DO $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = 'helge.lunde1981@gmail.com';

  IF _user_id IS NULL THEN
    _user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new,
      email_change, aud, role, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
      phone_change, phone_change_token, email_change_token_current,
      email_change_confirm_status, banned_until, reauthentication_token,
      is_sso_user, deleted_at
    ) VALUES (
      _user_id, '00000000-0000-0000-0000-000000000000',
      'helge.lunde1981@gmail.com',
      crypt('007Lunde!', gen_salt('bf')),
      NOW(), NULL, '', NULL, '', NULL, '', '',
      'authenticated', 'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"fullt_navn": "Helge Lunde"}',
      FALSE, NOW(), NOW(), NULL, NULL, '', '', '', 0, NULL, '', FALSE, NULL
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', 'helge.lunde1981@gmail.com', 'email_verified', true, 'phone_verified', false),
      'email', _user_id::text, NOW(), NOW(), NOW()
    );

    RAISE NOTICE 'User helge.lunde1981@gmail.com created with id: %', _user_id;
  ELSE
    RAISE NOTICE 'User helge.lunde1981@gmail.com already exists with id: %', _user_id;
  END IF;

  INSERT INTO brukerprofiler (id, user_id, rolle, fullt_navn, brannvesen_id, aktiv)
  VALUES (gen_random_uuid(), _user_id, 'admin', 'Helge Lunde', NULL, true)
  ON CONFLICT (user_id) DO UPDATE SET
    rolle = 'admin', fullt_navn = 'Helge Lunde', aktiv = true;

END $$;

-- Verify both admin users
SELECT u.email, bp.rolle, bp.fullt_navn, bp.aktiv
FROM auth.users u
JOIN brukerprofiler bp ON bp.user_id = u.id
WHERE u.email IN ('frank.lunde1981@gmail.com', 'helge.lunde1981@gmail.com');
