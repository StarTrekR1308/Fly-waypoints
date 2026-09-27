import React, { useState } from 'react';
import { FunctionalFlyBrain } from '../simulation/flywireConnectome';
import { Activity, Download, Eye, ChevronRight } from 'lucide-react';

interface BrainVisualizerProps {
  brain: FunctionalFlyBrain;
  isHappy: boolean;
}

export const BrainVisualizer: React.FC<BrainVisualizerProps> = ({
  brain,
  isHappy,
}) => {
  const [selectedNeuronId, setSelectedNeuronId] = useState<string | null>(null);

  const neurons = Array.from(brain.neurons.values());
  const selectedNeuron = neurons.find(n => n.id === selectedNeuronId);

  const downloadJSON = () => {
    const jsonStr = brain.exportConnectomeJSON();
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 font-mono">
      {/* Header with Dataset Info & Direct Download */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs text-slate-100 uppercase tracking-wide">
            Echtes Fliegen-Konnektom (FlyWire / Codex FAFB Circuit)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            {isHappy ? (
              <span className="text-emerald-400 font-bold">😊 GLÜCKLICH (+Dopamin PAM-γ5)</span>
            ) : (
              <span className="text-rose-400 font-bold">😢 TRAUER (+Octopamin PPL1)</span>
            )}
          </span>
          <button
            onClick={downloadJSON}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition-colors"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>Konnektom-JSON downloaden</span>
          </button>
        </div>
      </div>

      {/* Real Biological Neurons Table with Voltage & Spikes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
        {/* Layer 1: Sensorik */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
          <div className="text-[10px] text-cyan-400 font-bold uppercase border-b border-slate-800 pb-1">
            1. Sensorik (Lobula & Antenne)
          </div>
          {neurons.filter(n => n.layer === 'sensory').map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNeuronId(n.id)}
              className={`p-1.5 rounded text-left transition-colors border ${
                selectedNeuronId === n.id
                  ? 'bg-cyan-950 border-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-bold truncate">{n.cellType}</span>
                <span className="text-[10px] text-cyan-400 tabular-nums">
                  {n.voltage.toFixed(0)} mV
                </span>
              </div>
              <div className="text-[9px] text-slate-400 truncate">{n.neuropil}</div>
            </button>
          ))}
        </div>

        {/* Layer 2: CX Kompass */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
          <div className="text-[10px] text-blue-400 font-bold uppercase border-b border-slate-800 pb-1">
            2. CX Kompass (E-PG / P-EN)
          </div>
          {neurons.filter(n => n.layer === 'cx_compass').map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNeuronId(n.id)}
              className={`p-1.5 rounded text-left transition-colors border ${
                selectedNeuronId === n.id
                  ? 'bg-blue-950 border-blue-500/50'
                  : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-bold truncate">{n.cellType}</span>
                <span className="text-[10px] text-blue-400 tabular-nums">
                  {n.voltage.toFixed(0)} mV
                </span>
              </div>
              <div className="text-[9px] text-slate-400 truncate">{n.neuropil}</div>
            </button>
          ))}
        </div>

        {/* Layer 3: CX Vektorsteuerung */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
          <div className="text-[10px] text-indigo-400 font-bold uppercase border-b border-slate-800 pb-1">
            3. CX Vektor (Fan-Shaped)
          </div>
          {neurons.filter(n => n.layer === 'cx_steering').map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNeuronId(n.id)}
              className={`p-1.5 rounded text-left transition-colors border ${
                selectedNeuronId === n.id
                  ? 'bg-indigo-950 border-indigo-500/50'
                  : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-bold truncate">{n.cellType}</span>
                <span className="text-[10px] text-indigo-400 tabular-nums">
                  {n.voltage.toFixed(0)} mV
                </span>
              </div>
              <div className="text-[9px] text-slate-400 truncate">{n.neuropil}</div>
            </button>
          ))}
        </div>

        {/* Layer 4: Pilzkörper (Gefühl & Lernen) */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
          <div className="text-[10px] text-amber-400 font-bold uppercase border-b border-slate-800 pb-1">
            4. Pilzkörper (PAM / MBON)
          </div>
          {neurons.filter(n => n.layer === 'mushroom_body').map(n => {
            const isPam = n.cellType.includes('PAM');
            const isPpl = n.cellType.includes('PPL1');
            return (
              <button
                key={n.id}
                onClick={() => setSelectedNeuronId(n.id)}
                className={`p-1.5 rounded text-left transition-colors border ${
                  selectedNeuronId === n.id
                    ? 'bg-amber-950 border-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold truncate ${isPam ? 'text-emerald-400' : isPpl ? 'text-rose-400' : 'text-slate-200'}`}>
                    {n.cellType}
                  </span>
                  <span className="text-[10px] text-amber-400 tabular-nums">
                    {n.voltage.toFixed(0)} mV
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 truncate">{n.function}</div>
              </button>
            );
          })}
        </div>

        {/* Layer 5: Absteigende Motor-Neuronen */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
          <div className="text-[10px] text-emerald-400 font-bold uppercase border-b border-slate-800 pb-1">
            5. Motorik (VNC Flügel/Beine)
          </div>
          {neurons.filter(n => n.layer === 'motor').map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNeuronId(n.id)}
              className={`p-1.5 rounded text-left transition-colors border ${
                selectedNeuronId === n.id
                  ? 'bg-emerald-950 border-emerald-500/50'
                  : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-bold truncate">{n.cellType}</span>
                <span className="text-[10px] text-emerald-400 tabular-nums">
                  {n.voltage.toFixed(0)} mV
                </span>
              </div>
              <div className="text-[9px] text-slate-400 truncate">{n.function}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Neuron Inspector */}
      {selectedNeuron && (
        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">FlyWire ID:</span>
            <span className="text-cyan-400 font-bold">{selectedNeuron.id}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-semibold">{selectedNeuron.cellType}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{selectedNeuron.function}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Transmitter:</span>
            <span className="text-emerald-400 capitalize">{selectedNeuron.neurotransmitter}</span>
            <span className="text-slate-400">Membran:</span>
            <span className="text-amber-400">{selectedNeuron.voltage.toFixed(1)} mV</span>
          </div>
        </div>
      )}
    </div>
  );
};
