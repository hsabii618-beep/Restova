-- isolation_test.sql
-- Programmatically verify multi-tenant boundaries and RLS enforcement

-- NOTE: This script assumes it is run in a fresh environment or following 'supabase db reset'
-- It uses DO blocks to perform assertions. If an assertion fails, an error is raised.

DO $$
DECLARE
    rest_a_id uuid;
    rest_b_id uuid;
    user_a_id uuid := '00000000-0000-0000-0000-000000000001';
    user_b_id uuid := '00000000-0000-0000-0000-000000000002';
    anon_id uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
    -- 1. SETUP: Create test data (using service_role privileges usually available in SQL Editor)
    -- We assume the user running this has the power to bypass RLS to setup the test.
    
    INSERT INTO public.restaurants (name, slug) VALUES ('Restaurant A', 'rest-a') RETURNING id INTO rest_a_id;
    INSERT INTO public.restaurants (name, slug) VALUES ('Restaurant B', 'rest-b') RETURNING id INTO rest_b_id;
    
    -- Mock users in auth.users (this might fail if auth schema is strictly protected, but usually works in Supabase SQL editor)
    -- Alternatively, we just assume these IDs exist for the sake of RLS claims.
    
    INSERT INTO public.restaurant_users (user_id, restaurant_id, role) VALUES (user_a_id, rest_a_id, 'owner');
    INSERT INTO public.restaurant_users (user_id, restaurant_id, role) VALUES (user_b_id, rest_b_id, 'owner');
    
    -- 2. TEST: Anonymous Access Denied
    SET ROLE anon;
    SET request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000003"}';
    
    IF EXISTS (SELECT 1 FROM public.restaurants) THEN
        RAISE EXCEPTION 'TEST FAILED: Anonymous user can see restaurants';
    END IF;
    
    -- 3. TEST: User A Isolation
    SET ROLE authenticated;
    EXECUTE format('SET request.jwt.claims = %L', format('{"sub": "%s"}', user_a_id));
    
    -- User A should see Restaurant A
    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_a_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User A cannot see their own restaurant';
    END IF;
    
    -- User A should NOT see Restaurant B
    IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_b_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User A can see Restaurant B';
    END IF;
    
    -- User A should NOT be able to insert into Restaurant B
    BEGIN
        INSERT INTO public.categories (restaurant_id, name) VALUES (rest_b_id, 'Illegal Category');
        RAISE EXCEPTION 'TEST FAILED: User A could insert into Restaurant B categories';
    EXCEPTION WHEN insufficient_privilege THEN
        -- Expected
    END;

    -- 4. TEST: User B Isolation
    EXECUTE format('SET request.jwt.claims = %L', format('{"sub": "%s"}', user_b_id));
    
    -- User B should see Restaurant B
    IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_b_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User B cannot see their own restaurant';
    END IF;
    
    -- User B should NOT see Restaurant A
    IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = rest_a_id) THEN
        RAISE EXCEPTION 'TEST FAILED: User B can see Restaurant A';
    END IF;

    -- Reset role to cleanup or continue
    RESET ROLE;
    
    RAISE NOTICE 'SUCCESS: All multi-tenant isolation tests passed.';
END $$;
