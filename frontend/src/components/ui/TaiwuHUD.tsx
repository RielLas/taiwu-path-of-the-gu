import { useEffect, useState } from 'react';
import { useCultivatorStore } from '../../hooks/useCultivator';
import { useWorldStore } from '../../hooks/useWorldStore';
import { playBrushSound } from '../../hooks/useAudio';

interface TaiwuHUDProps {
  activeTab: 'World' | 'Aperture' | 'Refine' | 'Ascend' | 'Ledger';
  setActiveTab: (tab: 'World' | 'Aperture' | 'Refine' | 'Ascend' | 'Ledger') => void;
}

export default function TaiwuHUD({ activeTab, setActiveTab }: TaiwuHUDProps) {
  const { cultivator, fetchAperture, meditate } = useCultivatorStore();
  const { currentRegionName, playerLocation } = useWorldStore();
  
  const [isMeditating, setIsMeditating] = useState(false);
  const [meditateToast, setMeditateToast] = useState<string | null>(null);

  useEffect(() => {
    if (!cultivator) fetchAperture();
  }, [cultivator, fetchAperture]);

  const isPeakStage = cultivator?.stage 
    ? (cultivator.stage.toLowerCase().includes('peak') || cultivator.stage.toLowerCase() === 'peak stage' || cultivator.stage.toLowerCase() === 'peak')
    : false;

  const staminaPercent = cultivator 
    ? Math.min(100, Math.max(0, (cultivator.primeval_essence / cultivator.max_essence) * 100))
    : 0;

  const hpPercent = cultivator ? ((cultivator.hp ?? 100) / (cultivator.max_hp ?? 100)) * 100 : 100;
  const isCriticalHp = hpPercent < 30;

  const handleTabChange = (tab: 'World' | 'Aperture' | 'Refine' | 'Ascend' | 'Ledger') => {
    playBrushSound();
    setActiveTab(tab);
  };

  const handleMeditate = async () => {
    if ((cultivator?.stamina || 0) < 20 || isMeditating) return;
    setIsMeditating(true);
    setMeditateToast(null);
    try {
      const res = await meditate(20);
      setMeditateToast(res.message || '🧘 Meditated: Essence & HP Restored!');
      setTimeout(() => setMeditateToast(null), 3500);
    } catch (err: any) {
      setMeditateToast(`💀 ${err.message}`);
      setTimeout(() => setMeditateToast(null), 3500);
    } finally {
      setIsMeditating(false);
    }
  };

  return (
    <>
      {/* Visual Degradation: Full-Screen Critical Low HP Crimson Vignette */}
      {isCriticalHp && (
        <div className="fixed inset-0 bg-red-950/20 shadow-[inset_0_0_100px_rgba(153,27,27,0.7)] border-[10px] border-red-950/60 pointer-events-none z-40 animate-pulse" />
      )}

      {/* Prominent Active Geographic Instance Header (z-50) */}
      {activeTab === 'World' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-2.5 bg-[#12100d]/95 backdrop-blur-xl border border-[#c89b3c]/60 px-5 py-2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.85)] animate-fade-in font-serif">
          <span className="text-base text-amber-400">📍</span>
          <div className="flex items-center gap-2.5">
            <span className="text-xs md:text-sm font-bold tracking-widest text-[#d5cfc4] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {currentRegionName}
            </span>
            <span className="text-[10px] font-sans font-bold text-amber-300 bg-amber-950/80 border border-amber-600/60 px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
              30x30 Grid [{playerLocation.x}, {playerLocation.y}]
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 w-full flex items-end justify-center pointer-events-none pb-4 z-50">
        
        {/* Meditate Toast Notification */}
        {meditateToast && (
          <div className="absolute -top-16 right-6 md:right-14 z-40 px-4 py-2 bg-[#12100d]/95 border border-[#c89b3c] rounded-xl text-xs font-sans font-bold text-amber-200 shadow-[0_0_25px_rgba(200,155,60,0.4)] animate-fade-in pointer-events-none whitespace-nowrap">
            {meditateToast}
          </div>
        )}

        {/* HUD Container - Glassmorphism base */}
        <div className="w-[95%] max-w-7xl h-28 glass-panel rounded-[2rem] flex items-center justify-between px-8 md:px-16 pointer-events-auto relative overflow-visible border-b-0 rounded-b-none bg-[#12100d]/90 backdrop-blur-md border border-[#2a2620]">
          
          {/* Subtle top glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-[#8a8275] to-transparent opacity-50"></div>

          {/* Left Side Portrait - Interactive Trigger for Character Ledger */}
          <div 
            onClick={() => handleTabChange('Ledger')}
            title="Open Character Ledger (Scroll of Taiwu)"
            className={`absolute bottom-6 left-6 md:left-12 w-28 h-36 bg-gradient-to-t from-gray-900 to-[#12100d] rounded-t-[40%] flex flex-col items-center justify-end overflow-visible z-20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all hover:scale-105 duration-500 cursor-pointer group ${
              isCriticalHp 
                ? 'border-2 border-red-600 ring-2 ring-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.9)] filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' 
                : 'border-2 border-[#c89b3c] border-opacity-30 hover:border-[#c89b3c]'
            }`}
          >
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] rounded-t-[40%] overflow-hidden pointer-events-none"></div>
            
            {/* Critical HP Blood Fissures Overlay */}
            {isCriticalHp && (
              <div className="absolute inset-0 bg-gradient-to-t from-red-950/80 via-transparent to-red-950/40 rounded-t-[40%] pointer-events-none z-10 flex flex-col items-center justify-start pt-2">
                <span className="text-[7px] text-red-300 font-bold uppercase tracking-wider animate-pulse">🩸 CRITICAL</span>
              </div>
            )}

            {/* Aperture Status Pill anchored safely above the portrait arch */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap">
              <span className={`text-[8px] font-sans font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border shadow-lg ${
                cultivator?.aperture_status === 'Fractured' 
                  ? 'bg-[#5c2424] text-red-200 border-red-500 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]' 
                  : 'bg-[#1e3a2b] text-emerald-300 border-[#3b4d3c] shadow-[0_0_8px_rgba(59,77,60,0.4)]'
              }`}>
                {cultivator?.aperture_status === 'Fractured' ? '💀 Fractured' : '✨ Pristine'}
              </span>
            </div>

            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
              🎴
            </div>

            {/* Procedural Active Title */}
            <div className="text-[7px] text-[#c89b3c] font-sans font-bold uppercase tracking-wider truncate px-1 text-center w-full z-20">
              {cultivator?.procedural_title || cultivator?.title || 'Demonic Cultivator'}
            </div>

            {/* Nameplate */}
            <div className="w-full text-center bg-black/90 backdrop-blur-sm text-[9px] py-1 text-[#d5cfc4] group-hover:text-[#c89b3c] font-serif tracking-widest border-t border-[#c89b3c]/30 z-20 uppercase font-bold transition-colors">
              {cultivator?.name || 'CULTIVATOR'} (R{cultivator?.rank || 1})
            </div>
          </div>

          {/* Left Menus */}
          <div className="flex gap-6 md:gap-10 ml-36 z-0">
            <button 
              onClick={() => handleTabChange('World')}
              className={`group flex flex-col items-center transition-all duration-300 ${activeTab === 'World' ? 'text-[#d5cfc4] scale-110 drop-shadow-[0_0_10px_rgba(244,238,219,0.5)]' : 'text-[#8a8275] hover:text-[#d5cfc4]'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${activeTab === 'World' ? 'bg-[#3b4d3c] bg-opacity-20 border border-[#3b4d3c]' : 'bg-gray-800 bg-opacity-50 border border-transparent group-hover:border-gray-600'}`}>
                <span className="text-xl">🏔️</span>
              </div>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] opacity-80 font-semibold">World</span>
            </button>
          </div>

          {/* Central Action Dial (Primeval Essence) */}
          <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex items-center justify-center z-20 animate-float">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full animate-pulse-glow"></div>
            
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-[3px] border-[#3b4d3c] bg-[#12100d] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden glass-panel">
              {/* Liquid / Wave effect */}
              <div 
                className="absolute bottom-0 w-full opacity-70 transition-all duration-1000 ease-in-out"
                style={{ 
                  height: `${staminaPercent}%`,
                  backgroundColor: cultivator?.essence_color || '#22c55e'
                }}
              >
                {/* Fake wave top */}
                <div className="absolute top-0 left-0 w-[200%] h-4 bg-white opacity-20 -translate-y-1/2 rounded-[100%] animate-[spin_4s_linear_infinite]"></div>
              </div>
              
              <span className="text-4xl md:text-5xl text-[#d5cfc4] font-serif font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10">
                {cultivator?.primeval_essence || 0}%
              </span>
              <span className="text-[9px] text-[#8a8275] uppercase tracking-[0.2em] font-sans mt-1 z-10 drop-shadow-md">
                {cultivator?.stage || 'Essence'}
              </span>
            </div>
          </div>

          {/* Right Menus */}
          <div className="flex gap-6 md:gap-10 mr-4 z-0">
            {/* Glowing Ascension Chamber Trigger (Only at Peak Stage) */}
            {isPeakStage && (
              <button 
                onClick={() => handleTabChange('Ascend')}
                className={`group flex flex-col items-center transition-all duration-300 animate-pulse ${
                  activeTab === 'Ascend' 
                    ? 'text-red-400 scale-115 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]' 
                    : 'text-rose-400 hover:text-red-300'
                }`}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 bg-gradient-to-t from-red-950 via-rose-900 to-red-800 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.7)] group-hover:scale-110">
                  <span className="text-xl">⚡</span>
                </div>
                <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold text-red-300">Ascend</span>
              </button>
            )}

            <button 
              onClick={() => handleTabChange('Aperture')}
              className={`group flex flex-col items-center transition-all duration-300 ${activeTab === 'Aperture' ? 'text-[#d5cfc4] scale-110 drop-shadow-[0_0_10px_rgba(244,238,219,0.5)]' : 'text-[#8a8275] hover:text-[#d5cfc4]'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${activeTab === 'Aperture' ? 'bg-[#3b4d3c] bg-opacity-20 border border-[#3b4d3c]' : 'bg-gray-800 bg-opacity-50 border border-transparent group-hover:border-gray-600'}`}>
                <span className="text-xl">🎴</span>
              </div>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] opacity-80 font-semibold">Aperture</span>
            </button>
            
            <button 
              onClick={() => handleTabChange('Refine')}
              className={`group flex flex-col items-center transition-all duration-300 ${activeTab === 'Refine' ? 'text-[#d5cfc4] scale-110 drop-shadow-[0_0_10px_rgba(158,42,43,0.8)]' : 'text-[#8a8275] hover:text-[#d5cfc4]'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${activeTab === 'Refine' ? 'bg-[#5c2424] bg-opacity-20 border border-[#5c2424]' : 'bg-gray-800 bg-opacity-50 border border-transparent group-hover:border-gray-600'}`}>
                <span className="text-xl">🔥</span>
              </div>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] opacity-80 font-semibold">Refine</span>
            </button>
          </div>

        </div>
      </div>

      {/* Standalone Bottom-Right Stamina & Meditation Console */}
      <div className="fixed bottom-8 right-8 z-50 pointer-events-auto flex flex-col items-end gap-2">
        {/* Meditate Toast Notification */}
        {meditateToast && (
          <div className="px-3.5 py-1.5 bg-[#12100d]/95 border border-[#c89b3c] rounded-xl text-xs font-sans font-bold text-amber-200 shadow-[0_0_25px_rgba(200,155,60,0.4)] animate-fade-in pointer-events-none whitespace-nowrap">
            {meditateToast}
          </div>
        )}

        {/* Unified Dark-Glass Panel with Gold Accents */}
        <div className="bg-[#12100d]/95 backdrop-blur-xl border border-[#c89b3c]/50 p-2.5 px-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center gap-3.5 hover:border-[#c89b3c] transition-all">
          {/* Stamina Meter */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3 text-[10px] font-sans font-bold uppercase tracking-wider">
              <span className="text-[#8a8275]">Stamina (AP)</span>
              <span className="text-amber-400 font-mono">⚡ {Math.round(cultivator?.stamina ?? 100)} / {cultivator?.max_stamina ?? 100}</span>
            </div>
            <div className="w-28 h-2 bg-[#0a0907] rounded-full overflow-hidden border border-[#2a2620]">
              <div 
                className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${Math.min(100, Math.max(0, ((cultivator?.stamina ?? 100) / (cultivator?.max_stamina || 100)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="w-px h-8 bg-[#2a2620]" />

          {/* Meditate Action Button */}
          <button
            onClick={handleMeditate}
            disabled={isMeditating || (cultivator?.stamina || 0) < 20}
            title="Burn 20 Stamina to restore Primeval Essence & HP"
            className={`px-3 py-2 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 shadow-lg cursor-pointer ${
              (cultivator?.stamina || 0) >= 20 && !isMeditating
                ? 'bg-gradient-to-r from-amber-950 via-[#2a1d12] to-amber-900 border-[#c89b3c] text-amber-200 hover:brightness-125 hover:shadow-[0_0_20px_rgba(200,155,60,0.6)] hover:scale-105 active:scale-95'
                : 'bg-black/60 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
            }`}
          >
            <span className="text-base">🧘</span>
            <span>{isMeditating ? 'Meditating...' : 'Meditate (-20 ⚡)'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
