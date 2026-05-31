import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Mic, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'reset';

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError('ایمیل یا رمز عبور اشتباه است');
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('این ایمیل قبلاً ثبت شده است');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('حساب کاربری ایجاد شد. وارد شوید.');
          setMode('login');
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError('خطا در ارسال ایمیل بازیابی');
        } else {
          setSuccess('ایمیل بازیابی ارسال شد');
        }
      }
    } catch (err) {
      setError('خطایی رخ داد');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 font-[Vazirmatn,system-ui,sans-serif]" dir="rtl">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Mic size={24} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">گفتار به نوشتار</h1>
              <p className="text-sm text-gray-500">Speech to Text AI</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ورود
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null); }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ثبت نام
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <AlertCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    نام و نام خانوادگی
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="نام خود را وارد کنید"
                      className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ایمیل
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                    required
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-left"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    رمز عبور
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور"
                      dir="ltr"
                      required
                      minLength={6}
                      className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-left"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-medium shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'ورود' : mode === 'signup' ? 'ثبت نام' : 'ارسال ایمیل بازیابی'}
                    <ArrowRight size={18} className="rotate-180" />
                  </>
                )}
              </button>
            </form>

            {/* Forgot Password */}
            {mode === 'login' && (
              <button
                onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
              >
                فراموشی رمز عبور
              </button>
            )}

            {mode === 'reset' && (
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="w-full text-center text-sm text-gray-600 hover:text-gray-700 mt-4"
              >
                بازگشت به صفحه ورود
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
