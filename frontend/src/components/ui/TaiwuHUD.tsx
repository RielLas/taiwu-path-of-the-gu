import { useEffect } from 'react';
import { useCultivatorStore } from '../../hooks/useCultivator';

interface TaiwuHUDProps {
  activeTab: 'World' | 'Aperture' | 'Refine' | 'Ascend' | 'Ledger';
  setActiveTab: (tab: 'World' | 'Aperture' | 'Refine' | 'Ascend' | 'Ledger') => void;
}

export default function TaiwuHUD({ activeTab, setActiveTab }: TaiwuHUDProps) {
  const { cultivator, fetchAperture } = useCultivatorStore();

  useEffect(() => {
    if (!cultivator) fetchAperture();
  }, [cultivator, fetchAperture]);

  const isPeakStage = cultivator?.stage 
    ? (cultivator.stage.toLowerCase().includes('peak') || cultivator.stage.toLowerCase() === 'peak stage' || cultivator.stage.toLowerCase() === 'peak')
    : false;

  const staminaPercent = cultivator 
    ? Math.min(100, Math.max(0, (cultivator.primeval_essence / cultivator.max_essence) * 100))
    : 0;

  return (
    <div className="absolute bottom-0 w-full flex items-end justify-center pointer-events-none pb-4 z-50">
      
      {/* HUD Container - Glassmorphism base */}
      <div className="w-[95%] max-w-7xl h-28 glass-panel rounded-[2rem] flex items-center justify-between px-8 md:px-16 pointer-events-auto relative overflow-visible border-b-0 rounded-b-none bg-[#12100d]/90 backdrop-blur-md border border-[#2a2620]">
        
        {/* Subtle top glow line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-[#8a8275] to-transparent opacity-50"></div>

        {/* Left Side Portrait - Interactive Trigger for Character Ledger */}
        <div 
          onClick={() => setActiveTab('Ledger')}
          title="Open Character Ledger (Scroll of Taiwu)"
          className="absolute bottom-6 left-6 md:left-12 w-28 h-36 bg-gradient-to-t from-gray-900 to-[#12100d] border-2 border-[#c89b3c] border-opacity-30 rounded-t-[40%] flex flex-col items-center justify-end overflow-visible z-20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-transform hover:scale-105 duration-500 cursor-pointer group hover:border-[#c89b3c]"
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] rounded-t-[40%] overflow-hidden pointer-events-none"></div>
          
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

          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
            🎴
          </div>

          <div className="w-full text-center bg-black/90 backdrop-blur-sm text-[9px] py-1.5 text-[#d5cfc4] group-hover:text-[#c89b3c] font-serif tracking-widest border-t border-[#c89b3c]/30 z-20 uppercase font-bold transition-colors">
            {cultivator?.name || 'CULTIVATOR'} (R{cultivator?.rank || 1})
          </div>
        </div>

        {/* Left Menus */}
        <div className="flex gap-6 md:gap-10 ml-36 z-0">
          <button 
            onClick={() => setActiveTab('World')}
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
              onClick={() => setActiveTab('Ascend')}
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
            onClick={() => setActiveTab('Aperture')}
            className={`group flex flex-col items-center transition-all duration-300 ${activeTab === 'Aperture' ? 'text-[#d5cfc4] scale-110 drop-shadow-[0_0_10px_rgba(244,238,219,0.5)]' : 'text-[#8a8275] hover:text-[#d5cfc4]'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${activeTab === 'Aperture' ? 'bg-[#3b4d3c] bg-opacity-20 border border-[#3b4d3c]' : 'bg-gray-800 bg-opacity-50 border border-transparent group-hover:border-gray-600'}`}>
              <span className="text-xl">🎴</span>
            </div>
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] opacity-80 font-semibold">Aperture</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('Refine')}
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
  );
}
