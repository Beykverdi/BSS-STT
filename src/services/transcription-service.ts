import { supabase } from '../lib/supabase';
import type { Transcription, TranscriptionSearchParams } from '../types';

export async function searchTranscriptions(
  userId: string,
  params: TranscriptionSearchParams
): Promise<Transcription[]> {
  let query = supabase
    .from('transcriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Full-text search
  if (params.query) {
    query = query.textSearch('content', params.query, {
      type: 'websearch',
      config: 'simple',
    });
  }

  // Date range
  if (params.dateFrom) {
    query = query.gte('created_at', params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte('created_at', params.dateTo);
  }

  // Language filter
  if (params.language) {
    query = query.eq('language', params.language);
  }

  // Folder filter
  if (params.folderId) {
    query = query.eq('folder_id', params.folderId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getTranscriptionById(
  userId: string,
  id: string
): Promise<Transcription | null> {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTranscription(
  userId: string,
  transcription: {
    title?: string;
    content: string;
    language?: string;
    duration_seconds?: number;
    audio_url?: string | null;
    audio_duration?: number | null;
    audio_size?: number | null;
    folder_id?: string | null;
  }
): Promise<Transcription> {
  const { data, error } = await supabase
    .from('transcriptions')
    .insert({
      user_id: userId,
      ...transcription,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTranscription(
  userId: string,
  id: string,
  updates: Partial<Transcription>
): Promise<Transcription> {
  const { data, error } = await supabase
    .from('transcriptions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTranscription(
  userId: string,
  id: string
): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('transcriptions')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function getTranscriptionStats(userId: string): Promise<{
  totalRecordings: number;
  totalTranscripts: number;
  totalWords: number;
  totalDuration: number;
}> {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('content, duration_seconds')
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (error) {
    throw error;
  }

  const transcriptions = data || [];

  return {
    totalRecordings: transcriptions.filter((t) => t.duration_seconds > 0).length,
    totalTranscripts: transcriptions.length,
    totalWords: transcriptions.reduce((sum, t) => sum + (t.content?.split(/\s+/).length || 0), 0),
    totalDuration: transcriptions.reduce((sum, t) => sum + (t.duration_seconds || 0), 0),
  };
}
