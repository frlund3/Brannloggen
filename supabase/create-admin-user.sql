-- ============================================================
-- Brannloggen: Create Admin User
-- Run this in Supabase SQL Editor AFTER complete-setup.sql
-- ============================================================
-- Creates admin user: frank.lunde1981@gmail.com
-- ============================================================

DO $$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO _user_id FROM auth.users WHERE email = 'frank.lunde1981@gmail.com';

  IF _user_id IS NULL THEN
    _user_id := gen_random_uuid();

    -- Create user in auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'frank.lunde1981@gmail.com',
      crypt('Flomlys@2025', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"fullt_navn": "Frank Lunde"}',
      'authenticated',
      'authenticated',
      NOW(),
      NOW(),
      '',
      ''
    );

    -- Create identity record for email login
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      _user_id,
      _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', 'frank.lunde1981@gmail.com'),
      'email',
      _user_id::text,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Admin user created: frank.lunde1981@gmail.com';
  ELSE
    RAISE NOTICE 'Admin user already exists: frank.lunde1981@gmail.com';
  END IF;

  -- Create or update admin profile
  INSERT INTO brukerprofiler (
    id,
    user_id,
    rolle,
    fullt_navn,
    brannvesen_id,
    aktiv
  ) VALUES (
    gen_random_uuid(),
    _user_id,
    'admin',
    'Frank Lunde',
    NULL,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    rolle = 'admin',
    fullt_navn = 'Frank Lunde',
    aktiv = true;

END $$;

-- Verify
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  bp.rolle,
  bp.fullt_navn,
  bp.aktiv
FROM auth.users u
LEFT JOIN brukerprofiler bp ON bp.user_id = u.id
WHERE u.email = 'frank.lunde1981@gmail.com';
