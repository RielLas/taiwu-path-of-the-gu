import { useState, useEffect } from 'react';
import { useCultivatorStore } from '../../hooks/useCultivator';
import { useVaultStore } from '../../hooks/useVault';
import { playBrushSound, playBladeImpactSound, playCrystalShatterSound, playJadeClinkSound } from '../../hooks/useAudio';
import type { GuWorm } from '../../types/api';

interface RefinementCauldronProps {
  onClose?: () => void;
}

export default function RefinementCauldron({ onClose }: RefinementCauldronProps) {
  const { guWorms, cultivator, refineGu, fetchAperture } = useCultivatorStore();
  const { vaultGu, fetchVault } = useVaultStore();
  
  const [slotA, setSlotA] = useState<GuWorm | null>(null);
  const [slotB, setSlotB] = useState<GuWorm | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [refineResult, setRefineResult] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);

  useEffect(() => {
    fetchAperture();
    fetchVault();
    // Fetch canonical recipes
    fetch('http://127.0.0.1:8001/api/v1/gu/refine/recipes')
      .then(res => res.json())
      .then(data => {
        if (data.recipes) setRecipes(data.recipes);
      })
      .catch(err => console.debug('Recipes fetch fallback', err));
  }, [fetchAperture, fetchVault]);

  // Combined available unique Gu worms from Aperture and Vault
  const allAvailableGu = [...guWorms, ...vaultGu.filter(vg => !guWorms.some(gw => gw.id === vg.id))];

  const primevalStones = cultivator?.spirit_stones || 0;
  const stoneCost = 50;
  const canAffordStones = primevalStones >= stoneCost;

  // Calculate dynamic success probability
  const daoMarks = cultivator?.dao_marks || {};
  const refinementMarks = (daoMarks['Refinement Path'] || 0);
  const pathMarks = slotA ? (daoMarks[slotA.path] || 0) : 0;
  const relevantMarksTotal = refinementMarks + pathMarks;
  const baseSuccessRate = 40;
  const estimatedSuccessRate = Math.min(85, Math.max(10, baseSuccessRate + relevantMarksTotal));

  const handleSelectGu = (gu: GuWorm) => {
    playBrushSound();
    if (!slotA) {
      setSlotA(gu);
    } else if (!slotB && gu.id !== slotA.id) {
      setSlotB(gu);
    }
  };

  const handleExecuteRefinement = async () => {
    if (!slotA || !slotB || !canAffordStones || isRefining) return;
    
    setIsRefining(true);
    setRefineResult(null);
    setIsShaking(false);

    try {
      const result = await refineGu(slotA.id, slotB.id);

      // Artificial cauldron resonance delay for dramatic suspense
      setTimeout(() => {
        setIsRefining(false);
        setRefineResult(result);
        
        if (result.success) {
          playCrystalShatterSound();
          playJadeClinkSound();
        } else {
          playBladeImpactSound();
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 600);
        }

        // Clear slots
        setSlotA(null);
        setSlotB(null);
        fetchAperture();
      }, 1400);

    } catch (err: any) {
      setTimeout(() => {
        setIsRefining(false);
        playBladeImpactSound();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
        setRefineResult({
          success: false,
          backlash: true,
          damage_taken: 20,
          message: `💥 REFINEMENT COLLAPSE! ${err.message || 'Cauldron ruptured under clashing dao marks.'}`
        });
        setSlotA(null);
        setSlotB(null);
      }, 1400);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-[#080705] flex flex-col items-center justify-start font-serif select-none p-4 md:p-8 overflow-y-auto ${
      isShaking ? 'animate-screen-shake' : ''
    }`}>
      
      {/* Top Banner & Exit Button */}
      <div className="w-full max-w-6xl flex items-center justify-between pt-2 pb-6 border-b border-[#2a2620]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#c89b3c] bg-[#1a140d] flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(200,155,60,0.4)]">
            🔥
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-widest text-[#d5cfc4] uppercase drop-shadow-[0_2px_10px_rgba(200,155,60,0.4)]">
              Dao of Refinement
            </h1>
            <p className="text-xs text-[#8a8275] uppercase tracking-[0.25em] font-sans">
              Heavenly Cauldron & Backlash Matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Primeval Stones Balance */}
          <div className="bg-[#12100d] border border-[#c89b3c]/60 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
            <span className="text-amber-400 text-sm font-bold font-mono">💎 {primevalStones}</span>
            <span className="text-[10px] text-[#8a8275] uppercase font-sans font-bold">Stones</span>
          </div>

          {onClose && (
            <button
              onClick={() => { playBrushSound(); onClose(); }}
              className="px-4 py-2 rounded-xl bg-[#12100d] border border-[#2a2620] hover:border-[#c89b3c] text-[#8a8275] hover:text-[#d5cfc4] text-xs font-sans uppercase tracking-widest transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
            >
              ✕ Exit Cauldron
            </button>
          )}
        </div>
      </div>

      {/* Main Refinement Workbench */}
      <div className="w-full max-w-6xl my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT / CENTER: The Cauldron Crucible & Slots (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Reactant Slots Container */}
          <div className="glass-card bg-[#12100d]/90 border border-[#2a2620] p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col items-center relative overflow-hidden">
            
            {/* Background Cauldron Flame Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(200,100,30,0.15)_0%,_transparent_70%)] pointer-events-none" />

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              
              {/* SLOT A */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#c89b3c]">
                    Reactant A (Primary Gu)
                  </span>
                  {slotA && (
                    <button 
                      onClick={() => setSlotA(null)}
                      className="text-[10px] text-red-400 hover:text-red-300 font-sans uppercase tracking-wider cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className={`min-h-[160px] rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center transition-all ${
                  slotA 
                    ? 'border-[#3b4d3c] bg-gradient-to-b from-[#1e3a2b]/30 to-[#12100d] shadow-[0_0_20px_rgba(59,77,60,0.3)]' 
                    : 'border-[#2a2620] bg-black/40 hover:border-[#c89b3c]/40'
                }`}>
                  {slotA ? (
                    <div className="animate-fade-in flex flex-col items-center">
                      <span className="text-3xl mb-1">🎴</span>
                      <h4 className="text-lg font-bold text-[#d5cfc4] tracking-wider">{slotA.name}</h4>
                      <span className="text-xs text-[#8a8275] uppercase font-sans mt-0.5">
                        Rank {slotA.tier} • {slotA.path}
                      </span>
                      <span className="text-[10px] text-amber-300/80 font-mono mt-2">
                        {slotA.gu_type === 'active' ? `⚡ ${slotA.active_power} DMG` : '🛡️ Body Buff'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[#8a8275] flex flex-col items-center gap-1">
                      <span className="text-2xl opacity-40">➕</span>
                      <span className="text-xs font-sans uppercase tracking-wider">Select Primary Gu</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SLOT B */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-[#c89b3c]">
                    Reactant B (Catalyst Gu)
                  </span>
                  {slotB && (
                    <button 
                      onClick={() => setSlotB(null)}
                      className="text-[10px] text-red-400 hover:text-red-300 font-sans uppercase tracking-wider cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className={`min-h-[160px] rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center transition-all ${
                  slotB 
                    ? 'border-[#3b4d3c] bg-gradient-to-b from-[#1e3a2b]/30 to-[#12100d] shadow-[0_0_20px_rgba(59,77,60,0.3)]' 
                    : 'border-[#2a2620] bg-black/40 hover:border-[#c89b3c]/40'
                }`}>
                  {slotB ? (
                    <div className="animate-fade-in flex flex-col items-center">
                      <span className="text-3xl mb-1">🎴</span>
                      <h4 className="text-lg font-bold text-[#d5cfc4] tracking-wider">{slotB.name}</h4>
                      <span className="text-xs text-[#8a8275] uppercase font-sans mt-0.5">
                        Rank {slotB.tier} • {slotB.path}
                      </span>
                      <span className="text-[10px] text-amber-300/80 font-mono mt-2">
                        {slotB.gu_type === 'active' ? `⚡ ${slotB.active_power} DMG` : '🛡️ Body Buff'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[#8a8275] flex flex-col items-center gap-1">
                      <span className="text-2xl opacity-40">➕</span>
                      <span className="text-xs font-sans uppercase tracking-wider">Select Catalyst Gu</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Central Cauldron Status & Probability Matrix */}
            <div className="w-full mt-6 pt-6 border-t border-[#2a2620] flex flex-col md:flex-row items-center justify-between gap-4 z-10">
              
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#8a8275]">
                  Dao Mark Synergy & Probability
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {slotA && slotB ? `${estimatedSuccessRate}%` : '--%'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-sans">
                    (Base 40% + {relevantMarksTotal}% Dao Marks)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-[#8a8275] block">
                    Refinement Cost
                  </span>
                  <span className={`text-sm font-bold font-mono ${canAffordStones ? 'text-amber-300' : 'text-red-400'}`}>
                    50 Primeval Stones
                  </span>
                </div>

                <button
                  onClick={handleExecuteRefinement}
                  disabled={!slotA || !slotB || !canAffordStones || isRefining}
                  className={`py-3.5 px-8 rounded-2xl font-sans text-xs md:text-sm font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl border flex items-center gap-2 ${
                    slotA && slotB && canAffordStones && !isRefining
                      ? 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-black border-[#c89b3c] hover:brightness-125 hover:shadow-[0_0_30px_rgba(200,155,60,0.8)] cursor-pointer hover:scale-105 active:scale-95'
                      : 'bg-[#1a1814] text-zinc-600 border-[#2a2620] cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>🔥</span>
                  <span>{isRefining ? 'Harmonizing Dao...' : 'Refine Gu'}</span>
                </button>
              </div>

            </div>

          </div>

          {/* Refinement Result Feedback Card */}
          {refineResult && (
            <div className={`glass-card p-6 rounded-3xl border shadow-2xl animate-slide-up ${
              refineResult.success 
                ? 'bg-gradient-to-r from-amber-950/90 via-[#241a0d] to-amber-950/90 border-[#c89b3c] shadow-[0_0_40px_rgba(200,155,60,0.4)]' 
                : 'bg-gradient-to-r from-red-950/90 via-[#200a0a] to-red-950/90 border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.5)]'
            }`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{refineResult.success ? '✨' : '💥'}</span>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold tracking-wider ${refineResult.success ? 'text-amber-200' : 'text-red-400'}`}>
                    {refineResult.success ? 'HEAVENLY REFINEMENT SUCCESSFUL' : 'REFINEMENT BACKLASH SUFFERED'}
                  </h3>
                  <p className="text-xs text-zinc-300 font-sans mt-1 leading-relaxed">
                    {refineResult.message}
                  </p>
                  {refineResult.result_gu && (
                    <div className="mt-3 bg-black/60 border border-[#c89b3c]/60 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎁</span>
                        <span className="text-sm font-bold text-amber-300 font-serif">
                          [{refineResult.result_gu.name}]
                        </span>
                        <span className="text-xs text-zinc-400 font-sans">
                          (Rank {refineResult.result_gu.tier} {refineResult.result_gu.path})
                        </span>
                      </div>
                      <span className="text-[10px] bg-amber-950/80 border border-amber-500 text-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                        Sent to Vault
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT: Inventory Picker & Canonical Recipes (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Available Gu Worms Picker */}
          <div className="glass-card bg-[#12100d]/90 border border-[#2a2620] p-6 rounded-3xl shadow-xl flex flex-col">
            <h3 className="text-xs text-[#8a8275] uppercase tracking-[0.25em] font-bold font-sans mb-3 pb-2 border-b border-[#2a2620]">
              Available Gu (Aperture & Vault)
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {allAvailableGu.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 italic">
                  No Gu worms available in aperture or vault.
                </div>
              ) : (
                allAvailableGu.map(gu => {
                  const isSelected = slotA?.id === gu.id || slotB?.id === gu.id;
                  return (
                    <div 
                      key={gu.id}
                      onClick={() => !isSelected && handleSelectGu(gu)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-[#3b4d3c] bg-[#1e3a2b]/20 opacity-50 cursor-not-allowed' 
                          : 'border-[#2a2620] bg-black/40 hover:border-[#c89b3c]/60 hover:bg-[#1a1610] cursor-pointer hover:scale-101'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎴</span>
                        <div>
                          <h5 className="text-xs font-bold text-[#d5cfc4]">{gu.name}</h5>
                          <span className="text-[10px] text-[#8a8275] font-sans">
                            Rank {gu.tier} • {gu.path}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-300/80 font-mono">
                          {gu.gu_type === 'active' ? `${gu.active_power} DMG` : 'Passive'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-sans">
                          {isSelected ? 'Slotted' : '+ Add'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Canonical Recipe Scroll */}
          <div className="glass-card bg-[#12100d]/90 border border-[#2a2620] p-6 rounded-3xl shadow-xl flex flex-col">
            <h3 className="text-xs text-[#8a8275] uppercase tracking-[0.25em] font-bold font-sans mb-3 pb-2 border-b border-[#2a2620]">
              Canonical Recipes (Dao Scroll)
            </h3>

            <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1 text-xs font-sans">
              {recipes.length > 0 ? (
                recipes.map(r => (
                  <div key={r.id} className="p-2.5 rounded-xl bg-black/50 border border-[#2a2620]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-amber-200 font-bold font-serif">{r.result.name} (Rank {r.result.tier})</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">{r.calculated_success_rate}% Success</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {r.ingredients.join(' + ')} + {r.stone_cost} Stones
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-xl bg-black/50 border border-[#2a2620]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-amber-200 font-bold font-serif">Moonglow Gu (Rank 2)</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">52% Success</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Moonlight Gu + Little Light Gu + 50 Stones
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
