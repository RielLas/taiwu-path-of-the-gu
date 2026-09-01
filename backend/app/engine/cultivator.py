"""
Cultivator State & Aperture System (Reverend Insanity Lore Compliant)
Gu live inside the Primeval Aperture.
Only passive body-tempering Gu (e.g., Boar Gu, Bear Gu, Jade Skin Gu) nourish
and permanently/passively alter the cultivator's physical stats.
Active Gu (e.g., Moonlight Gu, Blood Frenzy Gu) are used in actions/battles consuming Primeval Essence.
"""

from typing import List, Dict, Any, Optional

class CultivatorState:
    def __init__(self):
        self.name: str = "Fang Yuan"
        self.rank: int = 1
        self.stage: str = "Peak Stage"
        self.aperture_grade: str = "A Grade (93% Primeval Sea)"
        self.aperture_status: str = "Pristine"  # "Pristine" or "Fractured"
        self.primeval_essence: int = 93
        self.max_essence: int = 93
        self.essence_type: str = "Dark Green Copper Primeval Essence"
        self.spirit_stones: int = 65
        self.player_pos: List[int] = [7, 7]  # [x, y]
        self.current_node: dict = None  # tracks the current explorable node
        
        # Base mortal attributes
        self.base_strength: int = 10
        self.base_defense: int = 5
        self.base_speed: int = 10
        self.current_hp: int = 100
        
        # Starting inventory inside the Primeval Aperture
        self.aperture: List[Dict[str, Any]] = [
            {
                "id": "gu_moonlight",
                "name": "Moonlight Gu",
                "tier": 1,
                "path": "Moon Path",
                "gu_type": "active",
                "satiety": 90,
                "hunger": 90,
                "food": "Moon Orchid Petals",
                "effect_desc": "Expels a curved moonblade from the palm (Deals 35 Moon damage). Costs 10% Essence.",
                "passive_buff": None,
                "active_power": 35,
                "essence_cost": 10
            },
            {
                "id": "gu_white_boar",
                "name": "White Boar Gu",
                "tier": 1,
                "path": "Strength Path",
                "gu_type": "passive_body",
                "satiety": 85,
                "hunger": 85,
                "food": "Boar Meat",
                "effect_desc": "Nourishes the body with the strength of one boar (+15 Strength). Passive while fed.",
                "passive_buff": {
                    "stat": "strength",
                    "value": 15,
                    "label": "1 Boar Strength"
                },
                "active_power": 0,
                "essence_cost": 0
            },
            {
                "id": "gu_jade_skin",
                "name": "Jade Skin Gu",
                "tier": 1,
                "path": "Transformation Path",
                "gu_type": "passive_body",
                "satiety": 70,
                "hunger": 70,
                "food": "Jade Stone Fragments",
                "effect_desc": "Tempers skin into lustrous jade (+20 Defense). Passive while fed.",
                "passive_buff": {
                    "stat": "defense",
                    "value": 20,
                    "label": "Jade Skin Armor"
                },
                "active_power": 0,
                "essence_cost": 0
            },
            {
                "id": "gu_liquor_worm",
                "name": "Liquor Worm",
                "tier": 1,
                "path": "Support Path",
                "gu_type": "passive_body",
                "satiety": 95,
                "hunger": 95,
                "food": "Fine Wine",
                "effect_desc": "Refines and purifies primeval essence by a minor realm (+10 Max Essence).",
                "passive_buff": {
                    "stat": "max_essence",
                    "value": 10,
                    "label": "Purified Essence Sea"
                },
                "active_power": 0,
                "essence_cost": 0
            },
            {
                "id": "gu_blood_frenzy",
                "name": "Blood Frenzy Gu",
                "tier": 2,
                "path": "Blood Path",
                "gu_type": "active",
                "satiety": 15,  # Starving!
                "hunger": 15,
                "food": "Fresh Warm Blood",
                "effect_desc": "Ignites blood sea to unleash terrifying devastation (Deals 80 Blood damage). Costs 25% Essence.",
                "passive_buff": None,
                "active_power": 80,
                "essence_cost": 25
            }
        ]
        
        # Inactive Gu Vault Storage (Capacity = Rank * 5)
        self.vault: List[Dict[str, Any]] = [
            {
                "id": "gu_little_light",
                "name": "Little Light Gu",
                "tier": 1,
                "path": "Light Path",
                "gu_type": "active",
                "satiety": 60,
                "hunger": 60,
                "food": "White Radiance Petals",
                "effect_desc": "Emits flashes of blinding light to disorient enemies (Deals 25 Light damage). Costs 8% Essence.",
                "passive_buff": None,
                "active_power": 25,
                "essence_cost": 8
            },
            {
                "id": "gu_bear_strength",
                "name": "Black Bear Gu",
                "tier": 1,
                "path": "Strength Path",
                "gu_type": "passive_body",
                "satiety": 80,
                "hunger": 80,
                "food": "Bear Honey",
                "effect_desc": "Infuses mortal sinews with the immense power of a black bear (+20 Strength). Passive while fed.",
                "passive_buff": {
                    "stat": "strength",
                    "value": 20,
                    "label": "1 Bear Strength"
                },
                "active_power": 0,
                "essence_cost": 0
            }
        ]

    def get_stats(self) -> Dict[str, Any]:
        """
        Calculates active total stats.
        Passive Gu only grant stats if their hunger is >= 20% (not starving).
        """
        total_strength = self.base_strength
        total_defense = self.base_defense
        bonus_essence = 0
        strength_modifiers = []
        defense_modifiers = []
        
        for gu in self.aperture:
            # Check if passive body Gu and fed
            if gu.get("gu_type") == "passive_body" and gu.get("hunger", 0) >= 20:
                buff = gu.get("passive_buff")
                if buff:
                    stat = buff.get("stat")
                    val = buff.get("value", 0)
                    label = buff.get("label", gu["name"])
                    
                    if stat == "strength":
                        total_strength += val
                        strength_modifiers.append(label)
                    elif stat == "defense":
                        total_defense += val
                        defense_modifiers.append(label)
                    elif stat == "max_essence":
                        bonus_essence += val

        max_essence = self.max_essence + bonus_essence
        # Clamp current essence to max
        current_essence = min(self.primeval_essence, max_essence)
        max_hp = total_defense * 10

        # Body Tempering Records (from passive Gu)
        body_tempering = []
        for gu in self.aperture:
            if gu.get("gu_type") == "passive_body":
                buff = gu.get("passive_buff")
                body_tempering.append({
                    "source": gu["name"],
                    "path": gu.get("path", "Strength Path"),
                    "bonus": buff.get("label", gu["name"]) if buff else "Physical Reinforcement",
                    "active": gu.get("hunger", 0) >= 20,
                    "tier": gu.get("tier", 1)
                })
        for gu in self.vault:
            if gu.get("gu_type") == "passive_body":
                buff = gu.get("passive_buff")
                body_tempering.append({
                    "source": gu["name"],
                    "path": gu.get("path", "Strength Path"),
                    "bonus": buff.get("label", gu["name"]) if buff else "Physical Reinforcement",
                    "active": False,
                    "tier": gu.get("tier", 1)
                })

        # Accumulated Dao Marks across various paths
        dao_marks = {
            "Strength Path": 35 + (self.rank * 10),
            "Blood Path": 20 + (self.rank * 5),
            "Moon Path": 28 + (self.rank * 8),
            "Transformation Path": 22 + (self.rank * 5),
            "Water Path": 10,
            "Light Path": 12,
            "Poison Path": 18 + (self.rank * 4),
            "Time (Chrono) Path": 999  # Spring Autumn Cicada imprint
        }

        # Cultivation Core Metrics
        cultivation_core = {
            "recovery_rate": f"{2.5 * self.rank:.1f}% Primeval Essence / Minute",
            "crystal_wall_durability": "100% (Solid Crystal Light Barrier)" if self.aperture_status == "Pristine" else "75% (Fractured Fissures Detected)",
            "crystal_wall_type": "Purple Crystal Layer" if self.rank >= 2 else "Green Copper Crystal Wall",
            "talent_desc": "A-Grade Innate Aptitude (90-99%). The Primeval Sea occupies 93% of the Aperture volume. An illustrious genius of the Gu world with immense capacity to batter the crystal aperture walls.",
            "essence_density": "Rank 2 Pale Charcoal Primeval Essence" if self.rank >= 2 else "Rank 1 Dark Green Copper Primeval Essence",
            "aperture_dimensions": f"Spatial Dimension: {self.rank * 100} Li Diameter"
        }

        # Karmic & Social Ledger
        karmic_ledger = {
            "alignment": "Demonic Path (Ruthless & Pragmatic)",
            "alignment_score": -75,  # Range -100 (Demonic) to +100 (Righteous)
            "reputation_title": "Demonic Scourge of Qing Mao Mountain",
            "known_aliases": [
                "Fang Yuan (方源)",
                "Gu Yue Fang Yuan",
                "Spring Autumn Reincarnator",
                "Cold-Blooded Moonblade"
            ],
            "active_bounties": [
                {
                    "id": "bounty_1",
                    "issuer": "Gu Yue Clan Elders",
                    "reward": "500 Primeval Stones",
                    "reason": "Defying Clan Hierarchy & Extortion of Fellow Disciples",
                    "threat_level": "High"
                },
                {
                    "id": "bounty_2",
                    "issuer": "Southern Border Merchant Guild",
                    "reward": "300 Primeval Stones",
                    "reason": "Unlicensed Black Market Gu Trading",
                    "threat_level": "Moderate"
                }
            ],
            "factions": [
                {"name": "Gu Yue Clan", "standing": "Hostile / Marked for Execution", "reputation": -80, "type": "Righteous Clan"},
                {"name": "Bai Clan", "standing": "Wary & Suspicious", "reputation": -30, "type": "Righteous Clan"},
                {"name": "Xiong Clan", "standing": "Hostile Competitor", "reputation": -50, "type": "Righteous Clan"},
                {"name": "Shang Clan Merchant City", "standing": "Pragmatic Trading Partner", "reputation": 25, "type": "Neutral Superclan"},
                {"name": "Shadow Sect Remnants", "standing": "Veiled Observers", "reputation": 0, "type": "Ancient Demonic Mystery"}
            ]
        }

        return {
            "name": self.name,
            "rank": self.rank,
            "stage": self.stage,
            "aperture_grade": self.aperture_grade,
            "aperture_status": self.aperture_status,
            "primeval_essence": current_essence,
            "max_essence": max_essence,
            "essence_type": self.essence_type,
            "spirit_stones": self.spirit_stones,
            "location": self.player_pos,
            "hp": self.current_hp,
            "max_hp": max_hp,
            "stats": {
                "strength": {
                    "total": total_strength,
                    "base": self.base_strength,
                    "modifiers": strength_modifiers
                },
                "defense": {
                    "total": total_defense,
                    "base": self.base_defense,
                    "modifiers": defense_modifiers
                },
                "speed": self.base_speed
            },
            "dao_marks": dao_marks,
            "body_tempering": body_tempering,
            "cultivation_core": cultivation_core,
            "karmic_ledger": karmic_ledger,
            "killer_move": self.get_killer_move_synergy()
        }

    def get_killer_move_synergy(self) -> Optional[Dict[str, Any]]:
        """
        Analyzes the player's equipped 'active' Gu worms in the Primeval Aperture.
        If compatible paths are equipped simultaneously, unlocks a composite Killer Move.
        Deals exponential damage but consumes heavy primeval essence.
        """
        active_gu = [g for g in self.aperture if g.get("gu_type") == "active"]
        if not active_gu:
            return None
            
        paths = [g.get("path", "").lower() for g in active_gu]
        names = [g.get("name", "") for g in active_gu]
        
        # 1. Water Path + Lightning Path
        if any("water" in p for p in paths) and any("lightning" in p for p in paths):
            return {
                "id": "killer_azure_thunder",
                "name": "Thunderous Azure Deluge",
                "chinese_name": "雷霆碧浪",
                "damage": 220,
                "essence_cost": 45,
                "description": "Combines torrential water currents with devastating lightning strikes to electrocute and vaporize the enemy!",
                "required_paths": ["Water Path", "Lightning Path"],
                "active_gu_names": names
            }
            
        # 2. Fire Path + Wind Path
        if any("fire" in p for p in paths) and any("wind" in p for p in paths):
            return {
                "id": "killer_wildfire_tempest",
                "name": "Wildfire Tempest",
                "chinese_name": "燎原风暴",
                "damage": 240,
                "essence_cost": 50,
                "description": "Howling winds fuel surging flames into a celestial vortex of total incineration!",
                "required_paths": ["Fire Path", "Wind Path"],
                "active_gu_names": names
            }
            
        # 3. Blood Path + Strength Path / Moon Path
        if any("blood" in p for p in paths) and (any("strength" in p for p in paths) or any("moon" in p for p in paths)):
            return {
                "id": "killer_blood_moon_cleave",
                "name": "Blood-Boiling Crimson Crescent",
                "chinese_name": "沸血残月斩",
                "damage": 250,
                "essence_cost": 40,
                "description": "Ignites mortal lifeblood to empower the Moonlight blade into a terrifying 250 DMG crescent of pure carnage!",
                "required_paths": ["Blood Path", "Moon Path / Strength Path"],
                "active_gu_names": names
            }
            
        # 4. Poison Path + Fire Path / Blood Path
        if any("poison" in p for p in paths) and (any("fire" in p for p in paths) or any("blood" in p for p in paths)):
            return {
                "id": "killer_toxic_conflagration",
                "name": "Toxic Smog Conflagration",
                "chinese_name": "剧毒爆炎",
                "damage": 230,
                "essence_cost": 45,
                "description": "Detonates corrosive poisonous venom into a violent acidic inferno!",
                "required_paths": ["Poison Path", "Fire/Blood Path"],
                "active_gu_names": names
            }
            
        # 5. Light Path + Moon Path
        if any("light" in p for p in paths) and any("moon" in p for p in paths):
            return {
                "id": "killer_celestial_radiance",
                "name": "Celestial Radiance Flash",
                "chinese_name": "日月凌空闪",
                "damage": 210,
                "essence_cost": 35,
                "description": "Harmonizes solar light particles with lunar curved blades for an unavoidable flash strike!",
                "required_paths": ["Light Path", "Moon Path"],
                "active_gu_names": names
            }
            
        # 6. Tri-Aperture Synergy (Any 3 active Gu equipped simultaneously)
        if len(active_gu) >= 3:
            return {
                "id": "killer_tri_annihilation",
                "name": "Tri-Aperture Annihilation Surge",
                "chinese_name": "三才寂灭狂潮",
                "damage": 300,
                "essence_cost": 55,
                "description": "Forces all three active combat Gu to resonate simultaneously in supreme tripartite harmony, unleashing an apocalyptic shockwave of Dao marks!",
                "required_paths": ["3 Active Gu Resonance"],
                "active_gu_names": names
            }
            
        # 7. Dual Active Gu composite resonance (Any 2 active Gu equipped)
        if len(active_gu) >= 2:
            return {
                "id": "killer_dual_resonance",
                "name": "Dual Aperture Resonance Strike",
                "chinese_name": "双元共鸣裂",
                "damage": 175,
                "essence_cost": 30,
                "description": "Channels two active Gu in simultaneous harmonic resonance to deal amplified composite damage!",
                "required_paths": ["2 Active Gu Resonance"],
                "active_gu_names": names
            }
            
        return None

    def attempt_ascension(self) -> Dict[str, Any]:
        """
        Lore-Accurate Mortal Breakthrough (Rank 1 -> 5):
        Mortals do NOT face Heavenly Tribulations.
        Breakthrough is strictly determined by battering the crystal wall with 90% essence.
        Success probability is strictly bounded by aperture_grade:
          A-Grade: 90%
          B-Grade: 60%
          C-Grade: 30%
          D-Grade: 10%
        If successful: Immediately rank up, reset to 'Initial Stage', and upgrade essence type.
        If failed: 15% chance of Aperture Fracture (permanently reducing max_essence by 5%).
        """
        import random
        
        # Check stage requirement
        if "Peak" not in self.stage:
            return {
                "success": False,
                "wall_broken": False,
                "message": f"Cannot ascend yet! You are currently at {self.stage}. Breakthrough to the next Rank requires reaching Peak Stage.",
                "cultivator": self.get_stats()
            }
            
        required_essence = int(self.max_essence * 0.9)
        if self.primeval_essence < required_essence:
            return {
                "success": False,
                "wall_broken": False,
                "message": f"Insufficient Primeval Essence! Battering the crystal wall requires at least 90% essence ({required_essence}%). Current: {self.primeval_essence}%.",
                "cultivator": self.get_stats()
            }
            
        # Instantly consume 90% essence in the battering attempt
        self.primeval_essence = max(0, self.primeval_essence - required_essence)
        
        # Calculate success chance strictly bounded by aperture grade
        grade = self.aperture_grade.upper()
        if "A" in grade:
            success_rate = 0.90
        elif "B" in grade:
            success_rate = 0.60
        elif "C" in grade:
            success_rate = 0.30
        elif "D" in grade:
            success_rate = 0.10
        else:
            success_rate = 0.40
            
        roll = random.random()
        if roll <= success_rate:
            # SUCCESS: Crystal wall breaks! Immediately rank up and reset stage to Initial Stage
            old_rank = self.rank
            self.rank += 1
            self.stage = "Initial Stage"
            
            # Upgrade essence type by Rank
            ESSENCE_TYPES = {
                1: "Dark Green Copper Primeval Essence",
                2: "Pale Red Iron Primeval Essence",
                3: "Light Silver Primeval Essence",
                4: "Bright Gold Primeval Essence",
                5: "Purple Crystal Primeval Essence",
                6: "Immortal Green Grape Essence"
            }
            self.essence_type = ESSENCE_TYPES.get(self.rank, f"Rank {self.rank} Primeval Essence")
            
            # Expand primeval sea capacity and fully replenish essence
            self.max_essence = int(self.max_essence * 1.25) + 10
            self.primeval_essence = self.max_essence
            
            # Mortal physique tempering from breakthrough
            self.base_strength += 15
            self.base_defense += 10
            self.base_speed += 5
            
            return {
                "success": True,
                "wall_broken": True,
                "message": f"✨ BREAKTHROUGH ACCOMPLISHED! The crystal wall shattered under your ferocious essence battering! You have ascended to Rank {self.rank} ({self.stage}) with {self.essence_type}!",
                "cultivator": self.get_stats()
            }
        else:
            # FAILURE: The wall held strong. Essence dissipated.
            # 15% chance of Aperture Fracture backlash
            fracture_roll = random.random()
            if fracture_roll <= 0.15:
                self.aperture_status = "Fractured"
                lost_cap = max(1, int(self.max_essence * 0.05))
                self.max_essence = max(10, self.max_essence - lost_cap)
                self.primeval_essence = min(self.primeval_essence, self.max_essence)
                return {
                    "success": False,
                    "wall_broken": False,
                    "fractured": True,
                    "message": f"💀 SEVERE BACKLASH! The aperture crystal wall resisted your essence onslaught. A hairline fracture cracked across your aperture wall! Max Essence permanently reduced by 5% (-{lost_cap}%). Status: FRACTURED.",
                    "cultivator": self.get_stats()
                }
            else:
                return {
                    "success": False,
                    "wall_broken": False,
                    "fractured": False,
                    "message": "💥 Breakthrough Failed! The crystal aperture wall resisted your onslaught. Your 90% primeval essence was depleted in vain.",
                    "cultivator": self.get_stats()
                }

    def apply_death_penalty(self) -> Dict[str, Any]:
        """
        Ruthless Gu World Death Penalty:
        - Teleport back to origin node [7, 7]
        - Deduct 50% Primeval Stones
        - Permanently destroy one equipped Gu worm from aperture
        """
        import random
        self.player_pos = [7, 7]
        lost_stones = self.spirit_stones // 2
        self.spirit_stones -= lost_stones
        
        lost_gu_name = None
        if len(self.aperture) > 0:
            destroyed_gu = random.choice(self.aperture)
            lost_gu_name = destroyed_gu["name"]
            self.aperture.remove(destroyed_gu)
            
        # Restore basic HP on revive
        self.current_hp = max(20, self.base_defense * 5)
        
        return {
            "success": True,
            "lost_stones": lost_stones,
            "lost_gu": lost_gu_name,
            "message": f"💀 MORTAL COLLAPSE! You fell in battle. Teleported to origin [7,7]. Plundered {lost_stones} Primeval Stones." + (f" Your Gu '{lost_gu_name}' was destroyed!" if lost_gu_name else ""),
            "cultivator": self.get_stats()
        }

    def get_vault_capacity(self) -> int:
        """
        Vault inactive storage capacity is determined by Rank:
        Rank 1 = 5 slots, Rank 2 = 10 slots, Rank 3 = 15 slots, etc.
        """
        return max(5, self.rank * 5)

    def get_equipped_active_count(self) -> int:
        """
        Returns number of active combat Gu currently equipped in the Aperture.
        """
        return len([g for g in self.aperture if g.get("gu_type") == "active"])

    def equip_gu(self, gu_id: str) -> Dict[str, Any]:
        """
        Equips a Gu worm from Vault storage into the active Aperture.
        Enforces maximum 3 active combat Gu at any time.
        """
        gu = next((g for g in self.vault if g["id"] == gu_id), None)
        if not gu:
            return {
                "success": False,
                "message": "Gu worm not found in Vault storage.",
                "equipped_gu": self.aperture,
                "vault_gu": self.vault,
                "cultivator": self.get_stats()
            }
            
        # Check active combat slot constraint (Max 3 active Gu)
        if gu.get("gu_type") == "active":
            if self.get_equipped_active_count() >= 3:
                return {
                    "success": False,
                    "message": "Combat Aperture is full! You can only equip up to 3 Active Gu worms at once for battle.",
                    "equipped_gu": self.aperture,
                    "vault_gu": self.vault,
                    "cultivator": self.get_stats()
                }
                
        # Move from vault to aperture
        self.vault.remove(gu)
        self.aperture.append(gu)
        
        return {
            "success": True,
            "message": f"Equipped {gu['name']} into your Primeval Aperture.",
            "gu": gu,
            "equipped_gu": self.aperture,
            "vault_gu": self.vault,
            "vault_capacity": self.get_vault_capacity(),
            "max_active_slots": 3,
            "equipped_active_count": self.get_equipped_active_count(),
            "cultivator": self.get_stats()
        }

    def unequip_gu(self, gu_id: str) -> Dict[str, Any]:
        """
        Unequips a Gu worm from active Aperture into Vault storage.
        Enforces vault storage capacity limit.
        """
        gu = next((g for g in self.aperture if g["id"] == gu_id), None)
        if not gu:
            return {
                "success": False,
                "message": "Gu worm is not equipped in your Aperture.",
                "equipped_gu": self.aperture,
                "vault_gu": self.vault,
                "cultivator": self.get_stats()
            }
            
        # Check vault capacity limit
        if len(self.vault) >= self.get_vault_capacity():
            return {
                "success": False,
                "message": f"Vault is full! Maximum storage is {self.get_vault_capacity()} slots for Rank {self.rank}.",
                "equipped_gu": self.aperture,
                "vault_gu": self.vault,
                "cultivator": self.get_stats()
            }
            
        # Move from aperture to vault
        self.aperture.remove(gu)
        self.vault.append(gu)
        
        return {
            "success": True,
            "message": f"Unequipped {gu['name']} and moved into Vault storage.",
            "gu": gu,
            "equipped_gu": self.aperture,
            "vault_gu": self.vault,
            "vault_capacity": self.get_vault_capacity(),
            "max_active_slots": 3,
            "equipped_active_count": self.get_equipped_active_count(),
            "cultivator": self.get_stats()
        }

    def calculate_feed_cost(self, tier: int) -> int:
        """
        Calculates Primeval Stone feeding cost based on Gu Rank/Tier:
        Tier 1 = 10 stones, Tier 2 = 50 stones, Tier 3 = 150 stones, Tier 4 = 400 stones, Tier 5 = 1000 stones.
        """
        FEED_COSTS = {1: 10, 2: 50, 3: 150, 4: 400, 5: 1000}
        return FEED_COSTS.get(tier, max(10, tier * 25))

    def feed_gu(self, gu_id: str) -> Dict[str, Any]:
        """
        Feeds a Gu worm in either Aperture or Vault, restoring Satiety/Hunger to 100%.
        Consumes fixed Primeval Stones based on Rank/Tier.
        """
        gu = next((g for g in self.aperture if g["id"] == gu_id), None)
        if not gu:
            gu = next((g for g in self.vault if g["id"] == gu_id), None)

        if not gu:
            return {
                "success": False,
                "message": "Gu worm not found in Aperture or Vault storage."
            }

        tier = gu.get("tier", 1)
        cost = self.calculate_feed_cost(tier)

        if self.spirit_stones < cost:
            return {
                "success": False,
                "message": f"Insufficient Primeval Stones! Feeding {gu['name']} (Tier {tier}) requires {cost} Primeval Stones. You only have {self.spirit_stones}.",
                "cost": cost,
                "equipped_gu": self.aperture,
                "vault_gu": self.vault,
                "cultivator": self.get_stats()
            }

        # Deduct stones and sate the Gu
        self.spirit_stones -= cost
        gu["satiety"] = 100
        gu["hunger"] = 100

        return {
            "success": True,
            "message": f"🌿 Fed {gu['name']}! Restored Satiety to 100% (Consumed {cost} Primeval Stones).",
            "gu": gu,
            "cost": cost,
            "equipped_gu": self.aperture,
            "vault_gu": self.vault,
            "vault_capacity": self.get_vault_capacity(),
            "max_active_slots": 3,
            "equipped_active_count": self.get_equipped_active_count(),
            "cultivator": self.get_stats()
        }

    def decay_gu_satiety(self, amount: int = 5) -> List[str]:
        """
        Deducts satiety (and hunger) from ALL Gu worms (both active in aperture and stored in vault).
        If any Gu worm's satiety reaches <= 0, it permanently dies of starvation and is deleted.
        Returns a list of starvation death alerts.
        """
        death_alerts: List[str] = []

        # Decay equipped Gu
        dead_equipped: List[Dict[str, Any]] = []
        for gu in self.aperture:
            cur = gu.get("satiety", gu.get("hunger", 100))
            new_val = max(0, cur - amount)
            gu["satiety"] = new_val
            gu["hunger"] = new_val
            if new_val <= 0:
                dead_equipped.append(gu)
                death_alerts.append(
                    f"💀 STARVATION DEATH! Your equipped Gu '{gu['name']}' (Tier {gu.get('tier', 1)}) ran out of essence nourishment and crumbled to dust!"
                )

        for dead in dead_equipped:
            self.aperture.remove(dead)

        # Decay vaulted Gu
        dead_vault: List[Dict[str, Any]] = []
        for gu in self.vault:
            cur = gu.get("satiety", gu.get("hunger", 100))
            new_val = max(0, cur - amount)
            gu["satiety"] = new_val
            gu["hunger"] = new_val
            if new_val <= 0:
                dead_vault.append(gu)
                death_alerts.append(
                    f"💀 STARVATION DEATH! Your stored Gu '{gu['name']}' (Tier {gu.get('tier', 1)}) starved in the vault and perished into ash!"
                )

        for dead in dead_vault:
            self.vault.remove(dead)

        return death_alerts

    def get_vault_data(self) -> Dict[str, Any]:
        """
        Returns full vault and aperture equipment inventory state.
        """
        return {
            "status": "success",
            "equipped_gu": self.aperture,
            "vault_gu": self.vault,
            "vault_capacity": self.get_vault_capacity(),
            "max_active_slots": 3,
            "equipped_active_count": self.get_equipped_active_count(),
            "cultivator": self.get_stats()
        }

# Global in-memory singleton for the prototype session
player_cultivator = CultivatorState()

