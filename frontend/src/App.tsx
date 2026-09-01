import { useState } from 'react';
import OverworldModal from './components/world/OverworldModal';
import MapGrid from './components/map/MapGrid';
import TaiwuHUD from './components/ui/TaiwuHUD';
import ApertureModal from './components/aperture/ApertureModal';
import CrucibleModal from './components/crucible/CrucibleModal';
import AscensionChamber from './components/views/AscensionChamber';
import CharacterLedger from './components/views/CharacterLedger';
import CombatArena from './components/views/CombatArena';
import { useCombatStore } from './hooks/useCombat';
import { useCultivatorStore } from './hooks/useCultivator';
import { unlockAudioContext, playJadeClinkSound } from './hooks/useAudio';

export type ActiveTab = 'World' | 'Aperture' | 'Refine' | 'Ascend' | 'Ledger';

function App() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('World');
  const isCombatActive = useCombatStore((state) => state.isActive);
  const cultivator = useCultivatorStore((state) => state.cultivator);

  // When the player enters a Node from the Overworld, we switch to the tile explorer
  const [activeNodeData, setActiveNodeData] = useState<any>(null);

  const handleEnterWorld = async () => {
    setIsEntering(true);
    await unlockAudioContext();
    playJadeClinkSound();
    setTimeout(() => {
      setIsInitialized(true);
    }, 400);
  };

  const handleEnterNode = (nodeData: any) => {
    setActiveNodeData(nodeData);
  };

  const handleExitNode = () => {
    setActiveNodeData(null);
  };

  // Global Modal & Overlay Supremacy: HUD only renders during raw overworld exploration
  const isOverlayActive = activeTab !== 'World' || isCombatActive;

  const hpPercent = cultivator ? ((cultivator.hp ?? 100) / (cultivator.max_hp ?? 100)) * 100 : 100;
  const isCriticalHp = hpPercent < 30;

  // ─── Audio Autoplay Gate (Initialization Screen) ──────────────────────────
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070605] flex flex-col items-center justify-center select-none overflow-hidden text-center px-4">
        {/* Atmospheric background aura */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-950/25 via-[#0c0a08]/90 to-[#050404] pointer-events-none" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none" />

        {/* Framing border */}
        <div className="relative max-w-xl w-full p-8 md:p-12 glass-panel border border-[#c89b3c]/40 rounded-3xl bg-[#12100d]/90 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col items-center gap-6 animate-fade-in">
          
          {/* Top calligraphy badge */}
          <div className="w-16 h-16 rounded-full border border-[#c89b3c]/60 bg-gradient-to-b from-[#251e14] to-[#0d0a07] flex items-center justify-center shadow-[0_0_20px_rgba(200,155,60,0.3)]">
            <span className="text-3xl">🎴</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-serif font-black tracking-widest text-amber-200 drop-shadow-[0_2px_10px_rgba(200,155,60,0.4)]">
              太吾蛊道
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] font-sans font-bold text-[#8a8275]">
              Taiwu: Path of the Gu
            </p>
          </div>

          <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-[#c89b3c]/60 to-transparent" />

          {/* Reverend Insanity Atmospheric Proclamation */}
          <div className="flex flex-col gap-1.5 text-xs md:text-sm font-serif italic text-amber-100/70 leading-relaxed px-2">
            <p>“人是万物之灵，蛊是天地真精。”</p>
            <p className="text-[11px] font-sans not-italic text-[#8a8275]">
              “Man is the spirit of all living beings, Gu are the essence of Heaven and Earth.”
            </p>
          </div>

          {/* Interactive Unlock Button */}
          <button
            onClick={handleEnterWorld}
            disabled={isEntering}
            className={`w-full py-3.5 px-6 rounded-2xl font-serif font-bold text-sm tracking-widest uppercase transition-all duration-300 border flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_25px_rgba(200,155,60,0.3)] ${
              isEntering
                ? 'bg-[#2a1a0f] border-amber-500/50 text-amber-400 scale-95 animate-pulse'
                : 'bg-gradient-to-r from-amber-950 via-[#312010] to-amber-900 border-[#c89b3c] text-amber-200 hover:brightness-125 hover:shadow-[0_0_35px_rgba(200,155,60,0.6)] hover:scale-102 active:scale-95'
            }`}
          >
            <span>{isEntering ? 'Entering the Gu World...' : 'Click to Enter the Gu World'}</span>
            <span className="text-lg">🗡️</span>
          </button>

          <span className="text-[10px] font-sans text-stone-500 tracking-wider">
            Audio context & procedural soundscape will initialize upon entry.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink relative overflow-hidden">
      {/* Global Visual Degradation: Low HP Crimson Vignette */}
      {isCriticalHp && (
        <div className="fixed inset-0 bg-red-900/10 shadow-[inset_0_0_90px_rgba(153,27,27,0.6)] border-[8px] border-red-950/40 pointer-events-none z-50 animate-pulse" />
      )}

      {/* World View: Overworld Map or Node Tile Explorer */}
      <div className={`transition-opacity duration-500 ${activeTab === 'World' ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
        {activeNodeData ? (
          // Inside a node — show the 15x15 local tile explorer
          <MapGrid 
            initialNodeData={activeNodeData} 
            onExitNode={handleExitNode} 
          />
        ) : (
          // Overworld map with 5 regions & nodes
          <OverworldModal onEnterNode={handleEnterNode} />
        )}
      </div>

      {/* Aperture Modal */}
      {activeTab === 'Aperture' && (
        <ApertureModal onClose={() => setActiveTab('World')} />
      )}

      {/* Refine Modal */}
      {activeTab === 'Refine' && (
        <CrucibleModal onClose={() => setActiveTab('World')} />
      )}

      {/* Closed Door Cultivation: Ascension Chamber */}
      {activeTab === 'Ascend' && (
        <AscensionChamber 
          onClose={() => setActiveTab('World')} 
          onAscendSuccess={() => setActiveTab('World')} 
        />
      )}

      {/* Scroll of Taiwu Character Ledger */}
      {activeTab === 'Ledger' && (
        <CharacterLedger 
          onClose={() => setActiveTab('World')} 
        />
      )}

      {/* Persistent Taiwu HUD — strictly rendered only during Overworld exploration */}
      {!isOverlayActive && (
        <TaiwuHUD
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Global Tactical Combat Arena */}
      <CombatArena />

    </div>
  );
}

export default App;
