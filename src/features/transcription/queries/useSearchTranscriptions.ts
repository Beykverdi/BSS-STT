// Search Transcriptions - Full-text search (safe & production-ready)

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { Transcription } from '../../../types';
import { transcriptionKeys } from './useTranscriptions';
import { DatabaseError, ErrorCode } from '../../../shared/errors';

export interface SearchResult extends Transcription {
  rank?: number;
  headline?: string;
}

/**
 * Safe search hook (NO debounce inside)
 */
export function useSearchTranscriptions(
  query: string,
  options?: { enabled?: boolean }
) {
  const normalizedQuery = query.trim().toLowerCase();

  return useQuery({
    queryKey: transcriptionKeys.search(normalizedQuery),

    queryFn: async (): Promise<SearchResult[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!normalizedQuery) return [];

      const sanitized = normalizedQuery.replace(/[^\w\s]/g, '');

      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .or(
          `content.ilike.%${sanitized}%,title.ilike.%${sanitized}%`
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new DatabaseError(
          ErrorCode.DATABASE_QUERY_FAILED,
          error.message,
          error
        );
      }

      return (data || []) as SearchResult[];
    },

    enabled:
      options?.enabled !== false &&
      normalizedQuery.length > 0,

    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}