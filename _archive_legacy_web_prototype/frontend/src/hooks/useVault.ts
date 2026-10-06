import { create } from 'zustand';
import type { GuWorm, VaultDataResponse, EquipGuResponse, UnequipGuResponse } from '../types/api';
import { useCultivatorStore } from './useCultivator';

const API_BASE = 'http://127.0.0.1:8001/api/v1/vault';

interface VaultState {
  equippedGu: GuWorm[];
  vaultGu: GuWorm[];
  vault: any[];
  vaultCapacity: number;
  maxActiveSlots: number;
  equippedActiveCount: number;
  isLoading: boolean;
  error: string | null;
  feedbackMessage: { text: string; type: 'success' | 'error' } | null;

  fetchVault: () => Promise<void>;
  equipGu: (guId: string) => Promise<EquipGuResponse>;
  unequipGu: (guId: string) => Promise<UnequipGuResponse>;
  feedGu: (guId: string) => Promise<any>;
  consumeStone: (quantity?: number) => Promise<any>;
  calculateFeedCost: (tier: number) => number;
  clearFeedback: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  equippedGu: [],
  vaultGu: [],
  vault: [],
  vaultCapacity: 5,
  maxActiveSlots: 3,
  equippedActiveCount: 0,
  isLoading: false,
  error: null,
  feedbackMessage: null,

  calculateFeedCost: (tier: number) => {
    const costs: Record<number, number> = { 1: 10, 2: 50, 3: 150, 4: 400, 5: 1000 };
    return costs[tier] || Math.max(10, tier * 25);
  },

  fetchVault: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}`);
      if (!response.ok) throw new Error('Failed to fetch vault storage data');
      const data: VaultDataResponse = await response.json();
      set({
        equippedGu: data.equipped_gu,
        vaultGu: data.vault_gu,
        vault: data.vault || [],
        vaultCapacity: data.vault_capacity,
        maxActiveSlots: data.max_active_slots,
        equippedActiveCount: data.equipped_active_count,
        isLoading: false
      });
      // Synchronize core cultivator store aperture list and stats
      if (data.cultivator) {
        useCultivatorStore.setState({
          cultivator: data.cultivator,
          guWorms: data.equipped_gu
        });
      }
    } catch (err: any) {
      set({ error: err.message || 'Error fetching vault data', isLoading: false });
    }
  },

  equipGu: async (guId: string) => {
    set({ isLoading: true, error: null, feedbackMessage: null });
    try {
      const response = await fetch(`${API_BASE}/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gu_id: guId })
      });

      const data: EquipGuResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (data as any).detail || 'Failed to equip Gu');
      }

      set({
        equippedGu: data.equipped_gu,
        vaultGu: data.vault_gu,
        vaultCapacity: data.vault_capacity,
        maxActiveSlots: data.max_active_slots,
        equippedActiveCount: data.equipped_active_count,
        feedbackMessage: { text: data.message, type: 'success' },
        isLoading: false
      });

      // Synchronize core cultivator store
      if (data.cultivator) {
        useCultivatorStore.setState({
          cultivator: data.cultivator,
          guWorms: data.equipped_gu
        });
      }

      return data;
    } catch (err: any) {
      const msg = err.message || 'Error equipping Gu';
      set({ error: msg, feedbackMessage: { text: msg, type: 'error' }, isLoading: false });
      throw err;
    }
  },

  unequipGu: async (guId: string) => {
    set({ isLoading: true, error: null, feedbackMessage: null });
    try {
      const response = await fetch(`${API_BASE}/unequip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gu_id: guId })
      });

      const data: UnequipGuResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (data as any).detail || 'Failed to unequip Gu');
      }

      set({
        equippedGu: data.equipped_gu,
        vaultGu: data.vault_gu,
        vaultCapacity: data.vault_capacity,
        maxActiveSlots: data.max_active_slots,
        equippedActiveCount: data.equipped_active_count,
        feedbackMessage: { text: data.message, type: 'success' },
        isLoading: false
      });

      // Synchronize core cultivator store
      if (data.cultivator) {
        useCultivatorStore.setState({
          cultivator: data.cultivator,
          guWorms: data.equipped_gu
        });
      }

      return data;
    } catch (err: any) {
      const msg = err.message || 'Error unequipping Gu';
      set({ error: msg, feedbackMessage: { text: msg, type: 'error' }, isLoading: false });
      throw err;
    }
  },

  feedGu: async (guId: string) => {
    set({ isLoading: true, error: null, feedbackMessage: null });
    try {
      const response = await fetch(`${API_BASE}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gu_id: guId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (data as any).detail || 'Failed to feed Gu');
      }

      set({
        equippedGu: data.equipped_gu,
        vaultGu: data.vault_gu,
        vaultCapacity: data.vault_capacity,
        maxActiveSlots: data.max_active_slots,
        equippedActiveCount: data.equipped_active_count,
        feedbackMessage: { text: data.message, type: 'success' },
        isLoading: false
      });

      // Synchronize core cultivator store
      if (data.cultivator) {
        useCultivatorStore.setState({
          cultivator: data.cultivator,
          guWorms: data.equipped_gu
        });
      }

      return data;
    } catch (err: any) {
      const msg = err.message || 'Error feeding Gu';
      set({ error: msg, feedbackMessage: { text: msg, type: 'error' }, isLoading: false });
      throw err;
    }
  },

  consumeStone: async (quantity: number = 1) => {
    set({ isLoading: true, error: null, feedbackMessage: null });
    try {
      const response = await fetch('http://127.0.0.1:8001/api/v1/cultivator/consume-stone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (data as any).detail || 'Failed to consume Primeval Stones');
      }

      set({
        feedbackMessage: { text: data.message, type: 'success' },
        isLoading: false
      });

      if (data.cultivator) {
        useCultivatorStore.setState({
          cultivator: data.cultivator
        });
      }

      // Re-fetch vault
      const vRes = await fetch(`${API_BASE}`);
      if (vRes.ok) {
        const vData = await vRes.json();
        set({
          equippedGu: vData.equipped_gu,
          vaultGu: vData.vault_gu,
          vault: vData.vault || []
        });
      }

      return data;
    } catch (err: any) {
      const msg = err.message || 'Error consuming stones';
      set({ error: msg, feedbackMessage: { text: msg, type: 'error' }, isLoading: false });
      throw err;
    }
  },

  clearFeedback: () => set({ feedbackMessage: null })
}));
