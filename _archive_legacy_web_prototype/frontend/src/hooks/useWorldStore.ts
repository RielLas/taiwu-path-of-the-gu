import { create } from 'zustand';
import type { RighteousEnforcer } from '../types/api';
import { useCultivatorStore } from './useCultivator';

// --- TS Interfaces ---
export interface OverworldNode {
  id: string;
  name: string;
  chinese_name: string;
  desc: string;
  type: string;
  region_id: number | string;
  position: { x: number; y: number };
  dominant_biome: string;
  unlocked: boolean;
}

export interface Region {
  id: string;
  name: string;
  chinese_name: string;
  desc: string;
  position: { x: number; y: number };
  biome: string;
  color: string;
  node_count: number;
}

export interface WorldNode {
  x: number;
  y: number;
  type: string;
  terrain?: string;
  biome?: string;
  is_spirit_spring?: boolean;
  is_faction_node?: boolean;
  is_way_station?: boolean;
  is_caravan?: boolean;
  faction?: string;
  faction_type?: string;
  harvested?: boolean;
  is_revealed: boolean;
  discovered: boolean;
}

export interface PlayerLocation {
  x: number;
  y: number;
  region_id?: number | string;
  current_node?: {
    node_id: string;
    node_name: string;
    region_id: string;
    grid_id: number | string;
  } | null;
}

export interface Encounter {
  type: string;
  title: string;
  desc: string;
  is_interception?: boolean;
  action?: string;
  wild_gu?: any;
  enemy_name?: string;
  enemy_hp?: number;
  enemy_atk?: number;
  reward_stones?: number;
  amount?: number;
  faction?: string;
  faction_type?: string;
  standing?: string;
  reputation?: number;
  is_hostile?: boolean;
  trade_inventory?: any[];
  guard_enemy?: {
    name: string;
    hp: number;
    atk: number;
    reward_stones: number;
  };
  enemy?: any;
}

interface WorldState {
  // Overworld Macro State
  regions: Region[];
  overworldNodes: OverworldNode[];
  currentRegionId: string;
  currentRegionName: string;
  
  // Local Micro Grid State (30x30)
  grid: WorldNode[];
  playerLocation: PlayerLocation;
  enforcer: RighteousEnforcer | null;
  isWayStationModalOpen: boolean;
  
  isLoading: boolean;
  error: string | null;

  // Actions
  setWayStationModalOpen: (open: boolean) => void;
  fetchOverworld: () => Promise<void>;
  enterOverworldNode: (regionId: string, nodeId: string) => Promise<void>;
  exitToOverworld: () => Promise<void>;
  loadInitialNodeData: (data: any) => void;
  fetchLocalGrid: (regionId?: number | string) => Promise<void>;
  travel: (targetX: number, targetY: number) => Promise<{ encounter: Encounter | null; logs: string[] }>;
  travelRegionalCaravan: (targetRegionId: string) => Promise<any>;
}

const API_BASE_WORLD = 'http://127.0.0.1:8001/api/v1/world';
const API_BASE_OVERWORLD = 'http://127.0.0.1:8001/api/v1/overworld';

export const useWorldStore = create<WorldState>((set) => ({
  regions: [],
  overworldNodes: [],
  currentRegionId: 'southern_border_gu_yue',
  currentRegionName: 'Southern Border: Gu Yue Sector',
  grid: [],
  playerLocation: { x: 15, y: 15 },
  enforcer: null,
  isWayStationModalOpen: false,
  isLoading: false,
  error: null,

  setWayStationModalOpen: (open: boolean) => set({ isWayStationModalOpen: open }),

  loadInitialNodeData: (data: any) => {
    if (!data) return;
    const tiles = data.grid || data.tiles || [];
    const playerPos = data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 15, y: 15 };
    set({
      currentRegionId: data.current_region_id || 'southern_border_gu_yue',
      currentRegionName: data.region_name || 'Southern Border: Gu Yue Sector',
      grid: tiles,
      playerLocation: playerPos,
      enforcer: data.enforcer || null,
      isLoading: false
    });
  },

  fetchOverworld: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_OVERWORLD}`);
      if (res.ok) {
        const data = await res.json();
        set({
          regions: data.regions || [],
          grid: data.grid || data.tiles || [],
          playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 15, y: 15 },
          currentRegionId: data.current_region_id || 'southern_border_gu_yue',
          currentRegionName: data.region_name || 'Southern Border: Gu Yue Sector',
          isLoading: false
        });
        return;
      }
      
      // Fallback if root /overworld 404s
      const fallbackRes = await fetch(`${API_BASE_OVERWORLD}/regions`);
      if (!fallbackRes.ok) throw new Error('Failed to fetch regions');
      const data = await fallbackRes.json();
      set({ 
        regions: data.regions || [],
        grid: data.grid || data.tiles || [],
        playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 15, y: 15 },
        currentRegionId: data.current_region_id || 'southern_border_gu_yue',
        currentRegionName: data.region_name || 'Southern Border: Gu Yue Sector',
        isLoading: false 
      });
    } catch (err: any) {
      console.error('fetchOverworld error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  enterOverworldNode: async (regionId: string, nodeId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_OVERWORLD}/regions/${regionId}/nodes/${nodeId}/enter`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to enter node');
      const data = await res.json();
      set({ 
        grid: data.grid || data.tiles || [],
        playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 15, y: 15 },
        currentRegionId: data.current_region_id || regionId,
        currentRegionName: data.region_name || 'Gu Yue Sector',
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  exitToOverworld: async () => {
    set({ isLoading: true, error: null });
    try {
      await fetch(`${API_BASE_OVERWORLD}/exit`, { method: 'POST' });
      set({ grid: [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchLocalGrid: async (regionId: number | string = 'southern_border_gu_yue') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_WORLD}/region/${regionId}`);
      if (!res.ok) throw new Error('Failed to fetch local grid');
      const data = await res.json();
      set({ 
        grid: data.grid || data.tiles || [],
        playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 15, y: 15 },
        currentRegionId: data.current_region_id || (typeof regionId === 'string' ? regionId : 'southern_border_gu_yue'),
        currentRegionName: data.region_name || 'Southern Border: Gu Yue Sector',
        enforcer: data.enforcer || null,
        isLoading: false 
      });
    } catch (err: any) {
      console.error('fetchLocalGrid error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  travel: async (targetX: number, targetY: number) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_WORLD}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_x: targetX, to_y: targetY })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Movement failed');
      }

      const data = await res.json();
      
      // Update state with new grid, position, and enforcer
      set({
        grid: data.tiles || data.grid,
        playerLocation: { x: data.player_pos[0], y: data.player_pos[1] },
        currentRegionId: data.current_region_id || undefined,
        currentRegionName: data.region_name || undefined,
        enforcer: data.enforcer || null,
        isLoading: false
      });

      // Update cultivator state if returned
      if (data.cultivator) {
        useCultivatorStore.setState({ cultivator: data.cultivator });
      }

      const encounter = data.event || null;
      const logs = [];
      logs.push(`Traveled to sector [${targetX}, ${targetY}]...`);
      if (data.enforcer && data.enforcer.active && data.enforcer.status !== 'defeated') {
        logs.push(`⚠️ Righteous Enforcer pursuing at [${data.enforcer.pos[0]}, ${data.enforcer.pos[1]}] (⚡ ${data.enforcer.stamina}/100)!`);
      }
      if (encounter) {
        logs.push(`> Encountered: ${encounter.title}`);
      }

      return { encounter, logs };
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  travelRegionalCaravan: async (targetRegionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_WORLD}/travel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_region_id: targetRegionId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Regional Caravan transit failed');
      }

      const data = await res.json();
      const newGrid = data.grid || data.tiles || [];
      const newPos = data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 15, y: 15 };

      set({
        currentRegionId: data.current_region_id || targetRegionId,
        currentRegionName: data.region_name || 'Regional Sector',
        grid: newGrid,
        playerLocation: newPos,
        enforcer: data.enforcer || null,
        isWayStationModalOpen: false,
        isLoading: false
      });

      // Refresh or set cultivator store
      if (data.cultivator) {
        useCultivatorStore.setState({ cultivator: data.cultivator });
      } else {
        await useCultivatorStore.getState().fetchAperture();
      }

      return data;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
