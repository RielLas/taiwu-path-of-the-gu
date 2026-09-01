import { create } from 'zustand';
import type { RighteousEnforcer } from '../types/api';

// --- TS Interfaces ---
export interface OverworldNode {
  id: string;
  name: string;
  chinese_name: string;
  desc: string;
  type: string;
  region_id: number;
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
  faction?: string;
  faction_type?: string;
  harvested?: boolean;
  is_revealed: boolean;
  discovered: boolean;
}

export interface PlayerLocation {
  x: number;
  y: number;
  region_id?: number;
  current_node?: {
    node_id: string;
    node_name: string;
    region_id: string;
    grid_id: number;
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
  
  // Local Micro Grid State (15x15)
  grid: WorldNode[];
  playerLocation: PlayerLocation;
  enforcer: RighteousEnforcer | null;
  
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchOverworld: () => Promise<void>;
  enterOverworldNode: (regionId: string, nodeId: string) => Promise<void>;
  exitToOverworld: () => Promise<void>;
  loadInitialNodeData: (data: any) => void;
  fetchLocalGrid: (regionId?: number) => Promise<void>;
  travel: (targetX: number, targetY: number) => Promise<{ encounter: Encounter | null; logs: string[] }>;
}

const API_BASE_WORLD = 'http://127.0.0.1:8001/api/v1/world';
const API_BASE_OVERWORLD = 'http://127.0.0.1:8001/api/v1/overworld';

export const useWorldStore = create<WorldState>((set) => ({
  regions: [],
  overworldNodes: [],
  grid: [],
  playerLocation: { x: 7, y: 7 },
  enforcer: null,
  isLoading: false,
  error: null,

  loadInitialNodeData: (data: any) => {
    if (!data) return;
    const tiles = data.grid || data.tiles || [];
    const playerPos = data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 7, y: 7 };
    set({
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
        console.log('API Response:', data);
        set({
          regions: data.regions || [],
          grid: data.grid || data.tiles || [],
          playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 7, y: 7 },
          isLoading: false
        });
        return;
      }
      
      // Fallback if root /overworld 404s
      const fallbackRes = await fetch(`${API_BASE_OVERWORLD}/regions`);
      if (!fallbackRes.ok) throw new Error('Failed to fetch regions');
      const data = await fallbackRes.json();
      console.log('API Response:', data);
      set({ 
        regions: data.regions || [],
        grid: data.grid || data.tiles || [],
        playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 7, y: 7 },
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
      console.log('API Response (enter node):', data);
      set({ 
        grid: data.grid || data.tiles || [],
        playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 7, y: 7 },
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

  fetchLocalGrid: async (regionId: number = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_WORLD}/region/${regionId}`);
      if (!res.ok) throw new Error('Failed to fetch local grid');
      const data = await res.json();
      console.log('API Response:', data);
      set({ 
        grid: data.grid || data.tiles || [],
        playerLocation: data.player_pos ? { x: data.player_pos[0], y: data.player_pos[1] } : { x: 7, y: 7 },
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
        enforcer: data.enforcer || null,
        isLoading: false
      });

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
  }
}));
