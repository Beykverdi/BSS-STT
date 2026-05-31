/*
  # Add Full-Text Search Support

  ## Summary
  Adds PostgreSQL full-text search capabilities to transcriptions table with support for Persian, English, and Arabic.

  ## New Columns
  - `search_vector` (tsvector) - Pre-computed full-text search vector

  ## New Indexes
  - GIN index on `search_vector` for fast full-text search

  ## Triggers
  - Automatic update of `search_vector` on content/title change

  ## Important Notes
  1. Uses 'simple' configuration for multilingual support
  2. Supports Persian, English, Arabic, and other languages
  3. Automatically updates when transcript changes
  4. Enables instant search across 100k+ records
*/

-- Add search_vector column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE public.transcriptions ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_transcription_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tsvector_update ON public.transcriptions;

CREATE TRIGGER tsvector_update
  BEFORE INSERT OR UPDATE OF title, content ON public.transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_transcription_search_vector();

-- Create GIN index for fast full-text search
DROP INDEX IF EXISTS transcriptions_search_idx;
CREATE INDEX transcriptions_search_idx ON public.transcriptions USING gin(search_vector);

-- Update existing records with search vectors
UPDATE public.transcriptions
SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(content, '')), 'B')
WHERE search_vector IS NULL;

-- Create RPC function for stats (for dashboard)
CREATE OR REPLACE FUNCTION get_transcription_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'totalRecordings', COUNT(*) FILTER (WHERE duration_seconds > 0),
    'totalTranscripts', COUNT(*),
    'totalWords', COALESCE(SUM(array_length(regexp_split_to_array(content, '\s+'), 1)), 0),
    'totalDuration', COALESCE(SUM(duration_seconds), 0)
  )
  INTO result
  FROM public.transcriptions
  WHERE user_id = p_user_id AND is_deleted = false;

  RETURN result;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;
