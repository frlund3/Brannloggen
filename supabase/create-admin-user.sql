-- ============================================================
-- Brannloggen: Create Admin User
-- Run this in Supabase SQL Editor AFTER complete-setup.sql
-- ============================================================
-- Creates admin user: frank.lunde1981@gmail.com
-- ============================================================

-- Step 1: Create user in auth.users
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
  gen_random_uuid(),
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
) ON CONFLICT (email) DO NOTHING;

-- Step 2: Create identity record for email auth
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id,
  id,
  jsonb_build_object('sub', id::text, 'email', 'frank.lunde1981@gmail.com'),
  'email',
  id::text,
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'frank.lunde1981@gmail.com'
ON CONFLICT DO NOTHING;

-- Step 3: Create admin profile in brukerprofiler
INSERT INTO brukerprofiler (
  id,
  user_id,
  rolle,
  fullt_navn,
  brannvesen_id,
  aktiv
)
SELECT
  gen_random_uuid(),
  id,
  'admin',
  'Frank Lunde',
  NULL,
  true
FROM auth.users
WHERE email = 'frank.lunde1981@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  rolle = 'admin',
  fullt_navn = 'Frank Lunde',
  aktiv = true;

-- Verify the user was created
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
