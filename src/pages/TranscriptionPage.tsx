import { useState, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { Mic, MicOff, Square, Trash2, Download, ChevronDown, AlertCircle, ClipboardList, Search, Loader2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { WaveAnimation } from '../components/WaveAnimation';
import { TranscriptionCard } from '../components/TranscriptionCard';
import { supabase } from '../lib/supabase';
import type { Transcription } from '../types';
import { exportToSRT, exportToVTT, exportToTXT } from '../utils/export';
import { formatDuration } from '../utils/date';
import {
  useTranscriptions,
  useSearchTranscriptions,
  useCreateTranscription,
  useDeleteTranscription,
} from '../features/transcription/queries';

const LANGUAGES = [
  { code: 'fa-IR', label: 'فارسی', flag: '🇮🇷' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'ar-SA', label: 'العربية', flag: '🇸🇦' },
  { code: 'tr-TR', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
];

export function TranscriptionPage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState('fa-IR');
  const [langOpen, setLangOpen] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // React Query hooks
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useTranscriptions();

  const { data: searchResults } = useSearchTranscriptions(searchQuery, {
    enabled: searchQuery.length > 0,
  });

  const createMutation = useCreateTranscription();
  const deleteMutation = useDeleteTranscription();

  // Flatten pages for display
  const transcriptions = data?.pages.flat() || [];
  const displayTranscriptions = searchQuery ? (searchResults || []) : transcriptions;

  const handleTranscriptUpdate = useCallback((finalText: string, interim: string) => {
    setTranscriptionText(finalText);
    setInterimText(interim);
  }, []);

  const { state, error, isSupported, duration, start, stop } = useSpeechRecognition({
    language,
    onTranscriptUpdate: handleTranscriptUpdate,
  });

  const handleStop = async () => {
    const finalText = (stop as () => string)() || transcriptionText.trim();

    if (!finalText || !user) {
      setTranscriptionText('');
      setInterimText('');
      return;
    }

    try {
      await createMutation.mutateAsync({
        content: finalText,
        language,
        duration_seconds: duration,
      });

      setTranscriptionText('');
      setInterimText('');
    } catch (err) {
      console.error('Failed to save transcription:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete transcription:', err);
    }
  };

  const handleExport = (id: string, format: 'txt' | 'srt' | 'vtt') => {
    const transcript = displayTranscriptions.find((t) => t.id === id);
    if (!transcript) return;

    if (format === 'txt') exportToTXT(transcript);
    else if (format === 'srt') exportToSRT(transcript);
    else if (format === 'vtt') exportToVTT(transcript);
  };

  const isRTL = language === 'fa-IR' || language === 'ar-SA';
  const isRecording = state === 'recording';
  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <div className="space-y-6">
      {/* Recorder Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Language Selector */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-50 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">زبان تشخیص</span>
            <div className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
              >
                <span>{currentLang?.flag}</span>
                <span>{currentLang?.label}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-30 min-w-[180px]">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${language === lang.code ? 'bg-blue-50 dark:bg-gray-700 text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recorder Area */}
        <div className="px-6 py-8">
          {!isSupported && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6">
              <AlertCircle size={18} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند. لطفا از Chrome یا Edge استفاده کنید.</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Wave / Mic Visual */}
          <div className="flex flex-col items-center gap-6 mb-8">
            {isRecording ? (
              <>
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 flex items-center justify-center animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                      <Mic size={28} className="text-red-500" />
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full" />
                </div>
                <WaveAnimation isActive={true} />
                <div className="flex items-center gap-2 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono font-medium">{formatDuration(duration)}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">در حال ضبط...</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Mic size={28} className="text-blue-500" />
                  </div>
                </div>
                <WaveAnimation isActive={false} />
                <p className="text-sm text-gray-400 dark:text-gray-500">برای شروع ضبط، دکمه زیر را فشار دهید</p>
              </>
            )}
          </div>

          {/* Transcript Preview */}
          <div
            className={`bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-6 min-h-[120px] border border-gray-100 dark:border-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">متن تشخیص داده شده (یا بنویسید):</label>
            <textarea
              value={transcriptionText}
              onChange={(e) => setTranscriptionText(e.target.value)}
              placeholder="متن در اینجا نمایش داده می‌شود یا خودتان تایپ کنید..."
              className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-gray-800 dark:text-gray-200"
              rows={4}
            />
            {isRecording && interimText && (
              <p className="text-sm text-blue-500 dark:text-blue-400 mt-2">{interimText}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <>
                <button
                  onClick={start}
                  disabled={!isSupported || createMutation.isPending}
                  className="flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-2xl font-medium text-sm shadow-md shadow-blue-200 dark:shadow-blue-900/50 hover:shadow-lg hover:shadow-blue-300 dark:hover:shadow-blue-800 transition-all duration-200 active:scale-95"
                >
                  <Mic size={18} />
                  شروع ضبط
                </button>
                {transcriptionText.trim() && (
                  <button
                    onClick={handleStop}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 disabled:opacity-50 text-white px-6 py-3.5 rounded-2xl font-medium text-sm shadow-md transition-all duration-200 active:scale-95"
                  >
                    {createMutation.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Download size={18} />
                    )}
                    {createMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-8 py-3.5 rounded-2xl font-medium text-sm shadow-md shadow-red-200 dark:shadow-red-900/50 hover:shadow-lg hover:shadow-red-300 dark:hover:shadow-red-800 transition-all duration-200 active:scale-95"
              >
                <Square size={16} fill="white" />
                توقف و ذخیره
              </button>
            )}
            {transcriptionText && !isRecording && (
              <button
                onClick={() => { setTranscriptionText(''); setInterimText(''); }}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-3.5 rounded-2xl text-sm transition-colors border border-gray-200 dark:border-gray-700"
              >
                <Trash2 size={15} />
                پاک کن
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-gray-500" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">تاریخچه تبدیل‌ها</h2>
            {displayTranscriptions.length > 0 && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-medium px-2 py-0.5 rounded-full">
                {displayTranscriptions.length}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        {transcriptions.length > 0 && (
          <div className="relative mb-4">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در یادداشت‌ها..."
              className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/4 mb-3" />
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : displayTranscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
              <MicOff size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">
              {searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز تبدیلی انجام نشده'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-gray-400 dark:text-gray-500">ضبط خود را شروع کنید تا اینجا ذخیره شود</p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayTranscriptions.map((item) => (
                <TranscriptionCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onExport={handleExport}
                />
              ))}
            </div>

            {/* Load More */}
            {!searchQuery && hasNextPage && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      در حال بارگذاری...
                    </>
                  ) : (
                    'بارگذاری بیشتر'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
