// Search Transcriptions - Full-text search with debouncing

import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '../../../lib/supabase';
import type { Transcription } from '../../../types';
import { transcriptionKeys } from './useTranscriptions';
import { DatabaseError, ErrorCode } from '../../../shared/errors';

export interface SearchResult extends Transcription {
  rank?: number;
  headline?: string; // Highlighted snippet
}

export function useSearchTranscriptions(query: string, options?: { enabled?: boolean }) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: transcriptionKeys.search(debouncedQuery || ''),
    queryFn: async (): Promise<SearchResult[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!debouncedQuery || debouncedQuery.trim().length === 0) {
        return [];
      }

      const searchTerms = debouncedQuery.trim().split(/\s+/).join(' | ');

      // Use PostgreSQL full-text search
      const { data, error } = await supabase
        .from('transcriptions')
        .select(`
          *,
          rank: ts_rank_cd(search_vector, to_tsquery('simple', '${searchTerms}'))
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .textSearch('search_vector', searchTerms, {
          type: 'websearch',
          config: 'simple',
        })
        .order('rank', { ascending: false })
        .limit(50);

      if (error) {
        // Fallback to simple LIKE search if full-text fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('transcriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .or(`content.ilike.%${debouncedQuery}%,title.ilike.%${debouncedQuery}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fallbackError) {
          throw new DatabaseError(
            ErrorCode.DATABASE_QUERY_FAILED,
            fallbackError.message,
            fallbackError
          );
        }

        return (fallbackData || []) as SearchResult[];
      }

      return (data || []) as SearchResult[];
    },
    enabled: options?.enabled !== false && !!debouncedQuery && debouncedQuery.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

// Debounce hook
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
