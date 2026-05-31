// Database Types - Generated from Supabase Schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transcriptions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          language: string;
          duration_seconds: number;
          audio_url: string | null;
          audio_duration: number | null;
          audio_size: number | null;
          folder_id: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          content: string;
          language?: string;
          duration_seconds?: number;
          audio_url?: string | null;
          audio_duration?: number | null;
          audio_size?: number | null;
          folder_id?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          language?: string;
          duration_seconds?: number;
          audio_url?: string | null;
          audio_duration?: number | null;
          audio_size?: number | null;
          folder_id?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          parent_id?: string | null;
          created_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      transcription_tags: {
        Row: {
          transcription_id: string;
          tag_id: string;
        };
        Insert: {
          transcription_id: string;
          tag_id: string;
        };
        Update: {
          transcription_id?: string;
          tag_id?: string;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Transcription = Database['public']['Tables']['transcriptions']['Row'];
export type Folder = Database['public']['Tables']['folders']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
