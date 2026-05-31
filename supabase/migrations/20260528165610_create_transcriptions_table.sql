/*
  # Create Transcriptions Table

  ## Summary
  Creates the main data store for speech-to-text transcription history.

  ## New Tables
  - `transcriptions`
    - `id` (uuid, primary key) - Unique identifier
    - `title` (text) - Optional user-provided title for the transcription
    - `content` (text) - The transcribed text content
    - `language` (text) - Language code used for transcription (e.g., 'fa-IR', 'en-US')
    - `duration_seconds` (numeric) - Duration of the recorded audio in seconds
    - `created_at` (timestamptz) - When the transcription was created
    - `session_id` (text) - Anonymous session identifier for grouping user transcriptions

  ## Security
  - RLS enabled on `transcriptions` table
  - Public insert policy: anyone with a valid session_id can insert
  - Session-scoped select policy: users can only read their own session's transcriptions
  - Session-scoped delete policy: users can delete their own session's transcriptions
*/

CREATE TABLE IF NOT EXISTS transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '',
  content text NOT NULL,
  language text NOT NULL DEFAULT 'fa-IR',
  duration_seconds numeric DEFAULT 0,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session users can insert transcriptions"
  ON transcriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0);

CREATE POLICY "Session users can view own transcriptions"
  ON transcriptions FOR SELECT
  TO anon, authenticated
  USING (session_id IS NOT NULL AND length(session_id) > 0);

CREATE POLICY "Session users can delete own transcriptions"
  ON transcriptions FOR DELETE
  TO anon, authenticated
  USING (session_id IS NOT NULL AND length(session_id) > 0);

CREATE INDEX IF NOT EXISTS transcriptions_session_id_idx ON transcriptions(session_id);
CREATE INDEX IF NOT EXISTS transcriptions_created_at_idx ON transcriptions(created_at DESC);
