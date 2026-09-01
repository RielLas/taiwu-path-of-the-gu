export type GuType = 'active' | 'passive_body';

export interface PassiveBuff {
  stat: 'strength' | 'defense' | 'max_essence' | string;
  value: number;
  label: string;
}

export interface GuWorm {
  id: string;
  name: string;
  tier: number;
  path: string;
  gu_type: GuType;
  satiety?: number;
  hunger: number;
  food: string;
  effect_desc: string;
  passive_buff: PassiveBuff | null;
  active_power: number;
  essence_cost: number;
}

export interface StatDetail {
  total: number;
  base: number;
  modifiers: string[];
}

export interface KillerMove {
  id: string;
  name: string;
  chinese_name?: string;
  damage: number;
  essence_cost: number;
  description: string;
  required_paths: string[];
  active_gu_names?: string[];
}

export interface BodyTemperingRecord {
  source: string;
  path: string;
  bonus: string;
  active: boolean;
  tier: number;
}

export interface CultivationCore {
  recovery_rate: string;
  crystal_wall_durability: string;
  crystal_wall_type: string;
  talent_desc: string;
  essence_density: string;
  aperture_dimensions: string;
}

export interface BountyRecord {
  id: string;
  issuer: string;
  reward: string;
  reason: string;
  threat_level: string;
}

export interface FactionStanding {
  name: string;
  standing: string;
  reputation: number;
  type: string;
}

export interface KarmicLedger {
  alignment: string;
  alignment_score: number;
  reputation_title: string;
  known_aliases: string[];
  active_bounties: BountyRecord[];
  factions: FactionStanding[];
}

export interface CultivatorStats {
  name: string;
  rank: number;
  stage: string;
  aperture_grade: string;
  aperture_status: 'Pristine' | 'Fractured' | string;
  primeval_essence: number;
  max_essence: number;
  aptitude_percentage?: number;
  nourish_progress?: number;
  essence_multiplier?: number;
  essence_color?: string;
  essence_type: string;
  spirit_stones: number;
  location: [number, number];
  hp?: number;
  max_hp?: number;
  stats: {
    strength: StatDetail;
    defense: StatDetail;
    speed: number;
  };
  dao_marks?: Record<string, number>;
  body_tempering?: BodyTemperingRecord[];
  cultivation_core?: CultivationCore;
  karmic_ledger?: KarmicLedger;
  killer_move?: KillerMove | null;
}

export interface NourishResponse {
  success: boolean;
  stage_promoted?: boolean;
  message: string;
  stage: string;
  nourish_progress: number;
  essence_multiplier: number;
  cultivator: CultivatorStats;
}

export interface GetApertureResponse {
  status: string;
  cultivator: CultivatorStats;
  gu_worms: GuWorm[];
}

export interface FeedGuRequest {
  gu_id: string;
}

export interface FeedGuResponse {
  success: boolean;
  message: string;
  gu: GuWorm;
  cultivator: CultivatorStats;
}

export interface RefineGuRequest {
  gu_a_id: string;
  gu_b_id: string;
  catalyst?: string | null;
}

export interface RefineGuResponse {
  success: boolean;
  message?: string;
  result_gu?: GuWorm;
  cultivator: CultivatorStats;
  damage_taken?: number;
  backlash?: boolean;
}

export interface CaptureGuRequest {
  wild_gu: Partial<GuWorm>;
}

export interface CaptureGuResponse {
  success: boolean;
  message: string;
  gu: GuWorm;
  cultivator: CultivatorStats;
}

export interface AscendResponse {
  success: boolean;
  wall_broken: boolean;
  message: string;
  fractured?: boolean;
  cultivator: CultivatorStats;
}

export interface DeathPenaltyResponse {
  success: boolean;
  lost_stones: number;
  lost_gu?: string | null;
  message: string;
  cultivator: CultivatorStats;
}

export interface VaultDataResponse {
  status: string;
  equipped_gu: GuWorm[];
  vault_gu: GuWorm[];
  vault_capacity: number;
  max_active_slots: number;
  equipped_active_count: number;
  cultivator: CultivatorStats;
}

export interface EquipGuResponse {
  success: boolean;
  message: string;
  gu?: GuWorm;
  equipped_gu: GuWorm[];
  vault_gu: GuWorm[];
  vault_capacity: number;
  max_active_slots: number;
  equipped_active_count: number;
  cultivator: CultivatorStats;
}

export interface UnequipGuResponse {
  success: boolean;
  message: string;
  gu?: GuWorm;
  equipped_gu: GuWorm[];
  vault_gu: GuWorm[];
  vault_capacity: number;
  max_active_slots: number;
  equipped_active_count: number;
  cultivator: CultivatorStats;
}

export interface FeedVaultGuResponse {
  success: boolean;
  message: string;
  gu: GuWorm;
  cost: number;
  equipped_gu: GuWorm[];
  vault_gu: GuWorm[];
  vault_capacity: number;
  max_active_slots: number;
  equipped_active_count: number;
  cultivator: CultivatorStats;
}

export interface FactionTradeItem {
  id: string;
  name: string;
  path: string;
  cost: number;
  desc: string;
  gu: Partial<GuWorm>;
}

export interface FactionEncounter {
  type: 'faction';
  title: string;
  desc: string;
  faction: string;
  faction_type: string;
  standing: string;
  reputation: number;
  is_hostile: boolean;
  trade_inventory: FactionTradeItem[];
  guard_enemy: {
    name: string;
    hp: number;
    atk: number;
    reward_stones: number;
  };
}

