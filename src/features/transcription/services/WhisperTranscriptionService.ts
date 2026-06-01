import { supabase } from '@/lib/supabase';

export class WhisperTranscriptionService {
  async transcribe(
    audio: Blob,
    language: string
  ): Promise<string> {
    const formData = new FormData();

    formData.append(
      'audio',
      audio,
      'audio.webm'
    );

    formData.append(
      'language',
      language.split('-')[0]
    );

    const { data, error } =
      await supabase.functions.invoke(
        'transcribe-audio',
        {
          body: formData,
        }
      );

    if (error) {
      throw error;
    }

    if (!data?.text) {
      throw new Error(
        'Invalid transcription response'
      );
    }

    return data.text;
  }
}