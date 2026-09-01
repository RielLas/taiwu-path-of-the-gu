import { useEffect } from 'react';
import { useCultivatorStore } from '../../hooks/useCultivator';

interface CharacterLedgerProps {
  onClose: () => void;
}

export default function CharacterLedger({ onClose }: CharacterLedgerProps) {
  const { cultivator, fetchAperture } = useCultivatorStore();

  useEffect(() => {
    fetchAperture();
  }, [fetchAperture]);

  if (!cultivator) return null;

  // Fallback defaults for deep matrices if backend is still initializing
  const daoMarks = cultivator.dao_marks || {
    'Strength Path': 35 + (cultivator.rank * 10),
    'Blood Path': 20 + (cultivator.rank * 5),
    'Moon Path': 28 + (cultivator.rank * 8),
    'Transformation Path': 22 + (cultivator.rank * 5),
    'Time Path': 999, // Spring Autumn Cicada imprint
    'Poison Path': 18 + (cultivator.rank * 4),
    'Light Path': 12,
    'Water Path': 10
  };

  const bodyTempering = cultivator.body_tempering || [
    { source: 'White Boar Gu', path: 'Strength Path', bonus: '1 Boar Strength (+15 STR)', active: true, tier: 1 },
    { source: 'Jade Skin Gu', path: 'Transformation Path', bonus: 'Jade Skin Armor (+20 DEF)', active: true, tier: 1 },
    { source: 'Liquor Worm', path: 'Support Path', bonus: 'Purified Essence Sea (+10 Max Ess)', active: true, tier: 1 },
    { source: 'Black Bear Gu', path: 'Strength Path', bonus: '1 Bear Strength (+20 STR)', active: false, tier: 1 }
  ];

  const cultivationCore = cultivator.cultivation_core || {
    recovery_rate: `${2.5 * cultivator.rank} % Primeval Essence / Breath`,
    crystal_wall_durability: cultivator.aperture_status === 'Fractured' ? '75% (Fractured Fissures Detected)' : '100% (Solid Crystal Light Barrier)',
    crystal_wall_type: cultivator.rank >= 2 ? 'Purple Crystal Barrier' : 'Green Copper Crystal Wall',
    talent_desc: 'A-Grade Innate Aptitude (90-99%). The Primeval Sea occupies 93% of the Aperture volume. An illustrious genius of the Gu world with immense capacity to batter the crystal aperture walls.',
    essence_density: cultivator.rank >= 2 ? 'Rank 2 Pale Charcoal Primeval Essence' : 'Rank 1 Dark Green Copper Primeval Essence',
    aperture_dimensions: `Spatial Diameter: ${cultivator.rank * 100} Li`
  };

  const karmicLedger = cultivator.karmic_ledger || {
    alignment: 'Demonic Path (Ruthless & Pragmatic)',
    alignment_score: -75,
    reputation_title: 'Demonic Scourge of Qing Mao Mountain',
    known_aliases: [
      'Fang Yuan (方源)',
      'Gu Yue Fang Yuan',
      'Spring Autumn Reincarnator',
      'Cold-Blooded Moonblade'
    ],
    active_bounties: [
      {
        id: 'bounty_1',
        issuer: 'Gu Yue Clan Elders',
        reward: '500 Primeval Stones',
        reason: 'Defying Clan Hierarchy & Extortion of Disciples',
        threat_level: 'High'
      },
      {
        id: 'bounty_2',
        issuer: 'Southern Border Merchant Guild',
        reward: '300 Primeval Stones',
        reason: 'Unlicensed Black Market Gu Trading',
        threat_level: 'Moderate'
      }
    ],
    factions: [
      { name: 'Gu Yue Clan', standing: 'Hostile / Marked for Death', reputation: -80, type: 'Righteous Clan' },
      { name: 'Bai Clan', standing: 'Wary & Suspicious', reputation: -30, type: 'Righteous Clan' },
      { name: 'Xiong Clan', standing: 'Hostile Competitor', reputation: -50, type: 'Righteous Clan' },
      { name: 'Shang Clan Merchant City', standing: 'Pragmatic Partner', reputation: 25, type: 'Neutral Superclan' },
      { name: 'Shadow Sect Remnants', standing: 'Veiled Observers', reputation: 0, type: 'Ancient Demonic Mystery' }
    ]
  };

  const maxHp = (cultivator.stats?.defense?.total || 10) * 10;
  const currentHp = cultivator.hp ?? maxHp;

  // Alignment slider math: -100 (demonic left) to +100 (righteous right) -> percent 0% to 100%
  const alignmentPercent = ((karmicLedger.alignment_score + 100) / 200) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0907]/95 backdrop-blur-md flex flex-col font-serif select-none overflow-y-auto text-[#d5cfc4]">
      
      {/* Top Ambient Vignette & Texture */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none z-0"></div>

      {/* Top Master Bar */}
      <header className="relative z-10 w-full border-b border-[#2a2620] bg-[#12100d]/90 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#c89b3c] bg-[#1a1814] flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(200,155,60,0.3)]">
            📜
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-[0.25em] text-[#d5cfc4] uppercase">
                Taiwu Cultivation Ledger
              </h1>
              <span className="text-xs bg-[#241a12] border border-[#c89b3c]/60 text-[#c89b3c] px-2.5 py-0.5 rounded-full font-mono font-bold">
                太吾命谱
              </span>
            </div>
            <p className="text-xs text-[#8a8275] font-sans tracking-wider mt-0.5">
              Comprehensive Physiological, Aperture Core & Karmic Faction Matrix
            </p>
          </div>
        </div>

        {/* Status Pill & Exit */}
        <div className="flex items-center gap-4">
          <div className="bg-[#171410] border border-[#2a2620] px-4 py-2 rounded-xl text-right font-sans">
            <span className="text-[10px] text-[#8a8275] uppercase tracking-widest block">Accumulated Wealth</span>
            <span className="text-sm font-bold text-[#c89b3c]">💎 {cultivator.spirit_stones} Primeval Stones</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1a1814] hover:bg-[#2a2620] border border-[#2a2620] hover:border-[#c89b3c] text-[#d5cfc4] hover:text-[#c89b3c] rounded-xl text-xs font-sans font-bold uppercase tracking-[0.2em] transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <span>✕</span> Return to Overworld
          </button>
        </div>
      </header>

      {/* Main 3-Column Scroll of Taiwu Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: PHYSIOLOGY & DAO MARKS (肉身与道痕) */}
        {/* ========================================================================= */}
        <section className="glass-card bg-[#12100d]/90 border border-[#2a2620] rounded-2xl p-5 shadow-2xl flex flex-col gap-5">
          
          <div className="border-b border-[#2a2620] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💪</span>
              <h2 className="text-lg font-bold text-[#d5cfc4] tracking-widest uppercase">
                Physiology & Dao Marks
              </h2>
            </div>
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#8a8275]">
              肉身气象
            </span>
          </div>

          {/* Physical Stat Ratings */}
          <div className="space-y-3 font-sans">
            {/* HP / Vitality */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#8a8275] uppercase tracking-wider">Physical Integrity (HP)</span>
                <span className="text-[#3b4d3c] font-bold">{Math.ceil(currentHp)} / {maxHp}</span>
              </div>
              <div className="w-full h-2.5 bg-[#1a1814] rounded-full border border-[#2a2620] overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#1e3a2b] to-[#3b4d3c] transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentHp / maxHp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Core Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-[#171410] border border-[#2a2620] p-3 rounded-xl text-center">
                <span className="text-[10px] text-[#8a8275] uppercase block mb-1">Strength</span>
                <span className="text-lg font-bold text-[#c89b3c]">{cultivator.stats?.strength?.total || 10}</span>
                <span className="text-[9px] text-[#8a8275] block mt-0.5">Force Output</span>
              </div>

              <div className="bg-[#171410] border border-[#2a2620] p-3 rounded-xl text-center">
                <span className="text-[10px] text-[#8a8275] uppercase block mb-1">Defense</span>
                <span className="text-lg font-bold text-[#3b4d3c]">{cultivator.stats?.defense?.total || 5}</span>
                <span className="text-[9px] text-[#8a8275] block mt-0.5">Skin Armor</span>
              </div>

              <div className="bg-[#171410] border border-[#2a2620] p-3 rounded-xl text-center">
                <span className="text-[10px] text-[#8a8275] uppercase block mb-1">Agility</span>
                <span className="text-lg font-bold text-sky-400">{cultivator.stats?.speed || 10}</span>
                <span className="text-[9px] text-[#8a8275] block mt-0.5">Movement</span>
              </div>
            </div>
          </div>

          {/* Body Tempering (Beast Force Infusion) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-[0.2em] text-[#c89b3c] font-bold">
                Body Tempering (肉身淬炼)
              </h3>
              <span className="text-[10px] text-[#8a8275] font-sans">
                {bodyTempering.filter(b => b.active).length} Active Inscriptions
              </span>
            </div>
            
            <div className="space-y-2 font-sans">
              {bodyTempering.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    item.active 
                      ? 'bg-[#171410] border-[#3b4d3c]/60 shadow-[0_0_10px_rgba(59,77,60,0.15)]' 
                      : 'bg-[#12100d] border-[#2a2620] opacity-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#d5cfc4]">{item.source}</span>
                      <span className="text-[9px] text-[#8a8275] uppercase font-mono">[{item.path}]</span>
                    </div>
                    <span className="text-[11px] text-[#c89b3c] font-medium block mt-0.5">{item.bonus}</span>
                  </div>

                  <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold ${
                    item.active ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}>
                    {item.active ? 'Active' : 'Vaulted'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Accumulated Dao Marks Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-[0.2em] text-[#c89b3c] font-bold">
                Accumulated Dao Marks (道痕积累)
              </h3>
              <span className="text-[10px] text-[#8a8275] font-sans">Permanent Attunement</span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-sans text-xs">
              {Object.entries(daoMarks).map(([path, count]) => {
                const isTime = path.includes('Time');
                return (
                  <div 
                    key={path} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isTime 
                        ? 'bg-gradient-to-r from-amber-950/60 to-red-950/60 border-amber-500/60 shadow-[0_0_15px_rgba(200,155,60,0.2)]' 
                        : 'bg-[#171410] border-[#2a2620]'
                    }`}
                  >
                    <span className={`text-[11px] font-medium ${isTime ? 'text-amber-300 font-bold' : 'text-[#8a8275]'}`}>
                      {path}
                    </span>
                    <span className={`font-mono font-bold ${isTime ? 'text-amber-400 text-sm' : 'text-[#d5cfc4]'}`}>
                      +{count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 2: CULTIVATION CORE & PRIMEVAL APERTURE (元海与仙窍) */}
        {/* ========================================================================= */}
        <section className="glass-card bg-[#12100d]/90 border border-[#2a2620] rounded-2xl p-5 shadow-2xl flex flex-col gap-5">
          
          <div className="border-b border-[#2a2620] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎴</span>
              <h2 className="text-lg font-bold text-[#d5cfc4] tracking-widest uppercase">
                Cultivation Core
              </h2>
            </div>
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#8a8275]">
              空窍灵海
            </span>
          </div>

          {/* Core Realm & Stage */}
          <div className="bg-gradient-to-br from-[#1c1611] to-[#12100d] border border-[#c89b3c]/40 p-4 rounded-2xl text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-[#c89b3c]/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <span className="text-[10px] font-sans uppercase tracking-[0.25em] text-[#c89b3c] font-bold block mb-1">
              Current Cultivation Realm
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-[#d5cfc4] tracking-widest uppercase">
              Rank {cultivator.rank} Cultivator
            </h3>
            <span className="text-xs text-amber-300 font-sans tracking-widest uppercase font-semibold">
              {cultivator.stage}
            </span>

            <div className="w-24 h-0.5 bg-[#c89b3c]/40 mx-auto my-3"></div>

            {/* Essence Sea Status */}
            <div className="space-y-1.5 font-sans text-xs">
              <div className="flex justify-between text-[#8a8275]">
                <span>Primeval Sea Volume</span>
                <span className="text-[#c89b3c] font-bold">{cultivator.primeval_essence} / {cultivator.max_essence}%</span>
              </div>
              <div className="w-full h-3 bg-[#1a1814] rounded-full border border-[#2a2620] overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8B6914] to-[#c89b3c] transition-all duration-500"
                  style={{ width: `${Math.min(100, (cultivator.primeval_essence / cultivator.max_essence) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-[#8a8275] block italic text-center mt-1">
                {cultivator.essence_type}
              </span>
            </div>
          </div>

          {/* Aperture Wall & Essence Recovery */}
          <div className="space-y-3 font-sans text-xs">
            <div className="bg-[#171410] border border-[#2a2620] p-3.5 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#8a8275] uppercase tracking-wider">Crystal Wall Durability</span>
                <span className={`font-bold ${cultivator.aperture_status === 'Fractured' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {cultivator.aperture_status === 'Fractured' ? '💀 Fractured (75%)' : '✨ Pristine (100%)'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-[#2a2620] pt-2">
                <span className="text-[#8a8275] uppercase tracking-wider">Wall Material</span>
                <span className="text-[#d5cfc4] font-medium">{cultivationCore.crystal_wall_type}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#2a2620] pt-2">
                <span className="text-[#8a8275] uppercase tracking-wider">Natural Recovery</span>
                <span className="text-[#c89b3c] font-medium">{cultivationCore.recovery_rate}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#2a2620] pt-2">
                <span className="text-[#8a8275] uppercase tracking-wider">Spatial Scale</span>
                <span className="text-[#d5cfc4] font-medium">{cultivationCore.aperture_dimensions}</span>
              </div>
            </div>
          </div>

          {/* Innate Aptitude Lore */}
          <div className="bg-[#171410] border border-[#2a2620] p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#c89b3c] font-bold">
                Innate Aptitude (天赋根骨)
              </h4>
              <span className="text-[10px] bg-[#c89b3c]/20 border border-[#c89b3c]/60 text-[#c89b3c] px-2 py-0.5 rounded font-mono font-bold">
                {cultivator.aperture_grade}
              </span>
            </div>
            <p className="text-xs text-[#8a8275] leading-relaxed font-sans">
              {cultivationCore.talent_desc}
            </p>
            <div className="p-2.5 rounded-lg bg-[#0a0907] border border-[#2a2620] text-[11px] text-[#8a8275] font-sans leading-relaxed">
              💡 <span className="text-[#d5cfc4] font-bold">Reverend Insanity Lore:</span> Mortals cannot ascend past their innate talent barrier without rare heaven-defying Gu worms (e.g. Man Triumphing Heaven Gu or Liquor Worm purification).
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 3: THE KARMIC LEDGER & SOCIAL STANDINGS (因果谱与宗族势力) */}
        {/* ========================================================================= */}
        <section className="glass-card bg-[#12100d]/90 border border-[#2a2620] rounded-2xl p-5 shadow-2xl flex flex-col gap-5">
          
          <div className="border-b border-[#2a2620] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <h2 className="text-lg font-bold text-[#d5cfc4] tracking-widest uppercase">
                The Karmic Ledger
              </h2>
            </div>
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#8a8275]">
              因果宗门
            </span>
          </div>

          {/* Alignment Gauge: Demonic vs Righteous */}
          <div className="bg-[#171410] border border-[#2a2620] p-4 rounded-xl flex flex-col gap-2.5 font-sans">
            {/* Top row: Path title / classification */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8a8275] uppercase tracking-widest font-semibold">Moral Disposition</span>
              <span className="text-xs font-bold text-amber-300 bg-[#241a12] border border-[#c89b3c]/40 px-2 py-0.5 rounded">
                {karmicLedger.alignment}
              </span>
            </div>

            {/* Slider Row */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold tracking-wider">
                <span className="text-red-400 uppercase">☠️ Demonic (魔道)</span>
                <span className="text-sky-400 uppercase">⚖️ Righteous (正道)</span>
              </div>

              {/* Slider Track */}
              <div className="relative w-full h-3 bg-[#0a0907] rounded-full border border-[#2a2620] overflow-hidden my-1">
                <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-amber-600 to-sky-700 opacity-60"></div>
                {/* Pointer Marker */}
                <div 
                  className="absolute top-0 bottom-0 w-3 bg-white border border-black shadow-[0_0_10px_rgba(255,255,255,1)] -translate-x-1/2 transition-all duration-500 rounded-full"
                  style={{ left: `${alignmentPercent}%` }}
                />
              </div>
            </div>
            
            <span className="text-[10px] text-[#8a8275] block text-center pt-0.5 border-t border-[#2a2620]/60">
              Karma Index: <strong className={karmicLedger.alignment_score < 0 ? 'text-red-400' : 'text-sky-400'}>{karmicLedger.alignment_score}</strong> ({karmicLedger.alignment_score < 0 ? 'Ruthless & Unshackled' : 'Bound by Clan Honor'})
            </span>
          </div>

          {/* Known Aliases & Monikers */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#c89b3c] font-bold mb-2">
              Known Aliases & Reputation (名号与化名)
            </h3>
            <div className="flex flex-wrap gap-1.5 font-sans">
              {karmicLedger.known_aliases.map((alias, idx) => (
                <span 
                  key={idx}
                  className="bg-[#171410] border border-[#2a2620] text-[#d5cfc4] px-2.5 py-1 rounded-lg text-xs font-medium"
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>

          {/* Active Bounties & Warrants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-[0.2em] text-red-400 font-bold">
                Active Bounties & Warrants (通缉悬赏)
              </h3>
              <span className="text-[10px] text-red-400/80 font-sans font-bold">
                {karmicLedger.active_bounties.length} Active Warrants
              </span>
            </div>

            <div className="space-y-2 font-sans text-xs">
              {karmicLedger.active_bounties.map(bounty => (
                <div 
                  key={bounty.id} 
                  className="bg-[#171410] border border-red-900/50 p-3 rounded-xl space-y-1 shadow-[0_0_15px_rgba(158,42,43,0.15)]"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-red-300">{bounty.issuer}</span>
                    <span className="bg-red-950 border border-red-700 text-[#c89b3c] px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                      {bounty.reward}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a8275]">{bounty.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Clan & Faction Standings */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#c89b3c] font-bold mb-2">
              Faction Relations (势力关系)
            </h3>

            <div className="space-y-2 font-sans text-xs">
              {karmicLedger.factions.map((fac, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#171410] border border-[#2a2620] p-2.5 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-[#d5cfc4] block">{fac.name}</span>
                    <span className="text-[10px] text-[#8a8275]">{fac.standing}</span>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    fac.reputation < -30 ? 'bg-red-950/80 text-red-300 border border-red-800' :
                    fac.reputation > 0 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                    'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>
                    {fac.reputation > 0 ? `+${fac.reputation}` : fac.reputation}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}