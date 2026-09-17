# Module 23: System Notifications Specs

## Table: public.notifications
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `user_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `title`: TEXT (NOT NULL)
- `message`: TEXT (NOT NULL)
- `is_read`: BOOLEAN (DEFAULT false)
- `link`: TEXT (DEFAULT '')
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT/UPDATE/DELETE**: Own-row only (`auth.uid() = user_id`).