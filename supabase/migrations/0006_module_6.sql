CREATE TABLE IF NOT EXISTS public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  university_id UUID REFERENCES public.universities (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  word_limit INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('brainstorming', 'drafting', 'review', 'final')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS essays_set_updated_at ON public.essays;
CREATE TRIGGER essays_set_updated_at
  BEFORE UPDATE ON public.essays
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS essays_select_own ON public.essays;
CREATE POLICY essays_select_own
  ON public.essays
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS essays_insert_own ON public.essays;
CREATE POLICY essays_insert_own
  ON public.essays
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS essays_update_own ON public.essays;
CREATE POLICY essays_update_own
  ON public.essays
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS essays_delete_own ON public.essays;
CREATE POLICY essays_delete_own
  ON public.essays
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.essays
  TO authenticated;
