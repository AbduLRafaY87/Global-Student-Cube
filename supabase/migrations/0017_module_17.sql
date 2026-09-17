CREATE TABLE IF NOT EXISTS public.visa_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  document_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.visa_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visa_checklists_select_own ON public.visa_checklists;
CREATE POLICY visa_checklists_select_own
  ON public.visa_checklists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS visa_checklists_insert_own ON public.visa_checklists;
CREATE POLICY visa_checklists_insert_own
  ON public.visa_checklists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS visa_checklists_update_own ON public.visa_checklists;
CREATE POLICY visa_checklists_update_own
  ON public.visa_checklists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS visa_checklists_delete_own ON public.visa_checklists;
CREATE POLICY visa_checklists_delete_own
  ON public.visa_checklists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.visa_checklists
  TO authenticated;
