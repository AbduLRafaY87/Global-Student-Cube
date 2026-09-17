# Module 3: University Search & Database Specs

## Table: public.universities
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `name`: TEXT (NOT NULL)
- `country`: TEXT (NOT NULL)
- `tuition_fee`: NUMERIC (NOT NULL)
- `acceptance_rate`: NUMERIC (NOT NULL)
- `minimum_gpa`: NUMERIC (NOT NULL)
- `ranking`: INTEGER (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: Authenticated users can view all universities.
- **INSERT/UPDATE/DELETE**: Restricted to `admin` role users.