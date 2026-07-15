// ゲームバランス・EXP計算・進化段階などの純粋なロジック。
// Reactに依存しないので、UIと切り離して単独でテストや調整がしやすい。
// 数値調整はこのファイルの GAME_BALANCE と CHECK_LEVELS を触れば完結する。

/* ============================================================
   ゲームバランス設定
   数値をここに集約。プレイして調整する前提の可変パラメータ。
   ============================================================ */
export const GAME_BALANCE = {
  // ◎を66日連続で続けると、ちょうどMAX_EXPに到達して完全体になるよう逆算した数値。
  // 内訳: ◎66日分の基本EXP(66×10=660) + 7日連続ボーナス(66日間で9回発生 ×20=180) = 840
  EXP_BY_LEVEL: { full: 10, good: 5, partial: 1 },
  // ×(できなかった)は固定減点ではなく、連続するほど重くなる。
  // 1日目−3、2日目−6、3日目−9…(MISS_PENALTY_BASE × 連続日数)。
  // 「2日連続サボると、やらない習慣がついてしまう」という体感を再現するための設計。
  MISS_PENALTY_BASE: -3,
  STREAK_BONUS_EVERY: 7,
  STREAK_BONUS_EXP: 20,
  EXP_PER_LEVEL: 42,
  MAX_LEVEL: 20,
  MAX_EXP: 840,
  // 10段階。数値を細かく刻むことで、頻繁に見た目が変わる楽しさを優先している。
  // 序盤ほど間隔を短く(早い段階で報酬を感じてもらう)、終盤はやや間隔を空けている。
  STAGE_LEVEL_THRESHOLDS: [0, 1, 3, 5, 7, 9, 12, 15, 18, 20],
};

/* 日次チェックの4段階(達成率はこのscoreの平均で計算する) */
export const CHECK_LEVELS = [
  { key: 'none', label: 'できなかった', score: 0 },
  { key: 'partial', label: '少し触った', score: 0.33 },
  { key: 'good', label: 'まぁできた', score: 0.66 },
  { key: 'full', label: 'かなりできた', score: 1 },
];
export const LEVEL_SCORE = Object.fromEntries(CHECK_LEVELS.map((l) => [l.key, l.score]));
export const LEVEL_LABEL = Object.fromEntries(CHECK_LEVELS.map((l) => [l.key, l.label]));

export function levelStyle(level, color) {
  if (level === undefined) return { backgroundColor: '#0f172a', border: '1.5px dashed #334155' };
  if (level === 'full') return { backgroundColor: color, border: 'none' };
  if (level === 'good') return { backgroundColor: color + 'b3', border: 'none' };
  if (level === 'partial') return { backgroundColor: color + '4d', border: 'none' };
  return { backgroundColor: '#0f172a', border: '1.5px solid #ff3d81' };
}

/* チェックボタンの記号(日本語でおなじみの◎○△×評価に合わせる)と文字色 */
export const LEVEL_SYMBOL = { full: '◎', good: '○', partial: '△', none: '×' };
export const LEVEL_TEXT_COLOR = { full: '#020617', good: '#020617', partial: '#e2e8f0', none: '#ff8fc0' };

export const STAGE_NAMES = ['たまご', '芽生え', 'よちよち期', '疾走期', '覚醒期', '開花期', '飛翔期', '光輝期', '覇者期', '完全体'];

export const CONDITION_LABEL = {
  great: { text: '絶好調', color: '#22e2ff' },
  normal: { text: 'ふつう', color: '#94a3b8' },
  weak: { text: '弱り気味', color: '#fbbf24' },
  down: { text: '瀕死', color: '#ff3d81' },
};

export const COLOR_PRESETS = ['#22e2ff', '#8b5cf6', '#ff3d81', '#34d399', '#fbbf24', '#60a5fa'];
export const ICON_PRESETS = ['💪', '📚', '🏃', '🧘', '💧', '🌅', '🥗', '🎸', '📝', '🦷', '🛏️', '🎨'];

/* キャラが育つ方向性のテーマ。アイコン(絵文字)は自由入力を許すため、見た目のカテゴリは
   アイコンから自動判定せず、ユーザーが別途明示的に選ぶ形にしている。 */
export const THEMES = [
  { key: 'muscle', label: '筋肉系', icon: '💪' },
  { key: 'study', label: '学習系', icon: '📚' },
  { key: 'wellness', label: '生活・休息系', icon: '💧' },
  { key: 'creative', label: 'クリエイティブ系', icon: '🎨' },
  { key: 'default', label: 'おまかせ', icon: '✨' },
];

export const displayStyle = { fontFamily: 'var(--font-rajdhani), sans-serif', letterSpacing: '0.03em' };
export const monoStyle = { fontFamily: 'var(--font-jetbrains-mono), monospace' };

/* ============================================================
   日付ユーティリティ(ローカルタイムゾーン基準)
   ============================================================ */
export function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDate(d);
}
export function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/* ============================================================
   未記録の過去日を「none(できなかった)」として遅延評価で確定させる
   (バックエンドのcronなしで「日付が変わったら自動で×」を実現)
   ============================================================ */
export function getSyncedLogs(habit) {
  const logs = { ...habit.logs };
  const start = new Date(habit.createdAt + 'T00:00:00');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= yesterday && guard < 500) {
    const ds = formatLocalDate(cursor);
    if (!logs[ds]) logs[ds] = 'none';
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return logs;
}

/* ============================================================
   ログからEXP・レベル・進化段階・コンディションを算出
   statsFromLogs: 与えられたログ集合だけからEXP/レベル/最長ストリークを算出(現在・過去共通)
   computeStatsAt: 基準日(refDate)時点での状態を算出。基準日を過去にすれば
                    「1ヶ月前はこうだった」を再現できる(キャラ変遷ギャラリー用)

   達成率の考え方:
   「できた/できなかった」の2択ではなく、CHECK_LEVELSの4段階(0 / 0.33 / 0.66 / 1)の
   スコアの平均を「達成率」として使う。EXPは段階ごとに固定値を加算し、
   noneの日だけストリークが途切れる(部分的にでも触っていればストリークは継続)。
   ============================================================ */
export function statsFromLogs(logs) {
  const dates = Object.keys(logs).sort();
  let exp = 0;
  let streak = 0;
  let longestStreak = 0;
  let missStreak = 0; // ×が連続した日数(ペナルティ加速の元になる。非×の日でリセット)
  let streakScores = []; // 現在の連続記録中の日ごとのスコア(0〜1)。ボーナスの質を決めるのに使う
  for (const date of dates) {
    const level = logs[date];
    if (level === 'none') {
      missStreak += 1;
      const penalty = GAME_BALANCE.MISS_PENALTY_BASE * missStreak; // -3, -6, -9, -12...
      exp = Math.max(0, exp + penalty);
      streak = 0;
      streakScores = [];
    } else {
      missStreak = 0;
      const delta = GAME_BALANCE.EXP_BY_LEVEL[level] ?? 0;
      exp += delta;
      streak += 1;
      streakScores.push(LEVEL_SCORE[level] ?? 0);
      longestStreak = Math.max(longestStreak, streak);
      if (streak % GAME_BALANCE.STREAK_BONUS_EVERY === 0) {
        // 直近7日の質(◎ばかりなら1.0、△続きなら0.33程度)に応じてボーナスの大きさを変える。
        // 全部◎なら満額(これまでと同じ計算結果になり、66日で完全体という設計は変わらない)。
        const recent7 = streakScores.slice(-GAME_BALANCE.STREAK_BONUS_EVERY);
        const avgScore = recent7.reduce((a, b) => a + b, 0) / recent7.length;
        exp += Math.round(GAME_BALANCE.STREAK_BONUS_EXP * avgScore);
      }
    }
  }
  exp = Math.min(Math.max(0, exp), GAME_BALANCE.MAX_EXP);
  const level = Math.min(GAME_BALANCE.MAX_LEVEL, Math.floor(exp / GAME_BALANCE.EXP_PER_LEVEL));
  let stage = 0;
  for (let i = GAME_BALANCE.STAGE_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (level >= GAME_BALANCE.STAGE_LEVEL_THRESHOLDS[i]) { stage = i; break; }
  }
  return { exp, level, stage, streak, longestStreak, missStreak };
}

export function computeStatsAt(habit, refDate) {
  const fullLogs = getSyncedLogs(habit);
  const logsUpTo = {};
  Object.keys(fullLogs).forEach((d) => { if (d <= refDate) logsUpTo[d] = fullLogs[d]; });
  const base = statsFromLogs(logsUpTo);

  const last7 = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(refDate + 'T00:00:00');
    d.setDate(d.getDate() - i);
    const ds = formatLocalDate(d);
    if (logsUpTo[ds]) last7.push(logsUpTo[ds]);
  }
  const avgScore = last7.length > 0 ? last7.reduce((sum, l) => sum + (LEVEL_SCORE[l] ?? 0), 0) / last7.length : 0;
  const noneCount = last7.filter((l) => l === 'none').length;

  let consecNone = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(refDate + 'T00:00:00');
    d.setDate(d.getDate() - i);
    const ds = formatLocalDate(d);
    if (logsUpTo[ds] === 'none') consecNone++;
    else break;
  }

  let condition = 'normal';
  if (consecNone >= 7) condition = 'down';
  else if (noneCount >= 3 || avgScore < 0.35) condition = 'weak';
  else if (avgScore >= 0.8) condition = 'great';

  return { logs: logsUpTo, ...base, condition, todayStatus: logsUpTo[refDate] };
}

export function computeStats(habit) {
  return computeStatsAt(habit, todayStr());
}

export function computeStatsAsOf(habit, cutoffDate) {
  return computeStatsAt(habit, cutoffDate);
}

/* ============================================================
   週次/月次の達成率集計(グラフ用)
   達成率(%) = その期間に記録があった日の CHECK_LEVELS スコア平均 × 100
   ============================================================ */
export function weeklyAggregation(habit, weeksCount = 8) {
  const logs = getSyncedLogs(habit);
  const result = [];
  for (let w = weeksCount - 1; w >= 0; w--) {
    let scoreSum = 0, count = 0;
    for (let d = 0; d < 7; d++) {
      const ds = todayStr(-(w * 7 + d));
      const l = logs[ds];
      if (l !== undefined) { scoreSum += LEVEL_SCORE[l] ?? 0; count++; }
    }
    const rate = count > 0 ? Math.round((scoreSum / count) * 100) : 0;
    const labelDate = new Date();
    labelDate.setDate(labelDate.getDate() - w * 7);
    result.push({ label: `${labelDate.getMonth() + 1}/${labelDate.getDate()}`, rate, count });
  }
  return result;
}

export function monthlyAggregation(habit, monthsCount = 6) {
  const logs = getSyncedLogs(habit);
  const result = [];
  const now = new Date();
  for (let m = monthsCount - 1; m >= 0; m--) {
    const target = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const year = target.getFullYear();
    const month = target.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let scoreSum = 0, count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const l = logs[ds];
      if (l !== undefined) { scoreSum += LEVEL_SCORE[l] ?? 0; count++; }
    }
    const rate = count > 0 ? Math.round((scoreSum / count) * 100) : 0;
    result.push({ label: `${month + 1}月`, rate, count });
  }
  return result;
}


/* ============================================================
   デモデータ(初回体験用)
   ============================================================ */
export function seedDemoData() {
  function daysAgoStr(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return formatLocalDate(d);
  }
  function weightedLevel(weights) {
    // weights: [none, partial, good, full] の相対確率
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    const order = ['none', 'partial', 'good', 'full'];
    for (let i = 0; i < order.length; i++) {
      if (r < weights[i]) return order[i];
      r -= weights[i];
    }
    return 'full';
  }

  const h1 = { id: genId(), name: '筋トレ', icon: '💪', color: '#22e2ff', theme: 'muscle', createdAt: daysAgoStr(70), logs: {}, notes: {} };
  for (let i = 70; i >= 1; i--) h1.logs[daysAgoStr(i)] = weightedLevel([1, 1, 3, 6]);
  h1.notes[daysAgoStr(3)] = '今日はいつもより追い込めた。フォームも安定してきた気がする。';

  const h2 = { id: genId(), name: '英語学習', icon: '📚', color: '#8b5cf6', theme: 'study', createdAt: daysAgoStr(20), logs: {}, notes: {} };
  for (let i = 20; i >= 1; i--) h2.logs[daysAgoStr(i)] = weightedLevel([2, 3, 3, 2]);

  const h3 = { id: genId(), name: '早起き', icon: '🌅', color: '#ff3d81', theme: 'wellness', createdAt: daysAgoStr(15), logs: {}, notes: {} };
  for (let i = 15; i >= 1; i--) h3.logs[daysAgoStr(i)] = i <= 8 ? 'none' : weightedLevel([1, 2, 3, 2]);
  h3.notes[daysAgoStr(9)] = '寝坊した…リズムが崩れてる。明日こそ立て直したい。';

  return [h1, h2, h3];
}
