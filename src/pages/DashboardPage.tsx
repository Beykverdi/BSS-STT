import { useTranscriptionStats } from '../features/transcription/queries';
import { Mic, FileText, Clock, TrendingUp, Calendar, BarChart2, Loader2 } from 'lucide-react';
import { formatDuration } from '../utils/date';

export function DashboardPage() {
  const { data: stats, isLoading, error } = useTranscriptionStats();

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-700 dark:text-red-300">خطا در دریافت آمار</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'تعداد ضبط',
      value: stats.totalRecordings,
      icon: Mic,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-500',
    },
    {
      label: 'تعداد یادداشت',
      value: stats.totalTranscripts,
      icon: FileText,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-500',
    },
    {
      label: 'تعداد واژه',
      value: stats.totalWords.toLocaleString('fa-IR'),
      icon: TrendingUp,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-500',
    },
    {
      label: 'مدت زمان',
      value: formatDuration(stats.totalDuration),
      icon: Clock,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-500',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">داشبورد</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">آمار و عملکرد شما</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.lightColor} dark:bg-opacity-20`}>
                <stat.icon size={24} className={stat.textColor} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">نمودار استفاده</h2>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-lg">
              روزانه
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              هفتگی
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              ماهانه
            </button>
          </div>
        </div>

        {/* Placeholder Chart */}
        <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl">
          <p className="text-gray-400 dark:text-gray-500 text-sm">نمودار به زودی اضافه می‌شود</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">فعالیت‌های اخیر</h2>
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-sm text-gray-400 dark:text-gray-500">برای مشاهده فعالیت‌ها، ضبط جدیدی انجام دهید</p>
        </div>
      </div>
    </div>
  );
}
