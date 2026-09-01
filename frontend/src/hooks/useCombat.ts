import { create } from 'zustand';
import { useCultivatorStore } from './useCultivator';
import type { KillerMove } from '../types/api';

export interface Enemy {
  id: string;
  name: string;
  rank: number;
  hp: number;
  maxHp: number;
  atk: number;
  reward_stones: number;
}

export interface CombatLog {
  id: string;
  message: string;
  type: 'player_atk' | 'enemy_atk' | 'system' | 'loot';
}

interface CombatStore {
  isActive: boolean;
  playerHp: number;
  playerMaxHp: number;
  enemy: Enemy | null;
  logs: CombatLog[];
  loot: { stones: number; items?: any[] } | null;
  killerMove: KillerMove | null;
  isProcessing: boolean;

  startCombat: (enemyName: string, enemyHp: number, enemyAtk: number, rewardStones: number) => void;
  executeAction: (actionType: 'strike' | 'gu' | 'killer_move' | 'flee', guId?: string, guName?: string, power?: number, cost?: number) => Promise<void>;
  endCombat: () => void;
}

const API_BASE = 'http://127.0.0.1:8001/api/v1/world';

export const useCombatStore = create<CombatStore>((set, get) => ({
  isActive: false,
  playerHp: 100,
  playerMaxHp: 100,
  enemy: null,
  logs: [],
  loot: null,
  killerMove: null,
  isProcessing: false,

  startCombat: (enemyName, enemyHp, enemyAtk, rewardStones) => {
    const cultivator = useCultivatorStore.getState().cultivator;
    const guWorms = useCultivatorStore.getState().guWorms;
    
    // Calculate HP based on Defense body tempering
    const maxHp = cultivator ? cultivator.stats.defense.total * 10 : 250;
    
    // Check if cultivator has a killer move from backend or compute active synergy
    let killerMove: KillerMove | null = cultivator?.killer_move || null;
    if (!killerMove) {
      const activeGu = guWorms.filter(g => g.gu_type === 'active');
      const paths = activeGu.map(g => g.path.toLowerCase());
      if (paths.some(p => p.includes('water')) && paths.some(p => p.includes('lightning'))) {
        killerMove = {
          id: 'killer_azure_thunder',
          name: 'Thunderous Azure Deluge',
          chinese_name: '雷霆碧浪',
          damage: 220,
          essence_cost: 45,
          description: 'Combines torrential water currents with devastating lightning strikes to electrocute and vaporize the enemy!',
          required_paths: ['Water Path', 'Lightning Path']
        };
      } else if (paths.some(p => p.includes('fire')) && paths.some(p => p.includes('wind'))) {
        killerMove = {
          id: 'killer_wildfire_tempest',
          name: 'Wildfire Tempest',
          chinese_name: '燎原风暴',
          damage: 240,
          essence_cost: 50,
          description: 'Howling winds fuel surging flames into a celestial vortex of total incineration!',
          required_paths: ['Fire Path', 'Wind Path']
        };
      } else if (paths.some(p => p.includes('blood')) && (paths.some(p => p.includes('strength')) || paths.some(p => p.includes('moon')))) {
        killerMove = {
          id: 'killer_blood_moon_cleave',
          name: 'Blood-Boiling Crimson Crescent',
          chinese_name: '沸血残月斩',
          damage: 250,
          essence_cost: 40,
          description: 'Ignites mortal lifeblood to empower the Moonlight blade into a terrifying 250 DMG crescent of pure carnage!',
          required_paths: ['Blood Path', 'Moon Path / Strength Path']
        };
      } else if (paths.some(p => p.includes('light')) && paths.some(p => p.includes('moon'))) {
        killerMove = {
          id: 'killer_celestial_radiance',
          name: 'Celestial Radiance Flash',
          chinese_name: '日月凌空闪',
          damage: 210,
          essence_cost: 35,
          description: 'Harmonizes solar light particles with lunar curved blades for an unavoidable flash strike!',
          required_paths: ['Light Path', 'Moon Path']
        };
      } else if (activeGu.length >= 3) {
        killerMove = {
          id: 'killer_tri_annihilation',
          name: 'Tri-Aperture Annihilation Surge',
          chinese_name: '三才寂灭狂潮',
          damage: 300,
          essence_cost: 55,
          description: 'Forces all three active combat Gu to resonate simultaneously in supreme tripartite harmony, unleashing an apocalyptic shockwave of Dao marks!',
          required_paths: ['3 Active Gu Resonance']
        };
      } else if (activeGu.length >= 2) {
        killerMove = {
          id: 'killer_dual_resonance',
          name: 'Dual Aperture Resonance Strike',
          chinese_name: '双元共鸣裂',
          damage: 175,
          essence_cost: 30,
          description: 'Channels two active Gu in simultaneous harmonic resonance to deal amplified composite damage!',
          required_paths: ['2 Active Gu Resonance']
        };
      }
    }
    
    set({
      isActive: true,
      playerHp: maxHp,
      playerMaxHp: maxHp,
      killerMove: killerMove,
      enemy: {
        id: `enemy_${Date.now()}`,
        name: enemyName,
        rank: 1,
        hp: enemyHp,
        maxHp: enemyHp,
        atk: enemyAtk,
        reward_stones: rewardStones
      },
      logs: [{ 
        id: Date.now().toString(), 
        message: `⚔️ Engaged in mortal combat with ${enemyName}!`, 
        type: 'system' 
      }],
      loot: null,
      isProcessing: false
    });
  },

  executeAction: async (actionType, guId, guName, power, cost) => {
    const state = get();
    if (!state.enemy || state.isProcessing) return;

    set({ isProcessing: true });
    const logId = Date.now();

    const cultivatorStore = useCultivatorStore.getState();
    const cultivator = cultivatorStore.cultivator;
    const multiplier = cultivator?.essence_multiplier || 1;
    const actualDrain = cost ? Math.max(0.01, Number((cost / multiplier).toFixed(2))) : 0;

    // Optimistically update logs
    let actionLog = '';
    if (actionType === 'flee') actionLog = 'You attempt to flee the battlefield...';
    else if (actionType === 'strike') actionLog = 'You launch a basic martial strike!';
    else if (actionType === 'killer_move') actionLog = `⚡ UNLEASHED SUPREME KILLER MOVE [${guName}], consuming ${actualDrain}% essence (${cost} BEU)!`;
    else actionLog = `You activate ${guName}, consuming ${actualDrain}% essence (${cost} BEU)!`;

    set(s => ({ logs: [...s.logs, { id: `${logId}_1`, message: actionLog, type: 'player_atk' }] }));

    try {
      // 1. Dispatch action to backend combat endpoint
      const res = await fetch(`${API_BASE}/combat/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          gu_id: guId,
          killer_id: guId,
          enemy_id: state.enemy.id,
          enemy_hp: state.enemy.hp,
          enemy_atk: state.enemy.atk,
          reward_stones: state.enemy.reward_stones,
          player_hp: state.playerHp,
          actual_drain: actualDrain
        })
      });

      let data;
      if (res.ok) {
        data = await res.json();
        if (data.cultivator) {
          useCultivatorStore.setState({ cultivator: data.cultivator });
        }
      } else {
        // --- FALLBACK SIMULATION ---
        await new Promise(resolve => setTimeout(resolve, 800)); // Artificial network delay
        
        let dmgDealt = 0;
        if (actionType === 'strike') {
          dmgDealt = Math.max(1, (cultivator?.stats.strength.total || 10) - (state.enemy.rank * 5));
        } else if (actionType === 'gu' && power) {
          dmgDealt = power;
          if (cultivator) {
             useCultivatorStore.setState({ 
               cultivator: { ...cultivator, primeval_essence: Math.max(0, Number((cultivator.primeval_essence - actualDrain).toFixed(2))) }
             });
          }
        } else if (actionType === 'killer_move' && power) {
          dmgDealt = power;
          if (cultivator) {
             useCultivatorStore.setState({ 
               cultivator: { ...cultivator, primeval_essence: Math.max(0, Number((cultivator.primeval_essence - actualDrain).toFixed(2))) }
             });
          }
        }
        
        const enemyRemHp = Math.max(0, state.enemy.hp - dmgDealt);
        const dmgTaken = enemyRemHp > 0 ? Math.max(1, state.enemy.atk - ((cultivator?.stats.defense.total || 10) / 2)) : 0;
        const playerRemHp = Math.max(0, state.playerHp - dmgTaken);
        
        data = {
          success: true,
          action_type: actionType,
          damage_dealt: dmgDealt,
          damage_taken: dmgTaken,
          enemy_hp: enemyRemHp,
          player_hp: playerRemHp,
          is_victory: enemyRemHp <= 0,
          is_defeat: playerRemHp <= 0,
          fled: actionType === 'flee' ? Math.random() > 0.5 : false,
          logs: [
            actionType !== 'flee' ? `Dealt ${dmgDealt} damage to ${state.enemy.name}.` : '',
            enemyRemHp > 0 && actionType !== 'flee' ? `${state.enemy.name} retaliated for ${dmgTaken} damage!` : ''
          ].filter(Boolean),
          loot: enemyRemHp <= 0 ? { stones: state.enemy.reward_stones } : null
        };
      }

      // 2. Parse Response and Update UI Reactively
      if (data.fled) {
        set(s => ({ 
          logs: [...s.logs, { id: `${logId}_flee`, message: '🏃 You successfully escaped the encounter!', type: 'system' }] 
        }));
        setTimeout(() => get().endCombat(), 1500);
        return;
      } else if (actionType === 'flee') {
        set(s => ({ 
          logs: [...s.logs, { id: `${logId}_flee_fail`, message: '❌ Escape failed! The enemy blocks your path.', type: 'system' }] 
        }));
      }

      if (actionType !== 'flee') {
        // Update HP pools
        set(s => ({
          playerHp: data.player_hp,
          enemy: s.enemy ? { ...s.enemy, hp: data.enemy_hp } : null,
          logs: [
            ...s.logs,
            { id: `${logId}_dmg`, message: `💥 Dealt ${data.damage_dealt} damage!`, type: 'player_atk' },
            ...(data.damage_taken > 0 ? [{ id: `${logId}_taken`, message: `🩸 Took ${data.damage_taken} damage from retaliation.`, type: 'enemy_atk' } as CombatLog] : [])
          ]
        }));
      }

      // Check combat resolution
      if (data.is_victory) {
        set(s => ({
          loot: data.loot,
          logs: [
            ...s.logs,
            { id: `${logId}_vic`, message: `🏆 VICTORY! Slain ${s.enemy?.name}.`, type: 'system' },
            ...(data.loot?.stones ? [{ id: `${logId}_loot`, message: `💎 Pillaged ${data.loot.stones} Primeval Stones.`, type: 'loot' } as CombatLog] : [])
          ]
        }));
        
        // Give actual rewards in global store
        const cultivator = useCultivatorStore.getState().cultivator;
        if (cultivator && data.loot?.stones) {
          useCultivatorStore.setState({
            cultivator: { ...cultivator, spirit_stones: cultivator.spirit_stones + data.loot.stones }
          });
        }
      } else if (data.is_defeat) {
        // Ruthless Mortality Death Penalty
        try {
          const penRes = await useCultivatorStore.getState().deathPenalty();
          set(s => ({
            logs: [
              ...s.logs,
              { id: `${logId}_def`, message: `💀 MORTAL COLLAPSE! Your physical body gave out on the battlefield...`, type: 'system' },
              { id: `${logId}_pen`, message: `🩸 ${penRes.message}`, type: 'enemy_atk' }
            ]
          }));
        } catch (err: any) {
          set(s => ({
            logs: [...s.logs, { id: `${logId}_def`, message: `💀 MORTAL COLLAPSE! Your consciousness fades...`, type: 'system' }]
          }));
        }
      }

    } catch (err: any) {
      set(s => ({ logs: [...s.logs, { id: `${logId}_err`, message: `⚠️ Combat Sync Error: ${err.message}`, type: 'system' }] }));
    } finally {
      set({ isProcessing: false });
    }
  },

  endCombat: () => {
    set({ isActive: false, enemy: null, loot: null });
  }
}));
