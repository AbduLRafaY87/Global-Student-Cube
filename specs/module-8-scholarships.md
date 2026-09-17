# Module 8: Financial Aid & Scholarships Specs

## Table: public.scholarships
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `title`: TEXT (NOT NULL)
- `provider`: TEXT (NOT NULL)
- `amount`: NUMERIC (NOT NULL)
- `country`: TEXT (NOT NULL)
- `minimum_gpa`: NUMERIC (NOT NULL)
- `deadline`: DATE (NOT NULL)
- `application_url`: TEXT (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: All authenticated users can view active scholarships.
- **INSERT/UPDATE/DELETE**: Admin role only.