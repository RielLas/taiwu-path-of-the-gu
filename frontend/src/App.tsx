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

export type ActiveTab = 'World' | 'Aperture' | 'Refine' | 'Ascend' | 'Ledger';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('World');
  const isCombatActive = useCombatStore((state) => state.isActive);
  const cultivator = useCultivatorStore((state) => state.cultivator);

  // When the player enters a Node from the Overworld, we switch to the tile explorer
  const [activeNodeData, setActiveNodeData] = useState<any>(null);

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
