import { createClient } from './supabase/client';

// 紛らわしい文字(0/O, 1/I/L など)を除いた文字セットで友達コードを生成
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateFriendCode() {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function mapProfile(row) {
  return {
    coins: row?.coins ?? 0,
    unlockedThemes: row?.unlocked_themes ?? [],
    questProgress: row?.quest_progress ?? {},
    lastQuestAttemptDate: row?.last_quest_attempt_date ?? null,
    friendCode: row?.friend_code ?? null,
  };
}

// プロフィール(コイン・解放済みテーマ)を取得。まだ行が無い初回ユーザーには自動で作成する。
// 友達コードが無ければここで発行する(既存ユーザーが初めてこのバージョンを開いた時のため)。
export async function loadProfile(userId) {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    console.error('loadProfile failed:', error.message);
    return mapProfile(null);
  }

  if (data) {
    if (!data.friend_code) {
      const assigned = await ensureFriendCode(userId);
      return mapProfile({ ...data, friend_code: assigned });
    }
    return mapProfile(data);
  }

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: userId, friend_code: generateFriendCode() })
    .select()
    .single();
  if (insertError) {
    console.error('profile init failed:', insertError.message);
    return mapProfile(null);
  }
  return mapProfile(created);
}

// 友達コードを発行して保存する。ごく低確率の重複時は数回だけ振り直す。
async function ensureFriendCode(userId) {
  const supabase = createClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFriendCode();
    const { error } = await supabase.from('profiles').update({ friend_code: code }).eq('user_id', userId);
    if (!error) return code;
    console.error('friend_code assign attempt failed:', error.message);
  }
  return null;
}

export async function addCoins(userId, currentCoins, amount) {
  const supabase = createClient();
  const newTotal = Math.max(0, currentCoins + amount);
  const { error } = await supabase.from('profiles').update({ coins: newTotal }).eq('user_id', userId);
  if (error) console.error('addCoins failed:', error.message);
  return newTotal;
}

// themeKeyを解放する。コインが足りない場合はnullを返す(呼び出し側で無視すればよい)。
export async function unlockTheme(userId, currentCoins, unlockedThemes, themeKey, cost) {
  if (unlockedThemes.includes(themeKey)) return { coins: currentCoins, unlockedThemes };
  if (currentCoins < cost) return null;

  const supabase = createClient();
  const newCoins = currentCoins - cost;
  const newUnlocked = [...unlockedThemes, themeKey];
  const { error } = await supabase.from('profiles').update({ coins: newCoins, unlocked_themes: newUnlocked }).eq('user_id', userId);
  if (error) {
    console.error('unlockTheme failed:', error.message);
    return null;
  }
  return { coins: newCoins, unlockedThemes: newUnlocked };
}

// クエストの挑戦結果を記録する。勝敗にかかわらず「本日の挑戦」は消費する(1日1ステージ制限)。
// 勝った場合のみ、そのステージ番号がquest_progressの最高到達点を超えていれば更新し、コインを加算する。
export async function recordQuestResult(userId, { worldKey, stageNumber, won, coinsEarned, currentProfile, todayStr }) {
  const supabase = createClient();
  const prevCleared = currentProfile.questProgress[worldKey] ?? 0;
  const newCleared = won ? Math.max(prevCleared, stageNumber) : prevCleared;
  const newCoins = won ? currentProfile.coins + coinsEarned : currentProfile.coins;
  const newProgress = { ...currentProfile.questProgress, [worldKey]: newCleared };

  const { error } = await supabase
    .from('profiles')
    .update({ coins: newCoins, quest_progress: newProgress, last_quest_attempt_date: todayStr })
    .eq('user_id', userId);
  if (error) console.error('recordQuestResult failed:', error.message);

  return { coins: newCoins, questProgress: newProgress, lastQuestAttemptDate: todayStr };
}
