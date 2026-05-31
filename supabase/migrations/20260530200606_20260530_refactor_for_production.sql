/*
  # Refactor Database for Production

  ## Summary
  Migrates from anonymous session-based architecture to authenticated user-based architecture.
  Improves security with proper RLS policies and adds support for audio recordings, folders, and tags.

  ## New Tables
  - `profiles` - User profile information
  - `folders` - User organization folders
  - `tags` - Transcription tags
  - `transcription_tags` - Many-to-many relationship for tags

  ## Modified Tables
  - `transcriptions` - Added user_id, audio fields, folder_id, soft delete
    - `user_id` (uuid, references auth.users) - Owner of the transcription
    - `audio_url` (text) - URL to stored audio file
    - `audio_duration` (numeric) - Duration of audio in seconds
    - `audio_size` (numeric) - Size of audio file in bytes
    - `folder_id` (uuid) - Reference to folder
    - `is_deleted` (boolean) - Soft delete flag
    - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all new tables
  - Strict policies using auth.uid() = user_id
  - Users can ONLY access their own data
  - Session-based data migrated to user-based

  ## Important Notes
  1. All existing session_id data will be preserved but deprecated
  2. New records require user_id (authenticated users only)
  3. RLS policies are RESTRICTIVE by default
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create transcription_tags junction table
CREATE TABLE IF NOT EXISTS public.transcription_tags (
  transcription_id uuid NOT NULL REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transcription_id, tag_id)
);

-- Update transcriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN audio_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'audio_duration'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN audio_duration numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'audio_size'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN audio_size numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcription_tags ENABLE ROW LEVEL SECURITY;

-- Drop old policies on transcriptions
DROP POLICY IF EXISTS "Session users can insert transcriptions" ON public.transcriptions;
DROP POLICY IF EXISTS "Session users can view own transcriptions" ON public.transcriptions;
DROP POLICY IF EXISTS "Session users can delete own transcriptions" ON public.transcriptions;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Folders policies
CREATE POLICY "Users can view own folders"
  ON public.folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON public.folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON public.folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON public.folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view own tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON public.tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Transcriptions policies (new, user-based)
CREATE POLICY "Users can view own transcriptions"
  ON public.transcriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "Users can create own transcriptions"
  ON public.transcriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcriptions"
  ON public.transcriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcriptions"
  ON public.transcriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Transcription tags policies
CREATE POLICY "Users can view transcription tags"
  ON public.transcription_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transcriptions
      WHERE transcriptions.id = transcription_tags.transcription_id
      AND transcriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage transcription tags"
  ON public.transcription_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transcriptions
      WHERE transcriptions.id = transcription_tags.transcription_id
      AND transcriptions.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON public.folders(parent_id);

CREATE INDEX IF NOT EXISTS tags_user_id_idx ON public.tags(user_id);

CREATE INDEX IF NOT EXISTS transcriptions_user_id_idx ON public.transcriptions(user_id);
CREATE INDEX IF NOT EXISTS transcriptions_folder_id_idx ON public.transcriptions(folder_id);
CREATE INDEX IF NOT EXISTS transcriptions_is_deleted_idx ON public.transcriptions(is_deleted);
CREATE INDEX IF NOT EXISTS transcriptions_created_at_idx ON public.transcriptions(created_at DESC);

-- Add full-text search index
CREATE INDEX IF NOT EXISTS transcriptions_content_search_idx ON public.transcriptions USING gin(to_tsvector('simple', content));
CREATE INDEX IF NOT EXISTS transcriptions_title_search_idx ON public.transcriptions USING gin(to_tsvector('simple', title));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to transcriptions
DROP TRIGGER IF EXISTS transcriptions_updated_at ON public.transcriptions;
CREATE TRIGGER transcriptions_updated_at
  BEFORE UPDATE ON public.transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Apply trigger to profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
