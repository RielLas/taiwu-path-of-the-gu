import { useEffect, useRef } from 'react';
import { useCombatStore } from '../../hooks/useCombat';
import { useCultivatorStore } from '../../hooks/useCultivator';

export default function CombatArena() {
  const { 
    isActive, playerHp, playerMaxHp, enemy, logs, loot, killerMove, isProcessing, 
    executeAction, endCombat 
  } = useCombatStore();
  
  const { cultivator, guWorms } = useCultivatorStore();
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll combat logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isActive || !enemy || !cultivator) return null;

  const currentEssence = cultivator.primeval_essence;
  const isDefeated = playerHp <= 0;
  const isVictory = enemy.hp <= 0;
  const isCombatOver = isDefeated || isVictory;

  // Filter only 'active' type Gu worms for combat skills
  const activeGuWorms = guWorms.filter(gu => gu.gu_type === 'active');

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0907] flex flex-col items-center justify-between font-serif select-none p-4 md:p-8 overflow-y-auto">
      
      {/* Header Banner */}
      <div className="w-full text-center pt-2 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-[0.3em] text-[#5c2424] drop-shadow-[0_0_15px_rgba(92,36,36,0.8)] uppercase">
          Mortal Combat
        </h1>
        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-[#5c2424] to-transparent mx-auto mt-2 opacity-70"></div>
      </div>

      {/* Main Arena Container */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6 items-stretch justify-between my-auto py-2">
        
        {/* LEFT: Player Cultivator Stats */}
        <div className="flex-1 glass-card bg-[#12100d] border border-[#2a2620] p-6 rounded-2xl shadow-[0_0_40px_rgba(59,77,60,0.15)] flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-[#3b4d3c] bg-[#1a1814] flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(59,77,60,0.5)]">
              🎴
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#d5cfc4] tracking-widest">{cultivator.name}</h2>
              <span className="text-xs text-[#8a8275] uppercase tracking-widest">Rank {cultivator.rank} Cultivator</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Player HP */}
            <div>
              <div className="flex justify-between text-xs font-sans uppercase tracking-widest mb-1.5">
                <span className="text-[#8a8275]">Physical Integrity</span>
                <span className="text-[#3b4d3c] font-bold">{Math.ceil(playerHp)} / {playerMaxHp}</span>
              </div>
              <div className="w-full h-3 bg-[#1a1814] rounded-full border border-[#2a2620] overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#1e3a2b] to-[#3b4d3c] transition-all duration-500"
                  style={{ width: `${(Math.max(0, playerHp) / playerMaxHp) * 100}%` }}
                />
              </div>
            </div>

            {/* Player Essence */}
            <div>
              <div className="flex justify-between text-xs font-sans uppercase tracking-widest mb-1.5">
                <span className="text-[#8a8275]">Primeval Essence</span>
                <span className="text-[#c89b3c] font-bold">{currentEssence}%</span>
              </div>
              <div className="w-full h-3 bg-[#1a1814] rounded-full border border-[#2a2620] overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8B6914] to-[#c89b3c] transition-all duration-500"
                  style={{ width: `${currentEssence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: Combat Log */}
        <div className="flex-1 md:flex-[1.5] glass-card bg-[#0a0907] border border-[#2a2620] rounded-2xl flex flex-col overflow-hidden shadow-2xl h-80 md:h-auto relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(10,9,7,1)_100%)] pointer-events-none z-10"></div>
          
          <div className="p-4 border-b border-[#2a2620] bg-[#12100d]/80 relative z-20">
            <h3 className="text-center text-xs text-[#8a8275] uppercase tracking-[0.3em] font-bold">Battle Scroll</h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-sans text-sm space-y-3 custom-scrollbar relative z-0">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`animate-fade-in pl-3 border-l-2 py-1
                  ${log.type === 'player_atk' ? 'border-[#3b4d3c] text-[#d5cfc4]' : 
                    log.type === 'enemy_atk' ? 'border-[#5c2424] text-red-400 font-semibold' : 
                    log.type === 'loot' ? 'border-[#c89b3c] text-[#c89b3c] font-bold' :
                    'border-[#8a8275] text-[#8a8275] italic text-xs'}
                `}
              >
                {log.message}
              </div>
            ))}
            <div ref={logsEndRef} className="h-2" />
          </div>
        </div>

        {/* RIGHT: Enemy Stats */}
        <div className="flex-1 glass-card bg-[#12100d]/90 border border-[#5c2424]/40 p-6 rounded-2xl shadow-[0_0_40px_rgba(92,36,36,0.1)] flex flex-col">
          <div className="flex items-center gap-4 mb-6 flex-row-reverse text-right">
            <div className="w-16 h-16 rounded-full border-2 border-[#5c2424] bg-[#1a1814] flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(92,36,36,0.5)]">
              👹
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-400 tracking-widest">{enemy.name}</h2>
              <span className="text-xs text-[#8a8275] uppercase tracking-widest">Rank {enemy.rank} Threat</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Enemy HP */}
            <div>
              <div className="flex justify-between text-xs font-sans uppercase tracking-widest mb-1.5">
                <span className="text-[#8a8275]">Vitality</span>
                <span className="text-[#5c2424] font-bold">{Math.ceil(enemy.hp)} / {enemy.maxHp}</span>
              </div>
              <div className="w-full h-3 bg-[#1a1814] rounded-full border border-[#2a2620] overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#3f1617] to-[#5c2424] transition-all duration-500 float-right"
                  style={{ width: `${(Math.max(0, enemy.hp) / enemy.maxHp) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="bg-[#0a0907] p-3 rounded-lg border border-[#2a2620] text-center mt-auto">
              <span className="text-[10px] text-[#8a8275] uppercase tracking-widest block mb-1">Estimated Attack Power</span>
              <span className="text-red-400 font-bold font-sans text-lg">{enemy.atk} DMG</span>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM: Tactical Action Bar */}
      <div className="w-full max-w-6xl mt-4 mb-4 pb-4">
        
        {/* Supreme Synergy: Killer Move Action Banner */}
        {!isCombatOver && killerMove && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-red-950/90 via-[#24130d] to-red-950/90 border-2 border-[#c89b3c] shadow-[0_0_30px_rgba(200,155,60,0.3)] flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up">
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#c89b3c] font-sans font-bold">
                  ⚡ Active Dao Synergy Unlocked
                </span>
                <span className="text-[9px] bg-red-950/90 border border-red-500 text-red-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                  Killer Move
                </span>
              </div>
              <h4 className="text-lg md:text-xl font-bold text-[#d5cfc4] tracking-wider">
                {killerMove.name} {killerMove.chinese_name ? `(${killerMove.chinese_name})` : ''}
              </h4>
              <p className="text-xs text-[#8a8275] font-sans mt-0.5 leading-relaxed">
                {killerMove.description}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <button
                onClick={() => executeAction('killer_move', killerMove.id, killerMove.name, killerMove.damage, killerMove.essence_cost)}
                disabled={isProcessing || currentEssence < killerMove.essence_cost}
                className={`py-3.5 px-6 md:px-8 rounded-xl font-sans text-xs md:text-sm font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl border ${
                  currentEssence >= killerMove.essence_cost && !isProcessing
                    ? 'bg-gradient-to-r from-red-600 via-amber-600 to-red-800 text-white hover:brightness-125 hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] border-[#c89b3c] cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-[#1a1814] text-zinc-600 border-[#2a2620] cursor-not-allowed opacity-50'
                }`}
              >
                ⚡ EXECUTE KILLER MOVE ({killerMove.damage} DMG • {killerMove.essence_cost}% Ess)
              </button>
              {currentEssence < killerMove.essence_cost && (
                <span className="text-[10px] text-red-400 font-sans mt-1 text-center">
                  Requires {killerMove.essence_cost}% Essence (Have {currentEssence}%)
                </span>
              )}
            </div>
          </div>
        )}
        {isCombatOver ? (
          <div className={`glass-card bg-[#12100d] border p-6 rounded-2xl text-center shadow-2xl animate-slide-up ${
            isVictory ? 'border-[#c89b3c] shadow-[0_0_30px_rgba(200,155,60,0.2)]' : 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]'
          }`}>
            <h3 className={`text-2xl font-bold tracking-widest mb-2 ${isVictory ? 'text-[#c89b3c]' : 'text-red-500'}`}>
              {isVictory ? '🏆 VICTORY ACHIEVED' : '💀 MORTAL COLLAPSE'}
            </h3>

            {!isVictory && (
              <div className="bg-[#5c2424]/40 border border-red-500/60 p-4 rounded-xl max-w-md mx-auto my-4 text-xs text-red-200 font-sans space-y-1">
                <p className="font-bold text-red-400 text-sm">Ruthless Gu World Penalty Applied:</p>
                <p>📍 Teleported back to Origin Node [7, 7]</p>
                <p>💎 50% of your Primeval Stones were plundered</p>
                <p>🦋 One equipped Gu worm was permanently destroyed</p>
              </div>
            )}
            
            {loot && (
              <div className="flex items-center justify-center gap-3 my-6">
                <span className="text-[#8a8275] font-sans text-sm uppercase tracking-wider">Acquired Loot:</span>
                <div className="bg-[#1a1814] border border-[#c89b3c]/50 px-4 py-2 rounded-lg text-[#c89b3c] font-bold shadow-md">
                  +{loot.stones} Primeval Stones
                </div>
              </div>
            )}
            
            <button 
              onClick={endCombat}
              className={`px-8 py-3 font-sans text-sm font-bold uppercase tracking-[0.2em] rounded-xl transition-all border ${
                isVictory 
                  ? 'bg-[#1a1814] border-[#2a2620] hover:border-[#c89b3c] text-[#d5cfc4] hover:text-[#c89b3c]' 
                  : 'bg-red-950/60 border-red-800 hover:border-red-500 text-red-200 hover:text-white'
              }`}
            >
              {isVictory ? 'Return to Overworld' : 'Revive at Origin'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-slide-up">
            
            {/* Basic Strike */}
            <button 
              onClick={() => executeAction('strike')}
              disabled={isProcessing}
              className="h-20 bg-[#12100d] hover:bg-[#1a1814] border border-[#2a2620] hover:border-[#d5cfc4] text-[#d5cfc4] rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="font-bold tracking-wider group-hover:scale-105 transition-transform">👊 Basic Strike</span>
              <span className="text-[10px] text-[#8a8275] font-sans uppercase">Cost: 0% Ess</span>
            </button>

            {/* Active Gu Actions */}
            {activeGuWorms.map(gu => {
              const canAfford = currentEssence >= gu.essence_cost;
              return (
                <button 
                  key={gu.id}
                  onClick={() => executeAction('gu', gu.id, gu.name, gu.active_power, gu.essence_cost)}
                  disabled={isProcessing || !canAfford}
                  className={`h-20 bg-[#12100d] border rounded-xl flex flex-col items-center justify-center gap-1 transition-all group relative overflow-hidden
                    ${!canAfford 
                      ? 'border-[#5c2424]/40 text-zinc-600 cursor-not-allowed' 
                      : 'border-[#3b4d3c]/60 hover:border-[#3b4d3c] text-[#3b4d3c] hover:bg-[#1e3a2b]/30 shadow-[0_0_10px_rgba(59,77,60,0.1)]'}
                  `}
                >
                  <span className={`font-bold tracking-wider z-10 transition-transform ${canAfford ? 'group-hover:scale-105' : ''}`}>
                    {gu.name}
                  </span>
                  <span className={`text-[10px] font-sans uppercase z-10 ${canAfford ? 'text-[#c89b3c]' : 'text-[#5c2424]'}`}>
                    Cost: {gu.essence_cost}% Ess
                  </span>
                  
                  {/* Power Tooltip Overlay */}
                  <div className="absolute inset-0 bg-[#0a0907]/90 backdrop-blur opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity z-20 font-sans text-xs">
                    <span className="text-red-400 font-bold">{gu.active_power} DMG</span>
                    {/* Add flavor description if needed */}
                  </div>
                </button>
              );
            })}

            {/* Flee */}
            <button 
              onClick={() => executeAction('flee')}
              disabled={isProcessing}
              className="h-20 bg-[#12100d] hover:bg-[#3f1617]/50 border border-[#2a2620] hover:border-[#5c2424] text-[#8a8275] hover:text-[#5c2424] rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed col-start-2 md:col-start-auto"
            >
              <span className="font-bold tracking-wider">🏃 Flee</span>
              <span className="text-[10px] uppercase font-sans">Escape Battle</span>
            </button>

          </div>
        )}
      </div>

    </div>
  );
}
