# Module 16: Extracurricular Activities Specs

## Table: public.activities
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `title`: TEXT (NOT NULL)
- `organization`: TEXT (NOT NULL)
- `role`: TEXT (NOT NULL)
- `description`: TEXT (DEFAULT '')
- `hours_per_week`: NUMERIC (NOT NULL)
- `weeks_per_year`: NUMERIC (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Own-row only (`auth.uid() = student_id`).