CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  university_id UUID REFERENCES public.universities (id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  interviewer_name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_sessions_select_own ON public.interview_sessions;
CREATE POLICY interview_sessions_select_own
  ON public.interview_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS interview_sessions_insert_own ON public.interview_sessions;
CREATE POLICY interview_sessions_insert_own
  ON public.interview_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS interview_sessions_update_own ON public.interview_sessions;
CREATE POLICY interview_sessions_update_own
  ON public.interview_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS interview_sessions_delete_own ON public.interview_sessions;
CREATE POLICY interview_sessions_delete_own
  ON public.interview_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.interview_sessions
  TO authenticated;
