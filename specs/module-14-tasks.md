# Module 14: Tasks & Checklist Specs

## Table: public.tasks
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `title`: TEXT (NOT NULL)
- `due_date`: DATE (NOT NULL)
- `is_completed`: BOOLEAN (DEFAULT false)
- `priority`: TEXT (NOT NULL, CHECK: priority IN ('low', 'medium', 'high'))
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Students manage only their own tasks (`auth.uid() = student_id`).