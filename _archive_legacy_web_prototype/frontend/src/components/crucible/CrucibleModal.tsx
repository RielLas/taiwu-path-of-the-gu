import { useState } from 'react';
import { useCultivatorStore } from '../../hooks/useCultivator';
import type { GuWorm } from '../../types/api';

interface CrucibleModalProps {
  onClose?: () => void;
}

export default function CrucibleModal({ onClose }: CrucibleModalProps) {
  const { guWorms, cultivator, refineGu } = useCultivatorStore();
  
  const [slotA, setSlotA] = useState<GuWorm | null>(null);
  const [slotB, setSlotB] = useState<GuWorm | null>(null);
  const [catalyst, setCatalyst] = useState<string>('None');
  const [refineResult, setRefineResult] = useState<any>(null);
  const [isRefining, setIsRefining] = useState(false);

  // Helper to filter out already selected Gu
  const getAvailableGu = (excludeId?: string) => {
    return guWorms.filter(gu => gu.id !== excludeId);
  };

  const refinementCost = (slotA?.essence_cost || 0) + (slotB?.essence_cost || 0);
  const hasEnoughEssence = (cultivator?.primeval_essence || 0) >= refinementCost;

  const handleRefine = async () => {
    if (!slotA || !slotB || !hasEnoughEssence) return;
    setIsRefining(true);
    setRefineResult(null);
    
    try {
      const selectedCatalyst = catalyst !== 'None' ? catalyst : undefined;
      const data = await refineGu(slotA.id, slotB.id, selectedCatalyst);
      
      // Artificial delay for dramatic effect
      setTimeout(() => {
        setRefineResult(data);
        setSlotA(null);
        setSlotB(null);
        setIsRefining(false);
      }, 1200);

    } catch (err: any) {
      setTimeout(() => {
        setRefineResult({ success: false, message: err.message || 'Catastrophic Failure!' });
        setSlotA(null);
        setSlotB(null);
        setIsRefining(false);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#12100d]/95 backdrop-blur-2xl flex flex-col items-center justify-start pt-8 pb-16 px-4 pointer-events-auto z-50 overflow-y-auto select-none">
      
      {/* Top Exit Button */}
      {onClose && (
        <div className="w-full max-w-5xl flex justify-end mb-2">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 border border-[#2a2620] hover:border-[#c89b3c]/50 text-[#8a8275] hover:text-[#d5cfc4] text-xs font-sans uppercase tracking-widest transition-all cursor-pointer shadow-lg"
          >
            ✕ Return to Overworld
          </button>
        </div>
      )}

      {/* Title Header */}
      <div className="mb-6 text-center animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-serif text-[#d5cfc4] drop-shadow-[0_2px_10px_rgba(200,155,60,0.5)]">Heavenly Refinement Crucible</h2>
        <p className="text-[#8a8275] text-xs uppercase tracking-[0.3em] mt-2">Combine Gu to transcend mortal limits</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-stretch mb-8 animate-slide-up">
        
        {/* SLOT A */}
        <div className="w-full md:w-[45%] bg-[#12100d]/90 backdrop-blur border border-[#2a2620] p-5 rounded-2xl min-h-[240px] flex flex-col shadow-xl">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2a2620]">
            <h3 className="text-[#d5cfc4] text-xs font-sans uppercase tracking-widest font-bold">Primary Gu (Slot A)</h3>
            {slotA && (
              <button 
                onClick={() => setSlotA(null)}
                className="text-[10px] text-[#5c2424] hover:text-red-400 font-sans uppercase tracking-wider"
              >
                Clear
              </button>
            )}
          </div>

          {slotA ? (
            <div className="flex-1 bg-gradient-to-b from-[#3b4d3c]/20 to-black/40 border border-[#3b4d3c] rounded-xl p-4 text-center flex flex-col justify-center">
              <span className="text-[#d5cfc4] font-bold text-lg block mb-1">{slotA.name}</span>
              <span className="text-xs text-[#8a8275] block font-sans uppercase tracking-widest">Tier {slotA.tier} • {slotA.path}</span>
              <span className="text-[10px] text-gray-500 mt-2 block">Essence Cost: {slotA.essence_cost}</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-44 custom-scrollbar pr-1">
              <p className="text-[11px] text-[#c89b3c]/80 font-sans italic mb-1">Select first Gu to refine:</p>
              {getAvailableGu(slotB?.id).map(gu => (
                <button 
                  key={gu.id} 
                  onClick={() => setSlotA(gu)} 
                  className="text-left p-2.5 border border-[#2a2620] hover:border-[#3b4d3c] hover:bg-[#3b4d3c]/10 rounded-lg bg-black/40 transition-all text-xs flex justify-between items-center group"
                >
                  <span className="text-[#d5cfc4] group-hover:text-white font-bold">{gu.name}</span> 
                  <span className="text-gray-400 font-sans text-[11px]">Tier {gu.tier}</span>
                </button>
              ))}
              {getAvailableGu(slotB?.id).length === 0 && (
                <span className="text-gray-500 text-xs text-center m-auto font-sans italic">No Gu in Aperture</span>
              )}
            </div>
          )}
        </div>

        {/* Center Fusion Icon */}
        <div className="flex items-center justify-center my-2 md:my-0">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-[#12100d] border border-[#c89b3c]/40 z-10 transition-all duration-700 ${isRefining ? 'animate-spin shadow-[0_0_30px_rgba(200,155,60,0.8)] border-[#c89b3c]' : 'shadow-lg'}`}>
            <span className="text-2xl text-[#c89b3c] font-sans font-bold">☯</span>
          </div>
        </div>

        {/* SLOT B */}
        <div className="w-full md:w-[45%] bg-[#12100d]/90 backdrop-blur border border-[#2a2620] p-5 rounded-2xl min-h-[240px] flex flex-col shadow-xl">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2a2620]">
            <h3 className="text-[#d5cfc4] text-xs font-sans uppercase tracking-widest font-bold">Secondary Gu (Slot B)</h3>
            {slotB && (
              <button 
                onClick={() => setSlotB(null)}
                className="text-[10px] text-[#5c2424] hover:text-red-400 font-sans uppercase tracking-wider"
              >
                Clear
              </button>
            )}
          </div>

          {slotB ? (
            <div className="flex-1 bg-gradient-to-b from-[#3b4d3c]/20 to-black/40 border border-[#3b4d3c] rounded-xl p-4 text-center flex flex-col justify-center">
              <span className="text-[#d5cfc4] font-bold text-lg block mb-1">{slotB.name}</span>
              <span className="text-xs text-[#8a8275] block font-sans uppercase tracking-widest">Tier {slotB.tier} • {slotB.path}</span>
              <span className="text-[10px] text-gray-500 mt-2 block">Essence Cost: {slotB.essence_cost}</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-44 custom-scrollbar pr-1">
              <p className="text-[11px] text-[#c89b3c]/80 font-sans italic mb-1">Select second Gu to refine:</p>
              {getAvailableGu(slotA?.id).map(gu => (
                <button 
                  key={gu.id} 
                  onClick={() => setSlotB(gu)} 
                  className="text-left p-2.5 border border-[#2a2620] hover:border-[#3b4d3c] hover:bg-[#3b4d3c]/10 rounded-lg bg-black/40 transition-all text-xs flex justify-between items-center group"
                >
                  <span className="text-[#d5cfc4] group-hover:text-white font-bold">{gu.name}</span> 
                  <span className="text-gray-400 font-sans text-[11px]">Tier {gu.tier}</span>
                </button>
              ))}
              {getAvailableGu(slotA?.id).length === 0 && (
                <span className="text-gray-500 text-xs text-center m-auto font-sans italic">No Gu in Aperture</span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Catalyst & Direct Refine Button */}
      <div className="w-full max-w-xl bg-[#12100d]/90 backdrop-blur p-6 rounded-2xl border border-[#c89b3c]/30 shadow-2xl flex flex-col gap-6">
        
        {/* Catalyst Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full font-sans">
          <label className="text-[#c89b3c] text-xs uppercase tracking-widest font-bold whitespace-nowrap">Catalyst:</label>
          <select 
            value={catalyst} 
            onChange={(e) => setCatalyst(e.target.value)}
            className="w-full bg-black/60 border border-[#2a2620] text-[#d5cfc4] rounded-lg p-2.5 focus:border-[#c89b3c] outline-none text-xs cursor-pointer"
          >
            <option value="None">None (Base Success Rate)</option>
            <option value="Spirit Stone">Spirit Stone (+15% Success)</option>
            <option value="Heavenly Dew">Heavenly Dew (+40% Success)</option>
          </select>
        </div>

        {/* Essence Cost & Danger Warning */}
        {slotA && slotB && (
          <div className="text-center font-sans text-xs space-y-1.5">
            <div>
              <span className="text-[#8a8275] uppercase tracking-wider">Required Essence: </span>
              <span className={`font-bold ${hasEnoughEssence ? 'text-[#3b4d3c]' : 'text-red-500'}`}>
                {refinementCost}
              </span>
              <span className="text-[#8a8275]"> / {cultivator?.primeval_essence || 0}</span>
            </div>
            <div className="bg-[#5c2424]/30 border border-[#5c2424]/60 p-2 rounded-lg text-[11px] text-red-300">
              ⚠️ <strong>Lore Reality:</strong> Baseline 30% failure rate. Failure permanently destroys both Gu and inflicts <strong>50% Max HP Damage</strong> from Dao mark clash!
            </div>
            {!hasEnoughEssence && (
              <p className="text-red-500 mt-1 text-[10px] uppercase font-bold">Insufficient Primeval Essence</p>
            )}
          </div>
        )}

        {/* PROMINENT REFINE BUTTON */}
        <button 
          onClick={handleRefine}
          disabled={!slotA || !slotB || !hasEnoughEssence || isRefining}
          className={`w-full py-4 rounded-xl text-lg font-bold tracking-[0.25em] font-sans uppercase transition-all duration-300 shadow-xl border flex items-center justify-center gap-2
            ${!slotA || !slotB || !hasEnoughEssence
              ? 'bg-[#1a1814] text-zinc-600 border-[#2a2620] cursor-not-allowed' 
              : isRefining 
              ? 'bg-[#c89b3c] text-black border-[#c89b3c] shadow-[0_0_30px_rgba(200,155,60,0.8)] animate-pulse'
              : 'bg-gradient-to-r from-[#5c2424] via-red-900 to-[#5c2424] text-white border-red-800 hover:brightness-125 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] cursor-pointer'}
          `}
        >
          {isRefining ? (
            'REFINING GU IN HEAVENLY FIRE...'
          ) : !slotA || !slotB ? (
            'SELECT 2 GU TO REFINE'
          ) : !hasEnoughEssence ? (
            'NOT ENOUGH ESSENCE'
          ) : (
            '🔥 REFINE GU'
          )}
        </button>

        {/* Refinement Result Box */}
        {refineResult && (
          <div className={`w-full p-6 text-center rounded-xl font-sans border backdrop-blur-md animate-fade-in
            ${refineResult.success ? 'bg-emerald-950/40 border-[#3b4d3c] shadow-[0_0_30px_rgba(59,77,60,0.3)]' : 'bg-[#5c2424]/60 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]'}
          `}>
            <h4 className={`text-xl font-bold tracking-widest mb-2 ${refineResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {refineResult.success ? '✨ REFINEMENT SUCCESSFUL' : '💀 REFINEMENT BACKLASH'}
            </h4>
            <p className={`text-xs mb-3 font-semibold ${refineResult.success ? 'text-gray-300' : 'text-red-200'}`}>
              {refineResult.message}
            </p>
            
            {!refineResult.success && (
              <div className="bg-black/60 border border-red-500/50 p-3 rounded-lg text-left text-xs space-y-1 text-red-300 font-sans">
                <div className="flex justify-between font-bold">
                  <span>🩸 Dao Mark Rebound:</span>
                  <span className="text-red-400">-{refineResult.damage_taken || '50%'} Max HP</span>
                </div>
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>🔥 Ingredient Loss:</span>
                  <span className="text-red-400">Both Gu turned to ash</span>
                </div>
              </div>
            )}
            
            {refineResult.success && refineResult.result_gu && (
              <div className="inline-block border border-[#c89b3c]/50 p-4 rounded-xl bg-black/80">
                <span className="block font-bold text-lg text-[#c89b3c]">{refineResult.result_gu.name}</span>
                <span className="block text-[11px] text-[#8a8275] uppercase tracking-wider">
                  Tier {refineResult.result_gu.tier} • {refineResult.result_gu.path}
                </span>
                <span className="block text-[10px] text-gray-500 mt-1 italic">
                  {refineResult.result_gu.effect_desc}
                </span>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
