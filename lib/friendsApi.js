import { createClient } from './supabase/client';

// 自分の友達一覧を取得。表示用のfriend_codeは、友達になった時点のスナップショットを
// friendships行自体に持たせてあるので、他人のprofilesを直接読みにいく必要がない。
export async function loadFriends(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id, friend_code_snapshot, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('loadFriends failed:', error.message);
    return [];
  }
  return (data || []).map((row) => ({
    friendId: row.friend_id,
    friendCode: row.friend_code_snapshot,
    since: row.created_at,
  }));
}

// 友達コードを入力して友達になる。実際の検索・双方向登録はDB側のSECURITY DEFINER関数
// (add_friend_by_code)が行う。他人の行に自分の権限で書き込むことになるため、
// クライアントから直接friendshipsテーブルを触らせず、この決まった処理だけを許可する設計。
export async function addFriendByCode(code) {
  const supabase = createClient();
  const normalized = code.trim().toUpperCase();
  const { error } = await supabase.rpc('add_friend_by_code', { p_code: normalized });

  if (error) {
    if (error.message.includes('friend_code_not_found')) {
      return { ok: false, message: 'その友達コードは見つかりませんでした' };
    }
    if (error.message.includes('cannot_add_self')) {
      return { ok: false, message: '自分のコードは登録できません' };
    }
    console.error('addFriendByCode failed:', error.message);
    return { ok: false, message: '登録中にエラーが起きました' };
  }
  return { ok: true, message: '友達になりました!' };
}

