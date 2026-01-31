-- ============================================================
-- Fix admin user login
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Delete existing broken user and profile
DELETE FROM brukerprofiler WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'frank.lunde1981@gmail.com'
);
DELETE FROM auth.identities WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'frank.lunde1981@gmail.com'
);
DELETE FROM auth.users WHERE email = 'frank.lunde1981@gmail.com';

-- Step 2: Recreate user with all required GoTrue fields
DO $$
DECLARE
  _user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    is_sso_user,
    deleted_at
  ) VALUES (
    _user_id,
    '00000000-0000-0000-0000-000000000000',
    'frank.lunde1981@gmail.com',
    crypt('Flomlys@2025', gen_salt('bf')),
    NOW(),                -- email_confirmed_at
    NULL,                 -- invited_at
    '',                   -- confirmation_token
    NULL,                 -- confirmation_sent_at
    '',                   -- recovery_token
    NULL,                 -- recovery_sent_at
    '',                   -- email_change_token_new
    '',                   -- email_change
    'authenticated',      -- aud
    'authenticated',      -- role
    '{"provider": "email", "providers": ["email"]}',
    '{"fullt_navn": "Frank Lunde"}',
    FALSE,                -- is_super_admin
    NOW(),
    NOW(),
    NULL,                 -- phone
    NULL,                 -- phone_confirmed_at
    '',                   -- phone_change
    '',                   -- phone_change_token
    '',                   -- email_change_token_current
    0,                    -- email_change_confirm_status
    NULL,                 -- banned_until
    '',                   -- reauthentication_token
    FALSE,                -- is_sso_user
    NULL                  -- deleted_at
  );

  -- Create identity (required for email/password login)
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
    gen_random_uuid(),
    _user_id,
    jsonb_build_object(
      'sub', _user_id::text,
      'email', 'frank.lunde1981@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    _user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- Create admin profile
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
  );

  RAISE NOTICE 'Admin user recreated with id: %', _user_id;
END $$;

-- Verify
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.encrypted_password IS NOT NULL AS has_password,
  u.is_sso_user,
  u.aud,
  u.role,
  bp.rolle AS app_rolle,
  bp.fullt_navn,
  bp.aktiv,
  i.provider
FROM auth.users u
LEFT JOIN brukerprofiler bp ON bp.user_id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email = 'frank.lunde1981@gmail.com';
