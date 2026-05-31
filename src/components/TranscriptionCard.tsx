import { useState } from 'react';
import { Trash2, Copy, Clock, Check, Globe, Download, ChevronDown } from 'lucide-react';
import type { Transcription } from '../types';

const LANGUAGE_LABELS: Record<string, string> = {
  'fa-IR': 'فارسی',
  'en-US': 'English',
  'ar-SA': 'عربی',
  'tr-TR': 'Turkish',
  'de-DE': 'Deutsch',
  'fr-FR': 'Français',
};

interface TranscriptionCardProps {
  item: Transcription;
  onDelete: (id: string) => void;
  onExport?: (id: string, format: 'txt' | 'srt' | 'vtt') => void;
}

export function TranscriptionCard({ item, onDelete, onExport }: TranscriptionCardProps) {
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('fa-IR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (secs: number) => {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  };

  const isRTL = item.language === 'fa-IR' || item.language === 'ar-SA';

  const wordCount = item.content?.split(/\s+/).length || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
            <Globe size={11} />
            {LANGUAGE_LABELS[item.language] || item.language}
          </span>
          {(formatDuration(item.audio_duration || item.duration_seconds)) && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 px-2.5 py-1 rounded-full">
              <Clock size={11} />
              {formatDuration(item.audio_duration || item.duration_seconds)}
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {wordCount.toLocaleString('fa-IR')} واژه
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatDate(item.created_at)}</span>
      </div>

      <p
        className={`text-gray-800 dark:text-gray-200 text-sm leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {item.content}
      </p>

      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          {copied ? 'کپی شد' : 'کپی'}
        </button>

        {onExport && (
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} />
              خروجی
              <ChevronDown size={12} />
            </button>
            {exportOpen && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-10 min-w-[100px]">
                <button
                  onClick={() => { onExport(item.id, 'txt'); setExportOpen(false); }}
                  className="w-full px-4 py-2 text-xs text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
                >
                  TXT
                </button>
                <button
                  onClick={() => { onExport(item.id, 'srt'); setExportOpen(false); }}
                  className="w-full px-4 py-2 text-xs text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
                >
                  SRT
                </button>
                <button
                  onClick={() => { onExport(item.id, 'vtt'); setExportOpen(false); }}
                  className="w-full px-4 py-2 text-xs text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
                >
                  VTT
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onDelete(item.id)}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
          حذف
        </button>
      </div>
    </div>
  );
}
