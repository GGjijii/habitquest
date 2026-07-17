import { createClient } from './supabase/client';

function mapProfile(row) {
  return {
    coins: row?.coins ?? 0,
    unlockedThemes: row?.unlocked_themes ?? [],
    questProgress: row?.quest_progress ?? {},
    lastQuestAttemptDate: row?.last_quest_attempt_date ?? null,
  };
}

// プロフィール(コイン・解放済みテーマ)を取得。まだ行が無い初回ユーザーには自動で作成する。
export async function loadProfile(userId) {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    console.error('loadProfile failed:', error.message);
    return mapProfile(null);
  }
  if (data) return mapProfile(data);

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: userId })
    .select()
    .single();
  if (insertError) {
    console.error('profile init failed:', insertError.message);
    return mapProfile(null);
  }
  return mapProfile(created);
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
