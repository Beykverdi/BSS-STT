import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '../../lib/theme-context';
import {
  Mic,
  LayoutDashboard,
  Mic2,
  LogOut,
  Sun,
  Moon,
  Settings,
  ChevronLeft,
  Menu,
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { icon: Mic2, label: 'تبدیل گفتار', path: '/transcribe' },
    { icon: LayoutDashboard, label: 'داشبورد', path: '/dashboard' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 font-[Vazirmatn,system-ui,sans-serif]" dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 transition-all duration-300 z-40 hidden lg:block ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                <Mic size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">گفتار به نوشتار</h1>
                <p className="text-xs text-gray-400">Speech to Text</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft
              size={18}
              className={`text-gray-500 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        {/* Nav items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-l from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon size={20} />
                {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-700">
          {sidebarOpen && (
            <div className="mb-3 flex items-center gap-3 px-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.fullName || 'کاربر'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}

          <div className={`flex ${sidebarOpen ? 'gap-2' : 'flex-col gap-2'}`}>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title={resolvedTheme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {sidebarOpen && <span className="text-sm">{resolvedTheme === 'dark' ? 'روشن' : 'تاریک'}</span>}
            </button>
            <button
              onClick={signOut}
              className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors"
              title="خروج"
            >
              <LogOut size={18} />
              {sidebarOpen && <span className="text-sm">خروج</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 z-40 px-4 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <Menu size={24} className="text-gray-600 dark:text-gray-300" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
            <Mic size={18} className="text-white" />
          </div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">گفتار به نوشتار</h1>
        </div>

        <div className="w-8" />
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <aside
        className={`lg:hidden fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 z-50 transform transition-transform ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">منو</h2>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-l from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.fullName || user?.email}
            </p>
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors"
          >
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm font-medium">{resolvedTheme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}</span>
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">خروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 pt-16 lg:pt-0 ${
          sidebarOpen ? 'lg:mr-64' : 'lg:mr-20'
        }`}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
