# Module 12: Interview Prep Specs

## Table: public.interview_sessions
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `university_id`: UUID (Foreign Key references public.universities(id) ON DELETE CASCADE, NULLABLE)
- `scheduled_at`: TIMESTAMPTZ (NOT NULL)
- `interviewer_name`: TEXT (NOT NULL)
- `notes`: TEXT (DEFAULT '')
- `status`: TEXT (NOT NULL, CHECK: status IN ('scheduled', 'completed', 'canceled'))
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Students manage only their own interview sessions (`auth.uid() = student_id`).