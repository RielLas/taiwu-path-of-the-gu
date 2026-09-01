import { create } from 'zustand';
import type {
  CultivatorStats,
  GuWorm,
  GetApertureResponse,
  FeedGuRequest,
  FeedGuResponse,
  RefineGuRequest,
  RefineGuResponse,
  CaptureGuRequest,
  CaptureGuResponse,
  AscendResponse,
  DeathPenaltyResponse
} from '../types/api';

const API_BASE = 'http://127.0.0.1:8001/api/v1/gu';

interface CultivatorState {
  cultivator: CultivatorStats | null;
  guWorms: GuWorm[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAperture: () => Promise<void>;
  feedGu: (guId: string) => Promise<FeedGuResponse>;
  refineGu: (guAId: string, guBId: string, catalyst?: string) => Promise<RefineGuResponse>;
  captureWildGu: (wildGu: Partial<GuWorm>) => Promise<CaptureGuResponse>;
  ascend: () => Promise<AscendResponse>;
  nourishAperture: (drainPercentage?: number) => Promise<any>;
  deathPenalty: () => Promise<DeathPenaltyResponse>;
}

export const useCultivatorStore = create<CultivatorState>((set, get) => ({
  cultivator: null,
  guWorms: [],
  isLoading: false,
  error: null,

  fetchAperture: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/aperture`);
      if (!response.ok) throw new Error('Failed to fetch aperture data');
      
      const data: GetApertureResponse = await response.json();
      set({
        cultivator: data.cultivator,
        guWorms: data.gu_worms,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', isLoading: false });
    }
  },

  feedGu: async (guId: string) => {
    set({ isLoading: true, error: null });
    try {
      const payload: FeedGuRequest = { gu_id: guId };
      const response = await fetch(`${API_BASE}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to feed Gu');
      }

      const data: FeedGuResponse = await response.json();
      
      // Update local state: Replace the specific Gu and update Cultivator stats
      set((state) => ({
        guWorms: state.guWorms.map((g) => (g.id === guId ? data.gu : g)),
        cultivator: data.cultivator,
        isLoading: false,
      }));

      return data;
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', isLoading: false });
      throw err;
    }
  },

  refineGu: async (guAId: string, guBId: string, catalyst?: string) => {
    set({ isLoading: true, error: null });
    try {
      const payload: RefineGuRequest = { gu_a_id: guAId, gu_b_id: guBId, catalyst };
      const response = await fetch(`${API_BASE}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: RefineGuResponse = await response.json();
      
      if (!response.ok) {
        throw new Error((data as any).detail || 'Failed to refine Gu');
      }

      // Re-fetch the entire aperture to ensure strict sync since Refinement removes 2 Gu and adds 1
      await get().fetchAperture();
      return data;
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', isLoading: false });
      throw err;
    }
  },

  captureWildGu: async (wildGu: Partial<GuWorm>) => {
    set({ isLoading: true, error: null });
    try {
      const payload: CaptureGuRequest = { wild_gu: wildGu };
      const response = await fetch(`${API_BASE}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to capture Gu');
      }

      const data: CaptureGuResponse = await response.json();

      // Update local state by appending the new Gu and updating stats
      set((state) => ({
        guWorms: [...state.guWorms, data.gu],
        cultivator: data.cultivator,
        isLoading: false,
      }));

      return data;
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', isLoading: false });
      throw err;
    }
  },

  ascend: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/ascend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data: AscendResponse = await response.json();
      if (data.cultivator) {
        set({ cultivator: data.cultivator });
      }
      // Re-fetch entire aperture and stats
      await get().fetchAperture();
      set({ isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', isLoading: false });
      throw err;
    }
  },

  nourishAperture: async (drainPercentage: number = 30.0) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/nourish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drain_percentage: drainPercentage }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to nourish aperture');
      }

      const data = await response.json();
      if (data.cultivator) {
        set({ cultivator: data.cultivator });
      }
      await get().fetchAperture();
      set({ isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', isLoading: false });
      throw err;
    }
  },

  deathPenalty: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/death-penalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data: DeathPenaltyResponse = await response.json();
      if (data.cultivator) {
        set({ cultivator: data.cultivator });
      }
      // Re-fetch aperture to remove the plundered Gu
      await get().fetchAperture();
      set({ isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', isLoading: false });
      throw err;
    }
  }
}));
