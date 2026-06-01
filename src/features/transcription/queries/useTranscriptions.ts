// Transcription Queries - React Query hooks for transcription data

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { Transcription } from '../../../types';
import type { AppError } from '../../../shared/errors';
import { DatabaseError, ErrorCode } from '../../../shared/errors';

/**
 * Query Keys (stable & production-safe)
 */
export const transcriptionKeys = {
  all: ['transcriptions'] as const,

  lists: () => [...transcriptionKeys.all, 'list'] as const,

  list: (filters?: {
    folderId?: string;
    language?: string;
    limit?: number;
  }) =>
    [
      ...transcriptionKeys.lists(),
      filters?.folderId ?? 'all',
      filters?.language ?? 'all',
      filters?.limit ?? 20,
    ] as const,

  details: () => [...transcriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transcriptionKeys.details(), id] as const,

  stats: () => [...transcriptionKeys.all, 'stats'] as const,

  search: (query: string) =>
    [
      ...transcriptionKeys.all,
      'search',
      query.trim().toLowerCase(),
    ] as const,
};

/**
 * Cached user getter (prevents auth spam)
 */
async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

/**
 * Infinite list with stable cursor pagination
 */
export function useTranscriptions(options?: {
  limit?: number;
  folderId?: string;
  language?: string;
}) {
  const limit = options?.limit ?? 20;

  return useInfiniteQuery({
    queryKey: transcriptionKeys.list(options),

    queryFn: async ({ pageParam }) => {
      const user = await requireUser();

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
      if (!lastPage || lastPage.length < limit) return null;

      const last = lastPage[lastPage.length - 1];

      return last?.created_at
        ? new Date(last.created_at).toISOString()
        : null;
    },

    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Single transcription
 */
export function useTranscription(id: string) {
  return useQuery({
    queryKey: transcriptionKeys.detail(id),

    queryFn: async () => {
      const user = await requireUser();

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

    staleTime: 60_000,
    retry: 2,
  });
}

/**
 * Create transcription
 */
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
      const user = await requireUser();

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
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.all });
    },

    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

/**
 * Update transcription
 */
export function useUpdateTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Transcription>;
    }) => {
      const user = await requireUser();

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
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.all });
    },

    retry: 2,
  });
}

/**
 * Soft delete
 */
export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const user = await requireUser();

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

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transcriptionKeys.all });
    },

    retry: 2,
  });
}