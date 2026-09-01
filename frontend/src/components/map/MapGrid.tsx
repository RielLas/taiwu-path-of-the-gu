import { useState, useEffect, useRef } from 'react';
import { useWorldStore } from '../../hooks/useWorldStore';
import { useCultivatorStore } from '../../hooks/useCultivator';
import type { Encounter } from '../../hooks/useWorldStore';
import { useCombatStore } from '../../hooks/useCombat';
import { playJadeClinkSound, playBrushSound } from '../../hooks/useAudio';
import WayStationModal from './WayStationModal';

// Static Vite Asset Imports for 100% Load Reliability
import bambooImg from '../../assets/bamboo.webp';
import springImg from '../../assets/spring.webp';
import waystationImg from '../../assets/waystation.webp';
import pointerImg from '../../assets/pointer.webp';

interface MapGridProps {
  initialNodeData?: any;
  onExitNode?: () => void;
}

const TILE_WIDTH = 192;
const TILE_HEIGHT = 192;

export default function MapGrid({ initialNodeData, onExitNode }: MapGridProps) {
  const { 
    grid, 
    playerLocation, 
    enforcer, 
    currentRegionName,
    isWayStationModalOpen,
    setWayStationModalOpen,
    fetchLocalGrid, 
    loadInitialNodeData, 
    travel 
  } = useWorldStore();
  
  const { cultivator, captureWildGu, fetchAperture } = useCultivatorStore();

  const [logs, setLogs] = useState<string[]>(['> Primeval Aperture steady. Centered on 15x15 dynamic sector.']);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [encounterResult, setEncounterResult] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Phase 1: Drag-to-Pan Camera State
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialNodeData) {
      loadInitialNodeData(initialNodeData);
    } else if (grid.length === 0) {
      fetchLocalGrid('southern_border_gu_yue');
    }
  }, [initialNodeData, loadInitialNodeData, fetchLocalGrid, grid.length]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Phase 2: Dynamic 15x15 Viewport Window (Lag Annihilation)
  // Slices the 30x30 matrix into a strict 15x15 sub-grid dynamically centered on player (X, Y)
  const WINDOW_SIZE = 15;
  const HALF_WINDOW = Math.floor(WINDOW_SIZE / 2); // 7

  const startX = Math.max(0, Math.min(30 - WINDOW_SIZE, playerLocation.x - HALF_WINDOW));
  const startY = Math.max(0, Math.min(30 - WINDOW_SIZE, playerLocation.y - HALF_WINDOW));
  const endX = startX + WINDOW_SIZE;
  const endY = startY + WINDOW_SIZE;

  // Sliced 15x15 array sorted by isometric depth (X + Y)
  const visibleTiles = grid
    .filter((tile) => tile.x >= startX && tile.x < endX && tile.y >= startY && tile.y < endY)
    .sort((a, b) => (a.x + a.y) - (b.x + b.y));

  // Phase 2: Sealing Tile Gaps & Center Calculation
  // Base player position in isometric space (using TILE_HEIGHT / 4 for vertical compression)
  const playerBaseX = (playerLocation.x - playerLocation.y) * (TILE_WIDTH / 2);
  const playerBaseY = (playerLocation.x + playerLocation.y) * (TILE_HEIGHT / 4);

  // Center offset to lock player position at origin
  const centerOffset = {
    x: -playerBaseX,
    y: -playerBaseY
  };

  const isWayStationTile = (tile: any) => {
    if (!tile) return false;
    return (
      tile.type === 'way_station' ||
      tile.type === 'Way Station' ||
      tile.type === 'caravan' ||
      tile.terrain === 'way_station' ||
      tile.terrain === 'Way Station' ||
      tile.terrain === 'caravan' ||
      Boolean(tile.is_way_station) ||
      Boolean(tile.is_caravan) ||
      (tile.x === 15 && tile.y === 15)
    );
  };

  const isSpiritSpringTile = (tile: any) => {
    if (!tile) return false;
    return (
      tile.type === 'Spirit Spring' ||
      tile.terrain === 'Spirit Spring' ||
      tile.type === 'spirit_spring' ||
      Boolean(tile.is_spirit_spring)
    );
  };

  const getTileAsset = (tile: any) => {
    if (isWayStationTile(tile)) return waystationImg || '/assets/waystation.webp';
    if (isSpiritSpringTile(tile)) return springImg || '/assets/spring.webp';
    return bambooImg || '/assets/bamboo.webp';
  };

  const handleCombat = async (customEnemy?: any) => {
    const enemy = customEnemy || activeEncounter?.enemy || (activeEncounter?.enemy_name ? {
      name: activeEncounter.enemy_name,
      hp: activeEncounter.enemy_hp || 100,
      atk: activeEncounter.enemy_atk || 15,
      reward_stones: activeEncounter.reward_stones || 10,
      is_enforcer: false
    } : null);

    if (!enemy) return;

    const { startCombat } = useCombatStore.getState();
    startCombat(
      enemy.name,
      enemy.hp || 100,
      enemy.atk || 15,
      enemy.reward_stones || 10,
      Boolean(enemy.is_enforcer)
    );

    setActiveEncounter(null);
  };

  const handleTravel = async (targetX: number, targetY: number) => {
    if (activeEncounter) return;
    try {
      const { encounter, logs: newLogs } = await travel(targetX, targetY);
      setLogs(prev => [...prev, ...newLogs]);

      const currentTile = grid.find((t) => t.x === targetX && t.y === targetY);
      if (isWayStationTile(currentTile)) {
        setLogs(prev => [...prev, '> 🏮 Arrived at Regional Way Station. Inter-regional caravan transit available.']);
        setWayStationModalOpen(true);
      }

      if (encounter) {
        if (encounter.is_interception && encounter.enemy) {
          setLogs(prev => [...prev, `> ⚠️ AMBUSH: ${encounter.title}! Forced into battle!`]);
          handleCombat(encounter.enemy);
        } else {
          setActiveEncounter(encounter);
          setEncounterResult(null);
        }
      }

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
    } catch {
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

  // Phase 1: Mouse Drag Event Handlers for Virtual Camera
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setHasMovedDuringDrag(false);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      setHasMovedDuringDrag(true);
    }

    setPan((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const isPlayerOnWayStation = playerLocation.x === 15 && playerLocation.y === 15;

  return (
    <div className="relative w-full h-full min-h-screen bg-[#0a0907] overflow-hidden select-none font-serif flex flex-col md:flex-row">

      {/* LEFT / CENTER VIEWPORT: Drag-to-Pan Isometric Canvas */}
      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex-1 relative h-full w-full overflow-hidden bg-[#0a0907] flex items-center justify-center ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >

        {/* Phase 1: Dynamic Hunter Matrix Banner positioned safely at top-24 right-8 (z-40) */}
        {enforcer && enforcer.active && enforcer.status !== 'defeated' && (
          <div className="absolute top-24 right-8 z-40 flex items-center gap-3 bg-gradient-to-r from-red-950/95 via-[#1a0808]/95 to-red-950/95 border-2 border-red-600/80 px-4 py-2.5 rounded-2xl shadow-[0_8px_32px_rgba(220,38,38,0.7)] animate-pulse pointer-events-none">
            <span className="text-xl animate-bounce">⚖️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-red-300 uppercase tracking-widest font-sans">
                  ⚠️ PREDATOR MATRIX: {enforcer.name}
                </span>
                <span className="text-[9px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded font-mono font-bold border border-red-500">
                  ⚡ {Math.round(enforcer.stamina)} / {enforcer.max_stamina}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-sans block mt-0.5">
                Distance: <strong className="text-amber-300">{Math.abs(enforcer.pos[0] - playerLocation.x) + Math.abs(enforcer.pos[1] - playerLocation.y)} tiles</strong> • Status: <strong className="text-red-400 capitalize">{enforcer.status}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Sector Navigation & Camera Controls (z-30) */}
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-[#12100d] border border-[#2a2620] px-3.5 py-2 rounded-xl shadow-lg pointer-events-auto"
        >
          <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#c89b3c] font-bold">
            {currentRegionName} • [{playerLocation.x}, {playerLocation.y}]
          </span>
          <div className="w-px h-4 bg-[#2a2620] mx-1"></div>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
            className="w-6 h-6 flex items-center justify-center text-xs text-[#8a8275] hover:text-[#d5cfc4] rounded hover:bg-[#1a1814] font-bold transition-colors cursor-pointer"
            title="Zoom In"
          >
            ＋
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            className="w-6 h-6 flex items-center justify-center text-xs text-[#8a8275] hover:text-[#d5cfc4] rounded hover:bg-[#1a1814] font-bold transition-colors cursor-pointer"
            title="Zoom Out"
          >
            －
          </button>
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoomLevel(1.0);
            }}
            className="text-[10px] text-[#8a8275] hover:text-[#c89b3c] px-2 py-0.5 rounded hover:bg-[#1a1814] uppercase tracking-wider font-bold transition-colors cursor-pointer"
            title="Reset Camera to Player Position"
          >
            Reset
          </button>
          <div className="w-px h-4 bg-[#2a2620] mx-1"></div>
          
          {/* Way Station Transit Button */}
          <button
            onClick={() => { playBrushSound(); setWayStationModalOpen(true); }}
            className={`text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isPlayerOnWayStation 
                ? 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                : 'bg-[#1a1814] text-[#8a8275] hover:text-[#c89b3c] border-[#2a2620]'
            }`}
            title="Open Way Station Caravan Transit Router"
          >
            <span>🏮</span>
            <span>Way Station</span>
          </button>

          {onExitNode && (
            <>
              <div className="w-px h-4 bg-[#2a2620] mx-1"></div>
              <button
                onClick={() => { playBrushSound(); onExitNode(); }}
                className="text-[10px] text-[#8a8275] hover:text-[#c89b3c] px-2 py-0.5 rounded hover:bg-[#1a1814] uppercase tracking-wider font-bold border border-[#2a2620] transition-colors cursor-pointer"
              >
                Exit Node
              </button>
            </>
          )}
        </div>

        {/* Phase 2: Dynamic Centered Isometric World Container (z-0) */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0"
        >
          {/* Main Grid Centering Wrapper with Scale and Origin */}
          <div
            className="relative pointer-events-auto"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              width: '0px',
              height: '0px',
            }}
          >
            {visibleTiles.map((tile) => {
              const isPlayerHere = tile.x === playerLocation.x && tile.y === playerLocation.y;
              const isEnforcerHere = Boolean(
                enforcer && enforcer.active && enforcer.status !== 'defeated' && 
                tile.x === enforcer.pos[0] && tile.y === enforcer.pos[1]
              );
              const isAdjacent = Math.abs(tile.x - playerLocation.x) <= 1 && 
                                 Math.abs(tile.y - playerLocation.y) <= 1 && 
                                 !isPlayerHere;
              
              const isWayStation = isWayStationTile(tile);
              const isFaction = Boolean(tile.type === 'Faction Outpost' || tile.terrain === 'Faction Outpost' || tile.is_faction_node);
              const tileAssetSrc = getTileAsset(tile);

              // Phase 2: Tightened Absolute Isometric Math with TILE_HEIGHT / 4 vertical compression
              const tileLeft = (tile.x - tile.y) * (TILE_WIDTH / 2) + centerOffset.x + pan.x;
              const tileTop = (tile.x + tile.y) * (TILE_HEIGHT / 4) + centerOffset.y + pan.y;

              const handleTileClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (hasMovedDuringDrag) return;
                if (isAdjacent) {
                  handleTravel(tile.x, tile.y);
                } else if (isWayStation && (isPlayerHere || isAdjacent)) {
                  playBrushSound();
                  setWayStationModalOpen(true);
                }
              };

              return (
                <div
                  key={`${tile.x}_${tile.y}`}
                  onClick={handleTileClick}
                  style={{
                    position: 'absolute',
                    left: `${tileLeft - TILE_WIDTH / 2}px`,
                    top: `${tileTop - TILE_HEIGHT / 2}px`,
                    width: `${TILE_WIDTH}px`,
                    height: `${TILE_HEIGHT}px`,
                    zIndex: (tile.x + tile.y) * 2 + (isPlayerHere ? 100 : 0)
                  }}
                  className={`
                    bg-[#1a1c1a] border border-[#2a2c2a] rounded-2xl overflow-hidden select-none transition-all duration-150
                    ${isAdjacent ? 'cursor-pointer hover:border-amber-400 border-2 hover:scale-105' : 'cursor-default'}
                    ${isPlayerHere ? 'border-2 border-[#c89b3c] shadow-[0_0_20px_rgba(200,155,60,0.7)]' : ''}
                  `}
                  title={`${isEnforcerHere ? `⚔️ ${enforcer?.name}` : isWayStation ? '🏮 Way Station' : isFaction ? `Faction Outpost: ${tile.faction}` : tile.type} (${tile.x}, ${tile.y})`}
                >
                  {/* Base Terrain Asset Image with Fallback (z-0) */}
                  <img
                    src={tileAssetSrc}
                    alt={`${tile.type || 'Tile Terrain'} [${tile.x}, ${tile.y}]`}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                    className={`w-full h-full object-cover select-none pointer-events-none ${
                      !tile.discovered ? 'brightness-40 opacity-40' : 'brightness-100 opacity-100'
                    }`}
                    loading="lazy"
                  />

                  {/* Fallback Coordinate Indicator */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <span className="text-[10px] text-zinc-400 font-mono font-bold">[{tile.x},{tile.y}]</span>
                  </div>

                  {/* Faction Node Overlay Badge (z-10) */}
                  {isFaction && tile.discovered && (
                    <div className="absolute top-2 left-2 z-10 bg-black/85 border border-[#c89b3c] px-2 py-0.5 rounded text-[10px] font-bold text-amber-200 uppercase font-serif">
                      {tile.faction || 'Sect Outpost'}
                    </div>
                  )}

                  {/* Way Station Overlay Badge (z-10) */}
                  {isWayStation && tile.discovered && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-black/90 border border-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-300 uppercase font-serif tracking-wider whitespace-nowrap">
                      🏮 Way Station
                    </div>
                  )}

                  {/* Player Avatar Asset Floating (z-20) */}
                  {isPlayerHere && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none animate-bounce">
                      <img
                        src={pointerImg || '/assets/pointer.webp'}
                        alt="Player Avatar"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                        className="w-14 h-14 object-contain pointer-events-none select-none drop-shadow"
                      />
                      <span className="text-[9px] bg-black/90 text-amber-300 border border-amber-400 px-2 py-0.2 rounded-full font-bold uppercase tracking-wider font-mono">
                        {cultivator?.name || 'Cultivator'}
                      </span>
                    </div>
                  )}

                  {/* Predator Enforcer Entity (z-20) */}
                  {isEnforcerHere && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-red-950/90 border-2 border-red-500 flex items-center justify-center text-red-200 font-bold text-xs uppercase font-sans tracking-widest animate-pulse">
                        ⚔️
                      </div>
                      <span className="text-[8px] bg-red-950 text-red-200 border border-red-500 px-1.5 py-0.2 rounded font-bold font-mono mt-0.5">
                        {enforcer?.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT DRAWER: Exploration Log & Sector Intel (z-30) */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full md:w-80 h-48 md:h-full bg-[#12100d] border-t md:border-t-0 md:border-l border-[#2a2620] flex flex-col z-30 pointer-events-auto"
      >
        
        {/* Header */}
        <div className="p-3 border-b border-[#2a2620] bg-[#1a1814] flex justify-between items-center">
          <span className="text-xs font-bold text-[#d5cfc4] uppercase tracking-wider">Sector Telemetry</span>
          <span className="text-[10px] text-amber-400 font-mono font-bold">15x15 Window</span>
        </div>

        {/* Scrollable Event Logs */}
        <div className="flex-1 p-3 overflow-y-auto font-sans text-xs space-y-1.5 custom-scrollbar bg-[#0a0907]/90 text-zinc-300">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Current Node Summary */}
        <div className="p-3 bg-[#12100d] border-t border-[#2a2620] text-xs space-y-1 font-sans">
          <div className="flex justify-between text-[#8a8275]">
            <span>Sector Position:</span>
            <span className="text-amber-300 font-mono font-bold">[{playerLocation.x}, {playerLocation.y}]</span>
          </div>
          <div className="flex justify-between text-[#8a8275]">
            <span>Active Region:</span>
            <span className="text-[#d5cfc4] truncate max-w-[150px]">{currentRegionName}</span>
          </div>
          <div className="flex justify-between text-[#8a8275]">
            <span>Camera Pan:</span>
            <span className="text-zinc-400 font-mono text-[11px]">X: {Math.round(pan.x)}, Y: {Math.round(pan.y)}</span>
          </div>
        </div>

      </div>

      {/* Modal Overlays (z-50) */}
      <WayStationModal
        isOpen={isWayStationModalOpen}
        onClose={() => setWayStationModalOpen(false)}
      />

      {/* Interactive Tile Encounter Modal (z-50) */}
      {activeEncounter && (
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none"
        >
          <div className="max-w-md w-full bg-[#12100d] border border-[#c89b3c] p-6 rounded-2xl font-serif text-center pointer-events-auto">
            
            <h3 className="text-xl font-bold text-amber-300 tracking-wider mb-2">
              {activeEncounter.title || 'Sector Anomaly'}
            </h3>
            <p className="text-xs text-zinc-300 font-sans mb-4 leading-relaxed">
              {activeEncounter.desc}
            </p>

            {encounterResult ? (
              <div className="space-y-4">
                <div className="p-3 bg-black/60 border border-[#2a2620] rounded-xl text-xs text-amber-200 font-sans">
                  {encounterResult}
                </div>
                <button
                  onClick={() => setActiveEncounter(null)}
                  className="w-full py-2 bg-[#1a1814] border border-[#2a2620] hover:border-[#c89b3c] text-xs font-sans uppercase tracking-wider rounded-xl text-[#d5cfc4]"
                >
                  Continue Exploration
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {activeEncounter.type === 'wild_gu' && (
                  <button
                    onClick={handleCaptureGu}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-950 border border-emerald-500 hover:bg-emerald-900 text-xs font-sans font-bold uppercase tracking-wider rounded-xl text-emerald-200"
                  >
                    {isSubmitting ? 'Subduing Gu...' : `Subdue [${activeEncounter.wild_gu?.name}]`}
                  </button>
                )}

                {activeEncounter.type === 'resource' && (
                  <button
                    onClick={handleHarvest}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-amber-950 border border-amber-500 hover:bg-amber-900 text-xs font-sans font-bold uppercase tracking-wider rounded-xl text-amber-200"
                  >
                    {isSubmitting ? 'Harvesting...' : 'Harvest Primeval Stones'}
                  </button>
                )}

                {activeEncounter.type === 'faction' && (
                  <div className="space-y-2">
                    {activeEncounter.trade_inventory && activeEncounter.trade_inventory.length > 0 && (
                      <button
                        onClick={() => handleFactionTrade(activeEncounter.trade_inventory![0])}
                        disabled={isSubmitting}
                        className="w-full py-2 bg-emerald-950 border border-emerald-500 hover:bg-emerald-900 text-xs font-sans font-bold uppercase tracking-wider rounded-xl text-emerald-200"
                      >
                        Trade with Clan Merchant
                      </button>
                    )}
                    <button
                      onClick={handleFactionExtort}
                      disabled={isSubmitting}
                      className="w-full py-2 bg-red-950 border border-red-500 hover:bg-red-900 text-xs font-sans font-bold uppercase tracking-wider rounded-xl text-red-200"
                    >
                      Extort Outpost (+Stones, Demonic)
                    </button>
                    <button
                      onClick={handleFactionAttack}
                      className="w-full py-2 bg-[#1a1814] border border-[#2a2620] hover:border-red-500 text-xs font-sans uppercase tracking-wider rounded-xl text-zinc-300"
                    >
                      Attack Clan Guards
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActiveEncounter(null)}
                  className="w-full py-2 bg-[#1a1814] border border-[#2a2620] hover:border-zinc-500 text-xs font-sans uppercase tracking-wider rounded-xl text-zinc-400"
                >
                  Leave Unmolested
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
