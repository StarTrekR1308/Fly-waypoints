import React from 'react';
import { EmotionState, SimulationStats, Waypoint } from '../types/simulation';
import { Smile, Frown, Sparkles, Meh, Target, Award, Zap } from 'lucide-react';

interface EmotionHUDProps {
  emotion: EmotionState;
  stats: SimulationStats;
  waypoints: Waypoint[];
}

export const EmotionHUD: React.FC<EmotionHUDProps> = ({
  emotion,
  stats,
  waypoints
}) => {
  const getEmotionDetails = () => {
    switch (emotion.currentEmotion) {
      case 'happy':
        return {
          icon: <Smile className="w-5 h-5 text-emerald-400" />,
          title: 'Glücksgefühl (Näher am Ziel)',
          description: 'Dopamin steigt · Synapsen werden verstärkt (LTP)',
          bg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
        };
      case 'sad':
        return {
          icon: <Frown className="w-5 h-5 text-rose-400" />,
          title: 'Trauer / Aversion (Entfernung)',
          description: 'Octopamin steigt · Kurskorrektur initiiert (LTD)',
          bg: 'bg-rose-950/60 border-rose-500/40 text-rose-300'
        };
      case 'ecstatic':
        return {
          icon: <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />,
          title: 'Erfolg! Wegpunkt erreicht',
          description: 'Maximaler Dopamin-Stoß · Meilenstein gespeichert',
          bg: 'bg-amber-950/60 border-amber-500/40 text-amber-300'
        };
      default:
        return {
          icon: <Meh className="w-5 h-5 text-slate-400" />,
          title: 'Neutral (Suche & Kursorientierung)',
          description: 'Zentralkomplex Ring-Attraktor berechnet Vektor',
          bg: 'bg-slate-900/60 border-slate-700/40 text-slate-300'
        };
    }
  };

  const emotionInfo = getEmotionDetails();

  return (
    <div className="flex flex-col gap-3">
      {/* 6 Waypoints + 1 Final Goal Milestone Stepper */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>WEGPUNKTE-SEQUENZ (6 Wegpunkte + Finales Ziel)</span>
          </div>
          <span className="text-slate-300 font-semibold">
            {stats.waypointsCompleted} von {waypoints.length} erreicht
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {waypoints.map((wp, idx) => {
            const isCompleted = idx < stats.activeWaypointIndex;
            const isActive = idx === stats.activeWaypointIndex;
            const isGoal = wp.isGoal;

            return (
              <div
                key={wp.id}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                  isGoal
                    ? isActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/40'
                      : isCompleted
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-slate-950/40 border-amber-500/30 text-amber-400/70'
                    : isCompleted
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                    : isActive
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-950'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider">
                  {isGoal ? 'Ziel' : `Pkt ${wp.id}`}
                </span>
                <span className="text-xs font-bold mt-0.5 truncate max-w-full">
                  {isCompleted ? '✓' : isGoal ? '🍯 Zucker' : `WP ${wp.id}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Feeling Card + Neuromodulation Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Feeling Emotion Indicator */}
        <div className={`p-3.5 rounded-xl border backdrop-blur flex items-start gap-3 transition-colors ${emotionInfo.bg}`}>
          <div className="p-2 rounded-lg bg-black/30 border border-white/10 shrink-0">
            {emotionInfo.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase font-mono tracking-wider opacity-75">
              Emotionaler Zustand
            </div>
            <div className="font-semibold text-sm truncate mt-0.5">
              {emotionInfo.title}
            </div>
            <div className="text-xs opacity-80 mt-0.5 truncate">
              {emotionInfo.description}
            </div>
          </div>
        </div>

        {/* Biological Neuromodulation (Dopamine & Octopamine) */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>DOPAMIN (PAM Cluster)</span>
            </div>
            <span className="tabular-nums font-semibold text-emerald-400">
              {(emotion.dopamine * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, emotion.dopamine * 100))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2.5">
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>OCTOPAMIN (PPL1 Aversion)</span>
            </div>
            <span className="tabular-nums font-semibold text-rose-400">
              {(emotion.octopamine * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-rose-500 transition-all duration-150 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, emotion.octopamine * 100))}%` }}
            />
          </div>
        </div>

        {/* Learning & Score Counters */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">KUMULATIVER REWARD</span>
            <span className={`text-base font-bold tabular-nums ${emotion.cumulativeReward >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {emotion.cumulativeReward > 0 ? `+${emotion.cumulativeReward.toFixed(1)}` : emotion.cumulativeReward.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>GENERATION</span>
            <span className="text-slate-200 font-semibold tabular-nums">{stats.generation}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>EPISODE SCHRITTE</span>
            <span className="text-slate-200 font-semibold tabular-nums">{stats.stepCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
