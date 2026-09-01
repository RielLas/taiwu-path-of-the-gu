import { useState } from 'react';
import { useCultivatorStore } from '../../hooks/useCultivator';
import { playAscendSound, playBrushSound } from '../../hooks/useAudio';

interface AscensionChamberProps {
  onClose: () => void;
  onAscendSuccess: () => void;
}

export default function AscensionChamber({ onClose, onAscendSuccess }: AscensionChamberProps) {
  const { cultivator, ascend, fetchAperture } = useCultivatorStore();
  const [isBattering, setIsBattering] = useState(false);
  const [outcome, setOutcome] = useState<{
    success: boolean;
    wallBroken: boolean;
    fractured?: boolean;
    message: string;
  } | null>(null);

  if (!cultivator) return null;

  const requiredEssence = Math.floor(cultivator.max_essence * 0.9);
  const canAfford = cultivator.primeval_essence >= requiredEssence;
  const isFractured = cultivator.aperture_status === 'Fractured';

  // Calculate success rate strictly based on Aperture Grade
  let successRate = 40;
  if (cultivator.aperture_grade) {
    const grade = cultivator.aperture_grade.toUpperCase();
    if (grade.includes('A')) successRate = 90;
    else if (grade.includes('B')) successRate = 60;
    else if (grade.includes('C')) successRate = 30;
    else if (grade.includes('D')) successRate = 10;
  }

  const handleShatterWall = async () => {
    setIsBattering(true);
    setOutcome(null);
    try {
      const res = await ascend();
      await fetchAperture();

      if (res.success && res.wall_broken) {
        playAscendSound();
        setOutcome({
          success: true,
          wallBroken: true,
          message: res.message || `🎉 BREAKTHROUGH ACHIEVED! You have shattered the crystal wall and ascended to Rank ${cultivator.rank + 1} Initial Stage!`
        });
        setTimeout(() => {
          onAscendSuccess();
        }, 2000);
      } else if (res.fractured) {
        setOutcome({
          success: false,
          wallBroken: false,
          fractured: true,
          message: res.message || '💀 CATASTROPHIC FRACTURE! The crystal wall held firm, and the violent rebound cracked your aperture (-5% max essence capacity permanently)!'
        });
      } else {
        setOutcome({
          success: false,
          wallBroken: false,
          fractured: false,
          message: res.message || '💥 Breakthrough Failed! The crystal aperture wall resisted your onslaught. Your 90% primeval essence was depleted in vain.'
        });
      }
    } catch (err: any) {
      setOutcome({
        success: false,
        wallBroken: false,
        message: err.message || 'An error occurred during ascension attempt.'
      });
    } finally {
      setIsBattering(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-[#0a0907]/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8 font-serif select-none animate-fade-in overflow-y-auto">
      
      {/* Background Ink & Aura Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(200,155,60,0.25)_0%,transparent_70%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]" />

      {/* Main Chamber Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#12100d] border-2 border-[#c89b3c]/50 rounded-3xl p-6 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col items-center text-center z-10 my-auto">
        
        {/* Top Close Button */}
        <button
          onClick={() => { playBrushSound(); onClose(); }}
          className="absolute top-5 right-5 text-gray-500 hover:text-[#d5cfc4] px-3 py-1.5 rounded-xl border border-transparent hover:border-[#2a2620] transition-all cursor-pointer font-sans text-xs uppercase tracking-widest bg-black/40"
        >
          ✕ Exit Chamber
        </button>

        {/* Chamber Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚡</span>
          <span className="text-xs uppercase tracking-[0.3em] text-[#c89b3c] font-sans font-bold">
            Closed Door Cultivation
          </span>
          <span className="text-2xl">⚡</span>
        </div>

        <h1 className="text-3xl md:text-5xl text-[#d5cfc4] font-bold tracking-widest mb-2 drop-shadow-md">
          Shatter Crystal Aperture Wall
        </h1>
        <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent mx-auto mb-4" />

        <p className="text-xs text-[#8a8275] font-sans max-w-xl leading-relaxed mb-6">
          You have reached the absolute peak of Rank {cultivator.rank}. Mortals face no Heavenly Tribulations, but their destiny is bound by aperture aptitude. Mobilize your full primeval sea to batter through the crystal barrier.
        </p>

        {/* Cultivator Breakthrough Matrix */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 font-sans text-xs">
          
          <div className="bg-black/60 border border-[#2a2620] p-4 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] text-[#8a8275] uppercase tracking-wider mb-1">Aptitude Grade</span>
            <span className="text-sm font-bold text-[#c89b3c]">
              {cultivator.aperture_grade}
            </span>
          </div>

          <div className="bg-black/60 border border-[#2a2620] p-4 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] text-[#8a8275] uppercase tracking-wider mb-1">Success Probability</span>
            <span className="text-sm font-bold text-emerald-400">
              {successRate}% Breakthrough
            </span>
          </div>

          <div className="bg-black/60 border border-[#2a2620] p-4 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] text-[#8a8275] uppercase tracking-wider mb-1">Essence Drain (90%)</span>
            <span className={`text-sm font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
              {cultivator.primeval_essence} / {requiredEssence}% Req
            </span>
          </div>

          <div className="bg-black/60 border border-[#2a2620] p-4 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] text-[#8a8275] uppercase tracking-wider mb-1">Aperture State</span>
            <span className={`text-sm font-bold ${isFractured ? 'text-red-500' : 'text-emerald-300'}`}>
              {isFractured ? '💀 Fractured (-5%)' : '✨ Pristine (100%)'}
            </span>
          </div>

        </div>

        {/* Warning Banner */}
        <div className="w-full bg-[#5c2424]/30 border border-red-700/60 p-4 rounded-2xl text-left mb-8 font-sans text-xs text-red-200 flex items-start gap-3 shadow-inner">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="font-bold text-red-400 text-sm uppercase tracking-wider mb-0.5">
              Aperture Fracture Rebound Warning
            </h4>
            <p className="leading-relaxed text-[11px] text-red-300/90">
              If the crystal wall resists your essence onslaught, the entire 90% primeval sea will be lost in vain. Furthermore, there is a <span className="font-bold text-red-200 underline">15% chance of Aperture Fracture</span>, permanently reducing your maximum essence capacity by 5%.
            </p>
          </div>
        </div>

        {/* Outcome Feedback Message */}
        {outcome && (
          <div className={`w-full p-4 rounded-2xl border text-sm font-sans font-bold text-center mb-6 animate-slide-up shadow-2xl ${
            outcome.wallBroken 
              ? 'bg-[#3b4d3c]/40 border-[#3b4d3c] text-emerald-200 shadow-[0_0_30px_rgba(59,77,60,0.5)]' 
              : 'bg-[#5c2424]/50 border-red-500 text-red-200 shadow-[0_0_30px_rgba(220,38,38,0.5)]'
          }`}>
            {outcome.message}
          </div>
        )}

        {/* Central Action Button */}
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <button
            onClick={handleShatterWall}
            disabled={!canAfford || isBattering}
            className={`w-full py-5 px-8 rounded-2xl font-sans text-sm md:text-base font-bold uppercase tracking-[0.25em] transition-all duration-500 shadow-2xl border ${
              canAfford && !isBattering
                ? 'bg-gradient-to-r from-red-700 via-rose-700 to-red-900 hover:brightness-125 border-red-500 text-white shadow-[0_0_40px_rgba(225,29,72,0.6)] cursor-pointer hover:scale-105 active:scale-95'
                : 'bg-[#1a1814] text-zinc-600 border-[#2a2620] cursor-not-allowed opacity-50'
            }`}
          >
            {isBattering ? '💥 Battering Crystal Wall...' : '⚡ SHATTER CRYSTAL WALL'}
          </button>

          {!canAfford && (
            <span className="text-xs text-red-400 font-sans font-semibold">
              ⚠️ Insufficient Primeval Essence! You need at least {requiredEssence}% to batter the crystal wall.
            </span>
          )}

          {canAfford && !isBattering && (
            <span className="text-[11px] text-[#8a8275] font-sans">
              Consumes {requiredEssence}% Primeval Essence instantly upon attempt.
            </span>
          )}
        </div>

      </div>

    </div>
  );
}
