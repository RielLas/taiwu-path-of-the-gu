import { useState } from 'react';
import { useWorldStore } from '../../hooks/useWorldStore';
import { useCultivatorStore } from '../../hooks/useCultivator';
import { playJadeClinkSound, playBrushSound } from '../../hooks/useAudio';

interface WayStationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MacroRegionInfo {
  id: string;
  name: string;
  region: string;
  fullName: string;
  icon: string;
  theme: string;
  lore: string;
  badgeColor: string;
  borderColor: string;
  bgGradient: string;
}

const FIVE_MACRO_REGIONS: MacroRegionInfo[] = [
  {
    id: 'southern_border_gu_yue',
    name: 'Gu Yue Sector',
    region: 'Southern Border',
    fullName: 'Southern Border: Gu Yue Sector',
    icon: '🎋',
    theme: 'mountain_bamboo',
    lore: 'Ancient karst mountains cloaked in spirit mist and ancestral Gu Yue bamboo groves.',
    badgeColor: 'text-emerald-400 border-emerald-600 bg-emerald-950/40',
    borderColor: 'hover:border-emerald-500',
    bgGradient: 'from-emerald-950/30 to-[#12100d]'
  },
  {
    id: 'central_continent_spirit_affinity',
    name: 'Spirit Affinity Sector',
    region: 'Central Continent',
    fullName: 'Central Continent: Spirit Affinity Sector',
    icon: '🏛️',
    theme: 'immortal_lakes',
    lore: 'Glistening spirit lakes and towering sect pavilions radiating profound immortal qi.',
    badgeColor: 'text-purple-400 border-purple-600 bg-purple-950/40',
    borderColor: 'hover:border-purple-500',
    bgGradient: 'from-purple-950/30 to-[#12100d]'
  },
  {
    id: 'western_desert_thousand_li',
    name: 'Thousand Li Dunes',
    region: 'Western Desert',
    fullName: 'Western Desert: Thousand Li Dunes',
    icon: '🏜️',
    theme: 'desert_oasis',
    lore: 'Endless golden sand dunes punctuated by oasis trade hubs and scorching heat.',
    badgeColor: 'text-amber-400 border-amber-600 bg-amber-950/40',
    borderColor: 'hover:border-amber-500',
    bgGradient: 'from-amber-950/30 to-[#12100d]'
  },
  {
    id: 'northern_plains_ge_tribe',
    name: 'Ge Tribe Grassland',
    region: 'Northern Plains',
    fullName: 'Northern Plains: Ge Tribe Grassland',
    icon: '🌾',
    theme: 'plains_camps',
    lore: 'Vast tempestuous grasslands home to nomadic heroic clans and wolf pack hunting grounds.',
    badgeColor: 'text-cyan-400 border-cyan-600 bg-cyan-950/40',
    borderColor: 'hover:border-cyan-500',
    bgGradient: 'from-cyan-950/30 to-[#12100d]'
  },
  {
    id: 'eastern_sea_blue_wave',
    name: 'Blue Wave Archipelago',
    region: 'Eastern Sea',
    fullName: 'Eastern Sea: Blue Wave Archipelago',
    icon: '🌊',
    theme: 'sea_islands',
    lore: 'Azure archipelagos, undersea coral reefs, and bustling maritime merchant ports.',
    badgeColor: 'text-sky-400 border-sky-600 bg-sky-950/40',
    borderColor: 'hover:border-sky-500',
    bgGradient: 'from-sky-950/30 to-[#12100d]'
  }
];

const REQUIRED_STAMINA = 40;
const REQUIRED_STONES = 100;

export default function WayStationModal({ isOpen, onClose }: WayStationModalProps) {
  const { currentRegionId, travelRegionalCaravan } = useWorldStore();
  const { cultivator } = useCultivatorStore();

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isTraveling, setIsTraveling] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStamina = cultivator?.stamina ?? 100;
  const currentStones = cultivator?.spirit_stones ?? 0;

  const hasEnoughStamina = currentStamina >= REQUIRED_STAMINA;
  const hasEnoughStones = currentStones >= REQUIRED_STONES;
  const canAffordTransit = hasEnoughStamina && hasEnoughStones;

  const handleSelectRegion = (regionId: string) => {
    if (regionId === currentRegionId) return;
    playBrushSound();
    setSelectedRegionId(regionId);
    setErrorMsg(null);
  };

  const handleTravel = async () => {
    if (!selectedRegionId || selectedRegionId === currentRegionId) return;
    if (!canAffordTransit) {
      setErrorMsg('Insufficient resources for inter-regional caravan transit.');
      return;
    }

    setIsTraveling(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      playJadeClinkSound();
      const res = await travelRegionalCaravan(selectedRegionId);
      setSuccessMsg(res.message || 'Caravan transit completed successfully!');
      setTimeout(() => {
        setIsTraveling(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch caravan.');
      setIsTraveling(false);
    }
  };

  const selectedRegion = FIVE_MACRO_REGIONS.find((r) => r.id === selectedRegionId);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0907]/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="max-w-3xl w-full glass-card border border-[#c89b3c]/50 bg-[#12100d] p-6 md:p-8 rounded-3xl shadow-[0_0_60px_rgba(200,155,60,0.2)] animate-fade-in font-serif flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#2a2620] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2a1a10] to-[#12100d] border border-[#c89b3c] flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(200,155,60,0.3)]">
              🏮
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-[#d5cfc4] tracking-widest">
                  Way Station • Caravan Transit
                </h2>
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-600/60 px-2 py-0.5 rounded font-sans font-bold uppercase tracking-wider">
                  Inter-Regional Router
                </span>
              </div>
              <p className="text-xs text-[#8a8275] font-sans mt-0.5">
                Dispatch Shang Clan merchant convoys across the Five Regions barrier.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => { playBrushSound(); onClose(); }}
            disabled={isTraveling}
            className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-[#1a1814] border border-[#2a2620] transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Player Toll Balance & Toll Status Header */}
        <div className="bg-[#0a0907] border border-[#2a2620] rounded-2xl p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-center gap-4">
            <span className="text-[#8a8275] uppercase tracking-wider text-[10px] font-bold">Your Reserves:</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono font-bold">⚡ {Math.round(currentStamina)} Stamina</span>
              <span className="text-[#2a2620]">•</span>
              <span className="text-emerald-400 font-mono font-bold">💎 {currentStones} Primeval Stones</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#8a8275] uppercase tracking-wider text-[10px] font-bold">Toll Fee:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${hasEnoughStamina ? 'bg-amber-950/60 text-amber-300 border-amber-700' : 'bg-red-950/80 text-red-300 border-red-700 animate-pulse'}`}>
              -40 ⚡ Stamina
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${hasEnoughStones ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700' : 'bg-red-950/80 text-red-300 border-red-700 animate-pulse'}`}>
              -100 💎 Stones
            </span>
          </div>
        </div>

        {/* Status Warnings */}
        {!canAffordTransit && (
          <div className="bg-red-950/40 border border-red-700/80 rounded-xl p-2.5 mb-4 text-xs font-sans text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>
              {!hasEnoughStamina && !hasEnoughStones
                ? 'Insufficient Stamina (< 40) and Primeval Stones (< 100). Rest or cultivate before transit.'
                : !hasEnoughStamina
                ? 'Insufficient Stamina (< 40). Meditate or rest to restore Action Points.'
                : 'Insufficient Primeval Stones (< 100). Harvest resources or trade to afford caravan passage.'}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-950/50 border border-red-600 rounded-xl p-2.5 mb-4 text-xs font-sans text-red-300 text-center animate-shake">
            💀 {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/50 border border-emerald-500 rounded-xl p-2.5 mb-4 text-xs font-sans text-emerald-300 text-center animate-fade-in">
            ✨ {successMsg}
          </div>
        )}

        {/* Macro-Regions Cards Grid */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar mb-4">
          {FIVE_MACRO_REGIONS.map((region) => {
            const isCurrent = region.id === currentRegionId;
            const isSelected = region.id === selectedRegionId;

            return (
              <div
                key={region.id}
                onClick={() => handleSelectRegion(region.id)}
                className={`
                  p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden flex items-center justify-between gap-4
                  ${isCurrent
                    ? 'bg-[#151310]/80 border-amber-600/40 opacity-75 cursor-default'
                    : isSelected
                    ? 'bg-gradient-to-r from-[#221c15] to-[#171410] border-[#c89b3c] shadow-[0_0_20px_rgba(200,155,60,0.3)] ring-1 ring-[#c89b3c] cursor-pointer scale-[1.01]'
                    : `bg-gradient-to-r ${region.bgGradient} border-[#2a2620] ${region.borderColor} hover:bg-[#1a1714] cursor-pointer`}
                `}
              >
                <div className="flex items-center gap-3.5">
                  <div className="text-3xl p-2 rounded-xl bg-[#0a0907]/80 border border-[#2a2620] flex items-center justify-center">
                    {region.icon}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-bold tracking-wide ${isSelected ? 'text-amber-200' : 'text-[#d5cfc4]'}`}>
                        {region.fullName}
                      </h3>
                      {isCurrent ? (
                        <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600">
                          📍 Current Sector
                        </span>
                      ) : (
                        <span className={`text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${region.badgeColor}`}>
                          {region.region}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8a8275] font-sans mt-1 leading-relaxed max-w-xl">
                      {region.lore}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {isCurrent ? (
                    <span className="text-[11px] font-sans font-bold text-stone-500 uppercase tracking-wider">
                      Active Grid
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRegion(region.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all ${
                        isSelected
                          ? 'bg-[#c89b3c] text-[#12100d] shadow-md'
                          : 'bg-[#1a1814] text-[#8a8275] border border-[#2a2620] hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#2a2620] pt-4 flex items-center justify-between gap-4 font-sans">
          <div className="text-xs text-[#8a8275]">
            {selectedRegion ? (
              <span>
                Target: <strong className="text-amber-300">{selectedRegion.fullName}</strong> (Entry at sector [15, 15])
              </span>
            ) : (
              <span>Select a destination macro-region above.</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { playBrushSound(); onClose(); }}
              disabled={isTraveling}
              className="px-5 py-2.5 bg-[#1a1814] hover:bg-[#25221c] text-[#8a8275] hover:text-[#d5cfc4] border border-[#2a2620] text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleTravel}
              disabled={!selectedRegionId || selectedRegionId === currentRegionId || !canAffordTransit || isTraveling}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2 shadow-lg cursor-pointer ${
                selectedRegionId && selectedRegionId !== currentRegionId && canAffordTransit && !isTraveling
                  ? 'bg-gradient-to-r from-amber-950 via-[#312010] to-amber-900 border-[#c89b3c] text-amber-200 hover:brightness-125 hover:shadow-[0_0_25px_rgba(200,155,60,0.5)] hover:scale-102 active:scale-98'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
              }`}
            >
              <span>{isTraveling ? 'Embarking Caravan...' : 'Travel Caravan (-40⚡, -100💎)'}</span>
              <span className="text-sm">🐫</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
