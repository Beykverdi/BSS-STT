// Transcription Stats Query - Dashboard statistics

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { transcriptionKeys } from './useTranscriptions';
import { DatabaseError, ErrorCode } from '../../../shared/errors';

export interface TranscriptionStats {
  totalRecordings: number;
  totalTranscripts: number;
  totalWords: number;
  totalDuration: number;
}

export function useTranscriptionStats() {
  return useQuery({
    queryKey: transcriptionKeys.stats(),
    queryFn: async (): Promise<TranscriptionStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use database aggregation for performance
      const { data, error } = await supabase.rpc('get_transcription_stats', {
        p_user_id: user.id,
      });

      if (error) {
        // If RPC doesn't exist, fall back to client-side calculation
        const { data: transcripts, error: queryError } = await supabase
          .from('transcriptions')
          .select('content, duration_seconds')
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        if (queryError) {
          throw new DatabaseError(
            ErrorCode.DATABASE_QUERY_FAILED,
            queryError.message,
            queryError
          );
        }

        const items = transcripts || [];
        return {
          totalRecordings: items.filter((t) => t.duration_seconds > 0).length,
          totalTranscripts: items.length,
          totalWords: items.reduce((sum, t) => sum + (t.content?.split(/\s+/).length || 0), 0),
          totalDuration: items.reduce((sum, t) => sum + (t.duration_seconds || 0), 0),
        };
      }

      return data as TranscriptionStats;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
