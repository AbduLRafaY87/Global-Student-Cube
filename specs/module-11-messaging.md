# Module 11: Student-Counselor Messaging Specs

## Table: public.messages
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `sender_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `receiver_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `content`: TEXT (NOT NULL)
- `read`: BOOLEAN (DEFAULT false)
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## RLS Policies
- **SELECT**: Users can view messages where they are sender OR receiver (`auth.uid() = sender_id OR auth.uid() = receiver_id`).
- **INSERT**: Authenticated users can send messages where they are the sender (`auth.uid() = sender_id`).