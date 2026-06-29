
-- Seed super admin user (yosmaym92@gmail.com) and assign super_admin role.
-- Uses pgcrypto bcrypt to hash the password directly into auth.users.

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'yosmaym92@gmail.com';
  v_password text := 'Inc0nc3rt!';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Super Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id,
      format('{"sub":"%s","email":"%s","email_verified":true}', v_user_id, v_email)::jsonb,
      'email', v_user_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role, business_id) DO NOTHING;
END $$;
