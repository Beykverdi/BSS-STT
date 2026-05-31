/*
  # Fix RLS for Legacy Data

  ## Summary
  Updates RLS policies to allow viewing legacy transcriptions with null user_id.
  This is needed for data migration purposes.

  ## Modified Policies
  - Updated "Users can view own transcriptions" to also show null user_id records
  - This allows existing data to be visible until properly migrated

  ## Important Notes
  1. Legacy data (user_id IS NULL) will be visible to all authenticated users
  2. New data requires proper user_id
  3. This should be reversed after migrating old data
*/

-- Drop and recreate the SELECT policy
DROP POLICY IF EXISTS "Users can view own transcriptions" ON public.transcriptions;

CREATE POLICY "Users can view own transcriptions"
  ON public.transcriptions FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND is_deleted = false)
    OR
    (user_id IS NULL AND is_deleted = false)
  );
