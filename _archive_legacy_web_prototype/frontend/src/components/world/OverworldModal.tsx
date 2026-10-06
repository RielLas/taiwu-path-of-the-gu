import { useState, useEffect } from 'react';
import worldMapImg from '../../assets/world_map.jpg';

interface WorldNode {
  id: string;
  name: string;
  chinese_name: string;
  desc: string;
  type: string;
  position: { x: number; y: number };
  unlocked: boolean;
  region_id: number;
  dominant_biome: string;
}

interface WorldRegion {
  id: string;
  name: string;
  chinese_name: string;
  desc: string;
  position: { x: number; y: number };
  biome: string;
  color: string;
  node_count: number;
}

interface OverworldProps {
  onEnterNode: (nodeData: any) => void;
}

const NODE_TYPE_ICONS: Record<string, string> = {
  starter: '⛩️',
  sect: '🏯',
  ruins: '🏛️',
  camp: '⛺',
  resource: '💎',
  island: '🏝️',
  wilderness: '🌿'
};

// Static fallback data - always shown even without API
const STATIC_REGIONS: WorldRegion[] = [
  { id: 'central_continent', name: 'Central Continent', chinese_name: '中土大陆', desc: 'The most powerful land under heaven. Home to the five peak Gu Immortals and the greatest clans.', position: { x: 50, y: 45 }, biome: 'Mountain Fortress', color: '#8B6914', node_count: 3 },
  { id: 'northern_plains', name: 'Northern Plains', chinese_name: '北疆平原', desc: 'Vast frozen steppes howling with bitter winds. The wolf clans and nomadic beast cultivators roam these lands.', position: { x: 50, y: 15 }, biome: 'Frozen Tundra', color: '#4A7FA5', node_count: 2 },
  { id: 'southern_border', name: 'Southern Border', chinese_name: '南疆', desc: 'Humid jungles thick with poison mist and ancient ruins. Demonic cultivators make their home here.', position: { x: 50, y: 78 }, biome: 'Venom Jungle', color: '#2D5A27', node_count: 2 },
  { id: 'eastern_sea', name: 'Eastern Sea', chinese_name: '东海', desc: 'Endless crashing seas with jagged island archipelagos. Sea path Gu Masters walk these coasts.', position: { x: 80, y: 45 }, biome: 'Coastal Cliffs', color: '#1A4A6E', node_count: 2 },
  { id: 'western_desert', name: 'Western Desert', chinese_name: '西域荒漠', desc: 'Scorching endless dunes and eroded stone obelisks. A realm of desolation where only the strong survive.', position: { x: 18, y: 45 }, biome: 'Sand Dunes', color: '#7A5C20', node_count: 2 },
];

export default function OverworldModal({ onEnterNode }: OverworldProps) {
  const [regions, setRegions] = useState<WorldRegion[]>(STATIC_REGIONS);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [nodes, setNodes] = useState<WorldNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<WorldNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    // Try to fetch live regions from backend, fall back to static data
    fetch('http://127.0.0.1:8001/api/v1/world/regions')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.regions?.length) setRegions(data.regions);
      })
      .catch(() => { /* stay with static data */ });
  }, []);

  const fetchNodes = async (regionId: string) => {
    setSelectedRegion(regionId);
    setNodes([]);
    try {
      const res = await fetch(`http://127.0.0.1:8001/api/v1/world/regions/${regionId}/nodes`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
      } else {
        showMsg('Backend offline — start the backend server first.', false);
      }
    } catch {
      showMsg('Cannot connect to backend (port 8001). Please start the server.', false);
    }
  };

  const showMsg = (text: string, ok: boolean) => {
    setStatusMsg({ text, ok });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleEnterNode = async (regionId: string, node: WorldNode) => {
    if (!node.unlocked) {
      showMsg(`"${node.name}" is sealed. Cultivate stronger to unlock this territory.`, false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8001/api/v1/world/regions/${regionId}/nodes/${node.id}/enter`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        onEnterNode(data);
      } else {
        const err = await res.json();
        showMsg(err.detail || 'Failed to enter node.', false);
      }
    } catch {
      showMsg('Cannot reach backend. Is the server running on port 8001?', false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 overflow-hidden font-serif select-none pb-28">

      {/* World Map Background */}
      <div className="relative w-full h-full">
        <img
          src={worldMapImg}
          alt="Reverend Insanity World Map"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.82)' }}
        />

        {/* Dark vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none"></div>

        {/* Title Banner */}
        <div className="absolute top-4 left-0 right-0 text-center z-20 pointer-events-none">
          <h1 className="text-2xl md:text-3xl text-gold font-bold tracking-[0.3em] drop-shadow-[0_0_20px_rgba(212,175,55,1)]">
            天下 • UNDER HEAVEN
          </h1>
          <p className="text-[11px] text-parchment/90 tracking-[0.2em] font-sans mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
            Click a Region • Explore its Nodes
          </p>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`absolute top-16 left-1/2 z-50 pointer-events-none px-4 py-2 rounded-xl text-xs font-sans font-bold shadow-2xl border
            ${statusMsg.ok ? 'bg-jade/90 border-jade text-white' : 'bg-crimson/90 border-red-400 text-white'}
          `} style={{ transform: 'translateX(-50%)' }}>
            {statusMsg.text}
          </div>
        )}

        {/* Region Markers — using inline left/top with margin trick, NOT transform class */}
        {regions.map((region) => {
          const isSelected = selectedRegion === region.id;
          return (
            <div
              key={region.id}
              className="absolute z-20"
              style={{
                left: `${region.position.x}%`,
                top: `${region.position.y}%`,
                marginLeft: '-40px',
                marginTop: '-40px',
              }}
            >
              {/* Outer ping */}
              <div
                className="absolute inset-0 rounded-full opacity-40 animate-ping pointer-events-none"
                style={{ backgroundColor: region.color }}
              ></div>

              <button
                onClick={() => fetchNodes(region.id)}
                className="relative w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 shadow-2xl hover:scale-110"
                style={{
                  backgroundColor: `${region.color}cc`,
                  borderColor: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                  boxShadow: isSelected ? `0 0 25px ${region.color}, 0 0 50px ${region.color}66` : '0 4px 20px rgba(0,0,0,0.8)',
                }}
              >
                <span className="text-parchment text-[9px] font-bold font-sans tracking-wide text-center leading-tight px-1 drop-shadow-md">
                  {region.chinese_name}
                </span>
                <span className="text-[8px] text-parchment/80 font-sans mt-0.5">{region.node_count} Nodes</span>
              </button>

              {/* Region name label below */}
              <div className="absolute top-full mt-1 left-0 right-0 text-center pointer-events-none">
                <span className="text-[10px] font-sans font-bold text-gold drop-shadow-[0_1px_4px_rgba(0,0,0,1)] whitespace-nowrap" style={{ textShadow: '0 0 8px rgba(0,0,0,1)' }}>
                  {region.name}
                </span>
              </div>
            </div>
          );
        })}

        {/* Node Markers for Selected Region */}
        {nodes.map((node) => {
          const isUnlocked = node.unlocked;
          return (
            <div
              key={node.id}
              className="absolute z-30"
              style={{
                left: `${node.position.x}%`,
                top: `${node.position.y}%`,
                marginLeft: '-20px',
                marginTop: '-20px',
              }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Node pulse for unlocked */}
              {isUnlocked && (
                <div className="absolute inset-0 rounded-full bg-jade/50 animate-ping pointer-events-none opacity-70"></div>
              )}

              <button
                onClick={() => handleEnterNode(selectedRegion!, node)}
                className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center text-base shadow-xl transition-all duration-200 ${isUnlocked ? 'hover:scale-125 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  borderColor: isUnlocked ? '#2d8a60' : '#555',
                  boxShadow: isUnlocked ? '0 0 15px rgba(45,138,96,0.7)' : 'none'
                }}
              >
                <span>{NODE_TYPE_ICONS[node.type] || '📍'}</span>
                {!isUnlocked && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">🔒</span>
                )}
              </button>

              {/* Node name label */}
              <div className="absolute top-full mt-1 left-1/2 pointer-events-none whitespace-nowrap" style={{ transform: 'translateX(-50%)' }}>
                <span className={`text-[9px] font-sans font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,1)] ${isUnlocked ? 'text-jade' : 'text-gray-400'}`}>
                  {node.name}
                </span>
              </div>
            </div>
          );
        })}

        {/* Hovered Node Tooltip */}
        {hoveredNode && (
          <div
            className="absolute z-40 w-72 pointer-events-none"
            style={{ bottom: '80px', left: '50%', transform: 'translateX(-50%)' }}
          >
            <div className="bg-black/95 border border-gold/50 p-4 rounded-xl shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-gold font-bold text-sm">{hoveredNode.name}</span>
                  <span className="text-gold/50 text-xs ml-2 font-sans">{hoveredNode.chinese_name}</span>
                </div>
                <span className="text-xl">{NODE_TYPE_ICONS[hoveredNode.type]}</span>
              </div>
              <p className="text-gray-200 text-xs font-sans leading-relaxed">{hoveredNode.desc}</p>
              <div className="mt-3 flex justify-between text-[10px] font-sans">
                <span className="text-jade-light uppercase tracking-wider">{hoveredNode.dominant_biome}</span>
                <span className={hoveredNode.unlocked ? 'text-jade font-bold' : 'text-crimson font-bold'}>
                  {hoveredNode.unlocked ? '✓ Accessible' : '🔒 Sealed'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Region Info Panel */}
        {selectedRegion && nodes.length === 0 && !statusMsg && (
          <div
            className="absolute z-30 w-52 bg-black/80 border border-gold/30 p-3 rounded-xl text-center"
            style={{ top: '16px', right: '16px' }}
          >
            <p className="text-gold text-xs font-sans animate-pulse">Loading Nodes...</p>
          </div>
        )}

        {/* Close Region button */}
        {selectedRegion && (
          <button
            onClick={() => { setSelectedRegion(null); setNodes([]); setHoveredNode(null); }}
            className="absolute z-30 bg-black/80 border border-crimson/50 text-crimson text-[10px] font-sans uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-crimson hover:text-white transition-all font-bold"
            style={{ top: '16px', right: '16px' }}
          >
            ✕ Close Region
          </button>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center">
            <div className="text-jade text-xl font-bold animate-pulse tracking-widest drop-shadow-xl">
              Entering Node...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
