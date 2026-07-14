'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const hasError = searchParams.get('error') === 'auth';

  async function handleGoogleSignIn() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // ここでブラウザがGoogleのログイン画面へ遷移するので、以降の処理は基本発生しない
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={22} className="text-cyan-400" />
          <span className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'var(--font-rajdhani), sans-serif', letterSpacing: '0.03em' }}>
            HABITQUEST
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-10">習慣を続けると、キャラが育つ。</p>

        {hasError && (
          <div className="mb-6 text-xs text-fuchsia-400 border border-fuchsia-900 rounded-xl px-3 py-2">
            ログインに失敗しました。もう一度お試しください。
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-medium bg-white text-slate-900"
          style={{ opacity: isLoading ? 0.6 : 1 }}
        >
          <GoogleIcon />
          {isLoading ? '接続しています...' : 'Googleでログイン'}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.1-5.1C33.5 6.1 29 4.4 24 4.4 13.2 4.4 4.4 13.2 4.4 24S13.2 43.6 24 43.6 43.6 34.8 43.6 24c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6 4.4C13.9 15.6 18.6 12.8 24 12.8c3.1 0 5.8 1.1 8 3l5.1-5.1C33.5 6.1 29 4.4 24 4.4c-7.5 0-14 4.2-17.7 10.3z" />
      <path fill="#4CAF50" d="M24 43.6c4.9 0 9.4-1.6 12.8-4.5l-5.9-5c-2 1.4-4.6 2.2-6.9 2.2-5.3 0-9.7-3.3-11.3-7.9l-6 4.6C10 39.4 16.5 43.6 24 43.6z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.4l5.9 5c-.4.4 6.9-5 6.9-14.6 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
