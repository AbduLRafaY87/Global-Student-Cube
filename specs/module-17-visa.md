# Module 17: Visa & Immigration Specs

## Table: public.visa_checklists
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `country`: TEXT (NOT NULL)
- `document_name`: TEXT (NOT NULL)
- `is_completed`: BOOLEAN (DEFAULT false)
- `notes`: TEXT (DEFAULT '')
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/INSERT/UPDATE/DELETE**: Own-row only (`auth.uid() = student_id`).