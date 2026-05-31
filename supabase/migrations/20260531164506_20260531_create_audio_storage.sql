/*
  # Create Audio Storage Bucket and Update Transcription Schema

  ## Summary
  Creates a storage bucket for audio recordings and adds upload tracking fields to transcriptions table.

  ## New Storage
  - `recordings` bucket for audio files

  ## Modified Tables
  - `transcriptions`
    - `audio_mime_type` (text) - MIME type of audio file
    - `upload_status` (text) - Status: pending, uploading, completed, failed
    - `upload_error` (text) - Error message if upload failed

  ## Security
  - Storage bucket policies: users can only access their own files
  - Policies enforce user_id in path matches auth.uid()

  ## Important Notes
  1. Audio files are stored with path: user_id/year/month/filename
  2. Users can only access their own recordings
  3. Upload status tracks progress and enables retry
*/

-- Add columns to transcriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'audio_mime_type'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN audio_mime_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'upload_status'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN upload_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'upload_error'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN upload_error text;
  END IF;
END $$;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,
  52428800, -- 50MB
  ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings bucket
CREATE POLICY "Users can upload own recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own recordings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add index for upload_status
CREATE INDEX IF NOT EXISTS transcriptions_upload_status_idx ON public.transcriptions(upload_status)
WHERE upload_status IS NOT NULL;
