# Module 9: Standardized Test Prep Specs

## Table: public.test_scores_log
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `test_type`: TEXT (NOT NULL, CHECK: test_type IN ('SAT', 'ACT', 'TOEFL', 'IELTS', 'GRE', 'GMAT'))
- `score`: NUMERIC (NOT NULL)
- `test_date`: DATE (NOT NULL)
- `is_official`: BOOLEAN (DEFAULT false)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Students can manage only their own test logs (`auth.uid() = student_id`).