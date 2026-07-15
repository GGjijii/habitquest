import { createBrowserClient } from '@supabase/ssr';

// クライアントコンポーネント(ブラウザ側)で使うSupabaseクライアント。
// NEXT_PUBLIC_ が付いた環境変数はブラウザにも見える値なので、
// ここには「公開しても問題ない」URLとanon keyだけを渡す。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
