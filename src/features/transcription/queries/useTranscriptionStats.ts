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

async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export function useTranscriptionStats() {
  return useQuery({
    queryKey: transcriptionKeys.stats(),

    queryFn: async (): Promise<TranscriptionStats> => {
      const user = await requireUser();

      const { data, error } = await supabase.rpc(
        'get_transcription_stats',
        {
          p_user_id: user.id,
        }
      );

      if (error) {
        throw new DatabaseError(
          ErrorCode.DATABASE_QUERY_FAILED,
          error.message,
          error
        );
      }

      return data as TranscriptionStats;
    },

    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}