import { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useWorldStore } from '../../hooks/useWorldStore';
import { useCultivatorStore } from '../../hooks/useCultivator';
import type { Encounter } from '../../hooks/useWorldStore';
import { useCombatStore } from '../../hooks/useCombat';
import { playJadeClinkSound, playBrushSound } from '../../hooks/useAudio';

interface MapGridProps {
  initialNodeData?: any;
  onExitNode?: () => void;
}

const BIOME_STYLES: Record<string, { bg: string; icon: string; border: string; glow?: string }> = {
  'Faction Outpost': { 
    bg: 'bg-gradient-to-br from-[#2a1a10] via-[#1a1410] to-[#251508]', 
    icon: '🏯', 
    border: 'border-2 border-[#c89b3c] animate-pulse', 
    glow: 'shadow-[0_0_25px_rgba(200,155,60,0.85)] ring-2 ring-[#c89b3c]/70' 
  },
  'Spirit Spring': { 
    bg: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-700', 
    icon: '💎', 
    border: 'border-2 border-emerald-400 animate-pulse', 
    glow: 'shadow-[0_0_25px_rgba(52,211,153,0.9)] ring-2 ring-emerald-400/80' 
  },
  'Southern Border Mountain': { bg: 'bg-[#2b1f16]', icon: '⛰️', border: 'border-amber-800/60' },
  'Northern Plains Grassland': { bg: 'bg-[#1b2b1a]', icon: '🌾', border: 'border-emerald-800/60' },
  'Eastern Sea Reef': { bg: 'bg-[#122830]', icon: '🌊', border: 'border-cyan-700/60' },
  'Western Desert Dunes': { bg: 'bg-[#3b2d15]', icon: '🏜️', border: 'border-yellow-700/60' },
  'Central Continent Plains': { bg: 'bg-[#1e1c24]', icon: '🏛️', border: 'border-purple-800/60' },
  'Bamboo Forest': { bg: 'bg-[#1e3a2b]', icon: '🎋', border: 'border-emerald-700/50' },
  'Venom Swamp': { bg: 'bg-[#2d1b36]', icon: '☠️', border: 'border-purple-800/50' },
  'Ancient Ruins': { bg: 'bg-[#2b2b2b]', icon: '🏛️', border: 'border-amber-900/50' },
  'Sect Grounds': { bg: 'bg-[#1b2a38]', icon: '🏯', border: 'border-sky-800/50' },
  'Spirit Veins': { bg: 'bg-[#163832]', icon: '⛏️', border: 'border-teal-700/50' },
  'Mountain Pass': { bg: 'bg-[#3b2d1d]', icon: '⛰️', border: 'border-amber-800/50' },
  'Blood Mountain': { bg: 'bg-[#3f1617]', icon: '🩸', border: 'border-red-800/50' },
  'Wilderness': { bg: 'bg-[#1a2318]', icon: '🌲', border: 'border-[#3b4d3c]/30' }
};

export default function MapGrid({ initialNodeData, onExitNode }: MapGridProps) {
  const { grid, playerLocation, enforcer, fetchLocalGrid, loadInitialNodeData, travel } = useWorldStore();
  const { cultivator, captureWildGu, fetchAperture } = useCultivatorStore();

  const [logs, setLogs] = useState<string[]>(['> Primeval Aperture steady. Ready to explore.']);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [encounterResult, setEncounterResult] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If initial node payload exists, load it immediately into the store
    if (initialNodeData) {
      loadInitialNodeData(initialNodeData);
    } else if (grid.length === 0) {
      // Fallback: actively request sector 1 grid from the backend
      fetchLocalGrid(1);
    }
  }, [initialNodeData, loadInitialNodeData, fetchLocalGrid, grid.length]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCombat = async (customEnemy?: any) => {
    const enemy = customEnemy || activeEncounter?.enemy || (activeEncounter?.enemy_name ? {
      name: activeEncounter.enemy_name,
      hp: activeEncounter.enemy_hp || 100,
      atk: activeEncounter.enemy_atk || 15,
      reward_stones: activeEncounter.reward_stones || 10,
      is_enforcer: false
    } : null);

    if (!enemy) return;

    // Start combat via the global store
    const { startCombat } = useCombatStore.getState();
    startCombat(
      enemy.name,
      enemy.hp || 100,
      enemy.atk || 15,
      enemy.reward_stones || 10,
      Boolean(enemy.is_enforcer)
    );

    // Clear the map encounter overlay since the CombatArena will take over
    setActiveEncounter(null);
  };

  const handleTravel = async (targetX: number, targetY: number) => {
    if (activeEncounter) return; // Block move while encounter is unresolved
    try {
      const { encounter, logs: newLogs } = await travel(targetX, targetY);
      setLogs(prev => [...prev, ...newLogs]);

      if (encounter) {
        if (encounter.is_interception && encounter.enemy) {
          setLogs(prev => [...prev, `> ⚠️ AMBUSH: ${encounter.title}! Forced into battle!`]);
          handleCombat(encounter.enemy);
        } else {
          setActiveEncounter(encounter);
          setEncounterResult(null);
        }
      }

      // Sync cultivator essence and stones
      fetchAperture();
    } catch (err: any) {
      setLogs(prev => [...prev, `> Movement Error: ${err.message}`]);
    }
  };

  const handleCaptureGu = async () => {
    if (!activeEncounter?.wild_gu) return;
    setIsSubmitting(true);
    try {
      await captureWildGu(activeEncounter.wild_gu);
      setEncounterResult('✨ Successfully subdued and stored into your Aperture!');
      setLogs(prev => [...prev, `> Captured Wild Gu: ${activeEncounter.wild_gu.name}`]);
    } catch (err: any) {
      setEncounterResult(`💀 Capture failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHarvest = async () => {
    setIsSubmitting(true);
    try {
      const stones = activeEncounter?.amount || 15;
      playJadeClinkSound();
      await fetchAperture();
      setEncounterResult(`✨ Harvested +${stones} Primeval Stones!`);
      setLogs(prev => [...prev, `> Harvested: ${activeEncounter?.title || 'Resource'} (+${stones} Primeval Stones)`]);
    } catch (err: any) {
      setEncounterResult('✨ Resource gathered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFactionExtort = async () => {
    if (!activeEncounter?.faction) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('http://127.0.0.1:8001/api/v1/world/faction/extort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faction_name: activeEncounter.faction })
      });
      const data = await res.json();
      if (data.success) {
        playJadeClinkSound();
        setEncounterResult(data.message);
        setLogs(prev => [...prev, `> ☠️ Extorted ${activeEncounter.faction}: +${data.loot_stones} Stones! Bounty issued.`]);
        await fetchAperture();
      } else {
        setEncounterResult(`💀 Extortion failed: ${data.message}`);
      }
    } catch (err: any) {
      setEncounterResult(`💀 Extortion failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFactionTrade = async (item: any) => {
    if (!activeEncounter?.faction) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('http://127.0.0.1:8001/api/v1/world/faction/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faction_name: activeEncounter.faction,
          item_id: item.id,
          cost: item.cost,
          gu: item.gu
        })
      });
      const data = await res.json();
      if (data.success) {
        playJadeClinkSound();
        setEncounterResult(data.message);
        setLogs(prev => [...prev, `> 🤝 Purchased '${item.name}' from ${activeEncounter.faction} (-${item.cost} Stones).`]);
        await fetchAperture();
      } else {
        setEncounterResult(`💀 Trade failed: ${data.message}`);
      }
    } catch (err: any) {
      setEncounterResult(`💀 Trade failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFactionAttack = () => {
    if (!activeEncounter?.guard_enemy) return;
    const { startCombat } = useCombatStore.getState();
    startCombat(
      activeEncounter.guard_enemy.name,
      activeEncounter.guard_enemy.hp || 95,
      activeEncounter.guard_enemy.atk || 30,
      activeEncounter.guard_enemy.reward_stones || 50
    );
    setActiveEncounter(null);
  };

  return (
    <div className="absolute inset-0 bg-[#12100d] z-40 flex flex-col md:flex-row font-serif overflow-hidden select-none">

      {/* LEFT / CENTER VIEWPORT: 2.5D Isometric Transform Canvas */}
      <div className="flex-1 relative h-full w-full overflow-hidden bg-[#0d0b09]">

        {/* Subtle Ambient Vignette & Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(10,9,7,0.85)_100%)] pointer-events-none z-10"></div>
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none z-10"></div>

        <TransformWrapper
          initialScale={0.8}
          minScale={1.0}
          maxScale={2.0}
          centerOnInit={true}
          limitToBounds={false}
          wheel={{ step: 0.08 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Floating Camera & Sector Controls */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#12100d]/90 backdrop-blur border border-[#2a2620] px-3.5 py-2 rounded-xl shadow-2xl">
                <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#c89b3c] font-bold">
                  Sector Grid (2.5D) • [{playerLocation.x}, {playerLocation.y}]
                </span>
                <div className="w-px h-4 bg-[#2a2620] mx-1"></div>
                <button
                  onClick={() => zoomIn()}
                  className="w-6 h-6 flex items-center justify-center text-xs text-[#8a8275] hover:text-[#d5cfc4] rounded hover:bg-[#1a1814] font-bold transition-colors"
                  title="Zoom In"
                >
                  ＋
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="w-6 h-6 flex items-center justify-center text-xs text-[#8a8275] hover:text-[#d5cfc4] rounded hover:bg-[#1a1814] font-bold transition-colors"
                  title="Zoom Out"
                >
                  －
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="text-[10px] text-[#8a8275] hover:text-[#c89b3c] px-2 py-0.5 rounded hover:bg-[#1a1814] uppercase tracking-wider font-bold transition-colors"
                  title="Reset Camera"
                >
                  Reset
                </button>
                <div className="w-px h-4 bg-[#2a2620] mx-1"></div>
                <button
                  onClick={() => { playBrushSound(); onExitNode?.(); }}
                  className="text-[10px] text-[#8a8275] hover:text-[#c89b3c] px-2 py-0.5 rounded hover:bg-[#1a1814] uppercase tracking-wider font-bold border border-[#2a2620] transition-colors"
                >
                  Exit Node
                </button>
              </div>

              {/* Dynamic Hunter Matrix: Predator Pursuit Banner (Relocated below header) */}
              {enforcer && enforcer.active && enforcer.status !== 'defeated' && (
                <div className="absolute top-24 right-8 z-30 flex items-center gap-3 bg-gradient-to-r from-red-950/95 via-[#1a0808]/95 to-red-950/95 border-2 border-red-600/80 px-4 py-2.5 rounded-2xl shadow-[0_8px_32px_rgba(220,38,38,0.7)] backdrop-blur-md animate-pulse">
                  <span className="text-xl animate-bounce">⚖️</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-red-300 uppercase tracking-widest font-sans">
                        ⚠️ PREDATOR MATRIX: {enforcer.name}
                      </span>
                      <span className="text-[9px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded font-mono font-bold border border-red-500 shadow">
                        ⚡ {Math.round(enforcer.stamina)} / {enforcer.max_stamina}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-sans block mt-0.5">
                      Distance: <strong className="text-amber-300">{Math.abs(enforcer.pos[0] - playerLocation.x) + Math.abs(enforcer.pos[1] - playerLocation.y)} tiles</strong> • Status: <strong className="text-red-400 capitalize">{enforcer.status}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Pan/Zoom Canvas Area */}
              <TransformComponent
                wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing"
                contentClass="!w-full !h-full flex items-center justify-center min-w-[1400px] min-h-[1200px]"
              >
                {/* 2.5D Isometric Tilt Wrapper */}
                <div
                  className="relative p-12 transition-transform duration-200 ease-out"
                  style={{
                    transform: 'rotateX(60deg) rotateZ(-45deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* The 15x15 Tile Grid Plane */}
                  <div
                    className="grid gap-1.5 p-6 bg-[#0a0907]/95 rounded-2xl border-2 border-[#2a2620] shadow-[0_0_80px_rgba(0,0,0,0.95)]"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    {grid.map((tile, idx) => {
                      const isPlayerHere = tile.x === playerLocation.x && tile.y === playerLocation.y;
                      const isEnforcerHere = Boolean(enforcer && enforcer.active && enforcer.status !== 'defeated' && tile.x === enforcer.pos[0] && tile.y === enforcer.pos[1]);
                      const isAdjacent = Math.abs(tile.x - playerLocation.x) <= 1 && Math.abs(tile.y - playerLocation.y) <= 1 && !isPlayerHere;
                      
                      const isFaction = tile.type === 'Faction Outpost' || tile.terrain === 'Faction Outpost' || tile.is_faction_node;
                      const isSpring = tile.type === 'Spirit Spring' || tile.terrain === 'Spirit Spring' || tile.is_spirit_spring;
                      const styleKey = isFaction ? 'Faction Outpost' : isSpring ? 'Spirit Spring' : (tile.type || tile.terrain || tile.biome || 'Wilderness');
                      const style = BIOME_STYLES[styleKey] || (tile.biome ? BIOME_STYLES[tile.biome] : undefined) || BIOME_STYLES['Wilderness'];

                      return (
                        <div
                          key={idx}
                          onClick={() => isAdjacent ? handleTravel(tile.x, tile.y) : null}
                          className={`
                            relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 aspect-square border rounded flex items-center justify-center transition-all duration-300
                            ${isEnforcerHere ? 'bg-gradient-to-br from-red-950 via-rose-950 to-red-900 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.95)] ring-2 ring-red-500 z-25 animate-pulse' : !tile.discovered ? 'bg-[#0a0907] border-[#1a1814]' : `${style.bg} ${style.border}`}
                            ${!tile.discovered && !isEnforcerHere ? 'opacity-35' : 'opacity-100 shadow-lg'}
                            ${(isSpring || isFaction) && tile.discovered ? (style.glow || '') : ''}
                            ${isPlayerHere ? 'ring-2 ring-[#c89b3c] shadow-[0_0_25px_rgba(200,155,60,0.9)] z-30 scale-110' : ''}
                            ${isAdjacent ? 'cursor-pointer hover:border-[#c89b3c] hover:scale-105 hover:z-20 animate-pulse border-gold/40' : 'cursor-default'}
                          `}
                          title={`${isEnforcerHere ? `⚔️ ${enforcer?.name} (${enforcer?.status})` : isFaction ? `Faction Outpost: ${tile.faction || 'Sect Territory'}` : isSpring ? 'Natural Jade Spirit Spring' : tile.type} (${tile.x}, ${tile.y})`}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          {/* Billboard / Counter-Rotate Icon Container */}
                          <div
                            className="flex items-center justify-center pointer-events-none select-none"
                            style={{
                              transform: 'rotateZ(45deg) rotateX(-60deg)',
                              transformOrigin: 'center center'
                            }}
                          >
                            {isPlayerHere ? (
                              <div className="relative flex flex-col items-center">
                                <span className="text-xl md:text-2xl drop-shadow-[0_4px_10px_rgba(200,155,60,1)] text-[#c89b3c] font-bold animate-bounce">
                                  🚶
                                </span>
                                <div className="w-3 h-1 bg-[#c89b3c]/60 rounded-full blur-[1px] mt-0.5"></div>
                              </div>
                            ) : isEnforcerHere ? (
                              <div className="relative flex flex-col items-center">
                                <span className="text-xl md:text-2xl drop-shadow-[0_4px_15px_rgba(239,68,68,1)] text-red-400 font-bold animate-pulse">
                                  🗡️
                                </span>
                                <div className="w-4 h-1 bg-red-600 rounded-full blur-[1px] mt-0.5 animate-pulse"></div>
                                <div className="absolute -top-5 whitespace-nowrap bg-black/95 border border-red-500/80 px-1.5 py-0.5 rounded text-[7px] text-red-300 font-bold uppercase tracking-wider shadow-lg">
                                  ⚔️ Enforcer ({Math.round(enforcer?.stamina || 0)}⚡)
                                </div>
                              </div>
                            ) : tile.discovered ? (
                              <span className={`text-sm md:text-base opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isSpring ? 'scale-125 animate-bounce' : ''}`}>
                                {style.icon}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* RIGHT PANEL: Cultivator Stats & Logs */}
      <div className="w-full md:w-80 bg-[#12100d]/90 border-l border-[#2a2620] flex flex-col shadow-2xl">

        <div className="p-6 border-b border-[#2a2620]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-bold text-[#d5cfc4] tracking-widest">{cultivator?.name || 'Cultivator'}</h2>
              <span className="text-[10px] text-[#c89b3c] font-sans uppercase tracking-[0.2em]">Rank {cultivator?.rank} • {cultivator?.stage}</span>
            </div>
            <div className="text-right text-[10px] text-[#8a8275] font-sans uppercase">
              💎 {cultivator?.spirit_stones ?? 0} Stones
            </div>
          </div>

          <div className="mt-3 space-y-2 text-xs font-sans">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8a8275]">Primeval Sea</span>
                <span className="text-[#3b4d3c] font-semibold">{cultivator?.primeval_essence ?? 0}% Essence</span>
              </div>
              <div className="w-full bg-[#1a1814] rounded-full h-1.5 overflow-hidden border border-[#2a2620]">
                <div
                  className="bg-[#3b4d3c] h-full rounded-full"
                  style={{ width: `${((cultivator?.primeval_essence ?? 0) / (cultivator?.max_essence || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#2a2620] space-y-1.5 mt-2">
              <div className="flex justify-between">
                <span className="text-[#8a8275]">Physical Strength:</span>
                <span className="text-[#d5cfc4] font-bold">
                  {cultivator?.stats.strength.total ?? 0}
                  <span className="text-[#3b4d3c] text-[10px] ml-1 font-normal">
                    ({cultivator?.stats.strength.modifiers.join(', ') || 'Base Human'})
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8275]">Body Tempering:</span>
                <span className="text-[#d5cfc4] font-bold">
                  {cultivator?.stats.defense.total ?? 0}
                  <span className="text-[#3b4d3c] text-[10px] ml-1 font-normal">
                    ({cultivator?.stats.defense.modifiers.join(', ') || 'Mortal Skin'})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col overflow-hidden">
          <h3 className="text-sm uppercase tracking-[0.2em] text-[#5c2424] font-bold mb-3 border-b border-[#5c2424]/30 pb-1">
            Destiny Logs
          </h3>
          <div className="flex-1 overflow-y-auto text-xs text-[#d5cfc4] space-y-2 font-sans pr-1 custom-scrollbar">
            {logs.map((log, idx) => (
              <p key={idx} className="border-l-2 border-[#3b4d3c]/50 pl-2 leading-relaxed opacity-90 text-[11px]">
                {log}
              </p>
            ))}
            <div ref={logsEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Interactive Encounter Modal */}
      {activeEncounter && (
        <div className="fixed inset-0 z-50 bg-[#0a0907]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card border border-[#c89b3c]/40 bg-[#12100d] p-6 rounded-2xl shadow-[0_0_50px_rgba(200,155,60,0.15)] animate-fade-in font-serif">

            <div className="text-center mb-4">
              <span className={`text-xs uppercase tracking-[0.2em] font-sans font-bold block mb-1 ${
                activeEncounter.type === 'faction' ? 'text-amber-400' :
                activeEncounter.type === 'wild_gu' ? 'text-emerald-400' :
                activeEncounter.type === 'resource' ? 'text-[#c89b3c]' : 'text-red-400'
              }`}>
                {activeEncounter.type === 'faction' ? '🏯 Institutional Outpost' :
                  activeEncounter.type === 'wild_gu' ? '🦋 Rare Gu Sighting' :
                  activeEncounter.type === 'resource' ? '✨ Fortuitous Encounter' : '💀 Sudden Ambush'}
              </span>
              <h2 className="text-2xl text-[#d5cfc4] font-bold">{activeEncounter.title}</h2>
              <div className="w-24 h-0.5 bg-[#c89b3c]/50 mx-auto mt-2"></div>
            </div>

            <p className="text-[#8a8275] text-sm leading-relaxed mb-6 font-sans">
              {activeEncounter.desc}
            </p>

            {/* Faction Institutional Outpost Info & Interaction */}
            {activeEncounter.type === 'faction' && (
              <div className="space-y-4 mb-6 font-sans">
                {/* Outpost Standing Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  activeEncounter.is_hostile 
                    ? 'bg-red-950/40 border-red-800/80 shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
                    : 'bg-emerald-950/30 border-emerald-700/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                }`}>
                  <div>
                    <span className="text-[10px] text-[#8a8275] uppercase tracking-wider block">Faction Standing</span>
                    <span className={`text-xs font-bold ${activeEncounter.is_hostile ? 'text-red-300' : 'text-emerald-300'}`}>
                      {activeEncounter.standing}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                    activeEncounter.is_hostile 
                      ? 'bg-red-900/60 text-red-200 border border-red-700' 
                      : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                  }`}>
                    {activeEncounter.reputation && activeEncounter.reputation > 0 ? `+${activeEncounter.reputation}` : activeEncounter.reputation} Rep
                  </span>
                </div>

                {/* Hostile Confrontation View */}
                {activeEncounter.is_hostile ? (
                  <div className="bg-[#171410] border border-red-900/60 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <span>⚠️</span>
                      <span>HOSTILE FORCES DETECTED</span>
                    </div>
                    <p className="text-xs text-[#8a8275] leading-relaxed">
                      Clan sentinels recognize your notorious demonic reputation and draw their primeval weapons! Trespassing is punishable by death.
                    </p>
                    {activeEncounter.guard_enemy && (
                      <div className="bg-[#0a0907] border border-red-950 p-2.5 rounded-lg flex justify-between items-center text-xs">
                        <span className="text-[#d5cfc4] font-medium">{activeEncounter.guard_enemy.name}</span>
                        <span className="text-[#8a8275]">HP: {activeEncounter.guard_enemy.hp} • ATK: {activeEncounter.guard_enemy.atk}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Neutral / Positive Faction Actions View */
                  <div className="space-y-3">
                    {/* Trade Section */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#c89b3c] font-bold block mb-1.5">
                        📦 Outpost Market Trade
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {activeEncounter.trade_inventory?.map((item: any) => {
                          const canAfford = (cultivator?.spirit_stones || 0) >= item.cost;
                          return (
                            <div key={item.id} className="bg-[#171410] border border-[#2a2620] hover:border-[#c89b3c]/50 p-2.5 rounded-xl flex items-center justify-between transition-all">
                              <div className="pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#d5cfc4]">{item.name}</span>
                                  <span className="text-[9px] text-[#8a8275] font-mono">[{item.path}]</span>
                                </div>
                                <span className="text-[10px] text-[#8a8275] block mt-0.5">{item.desc}</span>
                              </div>
                              <button
                                onClick={() => handleFactionTrade(item)}
                                disabled={!canAfford || isSubmitting}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                  canAfford 
                                    ? 'bg-[#c89b3c] text-[#12100d] hover:brightness-110 shadow-md cursor-pointer' 
                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                }`}
                              >
                                {item.cost} 💎
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Demonic Extortion Section */}
                    <div className="bg-[#171410] border border-red-900/50 p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                          <span>☠️</span> Demonic Armed Extortion
                        </span>
                        <span className="text-[10px] text-[#c89b3c] font-bold font-mono">+80 Stones</span>
                      </div>
                      <p className="text-[10px] text-[#8a8275] leading-relaxed">
                        Plunder the supply cache by force. Decreases reputation by -40, shifts alignment towards Demonic (-15), and places a Bounty on your head!
                      </p>
                      <button
                        onClick={handleFactionExtort}
                        disabled={isSubmitting}
                        className="w-full py-2 bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 border border-red-700 text-red-200 text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer uppercase tracking-wider"
                      >
                        {isSubmitting ? 'Plundering...' : '☠️ Execute Extortion & Rob Outpost'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resource Info Box */}
            {activeEncounter.type === 'resource' && (
              <div className="bg-[#171410] border border-[#c89b3c]/40 p-3.5 rounded-xl mb-6 font-sans flex items-center justify-between">
                <div>
                  <span className="text-[#c89b3c] font-bold text-sm block">{activeEncounter.title}</span>
                  <span className="text-xs text-[#8a8275]">Natural spiritual bounty discovered in the wild.</span>
                </div>
                <div className="bg-[#1a1814] border border-[#c89b3c]/50 px-3 py-1.5 rounded-lg text-right">
                  <span className="text-xs text-[#c89b3c] font-bold">+{activeEncounter.amount || 15} Stones</span>
                </div>
              </div>
            )}

            {/* Wild Gu Info Box */}
            {activeEncounter.wild_gu && (
              <div className="bg-[#171410] border border-[#3b4d3c]/40 p-3.5 rounded-xl mb-6 font-sans">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#3b4d3c] font-bold text-sm">{activeEncounter.wild_gu.name}</span>
                  <span className="text-[10px] bg-[#3b4d3c]/20 border border-[#3b4d3c] text-[#3b4d3c] px-2 py-0.5 rounded uppercase font-bold">
                    Tier {activeEncounter.wild_gu.tier} • {activeEncounter.wild_gu.path}
                  </span>
                </div>
                <p className="text-xs text-[#8a8275]">{activeEncounter.wild_gu.effect_desc}</p>
              </div>
            )}

            {/* Enemy Combat Info Box */}
            {activeEncounter.enemy_name && (
              <div className="bg-[#171410] border border-[#5c2424]/40 p-3.5 rounded-xl mb-6 font-sans">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-red-400 font-bold text-sm">{activeEncounter.enemy_name}</span>
                  <span className="text-xs text-[#c89b3c]">Reward: +{activeEncounter.reward_stones} Stones</span>
                </div>
                <div className="text-xs text-[#8a8275] flex gap-4 mt-2">
                  <span>Enemy Health: {activeEncounter.enemy_hp}</span>
                  <span>Enemy Attack: {activeEncounter.enemy_atk}</span>
                </div>
              </div>
            )}

            {/* Outcome Display */}
            {encounterResult && (
              <div className={`mb-6 p-3 rounded-lg border text-center text-xs font-sans font-semibold
                ${encounterResult.includes('failed') ? 'bg-[#5c2424]/10 border-red-500 text-red-400' : 'bg-[#3b4d3c]/10 border-[#3b4d3c] text-[#3b4d3c]'}
              `}>
                {encounterResult}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 font-sans">
              {encounterResult ? (
                <button
                  onClick={() => setActiveEncounter(null)}
                  className="w-full py-3 bg-[#c89b3c] text-[#12100d] font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all cursor-pointer"
                >
                  Continue Exploration
                </button>
              ) : activeEncounter.type === 'faction' ? (
                activeEncounter.is_hostile ? (
                  <>
                    <button
                      onClick={handleFactionAttack}
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-gradient-to-r from-[#5c2424] to-[#3f1617] text-[#d5cfc4] font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all border border-[#5c2424] cursor-pointer"
                    >
                      ⚔️ Engage Sentinels
                    </button>
                    <button
                      onClick={() => setActiveEncounter(null)}
                      className="py-3 px-4 bg-[#1a1814] text-[#8a8275] border border-[#2a2620] text-xs uppercase tracking-wider rounded-lg hover:text-white transition-all cursor-pointer"
                    >
                      Flee Outpost
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setActiveEncounter(null)}
                    className="w-full py-2.5 bg-[#1a1814] hover:bg-[#2a2620] text-[#8a8275] hover:text-[#d5cfc4] border border-[#2a2620] hover:border-[#c89b3c] text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    ✕ Depart Peacefully
                  </button>
                )
              ) : activeEncounter.type === 'wild_gu' ? (
                <>
                  <button
                    onClick={handleCaptureGu}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-[#3b4d3c] to-[#1e3a2b] text-[#d5cfc4] font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all disabled:opacity-50 border border-[#3b4d3c] cursor-pointer"
                  >
                    {isSubmitting ? 'Subduing...' : 'Subdue & Store'}
                  </button>
                  <button
                    onClick={() => setActiveEncounter(null)}
                    className="py-3 px-4 bg-[#1a1814] text-[#8a8275] border border-[#2a2620] text-xs uppercase tracking-wider rounded-lg hover:text-white transition-all cursor-pointer"
                  >
                    Leave
                  </button>
                </>
              ) : activeEncounter.type === 'resource' ? (
                <>
                  <button
                    onClick={handleHarvest}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-[#c89b3c] to-[#8B6914] text-[#12100d] font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all disabled:opacity-50 border border-[#c89b3c] cursor-pointer"
                  >
                    {isSubmitting ? 'Harvesting...' : 'Harvest'}
                  </button>
                  <button
                    onClick={() => setActiveEncounter(null)}
                    className="py-3 px-4 bg-[#1a1814] text-[#8a8275] border border-[#2a2620] text-xs uppercase tracking-wider rounded-lg hover:text-white transition-all cursor-pointer"
                  >
                    Ignore
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCombat}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-[#5c2424] to-[#3f1617] text-[#d5cfc4] font-bold text-xs uppercase tracking-widest rounded-lg hover:brightness-110 transition-all disabled:opacity-50 border border-[#5c2424] cursor-pointer"
                  >
                    {isSubmitting ? 'Battling...' : 'Engage & Slaughter'}
                  </button>
                  <button
                    onClick={() => setActiveEncounter(null)}
                    className="py-3 px-4 bg-[#1a1814] text-[#8a8275] border border-[#2a2620] text-xs uppercase tracking-wider rounded-lg hover:text-white transition-all cursor-pointer"
                  >
                    Flee
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
