// Transcription Queries - React Query hooks for transcription data

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { Transcription } from '../../../types';
import type { AppError } from '../../../shared/errors';
import { parseError, DatabaseError, ErrorCode } from '../../../shared/errors';

// Query keys
export const transcriptionKeys = {
  all: ['transcriptions'] as const,
  lists: () => [...transcriptionKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...transcriptionKeys.lists(), filters] as const,
  details: () => [...transcriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transcriptionKeys.details(), id] as const,
  stats: () => [...transcriptionKeys.all, 'stats'] as const,
  search: (query: string) => [...transcriptionKeys.all, 'search', query] as const,
};

// Fetch transcriptions with cursor pagination
export function useTranscriptions(options?: {
  limit?: number;
  folderId?: string;
  language?: string;
}) {
  const limit = options?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: transcriptionKeys.list(options || {}),
    queryFn: async ({ pageParam }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('transcriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.folderId) {
        query = query.eq('folder_id', options.folderId);
      }

      if (options?.language) {
        query = query.eq('language', options.language);
      }

      // Cursor pagination
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseError(
          ErrorCode.DATABASE_QUERY_FAILED,
          error.message,
          error
        );
      }

      return data as Transcription[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < limit) return null;
      const lastItem = lastPage[lastPage.length - 1];
      return lastItem?.created_at || null;
    },
  });
}

// Fetch single transcription
export function useTranscription(id: string) {
  return useQuery({
    queryKey: transcriptionKeys.detail(id),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single();

      if (error) {
        throw new DatabaseError(
          ErrorCode.DATABASE_QUERY_FAILED,
          error.message,
          error
        );
      }

      return data as Transcription;
    },
    enabled: !!id,
  });
}

// Create transcription mutation
export function useCreateTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      content: string;
      language: string;
      duration_seconds?: number;
      audio_url?: string;
      audio_duration?: number;
      audio_size?: number;
      audio_mime_type?: string;
      folder_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transcriptions')
        .insert({
          user_id: user.id,
          ...input,
          upload_status: input.audio_url ? 'completed' : undefined,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseError(
          ErrorCode.DATABASE_INSERT_FAILED,
          error.message,
          error
        );
      }

      return data as Transcription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.stats() });
    },
  });
}

// Update transcription mutation
export function useUpdateTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transcription> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('transcriptions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(
          ErrorCode.DATABASE_UPDATE_FAILED,
          error.message,
          error
        );
      }

      return data as Transcription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.lists() });
    },
  });
}

// Delete transcription mutation (soft delete)
export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('transcriptions')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError(
          ErrorCode.DATABASE_DELETE_FAILED,
          error.message,
          error
        );
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.stats() });
    },
  });
}
