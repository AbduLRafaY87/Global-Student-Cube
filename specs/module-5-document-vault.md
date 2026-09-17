# Module 5: Document Vault Specs

## Table: public.documents
- `id`: UUID (Primary Key, DEFAULT gen_random_uuid())
- `user_id`: UUID (Foreign Key references auth.users(id) ON DELETE CASCADE)
- `file_name`: TEXT (NOT NULL)
- `file_url`: TEXT (NOT NULL)
- `document_type`: TEXT (NOT NULL, CHECK: document_type IN ('transcript', 'passport', 'recommendation_letter', 'essay', 'other'))
- `created_at`: TIMESTAMPTZ (DEFAULT now())

## Storage Bucket
- `student-documents`: Private bucket for user document uploads.

## RLS Policies
- **Database & Storage**: Users can manage only their own documents (`auth.uid() = user_id`).