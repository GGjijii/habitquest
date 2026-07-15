import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Googleでログイン後、Supabaseがこの/auth/callback?code=...に一度リダイレクトしてくる。
// そのcodeを実際のログインセッションに交換して、トップページへ戻す。
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 失敗した場合はログイン画面にエラー付きで戻す
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
