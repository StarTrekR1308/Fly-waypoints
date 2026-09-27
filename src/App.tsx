import { useState, useMemo, useCallback } from 'react';
import { FlySimulation3D } from './components/FlySimulation3D';
import { EmotionHUD } from './components/EmotionHUD';
import { BrainVisualizer } from './components/BrainVisualizer';
import { PythonHandoffModal } from './components/PythonHandoffModal';
import { ConnectomeExplorerModal } from './components/ConnectomeExplorerModal';
import { ARENA_WAYPOINTS } from './simulation/connectome';
import { FunctionalFlyBrain } from './simulation/flywireConnectome';
import {
  SimulationStats,
  EmotionState,
  CameraMode,
  ArenaPreset
} from './types/simulation';
import {
  Play,
  Pause,
  Camera,
  Terminal,
  Network,
  FastForward,
  Download,
  Brain,
  Sparkles
} from 'lucide-react';

export default function App() {
  // Reales biologisches Fliegengehirn aus dem FlyWire Connectom (100% autonome Steuerung)
  const flyBrain = useMemo(() => new FunctionalFlyBrain(), []);

  // UI & Simulation State
  const [arenaPreset, setArenaPreset] = useState<ArenaPreset>('slalom');
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [simSpeed, setSimSpeed] = useState<number>(1);

  // Modals
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [isConnectomeModalOpen, setIsConnectomeModalOpen] = useState(false);

  // Telemetrie
  const [stats, setStats] = useState<SimulationStats>({
    generation: 1,
    episode: 1,
    stepCount: 0,
    activeWaypointIndex: 0,
    waypointsCompleted: 0,
    totalWaypoints: ARENA_WAYPOINTS.slalom.length,
    hasReachedGoal: false,
    bestDistanceToGoal: 9999,
    avgReward: 0,
  });

  const [emotion, setEmotion] = useState<EmotionState>({
    currentEmotion: 'neutral',
    dopamine: 0.5,
    octopamine: 0.2,
    currentReward: 0,
    cumulativeReward: 0,
    stepPenalty: 0,
    targetApproached: false,
    distanceDelta: 0,
  });

  const [distanceToWp, setDistanceToWp] = useState<number>(15);

  const waypoints = ARENA_WAYPOINTS[arenaPreset] || ARENA_WAYPOINTS.slalom;

  const handleTelemetry = useCallback((data: {
    activeWp: number;
    distToWp: number;
    deltaDist: number;
    isHappy: boolean;
    dopamine: number;
    octopamine: number;
    turn: number;
    thrust: number;
    completedCount: number;
    hasReachedGoal: boolean;
    generation: number;
  }) => {
    setDistanceToWp(data.distToWp);

    setStats(prev => ({
      ...prev,
      activeWaypointIndex: data.activeWp,
      waypointsCompleted: data.completedCount,
      hasReachedGoal: data.hasReachedGoal,
      generation: data.generation,
      stepCount: prev.stepCount + 1
    }));

    setEmotion(prev => ({
      ...prev,
      currentEmotion: data.hasReachedGoal
        ? 'ecstatic'
        : data.isHappy
        ? 'happy'
        : 'sad',
      dopamine: data.dopamine,
      octopamine: data.octopamine,
      targetApproached: data.isHappy,
      distanceDelta: data.deltaDist,
      cumulativeReward: prev.cumulativeReward + (data.isHappy ? 0.6 : -0.4)
    }));
  }, []);

  const handleTogglePlayPause = () => {
    setSimSpeed(prev => (prev === 0 ? 1 : 0));
  };

  const handleCycleSpeed = () => {
    setSimSpeed(prev => {
      if (prev === 0) return 1;
      if (prev === 1) return 2;
      if (prev === 2) return 5;
      if (prev === 5) return 10;
      return 1;
    });
  };

  const downloadConnectomeJSON = () => {
    const jsonStr = flyBrain.exportConnectomeJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flywire_connectome_circuit.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. TOP BAR */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur z-20 shrink-0">
        {/* Zone 1: Single Brand element */}
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${emotion.currentEmotion === 'happy' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-base font-bold tracking-tight text-slate-100">
            Drosophila Biorobot 3D
          </span>
          <span className="hidden sm:inline text-xs text-slate-500 font-mono">
            FlyWire Connectom
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => setIsConnectomeModalOpen(true)}
            className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
          >
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connectom-Atlas</span>
          </button>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <button
            onClick={() => setIsPythonModalOpen(true)}
            className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Python-Handoff (Code)</span>
          </button>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <button
            onClick={downloadConnectomeJSON}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Fliegenhirn-Download (.json)</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 font-mono">
          {/* Autonomous Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs">
            <Brain className="w-3.5 h-3.5" />
            <span>100% Fliegenhirn-Steuerung</span>
          </div>

          {/* Speed Toggle */}
          <button
            onClick={handleCycleSpeed}
            title="Simulations-Geschwindigkeit"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs border border-slate-800 transition-colors"
          >
            <FastForward className="w-3 h-3 text-cyan-400" />
            <span>{simSpeed === 0 ? 'PAUSE' : `${simSpeed}x`}</span>
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={handleTogglePlayPause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              simSpeed === 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {simSpeed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. SUB-BAR: Presets & Cameras */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2 bg-slate-950 border-b border-slate-800/60 text-xs font-mono text-slate-400 gap-3">
        {/* Arena Mode */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">ARENA:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => setArenaPreset('slalom')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                arenaPreset === 'slalom' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              6 Wegpunkte Slalom
            </button>
            <button
              onClick={() => setArenaPreset('windTunnel')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                arenaPreset === 'windTunnel' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Windkanal
            </button>
            <button
              onClick={() => setArenaPreset('garden')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                arenaPreset === 'garden' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Garten-Pfad
            </button>
          </div>
        </div>

        {/* Camera Views: 3rd-Person Follow von hinten! */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">KAMERA:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => setCameraMode('follow')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                cameraMode === 'follow' ? 'bg-slate-800 text-emerald-300 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>3D-Verfolgung (von hinten)</span>
            </button>
            <button
              onClick={() => setCameraMode('firstPerson')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                cameraMode === 'firstPerson' ? 'bg-slate-800 text-emerald-300 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Facettenauge (1st Person)
            </button>
            <button
              onClick={() => setCameraMode('topDown')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                cameraMode === 'topDown' ? 'bg-slate-800 text-emerald-300 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              Draufsicht
            </button>
            <button
              onClick={() => setCameraMode('orbit')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                cameraMode === 'orbit' ? 'bg-slate-800 text-emerald-300 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              3D Orbit
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* 3D Simulation Viewport */}
        <div className="relative w-full h-[52vh] min-h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
          <FlySimulation3D
            brain={flyBrain}
            arenaPreset={arenaPreset}
            cameraMode={cameraMode}
            simSpeed={simSpeed}
            onUpdateTelemetry={handleTelemetry}
          />

          {/* Live HUD Overlay inside 3D View */}
          <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none font-mono text-xs">
            <div className="px-3 py-1.5 bg-black/80 backdrop-blur rounded-lg border border-white/10 text-slate-200 flex items-center gap-2">
              <span className="text-slate-400">DISTANZ:</span>
              <span className="text-cyan-400 font-bold tabular-nums">
                {distanceToWp.toFixed(1)} m
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">GEFÜHL:</span>
              <span className={emotion.currentEmotion === 'happy' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {emotion.currentEmotion === 'happy' ? '😊 Glücklich (Annäherung)' : '😢 Trauer (Abweichung)'}
              </span>
            </div>
          </div>
        </div>

        {/* The 6-Waypoints & Emotion HUD (Dashboard mit Belohnungsmessern) */}
        <EmotionHUD
          emotion={emotion}
          stats={stats}
          waypoints={waypoints}
        />

        {/* Live Biological FlyWire Brain Visualizer (Spikes & Voltage) */}
        <BrainVisualizer
          brain={flyBrain}
          isHappy={emotion.targetApproached}
        />

        {/* Explain Card */}
        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 text-sm">
                Neurobiologische Verknüpfung: FlyWire Connectom $\rightarrow$ Roboter-Aktorik
              </div>
              <p className="mt-0.5 leading-relaxed text-slate-400">
                Die Steuerung läuft zu 100% über die synaptischen Verbindungen des echten Fliegenhirns. Nähert sich der Roboter dem aktiven Wegpunkt,
                stimulieren die <strong className="text-emerald-400">PAM-Dopamin-Neuronen</strong> die Annäherung (<strong className="text-emerald-400">Glücksgefühl</strong>).
                Entfernt er sich, stimulieren <strong className="text-rose-400">PPL1-Neuronen</strong> Aversion (<strong className="text-rose-400">Trauer</strong>).
                Nach 6 Wegpunkten erreicht der Roboter das finale Zucker-Ziel.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPythonModalOpen(true)}
            className="shrink-0 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold rounded-lg border border-emerald-500/30 transition-colors"
          >
            Python-Skript ansehen
          </button>
        </div>
      </main>

      {/* Modals */}
      <PythonHandoffModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />
      <ConnectomeExplorerModal
        isOpen={isConnectomeModalOpen}
        onClose={() => setIsConnectomeModalOpen(false)}
      />
    </div>
  );
}
