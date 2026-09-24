-- P0 RLS and role-escalation tests. Run with: supabase test db
BEGIN;

SELECT no_plan();

CREATE SCHEMA IF NOT EXISTS gsc_tests;

CREATE OR REPLACE FUNCTION gsc_tests.create_auth_user(p_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
END;
$$;

CREATE OR REPLACE FUNCTION gsc_tests.set_jwt(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_id,
      'role', 'authenticated'
    )::text,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION gsc_tests.clear_jwt()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('gsc.role_change_allowed', 'off', true);
END;
$$;

GRANT USAGE ON SCHEMA gsc_tests TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA gsc_tests TO authenticated, anon, postgres;

DO $$
DECLARE
  student_a uuid := '11111111-1111-4111-8111-111111111111';
  student_b uuid := '22222222-2222-4222-8222-222222222222';
  parent_id uuid := '33333333-3333-4333-8333-333333333333';
  counselor_id uuid := '44444444-4444-4444-8444-444444444444';
  admin_id uuid := '55555555-5555-4555-8555-555555555555';
  uni_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN
  PERFORM gsc_tests.create_auth_user(student_a, 'student-a@example.invalid');
  PERFORM gsc_tests.create_auth_user(student_b, 'student-b@example.invalid');
  PERFORM gsc_tests.create_auth_user(parent_id, 'parent@example.invalid');
  PERFORM gsc_tests.create_auth_user(counselor_id, 'counselor@example.invalid');
  PERFORM gsc_tests.create_auth_user(admin_id, 'admin@example.invalid');

  PERFORM set_config('gsc.role_change_allowed', 'on', true);
  UPDATE public.user_profiles SET role = 'parent' WHERE id = parent_id;
  UPDATE public.user_profiles SET role = 'counselor' WHERE id = counselor_id;
  UPDATE public.user_profiles SET role = 'admin' WHERE id = admin_id;
  PERFORM set_config('gsc.role_change_allowed', 'off', true);

  INSERT INTO public.universities (
    id, name, country, tuition_fee, acceptance_rate, minimum_gpa, ranking
  )
  VALUES (
    uni_id,
    'Synthetic Test University',
    'KE',
    10000,
    0,
    3.0,
    100
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.student_profiles (
    user_id, first_name, last_name, target_major, target_country, graduation_year, gpa
  )
  VALUES
    (student_a, 'Ada', 'A', 'CS', 'KE', 2027, 3.5),
    (student_b, 'Bea', 'B', 'Law', 'KE', 2027, 3.4);

  INSERT INTO public.applications (student_id, university_id, status, deadline)
  VALUES
    (student_a, uni_id, 'draft', '2027-01-15'),
    (student_b, uni_id, 'submitted', '2027-01-15');

  INSERT INTO public.documents (user_id, file_name, file_url, document_type)
  VALUES
    (student_a, 'a.pdf', 'https://example.invalid/a.pdf', 'transcript'),
    (student_b, 'b.pdf', 'https://example.invalid/b.pdf', 'transcript');

  INSERT INTO public.essays (student_id, title, prompt, word_limit, status)
  VALUES
    (student_a, 'Essay A', 'Prompt', 500, 'drafting'),
    (student_b, 'Essay B', 'Prompt', 500, 'drafting');

  INSERT INTO public.recommendations (
    student_id, recommender_name, recommender_email, recommender_title,
    relationship, status, deadline
  )
  VALUES
    (student_a, 'Ref A', 'ref-a@example.invalid', 'Teacher', 'tutor', 'requested', '2027-02-01'),
    (student_b, 'Ref B', 'ref-b@example.invalid', 'Teacher', 'tutor', 'requested', '2027-02-01');

  INSERT INTO public.scholarships (
    title, provider, amount, country, minimum_gpa, deadline, application_url
  )
  VALUES (
    'Synthetic Scholarship',
    'Test',
    1000,
    'KE',
    3.0,
    '2027-03-01',
    'https://example.invalid/s'
  );

  INSERT INTO public.test_scores_log (student_id, test_type, score, test_date)
  VALUES
    (student_a, 'SAT', 1400, '2026-01-01'),
    (student_b, 'SAT', 1300, '2026-01-01');

  INSERT INTO public.counselor_assignments (student_id, counselor_id)
  VALUES (student_a, counselor_id);

  INSERT INTO public.messages (sender_id, receiver_id, content)
  VALUES
    (student_a, counselor_id, 'hello from a'),
    (student_b, counselor_id, 'hello from b');

  INSERT INTO public.interview_sessions (
    student_id, scheduled_at, interviewer_name, status
  )
  VALUES
    (student_a, '2027-04-01T10:00:00Z', 'Int A', 'scheduled'),
    (student_b, '2027-04-01T10:00:00Z', 'Int B', 'scheduled');

  INSERT INTO public.tasks (student_id, title, due_date, priority)
  VALUES
    (student_a, 'Task A', '2027-05-01', 'low'),
    (student_b, 'Task B', '2027-05-01', 'low');

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (parent_id, student_a);

  INSERT INTO public.activities (
    student_id, title, organization, role, hours_per_week, weeks_per_year
  )
  VALUES
    (student_a, 'Club A', 'Org', 'Member', 2, 30),
    (student_b, 'Club B', 'Org', 'Member', 2, 30);

  INSERT INTO public.visa_checklists (student_id, country, document_name)
  VALUES
    (student_a, 'KE', 'Passport A'),
    (student_b, 'KE', 'Passport B');

  INSERT INTO public.housing_options (
    university_id, title, housing_type, monthly_cost, address
  )
  VALUES (uni_id, 'Hall', 'on_campus', 400, '1 Test Road');

  INSERT INTO public.alumni_profiles (
    name, university_id, graduation_year, current_company, linkedin_url
  )
  VALUES (
    'Alum',
    uni_id,
    2020,
    'Co',
    'https://example.invalid/in/alum'
  );

  INSERT INTO public.admission_offers (
    student_id, university_id, tuition_cost, deposit_deadline, status
  )
  VALUES
    (student_a, uni_id, 10000, '2027-06-01', 'pending'),
    (student_b, uni_id, 10000, '2027-06-01', 'pending');

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES
    (student_a, 'free', 'active', '2027-12-01'),
    (admin_id, 'counselor_pro', 'active', '2027-12-01');

  INSERT INTO public.notifications (user_id, title, message)
  VALUES
    (student_a, 'Note A', 'Body A'),
    (admin_id, 'Admin note', 'Secret admin body');
END;
$$;

SELECT hasnt_table('public', 'users', 'public.users is gone');

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.conrelid = 'public.applications'::regclass
      AND c.contype = 'f'
      AND a.attname = 'student_id'
      AND c.confrelid = 'auth.users'::regclass
  ),
  'applications.student_id references auth.users'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.conrelid = 'public.student_profiles'::regclass
      AND c.contype = 'f'
      AND a.attname = 'user_id'
      AND c.confrelid = 'auth.users'::regclass
  ),
  'student_profiles.user_id references auth.users'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ),
  'every public table has RLS enabled'
);

SELECT ok(
  (SELECT c.relrowsecurity
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'storage' AND c.relname = 'objects'),
  'storage.objects has RLS enabled'
);

SELECT row_eq(
  $$SELECT role FROM public.user_profiles WHERE id = '11111111-1111-4111-8111-111111111111'$$,
  ROW('student'::text),
  'fresh signup remains student'
);

SET ROLE authenticated;
SELECT gsc_tests.set_jwt('11111111-1111-4111-8111-111111111111');

SELECT throws_ok(
  $$UPDATE public.user_profiles SET role = 'admin' WHERE id = '11111111-1111-4111-8111-111111111111'$$,
  'P0001',
  'User roles can only be changed through the admin role function',
  'student cannot change own role'
);

SELECT throws_ok(
  $$SELECT public.set_user_role('11111111-1111-4111-8111-111111111111', 'admin')$$,
  'P0001',
  'Only administrators can change user roles',
  'student cannot call set_user_role'
);

SELECT isnt_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '11111111-1111-4111-8111-111111111111'$$,
  'student can read own user_profiles'
);

SELECT is_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another user_profiles row'
);

SELECT is_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '55555555-5555-4555-8555-555555555555'$$,
  'student cannot read admin user_profiles'
);

SELECT isnt_empty(
  $$SELECT id FROM public.student_profiles WHERE user_id = '11111111-1111-4111-8111-111111111111'$$,
  'student can read own student_profiles'
);

SELECT is_empty(
  $$SELECT id FROM public.student_profiles WHERE user_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another student_profiles row'
);

SELECT isnt_empty(
  $$SELECT id FROM public.universities$$,
  'authenticated student can read universities catalog'
);

SELECT is_empty(
  $$SELECT id FROM public.applications WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another applications row'
);

SELECT is_empty(
  $$SELECT id FROM public.documents WHERE user_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another documents row'
);

SELECT is_empty(
  $$SELECT id FROM public.essays WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another essays row'
);

SELECT is_empty(
  $$SELECT id FROM public.recommendations WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another recommendations row'
);

SELECT isnt_empty(
  $$SELECT id FROM public.scholarships$$,
  'authenticated student can read scholarships catalog'
);

SELECT is_empty(
  $$SELECT id FROM public.test_scores_log WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another test_scores_log row'
);

SELECT isnt_empty(
  $$SELECT id FROM public.counselor_assignments WHERE student_id = '11111111-1111-4111-8111-111111111111'$$,
  'student can read own counselor_assignments'
);

SELECT is_empty(
  $$SELECT id FROM public.messages WHERE sender_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read unrelated messages'
);

SELECT is_empty(
  $$SELECT id FROM public.interview_sessions WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another interview_sessions row'
);

SELECT is_empty(
  $$SELECT id FROM public.tasks WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another tasks row'
);

SELECT is_empty(
  $$SELECT id FROM public.parent_student_links$$,
  'linked student cannot select parent_student_links (parent-only select)'
);

SELECT is_empty(
  $$SELECT id FROM public.activities WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another activities row'
);

SELECT is_empty(
  $$SELECT id FROM public.visa_checklists WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another visa_checklists row'
);

SELECT isnt_empty(
  $$SELECT id FROM public.housing_options$$,
  'authenticated student can read housing_options catalog'
);

SELECT isnt_empty(
  $$SELECT id FROM public.alumni_profiles$$,
  'authenticated student can read alumni_profiles catalog'
);

SELECT is_empty(
  $$SELECT id FROM public.admission_offers WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'student cannot read another admission_offers row'
);

SELECT is_empty(
  $$SELECT id FROM public.notifications WHERE user_id = '55555555-5555-4555-8555-555555555555'$$,
  'student cannot read admin notifications'
);

SELECT is_empty(
  $$SELECT id FROM public.subscriptions WHERE user_id = '55555555-5555-4555-8555-555555555555'$$,
  'student cannot read admin subscription'
);

RESET ROLE;
SELECT gsc_tests.clear_jwt();

SET ROLE authenticated;
SELECT gsc_tests.set_jwt('33333333-3333-4333-8333-333333333333');

SELECT isnt_empty(
  $$SELECT id FROM public.parent_student_links WHERE parent_id = '33333333-3333-4333-8333-333333333333'$$,
  'parent can read own parent_student_links'
);

SELECT isnt_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '11111111-1111-4111-8111-111111111111'$$,
  'parent can read linked student user_profiles'
);

SELECT is_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '22222222-2222-4222-8222-222222222222'$$,
  'parent cannot read unlinked student user_profiles'
);

SELECT isnt_empty(
  $$SELECT id FROM public.applications WHERE student_id = '11111111-1111-4111-8111-111111111111'$$,
  'parent can read linked student applications'
);

SELECT is_empty(
  $$SELECT id FROM public.applications WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'parent cannot read unlinked student applications'
);

SELECT isnt_empty(
  $$SELECT id FROM public.tasks WHERE student_id = '11111111-1111-4111-8111-111111111111'$$,
  'parent can read linked student tasks'
);

SELECT is_empty(
  $$SELECT id FROM public.documents WHERE user_id = '11111111-1111-4111-8111-111111111111'$$,
  'parent cannot read student documents (no policy)'
);

RESET ROLE;
SELECT gsc_tests.clear_jwt();

SET ROLE authenticated;
SELECT gsc_tests.set_jwt('44444444-4444-4444-8444-444444444444');

SELECT isnt_empty(
  $$SELECT id FROM public.counselor_assignments WHERE counselor_id = '44444444-4444-4444-8444-444444444444'$$,
  'counselor can read own assignments'
);

SELECT isnt_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '11111111-1111-4111-8111-111111111111'$$,
  'counselor can read assigned student user_profiles'
);

SELECT is_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '22222222-2222-4222-8222-222222222222'$$,
  'counselor cannot read unassigned student user_profiles'
);

SELECT isnt_empty(
  $$SELECT id FROM public.messages WHERE sender_id = '11111111-1111-4111-8111-111111111111'$$,
  'counselor can read messages with assigned student'
);

SELECT is_empty(
  $$SELECT id FROM public.applications WHERE student_id = '11111111-1111-4111-8111-111111111111'$$,
  'counselor cannot read student applications (no policy)'
);

RESET ROLE;
SELECT gsc_tests.clear_jwt();

SET ROLE authenticated;
SELECT gsc_tests.set_jwt('55555555-5555-4555-8555-555555555555');

SELECT isnt_empty(
  $$SELECT id FROM public.user_profiles WHERE id = '22222222-2222-4222-8222-222222222222'$$,
  'admin can read all user_profiles'
);

SELECT isnt_empty(
  $$SELECT id FROM public.applications WHERE student_id = '22222222-2222-4222-8222-222222222222'$$,
  'admin can read all applications'
);

SELECT lives_ok(
  $$SELECT public.set_user_role('22222222-2222-4222-8222-222222222222', 'parent')$$,
  'admin set_user_role succeeds when GUC is set inside the function'
);

SELECT row_eq(
  $$SELECT role FROM public.user_profiles WHERE id = '22222222-2222-4222-8222-222222222222'$$,
  ROW('parent'::text),
  'admin role change persisted'
);

RESET ROLE;
SELECT gsc_tests.clear_jwt();

SET ROLE authenticated;
SELECT gsc_tests.set_jwt('22222222-2222-4222-8222-222222222222');

SELECT throws_ok(
  $$UPDATE public.user_profiles SET role = 'admin' WHERE id = '22222222-2222-4222-8222-222222222222'$$,
  'P0001',
  'User roles can only be changed through the admin role function',
  'direct UPDATE of role still fails after admin used set_user_role'
);

RESET ROLE;
SELECT gsc_tests.clear_jwt();

SET ROLE anon;

SELECT is_empty($$SELECT id FROM public.user_profiles$$, 'anon sees no user_profiles');
SELECT is_empty($$SELECT id FROM public.student_profiles$$, 'anon sees no student_profiles');
SELECT is_empty($$SELECT id FROM public.applications$$, 'anon sees no applications');
SELECT is_empty($$SELECT id FROM public.documents$$, 'anon sees no documents');
SELECT is_empty($$SELECT id FROM public.essays$$, 'anon sees no essays');
SELECT is_empty($$SELECT id FROM public.recommendations$$, 'anon sees no recommendations');
SELECT is_empty($$SELECT id FROM public.test_scores_log$$, 'anon sees no test_scores_log');
SELECT is_empty($$SELECT id FROM public.counselor_assignments$$, 'anon sees no counselor_assignments');
SELECT is_empty($$SELECT id FROM public.messages$$, 'anon sees no messages');
SELECT is_empty($$SELECT id FROM public.interview_sessions$$, 'anon sees no interview_sessions');
SELECT is_empty($$SELECT id FROM public.tasks$$, 'anon sees no tasks');
SELECT is_empty($$SELECT id FROM public.parent_student_links$$, 'anon sees no parent_student_links');
SELECT is_empty($$SELECT id FROM public.activities$$, 'anon sees no activities');
SELECT is_empty($$SELECT id FROM public.visa_checklists$$, 'anon sees no visa_checklists');
SELECT is_empty($$SELECT id FROM public.admission_offers$$, 'anon sees no admission_offers');
SELECT is_empty($$SELECT id FROM public.subscriptions$$, 'anon sees no subscriptions');
SELECT is_empty($$SELECT id FROM public.notifications$$, 'anon sees no notifications');
SELECT is_empty($$SELECT id FROM public.universities$$, 'anon sees no universities');
SELECT is_empty($$SELECT id FROM public.scholarships$$, 'anon sees no scholarships');
SELECT is_empty($$SELECT id FROM public.housing_options$$, 'anon sees no housing_options');
SELECT is_empty($$SELECT id FROM public.alumni_profiles$$, 'anon sees no alumni_profiles');

RESET ROLE;
SELECT gsc_tests.clear_jwt();

SELECT * FROM finish();

ROLLBACK;
