import React from 'react';
import { X, Network, Database, Compass, Award, ExternalLink } from 'lucide-react';

interface ConnectomeExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectomeExplorerModal: React.FC<ConnectomeExplorerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Drosophila melanogaster Connectom Atlas
              </h3>
              <p className="text-xs text-slate-400">
                FlyWire, Codex & Google DeepMind / Princeton Forschungsdaten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300 leading-relaxed">
          {/* Key Connectome Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
              <div className="text-xl font-bold text-cyan-400 tabular-nums font-mono">139.255</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Kartierte Neuronen</div>
            </div>
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
              <div className="text-xl font-bold text-emerald-400 tabular-nums font-mono">54.5 Mio.</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Synapsen</div>
            </div>
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
              <div className="text-xl font-bold text-amber-400 tabular-nums font-mono">8.450</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Zelltypen</div>
            </div>
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
              <div className="text-xl font-bold text-purple-400 tabular-nums font-mono">140 m</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Nervenstranglänge</div>
            </div>
          </div>

          {/* Biological Circuit Architecture */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Wie die Fliege navigiert (Zentralkomplex & Ring-Attraktor)</span>
            </h4>
            <p className="text-xs text-slate-300">
              Im Zentrum des Fliegenhirns liegt der <strong>Zentralkomplex (Central Complex, CX)</strong>.
              Hier bilden die <strong>E-PG Neuronen</strong> im sogenannten <em>Ellipsoid Body</em> einen
              biologischen Ring-Kompass: Ein aktives Neuronen-Bündel wandert im Kreis im Takt der Drehung der Fliege
              (ähnlich einer Kompassnadel). Zusammen mit den <strong>FB4R-Neuronen</strong> (Fan-Shaped Body)
              wird die Differenz zum Zielvektor berechnet und an die absteigenden Motor-Neuronen (<strong>DNa01/DNa02</strong>)
              übertragen.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Das neuronale &quot;Gefühls-System&quot; (Dopamin &amp; Octopamin im Pilzkörper)</span>
            </h4>
            <p className="text-xs text-slate-300">
              Fliegen besitzen keine Gefühle im menschlichen Sinn, aber hochentwickelte <strong>Valenz-Schaltkreise</strong>.
              Wenn sich der Bioroboter einem Wegpunkt nähert:
            </p>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-emerald-400">Glücksgefühl / Belohnung:</strong> Die <strong>PAM-Neuronen</strong> schütten
                Dopamin in die γ5-Region des Pilzkörpers aus. Dies stärkt synaptisch die Verknüpfung zu den <em>MBON-Annäherungsneuronen</em>.
              </li>
              <li>
                <strong className="text-rose-400">Trauer / Aversive Vermeidung:</strong> Entfernt sich der Roboter, werden die
                <strong>PPL1-Neuronen</strong> und Octopamin aktiv. Dies hemmt die aktuellen Pfade und zwingt die Fliege zur Richtungsänderung.
              </li>
            </ul>
          </div>

          {/* Open Datasets & Links */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Öffentliche Connectom-Datenquellen zum Download:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 text-xs">
              <a
                href="https://codex.flywire.ai/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>FlyWire Codex Browser</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://virtualflybrain.org/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>Virtual Fly Brain (VFB)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/flyconnectome/fafbseg-py"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>fafbseg Python API</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
