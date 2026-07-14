import { createClient } from './supabase/client';
import { getSyncedLogs } from './gameLogic';

// DBの行 → アプリ内で使っている habit オブジェクトの形に変換
function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    logs: row.logs || {},
    notes: row.notes || {},
  };
}

// 自分の習慣を全部取得。あわせて「日付が変わって未記録のまま残っていた日」を
// ×(none)として確定させ、変化があった行だけDBにも書き戻す(遅延評価)。
export async function loadHabits() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('loadHabits failed:', error.message);
    return [];
  }

  const habits = (data || []).map(mapRow);
  const synced = [];
  for (const h of habits) {
    const newLogs = getSyncedLogs(h);
    if (JSON.stringify(newLogs) !== JSON.stringify(h.logs)) {
      const { error: updateError } = await supabase.from('habits').update({ logs: newLogs }).eq('id', h.id);
      if (updateError) console.error('sync update failed:', updateError.message);
      synced.push({ ...h, logs: newLogs });
    } else {
      synced.push(h);
    }
  }
  return synced;
}

export async function addHabit(userId, { name, icon, color }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name, icon, color, logs: {}, notes: {} })
    .select()
    .single();
  if (error) {
    console.error('addHabit failed:', error.message);
    return null;
  }
  return mapRow(data);
}

// デモデータを一括投入する(サンプルで試すボタン用)。作成日を過去にずらして
// 履歴のある状態を再現するため、created_atも明示的に指定する。
export async function seedHabits(userId, habits) {
  const supabase = createClient();
  const rows = habits.map((h) => ({
    user_id: userId,
    name: h.name,
    icon: h.icon,
    color: h.color,
    created_at: h.createdAt,
    logs: h.logs,
    notes: h.notes,
  }));
  const { data, error } = await supabase.from('habits').insert(rows).select();
  if (error) {
    console.error('seedHabits failed:', error.message);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function updateHabitFields(habitId, { name, icon, color }) {
  const supabase = createClient();
  const { error } = await supabase.from('habits').update({ name, icon, color }).eq('id', habitId);
  if (error) console.error('updateHabitFields failed:', error.message);
}

export async function deleteHabit(habitId) {
  const supabase = createClient();
  const { error } = await supabase.from('habits').delete().eq('id', habitId);
  if (error) console.error('deleteHabit failed:', error.message);
}

export async function saveLogs(habitId, logs) {
  const supabase = createClient();
  const { error } = await supabase.from('habits').update({ logs }).eq('id', habitId);
  if (error) console.error('saveLogs failed:', error.message);
}

export async function saveNotes(habitId, notes) {
  const supabase = createClient();
  const { error } = await supabase.from('habits').update({ notes }).eq('id', habitId);
  if (error) console.error('saveNotes failed:', error.message);
}
