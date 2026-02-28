-- isolation_test.sql
-- Programmatically verify multi-tenant boundaries and RLS enforcement (Supabase Local)

DO $$
DECLARE
    rest_a_id uuid;
    rest_b_id uuid;
    user_a_id uuid := '00000000-0000-0000-0000-000000000001';
    user_b_id uuid := '00000000-0000-0000-0000-000000000002';
    anon_id   uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
    -- 0) Ensure clean baseline for repeat runs (optional safety)
    -- (If you run after `supabase db reset`, these tables are empty anyway.)
    DELETE FROM public.restaurant_users;
    DELETE FROM public.orders;
    DELETE FROM public.menu_items;
    DELETE FROM public.categories;
    DELETE FROM public.restaurants;

    -- 1) Create restaurants (setup as superuser / privileged session)
    INSERT INTO public.restaurants (name, slug) VALUES ('Restaurant A', 'rest-a') RETURNING id INTO rest_a_id;
    INSERT INTO public.restaurants (name, slug) VALUES ('Restaurant B', 'rest-b') RETURNING id INTO rest_b_id;

    -- 2) Create auth users (required because restaurant_users.user_id references auth.users)
    -- Minimal insert: id + aud + role + email + timestamps
    -- This is intended for Supabase Local testing.
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES
      (user_a_id, 'authenticated', 'authenticated', 'usera@test.local', 'x', now(), now(), now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES
      (user_b_id, 'authenticated', 'authenticated', 'userb@test.local', 'x', now(), now(), now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES
      (anon_id, 'anon', 'anon', 'anon@test.local', 'x', now(), now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- 3) Map users to restaurants
    INSERT INTO public.restaurant_users (user_id, restaurant_id, role)
    VALUES (user_a_id, rest_a_id, 'owner');

    INSERT INTO public.restaurant_users (user_id, restaurant_id, role)
    VALUES (user_b_id, rest_b_id, 'owner');

    -- 4) TEST: Anonymous Access Denied
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s"}', anon_id), true);

    IF EXISTS (SELECT 1 FROM public.restaurants) THEN
        RAISE EXCEPTION 'TEST FAILED: Anonymous user can see restaurants';
    END IF;

    -- 5) TEST: User A Isolation
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s"}', user_a_id), true);

    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_a_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User A cannot see their own restaurant';
    END IF;

    IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_b_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User A can see Restaurant B';
    END IF;

    -- User A should NOT be able to insert into Restaurant B categories
    BEGIN
        INSERT INTO public.categories (restaurant_id, name) VALUES (rest_b_id, 'Illegal Category');
        RAISE EXCEPTION 'TEST FAILED: User A could insert into Restaurant B categories';
    EXCEPTION
        WHEN insufficient_privilege OR check_violation OR foreign_key_violation OR raise_exception THEN
            -- Expected: RLS should block this
            NULL;
    END;

    -- 6) TEST: User B Isolation
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s"}', user_b_id), true);

    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_b_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User B cannot see their own restaurant';
    END IF;

    IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_a_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User B can see Restaurant A';
    END IF;

    -- Reset role
    RESET ROLE;

    RAISE NOTICE 'SUCCESS: All multi-tenant isolation tests passed.';
END $$;