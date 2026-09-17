CREATE TABLE IF NOT EXISTS public.counselor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.counselor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS counselor_assignments_select_participants ON public.counselor_assignments;
CREATE POLICY counselor_assignments_select_participants
  ON public.counselor_assignments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = counselor_id
  );

DROP POLICY IF EXISTS counselor_assignments_insert_admin ON public.counselor_assignments;
CREATE POLICY counselor_assignments_insert_admin
  ON public.counselor_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS counselor_assignments_delete_admin ON public.counselor_assignments;
CREATE POLICY counselor_assignments_delete_admin
  ON public.counselor_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, DELETE
  ON public.counselor_assignments
  TO authenticated;

DROP POLICY IF EXISTS user_profiles_select_assignment_counterpart ON public.user_profiles;
CREATE POLICY user_profiles_select_assignment_counterpart
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.counselor_assignments AS assignments
      WHERE (
        assignments.student_id = auth.uid()
        AND assignments.counselor_id = user_profiles.id
      )
      OR (
        assignments.counselor_id = auth.uid()
        AND assignments.student_id = user_profiles.id
      )
    )
  );

DROP POLICY IF EXISTS users_select_assignment_counterpart ON public.users;
CREATE POLICY users_select_assignment_counterpart
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.counselor_assignments AS assignments
      WHERE (
        assignments.student_id = auth.uid()
        AND assignments.counselor_id = users.id
      )
      OR (
        assignments.counselor_id = auth.uid()
        AND assignments.student_id = users.id
      )
    )
  );
