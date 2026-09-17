CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_student_id_fkey;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_university_id_fkey;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_university_id_fkey
  FOREIGN KEY (university_id) REFERENCES public.universities (id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_set_updated_at ON public.applications;
CREATE TRIGGER applications_set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applications_own_records ON public.applications;

DROP POLICY IF EXISTS applications_select_own ON public.applications;
CREATE POLICY applications_select_own
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS applications_insert_own ON public.applications;
CREATE POLICY applications_insert_own
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS applications_update_own ON public.applications;
CREATE POLICY applications_update_own
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS applications_delete_own ON public.applications;
CREATE POLICY applications_delete_own
  ON public.applications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.applications
  TO authenticated;
