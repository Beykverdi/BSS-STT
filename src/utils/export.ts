import type { Transcription } from '../types';

// Format duration to SRT/VTT timestamp
function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVTTTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// Export as TXT
export function exportToTXT(transcription: Transcription): void {
  const content = `${transcription.title}\n\n${transcription.content}`;
  downloadFile(content, `${transcription.title || 'transcription'}.txt`, 'text/plain;charset=utf-8');
}

// Export as SRT (subtitles)
export function exportToSRT(transcription: Transcription, wordsPerSegment = 5): void {
  const words = transcription.content.split(/\s+/);
  const duration = transcription.audio_duration || transcription.duration_seconds;
  const wordDuration = duration / words.length;

  let srt = '';
  let segmentIndex = 1;
  let currentSegmentWords: string[] = [];
  let startTime = 0;

  for (let i = 0; i < words.length; i++) {
    currentSegmentWords.push(words[i]);

    if (currentSegmentWords.length >= wordsPerSegment || i === words.length - 1) {
      const endTime = Math.min((i + 1) * wordDuration, duration);
      srt += `${segmentIndex}\n`;
      srt += `${formatTimestamp(startTime)} --> ${formatTimestamp(endTime)}\n`;
      srt += `${currentSegmentWords.join(' ')}\n\n`;

      segmentIndex++;
      startTime = endTime;
      currentSegmentWords = [];
    }
  }

  downloadFile(srt, `${transcription.title || 'transcription'}.srt`, 'text/plain;charset=utf-8');
}

// Export as VTT (WebVTT)
export function exportToVTT(transcription: Transcription, wordsPerSegment = 5): void {
  const words = transcription.content.split(/\s+/);
  const duration = transcription.audio_duration || transcription.duration_seconds;
  const wordDuration = duration / words.length;

  let vtt = 'WEBVTT\n\n';
  let segmentIndex = 1;
  let currentSegmentWords: string[] = [];
  let startTime = 0;

  for (let i = 0; i < words.length; i++) {
    currentSegmentWords.push(words[i]);

    if (currentSegmentWords.length >= wordsPerSegment || i === words.length - 1) {
      const endTime = Math.min((i + 1) * wordDuration, duration);
      vtt += `${segmentIndex}\n`;
      vtt += `${formatVTTTimestamp(startTime)} --> ${formatVTTTimestamp(endTime)}\n`;
      vtt += `${currentSegmentWords.join(' ')}\n\n`;

      segmentIndex++;
      startTime = endTime;
      currentSegmentWords = [];
    }
  }

  downloadFile(vtt, `${transcription.title || 'transcription'}.vtt`, 'text/vtt;charset=utf-8');
}

// Download helper
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export multiple transcriptions
export function exportAllToTXT(transcriptions: Transcription[]): void {
  const content = transcriptions
    .map((t, i) => `${i + 1}. ${t.title}\n${t.content}\nتاریخ: ${new Date(t.created_at).toLocaleDateString('fa-IR')}`)
    .join('\n\n---\n\n');

  downloadFile(content, 'all-transcriptions.txt', 'text/plain;charset=utf-8');
}
