import { useEffect, useState } from 'react';
import { useWorldStore } from '../../hooks/useWorldStore';
import type { OverworldNode } from '../../hooks/useWorldStore';

interface OverworldMapProps {
  onSelectNode: (node: OverworldNode) => void;
}

export default function OverworldMap({ onSelectNode }: OverworldMapProps) {
  const { regions, fetchOverworld, enterOverworldNode, isLoading } = useWorldStore();
  const [activeNode, setActiveNode] = useState<any>(null);

  useEffect(() => {
    fetchOverworld();
  }, [fetchOverworld]);

  const handleEnterNode = async (regionId: string, node: any) => {
    try {
      await enterOverworldNode(regionId, node.id);
      onSelectNode(node);
      setActiveNode(null);
    } catch (err) {
      console.error("Failed to enter node:", err);
    }
  };

  if (isLoading && regions.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#12100d] text-[#d5cfc4] font-serif animate-pulse">
        Unfurling ancient ink landscape scroll of the 5 Great Regions...
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0907] select-none font-serif flex flex-col items-center justify-center">
      
      {/* Header Banner */}
      <div className="absolute top-4 z-20 text-center pointer-events-none">
        <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] text-[#c89b3c] drop-shadow-[0_0_20px_rgba(200,155,60,0.8)] uppercase">
          Five Great Regions of the Gu World
        </h1>
        <p className="text-xs text-[#8a8275] font-sans tracking-widest mt-1">
          Southern Border • Northern Plains • Central Continent • Eastern Sea • Western Desert
        </p>
      </div>

      {/* Main Map Container with Ink Scroll Artwork */}
      <div className="relative w-[96vw] max-w-7xl aspect-[16/9] rounded-2xl overflow-hidden border-2 border-[#2a2620] shadow-[0_0_60px_rgba(0,0,0,0.95)]">
        
        {/* Generated 16:9 Chinese Ink Wash Artwork */}
        <img 
          src="/gu_world_map.jpg" 
          alt="5 Regions Gu World Map" 
          className="w-full h-full object-cover filter contrast-[1.05] brightness-95 opacity-80 mix-blend-luminosity"
        />

        {/* Parchment overlay texture */}
        <div className="absolute inset-0 bg-[#12100d]/40 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(10,9,7,0.8)_100%)] pointer-events-none"></div>

        {/* Region Label Overlay Tags */}
        <div className="absolute left-6 bottom-16 text-[#3b4d3c] font-serif font-bold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-widest pointer-events-none">
          南疆 SOUTHERN BORDER
        </div>
        <div className="absolute left-10 top-12 text-[#4A7FA5] font-serif font-bold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-widest pointer-events-none">
          北原 NORTHERN PLAINS
        </div>
        <div className="absolute left-[45%] top-16 text-[#8B6914] font-serif font-bold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-widest pointer-events-none">
          中洲 CENTRAL CONTINENT
        </div>
        <div className="absolute right-12 top-20 text-[#1A4A6E] font-serif font-bold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-widest pointer-events-none">
          东海 EASTERN SEA
        </div>
        <div className="absolute right-16 bottom-12 text-[#8B6914] font-serif font-bold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-widest pointer-events-none">
          西漠 WESTERN DESERT
        </div>

        {/* Interactive Location Nodes mapped from the dynamic Region backend */}
        {regions.map(region => {
          // Since the API sends regions with `nodes`? No, wait. 
          // `regions` from GET /api/v1/overworld/regions returns region_summary without nodes array directly.
          // Wait, the API `get_all_regions()` returns region objects, but `nodes` is removed in favor of `node_count`. 
          // If the backend returns nodes inside `regions`, we map them. 
          // But looking at overworld.py, it doesn't. 
          // If they don't, we can just use the region's position itself to act as the "node" for now,
          // or we fetch nodes for each region. 
          // For aesthetic simplicity in this UI, I will render the REGION centers.
          
          const isSelected = activeNode?.id === region.id;
          
          return (
            <div
              key={region.id}
              style={{ left: `${region.position.x}%`, top: `${region.position.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group cursor-pointer"
              onClick={() => setActiveNode(region)}
            >
              {/* Region Pulse Effect */}
              <div className={`w-8 h-8 rounded-full border-2 border-[#c89b3c] bg-[#1a1814] text-[#c89b3c] shadow-[0_0_15px_rgba(200,155,60,0.5)] flex items-center justify-center transition-all duration-300 group-hover:scale-125 ${isSelected ? 'scale-125 ring-4 ring-[#c89b3c]/60' : ''}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-current animate-ping"></div>
              </div>

              {/* Region Label Tooltip */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#12100d]/90 backdrop-blur-md px-3 py-1 rounded-md border border-[#2a2620] text-xs font-sans text-[#d5cfc4] shadow-xl transition-all duration-200 group-hover:opacity-100 opacity-90">
                <span className="font-bold uppercase tracking-wider">{region.name}</span>
                <span className="block text-[10px] text-[#8a8275]">{region.node_count} Territories</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Region Drawer / Modal */}
      {activeNode && (
        <div className="fixed inset-0 z-50 bg-[#0a0907]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#12100d] border border-[#c89b3c]/40 p-6 rounded-2xl shadow-[0_0_50px_rgba(200,155,60,0.3)] animate-fade-in font-serif">
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#c89b3c] font-bold">
                  {activeNode.chinese_name} • Region
                </span>
                <h2 className="text-2xl font-bold text-[#d5cfc4] mt-0.5">{activeNode.name}</h2>
              </div>
              <button 
                onClick={() => setActiveNode(null)}
                className="text-[#8a8275] hover:text-[#d5cfc4] text-lg font-sans px-2"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#8a8275] font-sans leading-relaxed my-4 bg-[#1a1814] p-3 rounded-lg border border-[#2a2620]">
              {activeNode.desc}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-sans mb-6">
              <div className="bg-[#171410] p-2.5 rounded-lg border border-[#2a2620]">
                <span className="text-[#8a8275] block text-[10px] uppercase">Dominant Biome</span>
                <span className="text-[#c89b3c] font-bold">{activeNode.biome}</span>
              </div>
              <div className="bg-[#171410] p-2.5 rounded-lg border border-[#2a2620]">
                <span className="text-[#8a8275] block text-[10px] uppercase">Explorable Nodes</span>
                <span className="text-[#3b4d3c] font-bold">{activeNode.node_count} Available</span>
              </div>
            </div>

            <div className="flex gap-3 font-sans">
              <button
                onClick={() => handleEnterNode(activeNode.id, activeNode)}
                disabled={isLoading}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#c89b3c] to-[#8B6914] text-[#12100d] font-bold text-xs uppercase tracking-[0.2em] rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(200,155,60,0.4)] transition-all disabled:opacity-50"
              >
                {isLoading ? 'Manifesting...' : 'Descend into Region'}
              </button>
              <button
                onClick={() => setActiveNode(null)}
                className="py-3.5 px-4 bg-[#1a1814] text-[#8a8275] border border-[#2a2620] text-xs font-bold uppercase tracking-wider rounded-xl hover:text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
