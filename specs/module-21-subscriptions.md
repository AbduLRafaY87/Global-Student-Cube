# Module 21: Subscriptions Specs

## Table: public.subscriptions
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `user_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE, UNIQUE)
- `plan`: TEXT (NOT NULL, CHECK: plan IN ('free', 'premium', 'counselor_pro'))
- `status`: TEXT (NOT NULL, CHECK: status IN ('active', 'canceled', 'past_due'))
- `current_period_end`: TIMESTAMPTZ (NOT NULL)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: Own-row view only (`auth.uid() = user_id`).
- **INSERT/UPDATE**: Service Role or webhook trigger handlers.