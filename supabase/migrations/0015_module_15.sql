CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_student_links_select_parent ON public.parent_student_links;
CREATE POLICY parent_student_links_select_parent
  ON public.parent_student_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS parent_student_links_insert_student_or_admin ON public.parent_student_links;
CREATE POLICY parent_student_links_insert_student_or_admin
  ON public.parent_student_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS parent_student_links_delete_student_or_admin ON public.parent_student_links;
CREATE POLICY parent_student_links_delete_student_or_admin
  ON public.parent_student_links
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles AS profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, DELETE
  ON public.parent_student_links
  TO authenticated;

DROP POLICY IF EXISTS applications_select_linked_parent ON public.applications;
CREATE POLICY applications_select_linked_parent
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_student_links AS links
      WHERE links.parent_id = auth.uid()
        AND links.student_id = applications.student_id
    )
  );

DROP POLICY IF EXISTS tasks_select_linked_parent ON public.tasks;
CREATE POLICY tasks_select_linked_parent
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_student_links AS links
      WHERE links.parent_id = auth.uid()
        AND links.student_id = tasks.student_id
    )
  );

DROP POLICY IF EXISTS user_profiles_select_linked_parent ON public.user_profiles;
CREATE POLICY user_profiles_select_linked_parent
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_student_links AS links
      WHERE links.parent_id = auth.uid()
        AND links.student_id = user_profiles.id
    )
  );
