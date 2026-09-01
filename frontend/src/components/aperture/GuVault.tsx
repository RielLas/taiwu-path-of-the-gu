import { useEffect, useState } from 'react';
import { useVaultStore } from '../../hooks/useVault';
import { useCultivatorStore } from '../../hooks/useCultivator';
import { playJadeClinkSound, playBrushSound } from '../../hooks/useAudio';
import type { GuWorm } from '../../types/api';
import uiPanelImg from '../../assets/ui_panel.webp';

export default function GuVault() {
  const { 
    equippedGu, vaultGu, vault, vaultCapacity, maxActiveSlots, equippedActiveCount,
    isLoading, feedbackMessage, fetchVault, equipGu, unequipGu, feedGu, consumeStone,
    calculateFeedCost, clearFeedback 
  } = useVaultStore();
  const { cultivator } = useCultivatorStore();

  const [selectedSlotItem, setSelectedSlotItem] = useState<any | null>(null);
  const [stoneConsumeAmount, setStoneConsumeAmount] = useState<number>(1);
  const [isConsumingStones, setIsConsumingStones] = useState<boolean>(false);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Combine player's raw vault inventory items with fallback
  const vaultItems = vault && vault.length > 0 ? vault : [
    {
      item_id: 'primeval_stone',
      name: 'Primeval Stone',
      quantity: cultivator?.spirit_stones || 500,
      type: 'material',
      description: 'Standard currency and essence recovery medium of the Gu World.'
    },
    ...vaultGu
  ];

  // Auto-select first item if nothing selected
  useEffect(() => {
    if (!selectedSlotItem && vaultItems.length > 0) {
      setSelectedSlotItem(vaultItems[0]);
    }
  }, [vaultItems, selectedSlotItem]);

  const handleFeed = async (guId: string) => {
    playJadeClinkSound();
    await feedGu(guId);
  };

  const handleConsumeStones = async () => {
    if (stoneConsumeAmount <= 0 || isConsumingStones) return;
    playJadeClinkSound();
    setIsConsumingStones(true);
    try {
      await consumeStone(stoneConsumeAmount);
    } finally {
      setIsConsumingStones(false);
    }
  };

  const activeCombatGu = equippedGu.filter(g => g.gu_type === 'active');

  const combatSlots: (GuWorm | null)[] = [
    activeCombatGu[0] || null,
    activeCombatGu[1] || null,
    activeCombatGu[2] || null
  ];

  // Map 32 total slots in the 8-column CSS matrix
  const TOTAL_GRID_SLOTS = 32;
  const gridSlots: (any | null)[] = Array.from({ length: TOTAL_GRID_SLOTS }).map((_, idx) => {
    return vaultItems[idx] || null;
  });

  const playerStones = cultivator?.spirit_stones || 0;

  const getItemIcon = (item: any) => {
    if (!item) return null;
    if (item.item_id === 'primeval_stone' || item.id === 'primeval_stone') return '💎';
    if (item.path === 'Moon Path') return '🌙';
    if (item.path === 'Strength Path') return item.name?.includes('Bear') ? '🐻' : '🐗';
    if (item.path === 'Transformation Path') return item.name?.includes('Jade') ? '🛡️' : '⚔️';
    if (item.path === 'Support Path' || item.name?.includes('Liquor')) return '🍶';
    if (item.path === 'Blood Path') return '🩸';
    if (item.path === 'Light Path') return '⚡';
    if (item.path === 'Water Path') return '💧';
    if (item.path === 'Poison Path') return '🧪';
    if (item.type === 'material') return '📦';
    return '🎴';
  };

  const renderSatietyIndicator = (gu: any) => {
    const val = gu.satiety !== undefined ? gu.satiety : (gu.hunger !== undefined ? gu.hunger : 100);
    const isCritical = val < 20;
    const isWarning = val >= 20 && val < 50;

    let barColor = 'bg-[#3b4d3c]';
    let textColor = 'text-[#3b4d3c]';
    let warningLabel = '';

    if (isCritical) {
      barColor = 'bg-[#c0392b] animate-pulse';
      textColor = 'text-red-500 font-bold animate-pulse';
      warningLabel = '💀 CRITICAL STARVATION';
    } else if (isWarning) {
      barColor = 'bg-amber-500';
      textColor = 'text-amber-400 font-semibold';
      warningLabel = '⚠️ Starving Soon';
    }

    return (
      <div className="w-full my-1.5 font-sans">
        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider mb-1">
          <span className="text-[#8a8275] flex items-center gap-1">
            Satiety: <span className={textColor}>{val}%</span>
          </span>
          {warningLabel && (
            <span className={`text-[9px] uppercase tracking-wider ${textColor}`}>
              {warningLabel}
            </span>
          )}
        </div>
        <div className="w-full bg-[#0a0907] rounded-full h-1.5 overflow-hidden border border-[#2a2620]">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
            style={{ width: `${Math.max(2, val)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 font-serif select-none animate-fade-in z-10">
      
      {/* Top Vault Summary Ribbon */}
      <div className="bg-[#12100d]/90 backdrop-blur-md border border-[#2a2620] rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 font-sans text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#c89b3c]/10 border border-[#c89b3c]/60 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(200,155,60,0.2)]">
            🏺
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-[#d5cfc4] tracking-wider">Primeval Gu Vault & Ledger</h3>
            <span className="text-[10px] text-[#8a8275] uppercase tracking-wider">
              Physical Storage Ledger • Rank {cultivator?.rank || 1} Aperture Matrix
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="bg-black/60 px-3.5 py-2 rounded-xl border border-[#c89b3c]/50 flex flex-col shadow-inner">
            <span className="text-[10px] text-[#8a8275] uppercase font-bold">Primeval Wealth</span>
            <span className="font-bold text-sm text-[#c89b3c] font-mono">
              💎 {playerStones} Stones
            </span>
          </div>

          <div className="bg-black/60 px-3.5 py-2 rounded-xl border border-[#2a2620] flex flex-col">
            <span className="text-[10px] text-[#8a8275] uppercase font-bold">Active Combat Slots</span>
            <span className={`font-bold text-sm font-mono ${equippedActiveCount >= maxActiveSlots ? 'text-[#c89b3c]' : 'text-emerald-400'}`}>
              {equippedActiveCount} / {maxActiveSlots} Equipped
            </span>
          </div>

          <div className="bg-black/60 px-3.5 py-2 rounded-xl border border-[#2a2620] flex flex-col">
            <span className="text-[10px] text-[#8a8275] uppercase font-bold">Vault Reserves</span>
            <span className={`font-bold text-sm font-mono ${vaultGu.length >= vaultCapacity ? 'text-red-400' : 'text-amber-300'}`}>
              {vaultGu.length} / {vaultCapacity} Gu
            </span>
          </div>
        </div>
      </div>

      {/* Alert / Feedback Notification */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-sans font-semibold flex justify-between items-center animate-fade-in ${
          feedbackMessage.type === 'success' 
            ? 'bg-[#3b4d3c]/30 border-[#3b4d3c] text-emerald-300 shadow-[0_0_15px_rgba(59,77,60,0.3)]' 
            : 'bg-[#5c2424]/40 border-red-500 text-red-300 shadow-[0_0_15px_rgba(92,36,36,0.3)]'
        }`}>
          <span>{feedbackMessage.text}</span>
          <button 
            onClick={clearFeedback}
            className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider ml-4 cursor-pointer"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* ACTIVE COMBAT APERTURE LOADOUT */}
      <div className="bg-[#171410]/90 backdrop-blur-md border border-[#c89b3c]/40 rounded-2xl p-5 shadow-[0_0_25px_rgba(0,0,0,0.8)] relative">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2a2620]">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[#c89b3c] font-sans font-bold">Zone 1</span>
            <span className="text-[10px] bg-[#c89b3c]/20 border border-[#c89b3c]/60 text-[#c89b3c] px-2 py-0.5 rounded font-sans uppercase font-bold">
              Combat Aperture (Max 3 Slots)
            </span>
          </div>
          <span className="text-[11px] text-[#8a8275] font-sans">
            Gu actively equipped inside the Primeval Sea for tactical combat.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {combatSlots.map((gu, index) => {
            if (gu) {
              const satietyVal = gu.satiety !== undefined ? gu.satiety : (gu.hunger !== undefined ? gu.hunger : 100);
              const feedCost = calculateFeedCost(gu.tier);
              const isSated = satietyVal >= 100;
              const canAfford = playerStones >= feedCost;

              return (
                <div 
                  key={gu.id}
                  className={`bg-[#100e0b] border rounded-xl p-3.5 flex flex-col justify-between shadow-md relative group transition-all ${
                    satietyVal < 20 
                      ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                      : 'border-[#c89b3c]/50 hover:border-[#c89b3c]'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-[#c89b3c] font-sans font-bold block">
                          Slot {index + 1} • Active
                        </span>
                        <h4 className="text-sm text-[#d5cfc4] font-bold flex items-center gap-1.5">
                          <span>{getItemIcon(gu)}</span>
                          <span>{gu.name}</span>
                        </h4>
                        <span className="text-[10px] text-[#8a8275] font-sans">Tier {gu.tier} • {gu.path}</span>
                      </div>
                      <span className="text-[9px] bg-[#c89b3c]/20 border border-[#c89b3c]/60 text-[#c89b3c] px-1.5 py-0.5 rounded font-sans font-bold">
                        ⚡ {gu.essence_cost}% Ess
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 font-sans leading-relaxed my-1.5 bg-black/40 p-1.5 rounded border border-[#2a2620]">
                      {gu.effect_desc}
                    </p>

                    {renderSatietyIndicator(gu)}
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#2a2620] flex gap-2">
                    <button
                      onClick={() => handleFeed(gu.id)}
                      disabled={isSated || !canAfford || isLoading}
                      className={`flex-1 py-1 rounded text-[10px] font-sans font-bold uppercase tracking-wider transition-all border ${
                        isSated
                          ? 'bg-[#1a1814] text-zinc-600 border-[#2a2620] cursor-not-allowed opacity-50'
                          : canAfford
                          ? 'bg-[#3b4d3c]/30 hover:bg-[#3b4d3c] border-[#3b4d3c] text-emerald-200 hover:text-white cursor-pointer'
                          : 'bg-[#5c2424]/20 border-red-900 text-red-400 cursor-not-allowed opacity-70'
                      }`}
                    >
                      {isSated ? 'Sated' : `🌿 Feed (💎 ${feedCost})`}
                    </button>
                    <button
                      onClick={() => unequipGu(gu.id)}
                      disabled={isLoading}
                      className="px-2.5 py-1 bg-black/60 hover:bg-[#5c2424]/40 border border-[#2a2620] hover:border-red-700 text-gray-400 hover:text-red-300 rounded text-[10px] uppercase font-sans font-bold tracking-wider transition-all cursor-pointer"
                    >
                      Unequip
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={`empty_slot_${index}`}
                className="bg-[#0e0c0a]/80 border-2 border-dashed border-[#2a2620] rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[140px] shadow-inner"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 border border-[#2a2620] flex items-center justify-center text-gray-600 text-sm mb-1.5">
                  ＋
                </div>
                <span className="text-[11px] font-sans font-semibold text-[#8a8275]">Empty Active Slot {index + 1}</span>
                <span className="text-[9px] font-sans text-stone-600 mt-0.5">Equip an active Gu from Vault below</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PHASE 1 & PHASE 2: THE GLASSMORPHISM VAULT UI CANVAS & CSS GRID MATRIX */}
      <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.95)] border border-[#cdaa6a]/30">
        
        {/* Phase 1: Absolute Background Visual Canvas */}
        <div className="absolute inset-0 bg-[#0c0a08] pointer-events-none">
          <img 
            src={uiPanelImg} 
            alt="Vault Glassmorphism Panel" 
            className="w-full h-full object-fill opacity-90 filter drop-shadow-[0_0_30px_rgba(200,155,60,0.15)]"
          />
        </div>

        {/* Inner Content Layer (z-10) */}
        <div className="relative z-10 p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT: Pure CSS 8-Column Grid Matrix */}
          <div className="flex-1 w-full">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#cdaa6a]/20">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-[#cdaa6a] font-sans font-bold block">
                  Phase 2: Matrix Storage
                </span>
                <h3 className="text-lg font-serif font-bold text-[#d5cfc4] tracking-wider">
                  Primeval Vault Grid (8x4 Slots)
                </h3>
              </div>
              <span className="text-[11px] text-[#8a8275] font-sans">
                Click any slot to inspect, equip, feed, or convert
              </span>
            </div>

            {/* Pure Tailwind CSS Grid for inventory slots: grid grid-cols-8 gap-3 p-8 */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-6 md:p-8 bg-black/70 backdrop-blur-md rounded-2xl border border-[#cdaa6a]/30 shadow-inner justify-items-center">
              {gridSlots.map((item, slotIndex) => {
                const isSelected = selectedSlotItem && (
                  (item && selectedSlotItem.id && item.id === selectedSlotItem.id) ||
                  (item && selectedSlotItem.item_id && item.item_id === selectedSlotItem.item_id)
                );
                const hasItem = !!item;
                const isGu = item && item.type !== 'material' && item.satiety !== undefined;

                return (
                  <div
                    key={`vault_slot_${slotIndex}`}
                    onClick={() => {
                      if (item) {
                        playBrushSound();
                        setSelectedSlotItem(item);
                      }
                    }}
                    title={item ? `${item.name}${item.quantity ? ` (${item.quantity})` : ''}` : `Empty Slot ${slotIndex + 1}`}
                    className={`w-14 h-14 bg-black/60 border rounded-sm flex items-center justify-center relative cursor-pointer group transition-all duration-200 shadow-inner select-none ${
                      isSelected
                        ? 'border-[#cdaa6a] bg-amber-950/40 shadow-[0_0_15px_rgba(205,170,106,0.6)] ring-1 ring-[#cdaa6a]'
                        : hasItem
                        ? 'border-[#cdaa6a]/40 hover:border-[#cdaa6a] hover:bg-[#1a1712] hover:scale-105'
                        : 'border-[#2a2620]/60 hover:border-[#cdaa6a]/20 bg-black/30'
                    }`}
                  >
                    {/* Phase 3: Data Injection — Centered item icon / transparent sprite */}
                    {hasItem && (
                      <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-110 transition-transform">
                        {getItemIcon(item)}
                      </span>
                    )}

                    {/* Satiety alert dot for Gu */}
                    {isGu && item.satiety < 20 && (
                      <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    )}

                    {/* Phase 3: Stackable Quantity in bottom-right corner */}
                    {hasItem && item.quantity !== undefined && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-sans font-bold text-[#cdaa6a] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] font-mono leading-none">
                        {item.quantity > 9999 ? `${(item.quantity / 1000).toFixed(1)}k` : item.quantity}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Slot Item Detail & Action Inspector */}
          <div className="w-full lg:w-80 bg-black/80 backdrop-blur-xl border border-[#cdaa6a]/40 rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[380px]">
            {selectedSlotItem ? (
              <div className="flex flex-col h-full justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 pb-3 border-b border-[#2a2620]">
                    <div className="w-12 h-12 rounded-xl bg-black/60 border border-[#cdaa6a] flex items-center justify-center text-2xl shadow-inner">
                      {getItemIcon(selectedSlotItem)}
                    </div>
                    <div>
                      <h4 className="text-base font-serif font-bold text-[#d5cfc4]">
                        {selectedSlotItem.name}
                      </h4>
                      <span className="text-[10px] font-sans text-[#cdaa6a] uppercase tracking-wider">
                        {selectedSlotItem.type === 'material' ? 'Physical Material / Currency' : `Tier ${selectedSlotItem.tier || 1} • ${selectedSlotItem.path || 'Gu'}`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-sans text-stone-400 leading-relaxed my-3 bg-black/40 p-2.5 rounded-xl border border-[#2a2620]">
                    {selectedSlotItem.description || selectedSlotItem.effect_desc || 'An ancient item stored inside the physical vault ledger.'}
                  </p>

                  {/* If item is a Gu worm, show satiety and buffs */}
                  {selectedSlotItem.type !== 'material' && selectedSlotItem.satiety !== undefined && (
                    <div className="my-2">
                      {renderSatietyIndicator(selectedSlotItem)}
                      {selectedSlotItem.passive_buff && (
                        <div className="text-[10px] font-sans text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2 py-1 rounded mt-2">
                          Passive: {selectedSlotItem.passive_buff.label || `+${selectedSlotItem.passive_buff.value} ${selectedSlotItem.passive_buff.stat}`}
                        </div>
                      )}
                    </div>
                  )}

                  {/* If item is Primeval Stone, show thermodynamic conversion */}
                  {(selectedSlotItem.item_id === 'primeval_stone' || selectedSlotItem.id === 'primeval_stone') && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-950/20 border border-[#cdaa6a]/40 font-sans">
                      <span className="text-[10px] text-[#cdaa6a] font-bold uppercase tracking-wider block mb-1">
                        💎 Primeval Stone Thermodynamics
                      </span>
                      <p className="text-[11px] text-stone-400 mb-2">
                        Shatter stones to instantly recover 5% Primeval Sea volume per stone, bypassing meditation stamina cost.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={selectedSlotItem.quantity || 100}
                          value={stoneConsumeAmount}
                          onChange={(e) => setStoneConsumeAmount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-black/80 border border-[#cdaa6a]/50 text-amber-200 text-xs px-2 py-1 rounded font-mono font-bold text-center"
                        />
                        <button
                          onClick={handleConsumeStones}
                          disabled={isConsumingStones || (selectedSlotItem.quantity || 0) < stoneConsumeAmount}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-amber-950 via-[#312010] to-amber-900 border border-[#cdaa6a] text-amber-200 hover:brightness-125 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {isConsumingStones ? 'Shattering...' : `Shatter (${stoneConsumeAmount * 5}% Ess)`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Gu Action Buttons */}
                {selectedSlotItem.type !== 'material' && selectedSlotItem.satiety !== undefined && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-[#2a2620] font-sans">
                    {/* Feed Gu */}
                    <button
                      onClick={() => handleFeed(selectedSlotItem.id)}
                      disabled={selectedSlotItem.satiety >= 100 || playerStones < calculateFeedCost(selectedSlotItem.tier || 1) || isLoading}
                      className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                        selectedSlotItem.satiety >= 100
                          ? 'bg-[#1a1814] text-zinc-600 border-[#2a2620] cursor-not-allowed opacity-50'
                          : playerStones >= calculateFeedCost(selectedSlotItem.tier || 1)
                          ? 'bg-[#3b4d3c]/30 hover:bg-[#3b4d3c] border-[#3b4d3c] text-emerald-200 hover:text-white cursor-pointer'
                          : 'bg-[#5c2424]/20 border-red-900 text-red-400 cursor-not-allowed opacity-70'
                      }`}
                    >
                      {selectedSlotItem.satiety >= 100 ? 'Sated (100%)' : `🌿 Feed with Stones (💎 ${calculateFeedCost(selectedSlotItem.tier || 1)})`}
                    </button>

                    {/* Equip to Aperture if in Vault */}
                    {vaultGu.some(vg => vg.id === selectedSlotItem.id) && (
                      <button
                        onClick={() => equipGu(selectedSlotItem.id)}
                        disabled={isLoading || (selectedSlotItem.gu_type === 'active' && equippedActiveCount >= maxActiveSlots)}
                        className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          !(selectedSlotItem.gu_type === 'active' && equippedActiveCount >= maxActiveSlots) && !isLoading
                            ? 'bg-gradient-to-r from-amber-950 via-[#312010] to-amber-900 border-[#cdaa6a] text-amber-200 hover:brightness-125 cursor-pointer shadow-lg'
                            : 'bg-black/60 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
                        }`}
                      >
                        Equip to Active Aperture
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-stone-600 font-sans">
                <span className="text-3xl mb-2">🔍</span>
                <span className="text-xs">Select a slot in the grid to inspect item details</span>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
