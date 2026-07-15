'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Check, X, Trash2, Edit3, Home as HomeIcon, BookOpen, Flame, Sparkles,
  ChevronLeft, ChevronRight, BarChart3, CalendarDays, PawPrint, LogOut, HelpCircle, StickyNote,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import {
  GAME_BALANCE, CHECK_LEVELS, LEVEL_SCORE, LEVEL_LABEL, LEVEL_SYMBOL, LEVEL_TEXT_COLOR,
  levelStyle, STAGE_NAMES, CONDITION_LABEL, COLOR_PRESETS, ICON_PRESETS, THEMES,
  displayStyle, monoStyle, todayStr, genId, getSyncedLogs, computeStats, computeStatsAsOf,
  weeklyAggregation, monthlyAggregation, seedDemoData,
} from '@/lib/gameLogic';
import {
  loadHabits, addHabit as apiAddHabit, seedHabits, updateHabitFields, deleteHabit as apiDeleteHabit,
  saveLogs, saveNotes,
} from '@/lib/habitsApi';

/* ============================================================
   キャラクター SVG
   ============================================================ */
function StarEye({ cx, cy }) {
  const d = `M${cx},${cy - 5} L${cx + 1.5},${cy - 1.5} L${cx + 5},${cy} L${cx + 1.5},${cy + 1.5} L${cx},${cy + 5} L${cx - 1.5},${cy + 1.5} L${cx - 5},${cy} L${cx - 1.5},${cy - 1.5} Z`;
  return <path d={d} />;
}

function FaceLayer({ condition, bodyR }) {
  const eyeY = 48;
  const eyeDx = bodyR * 0.35;
  if (condition === 'down') {
    return (
      <g stroke="#020617" strokeWidth="2.5" strokeLinecap="round">
        <line x1={50 - eyeDx - 4} y1={eyeY - 4} x2={50 - eyeDx + 4} y2={eyeY + 4} />
        <line x1={50 - eyeDx - 4} y1={eyeY + 4} x2={50 - eyeDx + 4} y2={eyeY - 4} />
        <line x1={50 + eyeDx - 4} y1={eyeY - 4} x2={50 + eyeDx + 4} y2={eyeY + 4} />
        <line x1={50 + eyeDx - 4} y1={eyeY + 4} x2={50 + eyeDx + 4} y2={eyeY - 4} />
        <path d={`M${50 - 6},${eyeY + 16} Q50,${eyeY + 13} ${50 + 6},${eyeY + 16}`} fill="none" />
      </g>
    );
  }
  if (condition === 'great') {
    return (
      <g fill="#020617">
        <StarEye cx={50 - eyeDx} cy={eyeY} />
        <StarEye cx={50 + eyeDx} cy={eyeY} />
        <path d={`M${50 - 7},${eyeY + 13} Q50,${eyeY + 21} ${50 + 7},${eyeY + 13}`} stroke="#020617" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (condition === 'weak') {
    return (
      <g stroke="#020617" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d={`M${50 - eyeDx - 4},${eyeY - 2} Q${50 - eyeDx},${eyeY + 3} ${50 - eyeDx + 4},${eyeY - 2}`} />
        <path d={`M${50 + eyeDx - 4},${eyeY - 2} Q${50 + eyeDx},${eyeY + 3} ${50 + eyeDx + 4},${eyeY - 2}`} />
        <path d={`M${50 - 6},${eyeY + 17} Q50,${eyeY + 12} ${50 + 6},${eyeY + 17}`} />
      </g>
    );
  }
  return (
    <g>
      <circle cx={50 - eyeDx} cy={eyeY} r="3.2" fill="#020617" />
      <circle cx={50 + eyeDx} cy={eyeY} r="3.2" fill="#020617" />
      <path d={`M${50 - 6},${eyeY + 13} Q50,${eyeY + 17} ${50 + 6},${eyeY + 13}`} stroke="#020617" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function ThemeAccessory({ theme, bodyR }) {
  if (theme === 'muscle') {
    // 筋肉系: 右手のそばにダンベル
    const hx = 50 + bodyR + 3;
    const hy = 48;
    return (
      <g>
        <rect x={hx - 7} y={hy - 1.5} width="14" height="3" rx="1.5" fill="#1e293b" />
        <circle cx={hx - 7} cy={hy} r="4" fill="#1e293b" />
        <circle cx={hx + 7} cy={hy} r="4" fill="#1e293b" />
      </g>
    );
  }
  if (theme === 'study') {
    // 学習系: 目の位置に合わせたメガネ
    const eyeY = 48;
    const eyeDx = bodyR * 0.35;
    return (
      <g stroke="#1e293b" strokeWidth="2" fill="none">
        <circle cx={50 - eyeDx} cy={eyeY} r="6" />
        <circle cx={50 + eyeDx} cy={eyeY} r="6" />
        <line x1={50 - eyeDx + 6} y1={eyeY} x2={50 + eyeDx - 6} y2={eyeY} />
      </g>
    );
  }
  if (theme === 'wellness') {
    // 生活・休息系: 頭のそばに小さな花
    const fx = 50 - bodyR - 6;
    const fy = 40;
    return (
      <g fill="#fde68a">
        <circle cx={fx} cy={fy - 4} r="3" />
        <circle cx={fx} cy={fy + 4} r="3" />
        <circle cx={fx - 4} cy={fy} r="3" />
        <circle cx={fx + 4} cy={fy} r="3" />
        <circle cx={fx} cy={fy} r="2.5" fill="#fbbf24" />
      </g>
    );
  }
  if (theme === 'creative') {
    // クリエイティブ系: パレット
    const hx = 50 + bodyR + 3;
    const hy = 46;
    return (
      <g>
        <ellipse cx={hx} cy={hy} rx="7" ry="5" fill="#e2e8f0" opacity="0.9" />
        <circle cx={hx - 3} cy={hy - 1.5} r="1.3" fill="#ff3d81" />
        <circle cx={hx + 1} cy={hy - 2} r="1.3" fill="#22e2ff" />
        <circle cx={hx + 3} cy={hy + 1.5} r="1.3" fill="#fbbf24" />
      </g>
    );
  }
  return null;
}

function Creature({ stage, condition, color, theme = 'default', size = 72 }) {
  const isDown = condition === 'down';
  const isGreat = condition === 'great';
  // 段階が上がるほど大きく育つ(たまご:20 → 完全体:55.5)。viewBoxも合わせて広げてあるので、
  // 終盤の大きな体や翼が枠外に切れないようになっている。
  const bodyR = 20 + stage * 3.5;
  const wobble = isDown ? 'rotate(14deg)' : 'rotate(0deg)';
  const filterStyle = isDown
    ? 'grayscale(0.6) brightness(0.75)'
    : isGreat
    ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`
    : `drop-shadow(0 0 3px ${color}88)`;

  /* 段階が上がるごとに見た目のパーツが増えていく(脚→腕→トゲ→翼→マント→オーラ粒子→王冠)。
     テーマ別のアクセサリーは腕が生える段階(stage>=3)からあわせて表示する。 */
  const hasLegs = stage >= 2;
  const hasArms = stage >= 3;
  const spikeCount = stage >= 4 ? Math.min(6, stage - 3) : 0;
  const hasWings = stage >= 6;
  const hasCape = stage >= 7;
  const hasParticles = stage >= 8;
  const hasCrown = stage >= 9;

  return (
    <svg viewBox="-25 -25 150 150" width={size} height={size} style={{ transform: wobble, filter: filterStyle, transition: 'all 0.4s ease' }}>
      <ellipse cx="50" cy="88" rx={bodyR * 0.7} ry="5" fill="#000" opacity="0.35" />

      {(hasParticles || hasCrown) && (
        <circle cx="50" cy="50" r={bodyR + (hasCrown ? 16 : 10)} fill="none" stroke={color} strokeWidth="1.5" opacity="0.5">
          <animate
            attributeName="r"
            values={hasCrown ? `${bodyR + 13};${bodyR + 19};${bodyR + 13}` : `${bodyR + 7};${bodyR + 12};${bodyR + 7}`}
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {hasParticles &&
        Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * 360 * (Math.PI / 180);
          const r = bodyR + 20;
          const px = 50 + Math.cos(angle) * r;
          const py = 50 + Math.sin(angle) * r;
          return (
            <circle key={i} cx={px} cy={py} r="2.2" fill={color} opacity="0.8">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          );
        })}

      {hasCape && (
        <path
          d={`M${50 - bodyR * 0.5},${48} Q${50 - bodyR - 16},${70} ${50 - bodyR * 0.3},${86} Q${50 - bodyR * 0.6},${68} ${50 - bodyR * 0.4},${48} Z`}
          fill={color}
          opacity="0.5"
        />
      )}

      {hasLegs && (
        <>
          <rect x={50 - bodyR * 0.55} y={50 + bodyR * 0.55} width={bodyR * 0.35} height={bodyR * 0.5} rx="4" fill={color} opacity="0.9" />
          <rect x={50 + bodyR * 0.2} y={50 + bodyR * 0.55} width={bodyR * 0.35} height={bodyR * 0.5} rx="4" fill={color} opacity="0.9" />
        </>
      )}

      {Array.from({ length: spikeCount }).map((_, i, arr) => {
        const angle = (-90 + (i - (arr.length - 1) / 2) * 20) * (Math.PI / 180);
        const x1 = 50 + Math.cos(angle) * (bodyR - 4);
        const y1 = 50 + Math.sin(angle) * (bodyR - 4);
        const x2 = 50 + Math.cos(angle) * (bodyR + 12);
        const y2 = 50 + Math.sin(angle) * (bodyR + 12);
        return <polygon key={i} points={`${x1 - 3.5},${y1} ${x1 + 3.5},${y1} ${x2},${y2}`} fill={color} />;
      })}

      {stage === 0 ? (
        <>
          <ellipse cx="50" cy="55" rx={bodyR * 0.8} ry={bodyR} fill={color} opacity="0.9" />
          <path d="M40,40 L48,55 L42,60 L52,72" stroke="#020617" strokeWidth="2" fill="none" opacity="0.5" />
        </>
      ) : (
        <circle cx="50" cy="52" r={bodyR} fill={color} />
      )}

      {hasArms && (
        <>
          <ellipse cx={50 - bodyR - 3} cy="48" rx={6 + stage * 0.3} ry={10 + stage * 0.4} fill={color} opacity="0.85" />
          <ellipse cx={50 + bodyR + 3} cy="48" rx={6 + stage * 0.3} ry={10 + stage * 0.4} fill={color} opacity="0.85" />
        </>
      )}

      {hasWings && (
        <>
          <ellipse cx={50 - bodyR - 12} cy="42" rx={10 + stage * 0.6} ry={18 + stage} fill={color} opacity="0.6" />
          <ellipse cx={50 + bodyR + 12} cy="42" rx={10 + stage * 0.6} ry={18 + stage} fill={color} opacity="0.6" />
        </>
      )}

      {hasCrown && (
        <polygon
          points={`${50 - 13},${52 - bodyR - 3} ${50 - 6.5},${52 - bodyR - 14} ${50},${52 - bodyR - 3} ${50 + 6.5},${52 - bodyR - 14} ${50 + 13},${52 - bodyR - 3}`}
          fill="#fbbf24"
        />
      )}

      {stage !== 0 && <FaceLayer condition={condition} bodyR={bodyR} />}
      {hasArms && <ThemeAccessory theme={theme} bodyR={bodyR} />}
    </svg>
  );
}

function ExpRing({ exp, size = 120, color }) {
  const max = GAME_BALANCE.MAX_EXP;
  const pct = Math.min(1, exp / max);
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <svg width={size} height={size} className="absolute inset-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#1b2540" strokeWidth="5" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none"
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {GAME_BALANCE.STAGE_LEVEL_THRESHOLDS.map((lvl, i) => {
        const thExp = lvl * GAME_BALANCE.EXP_PER_LEVEL;
        const frac = thExp / max;
        const angle = -90 + frac * 360;
        const rad = angle * (Math.PI / 180);
        const x1 = size / 2 + Math.cos(rad) * (r - 6);
        const y1 = size / 2 + Math.sin(rad) * (r - 6);
        const x2 = size / 2 + Math.cos(rad) * (r + 6);
        const y2 = size / 2 + Math.sin(rad) * (r + 6);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3a4a6b" strokeWidth="2" />;
      })}
    </svg>
  );
}

function WeekStrip({ habit }) {
  const cells = [];
  for (let i = 6; i >= 0; i--) {
    const ds = todayStr(-i);
    cells.push({ ds, status: habit.logs[ds], isToday: i === 0 });
  }
  return (
    <div className="flex gap-1.5">
      {cells.map((c) => (
        <div
          key={c.ds}
          className="w-6 h-6 rounded-md"
          style={{
            ...levelStyle(c.status, habit.color),
            outline: c.isToday ? `2px solid ${habit.color}` : 'none',
            outlineOffset: '1px',
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   キャラ変遷ギャラリー(1ヶ月前・1週間前・今日を再現して並べる)
   ============================================================ */
function EvolutionGallery({ habit }) {
  const points = [
    { label: '1ヶ月前', days: 30 },
    { label: '1週間前', days: 7 },
    { label: '今日', days: 0 },
  ];
  return (
    <div className="flex justify-between items-end gap-2">
      {points.map((p) => {
        const cutoff = todayStr(-p.days);
        if (cutoff < habit.createdAt) {
          return (
            <div key={p.label} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-700" />
              <span className="text-xs text-slate-600">記録前</span>
            </div>
          );
        }
        const s = computeStatsAsOf(habit, cutoff);
        return (
          <div key={p.label} className="flex flex-col items-center gap-1 flex-1">
            <Creature stage={s.stage} condition={s.condition} color={habit.color} theme={habit.theme} size={56} />
            <span className="text-xs text-slate-500">{p.label}</span>
            <span className="text-xs" style={monoStyle}>Lv.{s.level}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   月間カレンダーヒートマップ
   ============================================================ */
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function MonthCalendar({ habit, year, month }) {
  const logs = getSyncedLogs(habit);
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const todayDs = todayStr();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-xs text-slate-600">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status = logs[ds];
          const isFuture = ds > todayDs;
          const isToday = ds === todayDs;
          const beforeCreation = ds < habit.createdAt;
          const shown = !isFuture && !beforeCreation ? status : undefined;
          const { backgroundColor: bg, border } = levelStyle(shown, habit.color);
          return (
            <div
              key={ds}
              className="aspect-square rounded-md flex items-center justify-center text-xs"
              style={{
                backgroundColor: bg,
                border,
                outline: isToday ? `2px solid ${habit.color}` : 'none',
                outlineOffset: '1px',
                opacity: isFuture || beforeCreation ? 0.3 : 1,
                color: '#64748b',
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   ナビゲーション / 一覧 / 図鑑
   ============================================================ */
function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition"
      style={{ color: active ? '#22e2ff' : '#94a3b8', backgroundColor: active ? 'rgba(34,226,255,0.08)' : 'transparent' }}
    >
      {icon}<span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function EmptyState({ onOpenAdd, onSeedDemo }) {
  return (
    <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
      <div className="flex justify-center mb-4"><Creature stage={0} condition="normal" color="#22e2ff" size={72} /></div>
      <p className="text-slate-400 mb-6 text-sm">まだ習慣が登録されていません。<br />最初の一歩を記録して、キャラを孵化させましょう。</p>
      <div className="flex flex-col items-center gap-3">
        <button onClick={onOpenAdd} className="px-5 py-2.5 rounded-xl font-medium" style={{ backgroundColor: '#22e2ff', color: '#020617' }}>
          ＋ 習慣を追加
        </button>
        <button onClick={onSeedDemo} className="text-sm text-slate-500 underline">サンプルデータで試す</button>
      </div>
    </div>
  );
}

function HabitRow({ habit, onSetToday, onOpenDetail, onOpenNote }) {
  const stats = computeStats(habit);
  const today = stats.todayStatus;
  const hasTodayNote = Boolean(habit.notes && habit.notes[todayStr()]);
  const orderedLevels = [...CHECK_LEVELS].reverse(); // full → good → partial → none
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <button onClick={() => onOpenDetail(habit)} className="relative flex-shrink-0 w-14 h-14 flex items-center justify-center">
          <Creature stage={stats.stage} condition={stats.condition} color={habit.color} theme={habit.theme} size={48} />
        </button>
        <button onClick={() => onOpenDetail(habit)} className="flex-1 min-w-0 text-left">
          <div className="text-slate-100 font-medium truncate flex items-center gap-1.5">
            <span>{habit.icon}</span><span>{habit.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
            <Flame size={12} className={stats.streak > 0 ? 'text-amber-400' : 'text-slate-600'} />
            <span style={monoStyle}>{stats.streak}日連続</span>
            <span className="mx-1">・</span>
            <span>Lv.{stats.level}</span>
          </div>
        </button>
        <button
          onClick={() => onOpenNote(habit)}
          className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-slate-500"
          title="今日のメモ"
        >
          <StickyNote size={16} />
          {hasTodayNote && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        {orderedLevels.map((lvl) => {
          const isSelected = today === lvl.key;
          return (
            <button
              key={lvl.key}
              onClick={() => onSetToday(habit.id, lvl.key)}
              className="h-11 rounded-lg flex items-center justify-center text-lg font-medium transition"
              style={{
                ...levelStyle(lvl.key, habit.color),
                color: LEVEL_TEXT_COLOR[lvl.key],
                outline: isSelected ? `2px solid ${habit.color}` : 'none',
                outlineOffset: '1px',
                opacity: isSelected || today === undefined ? 1 : 0.5,
              }}
              title={lvl.label}
            >
              {LEVEL_SYMBOL[lvl.key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeTab({ habits, onSetToday, onOpenDetail, onOpenAdd, onSeedDemo, onOpenNote }) {
  const formattedToday = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-4">
        <div className="text-xs text-slate-500" style={monoStyle}>{formattedToday}</div>
        <h1 className="text-2xl font-bold text-slate-100" style={displayStyle}>今日の習慣</h1>
      </div>
      {habits.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-4">
          {CHECK_LEVELS.slice().reverse().map((lvl) => (
            <span key={lvl.key} className="flex items-center gap-1">
              <span style={{ color: lvl.key === 'none' ? '#ff8fc0' : '#e2e8f0' }}>{LEVEL_SYMBOL[lvl.key]}</span>{lvl.label}
            </span>
          ))}
        </div>
      )}
      {habits.length === 0 ? (
        <EmptyState onOpenAdd={onOpenAdd} onSeedDemo={onSeedDemo} />
      ) : (
        <div className="space-y-3">
          {habits.map((h) => <HabitRow key={h.id} habit={h} onSetToday={onSetToday} onOpenDetail={onOpenDetail} onOpenNote={onOpenNote} />)}
        </div>
      )}
    </div>
  );
}

function GalleryTab({ habits, onOpenDetail }) {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-6" style={displayStyle}>キャラ図鑑</h1>
      {habits.length === 0 ? (
        <p className="text-slate-500 text-sm">習慣を登録すると、ここにキャラが並びます。</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {habits.map((h) => {
            const stats = computeStats(h);
            const cond = CONDITION_LABEL[stats.condition];
            return (
              <button key={h.id} onClick={() => onOpenDetail(h)} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-slate-600 transition">
                <Creature stage={stats.stage} condition={stats.condition} color={h.color} theme={h.theme} size={64} />
                <div className="text-slate-100 text-sm font-medium truncate w-full text-center">{h.icon} {h.name}</div>
                <div className="text-xs text-slate-500" style={monoStyle}>Lv.{stats.level} ・ {STAGE_NAMES[stats.stage]}</div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: cond.color, border: `1px solid ${cond.color}` }}>{cond.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   統計ページ(週/月/年の達成率グラフ・カレンダー・キャラ変遷)
   ============================================================ */
function StatsView({ habit, onClose }) {
  const [period, setPeriod] = useState('week');
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const stats = computeStats(habit);
  const chartData =
    period === 'week' ? weeklyAggregation(habit, 8)
    : period === 'month' ? monthlyAggregation(habit, 6)
    : monthlyAggregation(habit, 12);

  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();

  function prevMonth() {
    let y = calYear, m = calMonth - 1;
    if (m < 0) { m = 11; y -= 1; }
    setCalYear(y); setCalMonth(m);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    let y = calYear, m = calMonth + 1;
    if (m > 11) { m = 0; y += 1; }
    setCalYear(y); setCalMonth(m);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950" style={{ overflowY: 'auto' }}>
      <div className="sticky top-0 bg-slate-950 border-b border-slate-800 p-4 flex items-center gap-3 z-10">
        <button onClick={onClose} className="text-slate-400"><ChevronLeft size={22} /></button>
        <div className="flex items-center gap-2">
          <Creature stage={stats.stage} condition={stats.condition} color={habit.color} theme={habit.theme} size={32} />
          <span className="text-slate-100 font-medium">{habit.icon} {habit.name}</span>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-2xl mx-auto" style={{ paddingBottom: '4rem' }}>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">現在の連続日数</div>
            <div className="text-2xl font-bold text-slate-100" style={displayStyle}>{stats.streak}<span className="text-sm ml-1">日</span></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">最長記録</div>
            <div className="text-2xl font-bold text-slate-100" style={displayStyle}>{stats.longestStreak}<span className="text-sm ml-1">日</span></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-medium text-slate-300 mb-3">キャラの変遷</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <EvolutionGallery habit={habit} />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">達成率の推移</h3>
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              {[['week', '週'], ['month', '月'], ['year', '年']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className="px-3 py-1 rounded-md text-xs"
                  style={{ backgroundColor: period === key ? habit.color : 'transparent', color: period === key ? '#020617' : '#94a3b8' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value) => [`${value}%`, '達成率']}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={habit.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">カレンダー</h3>
            <div className="flex items-center gap-3 text-slate-400">
              <button onClick={prevMonth}><ChevronLeft size={18} /></button>
              <span className="text-sm text-slate-200" style={monoStyle}>{calYear}年{calMonth + 1}月</span>
              <button onClick={nextMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <MonthCalendar habit={habit} year={calYear} month={calMonth} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   全体振り返りカレンダー(全習慣まとめ + 日記)
   ============================================================ */
function getDayAggregate(habits, ds) {
  let scoreSum = 0;
  let count = 0;
  let noteCount = 0;
  habits.forEach((h) => {
    const logs = getSyncedLogs(h);
    const status = logs[ds];
    if (status !== undefined) {
      scoreSum += LEVEL_SCORE[status] ?? 0;
      count++;
    }
    if (h.notes && h.notes[ds]) noteCount++;
  });
  return { scoreSum, count, noteCount, avg: count > 0 ? scoreSum / count : null };
}

function DayDetailSheet({ date, habits, onClose, onUpdateNote }) {
  const d = new Date(date + 'T00:00:00');
  const label = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(d);
  const entries = habits
    .map((h) => ({ habit: h, status: getSyncedLogs(h)[date] }))
    .filter((e) => e.status !== undefined);

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-100 mb-1" style={displayStyle}>{label}</h2>
      <p className="text-xs text-slate-500 mb-4">この日の記録と日記</p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">この日の記録はありません。</p>
      ) : (
        <div className="space-y-4">
          {entries.map(({ habit, status }) => (
            <div key={habit.id} className="border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>{habit.icon}</span>
                <span className="text-sm text-slate-200 flex-1 truncate">{habit.name}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1"
                  style={{ ...levelStyle(status, habit.color), color: LEVEL_TEXT_COLOR[status] }}
                >
                  {LEVEL_SYMBOL[status]} {LEVEL_LABEL[status]}
                </span>
              </div>
              <textarea
                defaultValue={(habit.notes && habit.notes[date]) || ''}
                onBlur={(e) => onUpdateNote(habit.id, date, e.target.value)}
                placeholder="ひとことメモ..."
                maxLength={200}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
              />
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function GlobalCalendarTab({ habits, onUpdateNote }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function prevMonth() {
    let y = year, m = month - 1;
    if (m < 0) { m = 11; y -= 1; }
    setYear(y); setMonth(m);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    let y = year, m = month + 1;
    if (m > 11) { m = 0; y += 1; }
    setYear(y); setMonth(m);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const todayDs = todayStr();

  let monthScoreSum = 0, monthCount = 0;
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const agg = getDayAggregate(habits, ds);
    monthScoreSum += agg.scoreSum; monthCount += agg.count;
    cells.push({ day, ds, agg });
  }
  const monthRate = monthCount > 0 ? Math.round((monthScoreSum / monthCount) * 100) : null;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-1" style={displayStyle}>カレンダー</h1>
      <p className="text-xs text-slate-500 mb-6">すべての習慣をまとめて振り返るページです。日付をタップすると、その日の記録と日記が見られます。</p>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-slate-400 p-2"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <div className="text-lg text-slate-100" style={displayStyle}>{year}年{month + 1}月</div>
          {monthRate !== null && <div className="text-xs text-slate-500" style={monoStyle}>今月の総合達成率 {monthRate}%</div>}
        </div>
        <button onClick={nextMonth} className="text-slate-400 p-2" style={{ opacity: isCurrentMonth ? 0.3 : 1 }}><ChevronRight size={20} /></button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAY_LABELS.map((w) => <div key={w} className="text-center text-xs text-slate-600">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            if (c === null) return <div key={`e${i}`} />;
            const { day, ds, agg } = c;
            const isFuture = ds > todayDs;
            let bg = '#0f172a';
            if (!isFuture && agg.avg !== null) {
              if (agg.avg >= 0.85) bg = '#22e2ff';
              else if (agg.avg >= 0.5) bg = '#0e7490';
              else bg = '#5b1a44';
            }
            const clickable = !isFuture && (agg.count > 0 || agg.noteCount > 0);
            return (
              <button
                key={ds}
                onClick={() => clickable && setSelectedDate(ds)}
                className="aspect-square rounded-md flex flex-col items-center justify-center relative"
                style={{
                  backgroundColor: bg,
                  opacity: isFuture ? 0.25 : 1,
                  outline: ds === todayDs ? '2px solid #22e2ff' : 'none',
                  outlineOffset: '1px',
                  cursor: clickable ? 'pointer' : 'default',
                }}
              >
                <span className="text-xs text-slate-200">{day}</span>
                {agg.noteCount > 0 && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#22e2ff' }} />絶好調</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#0e7490' }} />まずまず</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#5b1a44' }} />伸び悩み</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />日記あり</div>
      </div>

      {selectedDate && (
        <DayDetailSheet date={selectedDate} habits={habits} onClose={() => setSelectedDate(null)} onUpdateNote={onUpdateNote} />
      )}
    </div>
  );
}

/* ============================================================
   ひろば(意味はないけど触れ合えるページ)
   キャラをつかんで投げられる簡易物理演算。パフォーマンスのため
   位置はReact stateではなくrefで持ち、DOM styleを直接書き換える。
   ============================================================ */
function PlaygroundTab({ habits }) {
  const containerRef = useRef(null);
  const bodiesRef = useRef({});
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const CREATURE_SIZE = 64;
  // 物理演算の調整値。THROW_POWERを下げる/MAX_THROW_SPEEDを絞ると「軽くてすぐ飛んでいく」感じが弱まり、
  // GRAVITYを上げると落下が速くなって重量感が出る。
  const GRAVITY = 0.85;
  const AIR_FRICTION = 0.99;
  const BOUNCE_DAMPING = 0.45;
  const GROUND_FRICTION = 0.8;
  const THROW_POWER = 7;
  const MAX_THROW_SPEED = 22;

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setContainerSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    // 削除された習慣のbodyだけクリーンアップ(生成はrefコールバック側で遅延初期化する)
    const currentIds = new Set(habits.map((h) => h.id));
    Object.keys(bodiesRef.current).forEach((id) => {
      if (!currentIds.has(id)) delete bodiesRef.current[id];
    });
  }, [habits]);

  useEffect(() => {
    if (!containerSize.w || !containerSize.h) return;
    let raf;
    function step() {
      const bodies = bodiesRef.current;
      const w = containerSize.w, h = containerSize.h;
      Object.keys(bodies).forEach((id) => {
        const b = bodies[id];
        if (!b.el) return;
        if (!b.dragging) {
          b.vy += GRAVITY;
          b.vx *= AIR_FRICTION;
          b.x += b.vx;
          b.y += b.vy;
          const floor = h - CREATURE_SIZE;
          if (b.y > floor) {
            b.y = floor;
            b.vy *= -BOUNCE_DAMPING;
            b.vx *= GROUND_FRICTION;
            if (Math.abs(b.vy) < 1.5) b.vy = 0;
          }
          if (b.x < 0) { b.x = 0; b.vx *= -0.6; }
          if (b.x > w - CREATURE_SIZE) { b.x = w - CREATURE_SIZE; b.vx *= -0.6; }
        }
        b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
      });
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [containerSize]);

  function handlePointerDown(id, e) {
    const b = bodiesRef.current[id];
    if (!b || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - b.x;
    const offsetY = e.clientY - rect.top - b.y;
    b.dragging = true;
    b.vx = 0; b.vy = 0;

    let lastX = e.clientX, lastY = e.clientY, lastT = performance.now();
    let vx = 0, vy = 0;

    function onMove(ev) {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const rawVx = ((ev.clientX - lastX) / dt) * THROW_POWER;
      const rawVy = ((ev.clientY - lastY) / dt) * THROW_POWER;
      vx = Math.max(-MAX_THROW_SPEED, Math.min(MAX_THROW_SPEED, rawVx));
      vy = Math.max(-MAX_THROW_SPEED, Math.min(MAX_THROW_SPEED, rawVy));
      lastX = ev.clientX; lastY = ev.clientY; lastT = now;

      const nx = ev.clientX - rect.left - offsetX;
      const ny = ev.clientY - rect.top - offsetY;
      b.x = Math.min(Math.max(0, nx), containerSize.w - CREATURE_SIZE);
      b.y = Math.min(Math.max(0, ny), containerSize.h - CREATURE_SIZE);
    }
    function onUp() {
      b.dragging = false;
      b.vx = vx;
      b.vy = vy;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-1" style={displayStyle}>ひろば</h1>
      <p className="text-xs text-slate-500 mb-4">キャラをつかんで、投げてみよう。意味はないけど、たまには眺めるのもいいものです。</p>

      <div
        ref={containerRef}
        className="relative w-full rounded-2xl border border-slate-800 overflow-hidden"
        style={{ height: '60vh', background: 'linear-gradient(to bottom, #0b1120 0%, #020617 75%)', touchAction: 'none' }}
      >
        <div className="absolute left-0 right-0 bottom-0" style={{ height: '1px', backgroundColor: '#1e293b' }} />
        {habits.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm px-6 text-center">
            習慣を登録すると、ここにキャラが遊びにきます
          </div>
        )}
        {habits.map((h, idx) => {
          const stats = computeStats(h);
          return (
            <div
              key={h.id}
              ref={(el) => {
                if (!el) return;
                if (!bodiesRef.current[h.id]) {
                  const w = containerRef.current ? containerRef.current.clientWidth : 320;
                  bodiesRef.current[h.id] = {
                    x: 20 + ((idx * 90) % Math.max(1, w - CREATURE_SIZE - 20)),
                    y: 10,
                    vx: (Math.random() - 0.5) * 3,
                    vy: 0,
                    dragging: false,
                    el: null,
                  };
                }
                bodiesRef.current[h.id].el = el;
                const b = bodiesRef.current[h.id];
                el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
              }}
              onPointerDown={(e) => handlePointerDown(h.id, e)}
              className="absolute select-none"
              style={{ width: CREATURE_SIZE, height: CREATURE_SIZE, cursor: 'grab', touchAction: 'none', willChange: 'transform' }}
            >
              <Creature stage={stats.stage} condition={stats.condition} color={h.color} theme={h.theme} size={CREATURE_SIZE} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   モーダル群
   ============================================================ */
function ModalShell({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md mx-0 md:mx-4 p-6 relative"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500"><X size={20} /></button>
        {children}
      </div>
    </div>
  );
}

function FormModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || ICON_PRESETS[0]);
  const [color, setColor] = useState(initial?.color || COLOR_PRESETS[0]);
  const [theme, setTheme] = useState(initial?.theme || 'default');
  const canSave = name.trim().length > 0;

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-100 mb-4" style={displayStyle}>{initial ? '習慣を編集' : '新しい習慣'}</h2>

      <label className="text-xs text-slate-400 block mb-1.5">習慣の名前</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder="例: 筋トレ、読書、早起き"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 mb-4 outline-none focus:border-cyan-400"
      />

      <label className="text-xs text-slate-400 block mb-1.5">キャラのアイコン</label>
      <div className="grid grid-cols-6 gap-2 mb-2">
        {ICON_PRESETS.map((ic) => (
          <button
            key={ic}
            onClick={() => setIcon(ic)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2"
            style={{ borderColor: icon === ic ? color : '#334155', backgroundColor: icon === ic ? '#0f172a' : 'transparent' }}
          >
            {ic}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-500">その他:</span>
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value.slice(0, 4))}
          placeholder="絵文字を入力"
          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-sm outline-none focus:border-cyan-400"
        />
        <span className="text-xs text-slate-600">(スマホのキーボードの絵文字一覧から選べます)</span>
      </div>

      <label className="text-xs text-slate-400 block mb-1.5">テーマカラー</label>
      <div className="flex items-center gap-2 mb-6">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-9 h-9 rounded-full border-2"
            style={{ backgroundColor: c, borderColor: color === c ? '#ffffff' : 'transparent' }}
          />
        ))}
        <label className="w-9 h-9 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center relative overflow-hidden cursor-pointer">
          <span className="text-slate-500 text-xs">+</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            title="好きな色を選ぶ"
          />
        </label>
      </div>

      <label className="text-xs text-slate-400 block mb-1.5">キャラのタイプ(育ち方の系統)</label>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {THEMES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            className="py-2 rounded-xl flex flex-col items-center justify-center gap-1 border-2 text-xs"
            style={{ borderColor: theme === t.key ? color : '#334155', backgroundColor: theme === t.key ? '#0f172a' : 'transparent', color: theme === t.key ? '#e2e8f0' : '#64748b' }}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => canSave && onSave({ name: name.trim(), icon, color, theme })}
        className="w-full py-3 rounded-xl font-medium"
        style={{ backgroundColor: color, color: '#020617', opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? 'auto' : 'none' }}
      >
        {initial ? '保存する' : '追加する'}
      </button>
    </ModalShell>
  );
}

function DetailModal({ habit, onClose, onEdit, onDeleteRequest, onOpenStats }) {
  const stats = computeStats(habit);
  const cond = CONDITION_LABEL[stats.condition];
  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="relative w-36 h-36 flex items-center justify-center mb-3">
          <ExpRing exp={stats.exp} size={144} color={habit.color} />
          <Creature stage={stats.stage} condition={stats.condition} color={habit.color} theme={habit.theme} size={88} />
        </div>
        <h2 className="text-xl font-bold text-slate-100" style={displayStyle}>{habit.icon} {habit.name}</h2>
        <div className="text-sm text-slate-400 mt-1">Lv.{stats.level} ・ {STAGE_NAMES[stats.stage]}</div>
        <span className="text-xs mt-2 px-2.5 py-1 rounded-full" style={{ color: cond.color, border: `1px solid ${cond.color}` }}>{cond.text}</span>
        <div className="mt-4 text-sm text-slate-400" style={monoStyle}>EXP {stats.exp} / {GAME_BALANCE.MAX_EXP}</div>
        <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-400">
          <Flame size={14} className="text-amber-400" /><span style={monoStyle}>現在 {stats.streak}日連続</span>
        </div>
        <div className="mt-5 w-full">
          <div className="text-xs text-slate-500 mb-1.5 text-left">直近7日間</div>
          <WeekStrip habit={habit} />
        </div>
        <button
          onClick={() => onOpenStats(habit)}
          className="w-full mt-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
          style={{ backgroundColor: habit.color, color: '#020617' }}
        >
          <BarChart3 size={18} />統計を見る
        </button>

        <div className="flex gap-3 mt-3 w-full">
          <button onClick={() => onEdit(habit)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 flex items-center justify-center gap-1.5">
            <Edit3 size={16} />編集
          </button>
          <button onClick={() => onDeleteRequest(habit)} className="flex-1 py-2.5 rounded-xl border border-fuchsia-900 text-fuchsia-400 flex items-center justify-center gap-1.5">
            <Trash2 size={16} />削除
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ habit, onConfirm, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-100 mb-2" style={displayStyle}>削除しますか?</h2>
      <p className="text-sm text-slate-400 mb-6">「{habit.icon} {habit.name}」とそのキャラの記録はすべて削除され、元に戻せません。</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300">キャンセル</button>
        <button onClick={() => onConfirm(habit.id)} className="flex-1 py-2.5 rounded-xl text-white" style={{ backgroundColor: '#e11d76' }}>削除する</button>
      </div>
    </ModalShell>
  );
}

/* 更新履歴。新しい変更を上に追記していく。日付は目安でよい。 */
const CHANGELOG = [
  { date: '2026-07', items: [
    '進化段階を8→10段階に拡張。サイズや見た目の変化をより大きく・派手に',
    '段階が上がった瞬間に進化演出(フルスクリーンでキャラが光って生まれ変わる)が出るように',
    'ホーム画面の各習慣にも、その場でメモを残せるボタンを追加',
  ]},
  { date: '2026-07', items: [
    '習慣ごとにキャラのアイコン・色を自由入力できるように',
    'キャラのタイプ(筋肉系/学習系/生活・休息系/クリエイティブ系)を選べるように。腕が生える段階からタイプ別の見た目に変化',
    '7日連続ボーナスを、直近7日の◎の割合に応じて変動する方式に変更',
    '「ひろば」の物理演算を調整(投げたときの初動を抑え、重さを感じられるように)',
  ]},
  { date: '2026-07', items: [
    'Next.js + Supabaseで本番リリース(Googleログイン対応)',
    '日記機能・全体振り返りカレンダー・ひろばを追加',
  ]},
];

function HelpModal({ onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-100 mb-4" style={displayStyle}>使い方・お知らせ</h2>

      <h3 className="text-sm font-medium text-slate-300 mb-2">使い方</h3>
      <div className="space-y-2 text-sm text-slate-400 mb-6">
        <p>毎日、習慣ごとに ◎○△× の4段階で記録します。◎かなりできた/○まぁできた/△少し触った/×できなかった、というニュアンスです。</p>
        <p>記録に応じてキャラが育ちます(EXPが貯まるとレベルアップし、見た目が進化します)。×が続くとキャラが弱っていきます。</p>
        <p>「カレンダー」タブでは、任意の日にひとことメモ(日記)を残せます。</p>
        <p>「ひろば」タブでは、育てたキャラをつかんで投げて遊べます(ゲーム的な意味はありません)。</p>
      </div>

      <h3 className="text-sm font-medium text-slate-300 mb-2">更新履歴</h3>
      <div className="space-y-3">
        {CHANGELOG.map((entry, i) => (
          <div key={i} className="text-sm">
            <div className="text-xs text-slate-500 mb-1" style={monoStyle}>{entry.date}</div>
            <ul className="text-slate-400 space-y-0.5 list-disc list-inside">
              {entry.items.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function QuickNoteModal({ habit, onClose, onUpdateNote }) {
  const [text, setText] = useState((habit.notes && habit.notes[todayStr()]) || '');
  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-lg font-bold text-slate-100 mb-1" style={displayStyle}>{habit.icon} {habit.name}</h2>
      <p className="text-xs text-slate-500 mb-4">今日のひとことメモ</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 200))}
        placeholder="今日はどうだった?"
        rows={4}
        autoFocus
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400 mb-4"
      />
      <button
        onClick={() => { onUpdateNote(habit.id, todayStr(), text); onClose(); }}
        className="w-full py-3 rounded-xl font-medium"
        style={{ backgroundColor: habit.color, color: '#020617' }}
      >
        保存する
      </button>
    </ModalShell>
  );
}

/* ============================================================
   進化演出(ポケモンの進化のような、段階が上がった瞬間の演出)
   ============================================================ */
function EvolutionCelebration({ habit, fromStage, toStage, onClose }) {
  const [phase, setPhase] = useState('flash'); // flash → whiteout → reveal

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('whiteout'), 900);
    const t2 = setTimeout(() => setPhase('reveal'), 1080);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: phase === 'whiteout' ? '#ffffff' : '#020617', transition: 'background-color 0.15s ease' }}>
      {phase !== 'whiteout' && (
        <div className="text-center px-6 w-full max-w-sm">
          <div className="text-sm text-slate-500 mb-8" style={monoStyle}>{habit.icon} {habit.name}</div>

          <div className="relative flex items-center justify-center mb-4" style={{ height: 190 }}>
            {phase === 'reveal' && (
              <div
                className="absolute rounded-full animate-evoBurst"
                style={{ width: 140, height: 140, background: `radial-gradient(circle, ${habit.color}55 0%, transparent 70%)` }}
              />
            )}
            {phase === 'flash' ? (
              <div className="animate-evoFlash">
                <Creature stage={fromStage} condition="normal" color={habit.color} theme={habit.theme} size={140} />
              </div>
            ) : (
              <div className="animate-evoPopIn">
                <Creature stage={toStage} condition="great" color={habit.color} theme={habit.theme} size={180} />
              </div>
            )}
          </div>

          {phase === 'reveal' && (
            <div className="animate-evoTextIn">
              <div className="text-xs text-slate-500 mb-1" style={monoStyle}>Lv.UP</div>
              <div className="text-xl font-bold text-slate-100 mb-1" style={displayStyle}>
                {STAGE_NAMES[toStage]}に進化した!
              </div>
              <div className="text-sm text-slate-400 mb-8">{habit.name}が新しい姿を手に入れた</div>
              <button
                onClick={onClose}
                className="px-8 py-2.5 rounded-xl font-medium"
                style={{ backgroundColor: habit.color, color: '#020617' }}
              >
                とじる
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   メインアプリ
   ============================================================ */
export default function App({ userId }) {
  const [habits, setHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState(null);
  const [evolution, setEvolution] = useState(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const loaded = await loadHabits();
      setHabits(loaded);
      setIsLoading(false);
    })();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // 楽観的更新: 先に画面上のstateを更新して即座に反映し、そのあとDBへ書き込む。
  // DB書き込みが多少遅れても操作感が損なわれないようにするため。
  function handleSetToday(habitId, status) {
    const target = habits.find((h) => h.id === habitId);
    if (!target) return;
    const current = target.logs[todayStr()];
    const newLogs = { ...target.logs };
    if (current === status) delete newLogs[todayStr()];
    else newLogs[todayStr()] = status;

    const prevStats = computeStats(target);
    const updatedHabit = { ...target, logs: newLogs };
    const nextStats = computeStats(updatedHabit);

    setHabits((prev) => prev.map((h) => (h.id === habitId ? updatedHabit : h)));
    saveLogs(habitId, newLogs);

    if (nextStats.stage > prevStats.stage) {
      setEvolution({ habit: updatedHabit, fromStage: prevStats.stage, toStage: nextStats.stage });
    }
  }

  async function handleAddHabit(data) {
    const created = await apiAddHabit(userId, data);
    if (created) setHabits((prev) => [...prev, created]);
    setModal(null);
  }

  function handleUpdateNote(habitId, date, text) {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== habitId) return h;
      const notes = { ...(h.notes || {}) };
      if (text && text.trim()) notes[date] = text.trim();
      else delete notes[date];
      saveNotes(habitId, notes);
      return { ...h, notes };
    }));
  }

  function handleEditHabit(habitId, data) {
    setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, name: data.name, icon: data.icon, color: data.color, theme: data.theme } : h)));
    updateHabitFields(habitId, data);
    setModal(null);
  }

  async function handleDeleteHabit(habitId) {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setModal(null);
    await apiDeleteHabit(habitId);
  }

  async function handleSeedDemo() {
    const created = await seedHabits(userId, seedDemoData());
    setHabits((prev) => [...prev, ...created]);
  }

  const currentDetailHabit = modal?.type === 'detail' ? habits.find((h) => h.id === modal.habit.id) || modal.habit : null;
  const currentStatsHabit = modal?.type === 'stats' ? habits.find((h) => h.id === modal.habit.id) || modal.habit : null;
  const currentNoteHabit = modal?.type === 'note' ? habits.find((h) => h.id === modal.habit.id) || modal.habit : null;

  return (
    <div className="min-h-screen bg-slate-950" style={{ fontFamily: 'var(--font-noto-sans-jp), sans-serif' }}>
      <button
        onClick={() => setModal({ type: 'help' })}
        className="fixed top-3 right-14 z-40 w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-500"
        title="使い方・お知らせ"
      >
        <HelpCircle size={16} />
      </button>
      <button
        onClick={handleSignOut}
        className="fixed top-3 right-3 z-40 w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-500"
        title="ログアウト"
      >
        <LogOut size={16} />
      </button>
      <div className="md:flex">
        <nav className="hidden md:flex md:flex-col md:w-56 md:min-h-screen border-r border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles size={20} className="text-cyan-400" />
            <span className="text-lg font-bold text-slate-100" style={displayStyle}>HABITQUEST</span>
          </div>
          <NavButton active={tab === 'home'} onClick={() => setTab('home')} icon={<HomeIcon size={18} />} label="ホーム" />
          <NavButton active={tab === 'gallery'} onClick={() => setTab('gallery')} icon={<BookOpen size={18} />} label="キャラ図鑑" />
          <NavButton active={tab === 'calendar'} onClick={() => setTab('calendar')} icon={<CalendarDays size={18} />} label="カレンダー" />
          <NavButton active={tab === 'playground'} onClick={() => setTab('playground')} icon={<PawPrint size={18} />} label="ひろば" />
          <div className="mt-auto pt-6">
            <button
              onClick={() => setModal({ type: 'add' })}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium"
              style={{ backgroundColor: '#22e2ff', color: '#020617' }}
            >
              <Plus size={16} /> 習慣を追加
            </button>
          </div>
        </nav>

        <main className="flex-1 pb-24 md:pb-0">
          {isLoading ? (
            <div className="flex items-center justify-center text-slate-500" style={{ height: '100vh' }}>読み込み中...</div>
          ) : tab === 'home' ? (
            <HomeTab
              habits={habits}
              onSetToday={handleSetToday}
              onOpenDetail={(h) => setModal({ type: 'detail', habit: h })}
              onOpenAdd={() => setModal({ type: 'add' })}
              onSeedDemo={handleSeedDemo}
              onOpenNote={(h) => setModal({ type: 'note', habit: h })}
            />
          ) : tab === 'gallery' ? (
            <GalleryTab habits={habits} onOpenDetail={(h) => setModal({ type: 'detail', habit: h })} />
          ) : tab === 'calendar' ? (
            <GlobalCalendarTab habits={habits} onUpdateNote={handleUpdateNote} />
          ) : (
            <PlaygroundTab habits={habits} />
          )}
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 flex items-center justify-around py-2 z-40">
        <button onClick={() => setTab('home')} className="flex flex-col items-center gap-0.5 px-3 py-1" style={{ color: tab === 'home' ? '#22e2ff' : '#64748b' }}>
          <HomeIcon size={19} /><span className="text-xs">ホーム</span>
        </button>
        <button onClick={() => setTab('gallery')} className="flex flex-col items-center gap-0.5 px-3 py-1" style={{ color: tab === 'gallery' ? '#22e2ff' : '#64748b' }}>
          <BookOpen size={19} /><span className="text-xs">図鑑</span>
        </button>
        <button onClick={() => setModal({ type: 'add' })} className="w-12 h-12 -mt-6 rounded-full flex items-center justify-center shadow-lg flex-shrink-0" style={{ backgroundColor: '#22e2ff' }}>
          <Plus size={22} color="#020617" />
        </button>
        <button onClick={() => setTab('calendar')} className="flex flex-col items-center gap-0.5 px-3 py-1" style={{ color: tab === 'calendar' ? '#22e2ff' : '#64748b' }}>
          <CalendarDays size={19} /><span className="text-xs">カレンダー</span>
        </button>
        <button onClick={() => setTab('playground')} className="flex flex-col items-center gap-0.5 px-3 py-1" style={{ color: tab === 'playground' ? '#22e2ff' : '#64748b' }}>
          <PawPrint size={19} /><span className="text-xs">ひろば</span>
        </button>
      </div>

      {modal?.type === 'add' && <FormModal onSave={handleAddHabit} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <FormModal initial={modal.habit} onSave={(data) => handleEditHabit(modal.habit.id, data)} onClose={() => setModal(null)} />}
      {modal?.type === 'detail' && currentDetailHabit && (
        <DetailModal
          habit={currentDetailHabit}
          onClose={() => setModal(null)}
          onEdit={(h) => setModal({ type: 'edit', habit: h })}
          onDeleteRequest={(h) => setModal({ type: 'delete', habit: h })}
          onOpenStats={(h) => setModal({ type: 'stats', habit: h })}
        />
      )}
      {modal?.type === 'delete' && <DeleteConfirmModal habit={modal.habit} onConfirm={handleDeleteHabit} onClose={() => setModal(null)} />}
      {modal?.type === 'help' && <HelpModal onClose={() => setModal(null)} />}
      {modal?.type === 'note' && currentNoteHabit && (
        <QuickNoteModal habit={currentNoteHabit} onClose={() => setModal(null)} onUpdateNote={handleUpdateNote} />
      )}
      {modal?.type === 'stats' && currentStatsHabit && (
        <StatsView habit={currentStatsHabit} onClose={() => setModal({ type: 'detail', habit: currentStatsHabit })} />
      )}
      {evolution && (
        <EvolutionCelebration
          habit={evolution.habit}
          fromStage={evolution.fromStage}
          toStage={evolution.toStage}
          onClose={() => setEvolution(null)}
        />
      )}
    </div>
  );
}
