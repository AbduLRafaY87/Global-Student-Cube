# Module 15: Parent Portal Specs

## Table: public.parent_student_links
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `parent_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `student_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: Parents can view linked student data (`auth.uid() = parent_id`).
- **INSERT/DELETE**: Student or Admin authorized creation.