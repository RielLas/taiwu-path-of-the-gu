"""
Cultivator State & Aperture System (Reverend Insanity Lore Compliant)
Gu live inside the Primeval Aperture.
Only passive body-tempering Gu (e.g., Boar Gu, Bear Gu, Jade Skin Gu) nourish
and permanently/passively alter the cultivator's physical stats.
Active Gu (e.g., Moonlight Gu, Blood Frenzy Gu) are used in actions/battles consuming Primeval Essence.
"""

import time
import json
from typing import List, Dict, Any, Optional
from app.core.db import get_db_connection

class CultivatorState:
    def __init__(self):
        self.name: str = "Fang Yuan"
        self.rank: int = 1
        self.stage: str = "Initial Stage"
        self.aperture_grade: str = "A Grade (93% Primeval Sea)"
        self.aptitude_percentage: float = 93.0
        self.aperture_status: str = "Pristine"  # "Pristine" or "Fractured"
        self.primeval_essence: float = 93.0
        self.max_essence: float = 93.0
        self.nourish_progress: float = 0.0
        self.stamina: float = 100.0
        self.max_stamina: float = 100.0
        self.last_stamina_update: float = time.time()
        self.essence_type: str = "Rank 1 Initial Green Copper Primeval Essence"
        self.spirit_stones: int = 65
        self.player_pos: List[int] = [7, 7]  # [x, y]
        self.current_node: dict = None  # tracks the current explorable node
        
        # Base mortal attributes
        self.base_strength: int = 10
        self.base_defense: int = 5
        self.base_speed: int = 10
        self.current_hp: int = 100

        # Dynamic Karmic & Institutional Standing State
        self.alignment_score: int = -75
        self.faction_reputations: Dict[str, int] = {
            "Gu Yue Clan": -80,
            "Bai Clan": -30,
            "Xiong Clan": -50,
            "Shang Clan Merchant City": 25,
            "Shadow Sect Remnants": 0,
            "Central Continent Sect": -10
        }
        self.active_bounties: List[Dict[str, Any]] = [
            {
                "id": "bounty_1",
                "issuer": "Gu Yue Clan Elders",
                "reward": "500 Primeval Stones",
                "reason": "Defying Clan Hierarchy & Extortion of Disciples",
                "threat_level": "High"
            },
            {
                "id": "bounty_2",
                "issuer": "Southern Border Merchant Guild",
                "reward": "300 Primeval Stones",
                "reason": "Unlicensed Black Market Gu Trading",
                "threat_level": "Moderate"
            }
        ]
        
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

    def save_to_db(self) -> None:
        """
        Persists the current cultivator state to the SQLite database.
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            now = time.time()
            cursor.execute("""
            INSERT INTO cultivator_state (
                id, name, rank, stage, aperture_grade, aptitude_percentage, aperture_status,
                primeval_essence, max_essence, nourish_progress, stamina, max_stamina,
                last_stamina_update, essence_type, spirit_stones, player_pos_x, player_pos_y,
                base_strength, base_defense, base_speed, current_hp, alignment_score,
                faction_reputations, active_bounties, aperture, vault, updated_at
            ) VALUES (
                1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                rank=excluded.rank,
                stage=excluded.stage,
                aperture_grade=excluded.aperture_grade,
                aptitude_percentage=excluded.aptitude_percentage,
                aperture_status=excluded.aperture_status,
                primeval_essence=excluded.primeval_essence,
                max_essence=excluded.max_essence,
                nourish_progress=excluded.nourish_progress,
                stamina=excluded.stamina,
                max_stamina=excluded.max_stamina,
                last_stamina_update=excluded.last_stamina_update,
                essence_type=excluded.essence_type,
                spirit_stones=excluded.spirit_stones,
                player_pos_x=excluded.player_pos_x,
                player_pos_y=excluded.player_pos_y,
                base_strength=excluded.base_strength,
                base_defense=excluded.base_defense,
                base_speed=excluded.base_speed,
                current_hp=excluded.current_hp,
                alignment_score=excluded.alignment_score,
                faction_reputations=excluded.faction_reputations,
                active_bounties=excluded.active_bounties,
                aperture=excluded.aperture,
                vault=excluded.vault,
                updated_at=excluded.updated_at
            """, (
                self.name, self.rank, self.stage, self.aperture_grade, self.aptitude_percentage, self.aperture_status,
                self.primeval_essence, self.max_essence, self.nourish_progress, self.stamina, self.max_stamina,
                self.last_stamina_update, self.essence_type, self.spirit_stones, self.player_pos[0], self.player_pos[1],
                self.base_strength, self.base_defense, self.base_speed, self.current_hp, self.alignment_score,
                json.dumps(self.faction_reputations), json.dumps(self.active_bounties),
                json.dumps(self.aperture), json.dumps(self.vault), now
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to persist cultivator state to DB: {e}")

    def load_from_db(self) -> bool:
        """
        Loads cultivator state from SQLite database.
        If found, immediately applies retroactive stamina for elapsed offline time.
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM cultivator_state WHERE id = 1")
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                self.save_to_db()
                return False
                
            self.name = row["name"]
            self.rank = row["rank"]
            self.stage = row["stage"]
            self.aperture_grade = row["aperture_grade"]
            self.aptitude_percentage = float(row["aptitude_percentage"])
            self.aperture_status = row["aperture_status"]
            self.primeval_essence = float(row["primeval_essence"])
            self.max_essence = float(row["max_essence"])
            self.nourish_progress = float(row["nourish_progress"])
            self.stamina = float(row["stamina"])
            self.max_stamina = float(row["max_stamina"])
            self.last_stamina_update = float(row["last_stamina_update"])
            self.essence_type = row["essence_type"]
            self.spirit_stones = int(row["spirit_stones"])
            self.player_pos = [int(row["player_pos_x"]), int(row["player_pos_y"])]
            self.base_strength = int(row["base_strength"])
            self.base_defense = int(row["base_defense"])
            self.base_speed = int(row["base_speed"])
            self.current_hp = int(row["current_hp"])
            self.alignment_score = int(row["alignment_score"])
            self.faction_reputations = json.loads(row["faction_reputations"])
            self.active_bounties = json.loads(row["active_bounties"])
            self.aperture = json.loads(row["aperture"])
            self.vault = json.loads(row["vault"])
            
            # Immediately calculate retroactive stamina for time offline
            self.update_stamina_passive()
            return True
        except Exception as e:
            print(f"Error loading from DB: {e}")
            return False

    def update_stamina_passive(self) -> None:
        """
        Retroactive Stamina Engine:
        Calculates time elapsed since last_stamina_update.
        Adds +1 Stamina per real-time minute (60 seconds) elapsed.
        Caps at max_stamina, updates last_stamina_update timestamp, and saves state to DB.
        """
        now = time.time()
        elapsed = max(0.0, now - self.last_stamina_update)
        if elapsed >= 1.0:
            stamina_gain = elapsed / 60.0  # +1 stamina per 60s
            old_stamina = self.stamina
            self.stamina = min(self.max_stamina, round(self.stamina + stamina_gain, 2))
            self.last_stamina_update = now
            if self.stamina != old_stamina:
                self.save_to_db()

    def get_stats(self) -> Dict[str, Any]:
        """
        Calculates active total stats.
        Passive Gu only grant stats if their hunger is >= 20% (not starving).
        """
        self.update_stamina_passive()
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
        # Strict Volume Percentage: Absolute volume is strictly capped by innate aptitude percentage (e.g. 93.0%)
        max_essence = self.aptitude_percentage
        current_essence = min(round(self.primeval_essence, 2), max_essence)
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
            "Refinement Path": 8 + (self.rank * 3),
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

        # Dynamic Faction Standings Array
        faction_list = []
        faction_meta = {
            "Gu Yue Clan": "Righteous Clan",
            "Bai Clan": "Righteous Clan",
            "Xiong Clan": "Righteous Clan",
            "Shang Clan Merchant City": "Neutral Superclan",
            "Shadow Sect Remnants": "Ancient Demonic Mystery",
            "Central Continent Sect": "Righteous Sect Territory"
        }
        for fac_name, rep in self.faction_reputations.items():
            if rep <= -60:
                standing = "Hostile / Marked for Death"
            elif rep <= -20:
                standing = "Wary & Suspicious"
            elif rep < 20:
                standing = "Neutral / Uncommitted"
            elif rep < 60:
                standing = "Pragmatic Trading Partner"
            else:
                standing = "Allied Benefactor"
                
            faction_list.append({
                "name": fac_name,
                "standing": standing,
                "reputation": rep,
                "type": faction_meta.get(fac_name, "Independent Faction")
            })

        # Dynamic Alignment Description
        if self.alignment_score <= -50:
            align_desc = "Demonic Path (Ruthless & Pragmatic)"
        elif self.alignment_score < 0:
            align_desc = "Demonic-Leaning Pragmatist"
        elif self.alignment_score == 0:
            align_desc = "True Neutral Mortal"
        elif self.alignment_score < 50:
            align_desc = "Righteous-Leaning Cultivator"
        else:
            align_desc = "Orthodox Righteous Paragon"

        procedural_title = self.generate_procedural_title(total_strength, total_defense, dao_marks)

        # Karmic & Social Ledger
        karmic_ledger = {
            "alignment": align_desc,
            "alignment_score": self.alignment_score,  # Range -100 (Demonic) to +100 (Righteous)
            "reputation_title": procedural_title,
            "procedural_title": procedural_title,
            "known_aliases": [
                f"Fang Yuan ({procedural_title})",
                "Gu Yue Fang Yuan",
                "Spring Autumn Reincarnator",
                "Cold-Blooded Moonblade"
            ],
            "active_bounties": self.active_bounties,
            "factions": faction_list
        }

        return {
            "name": self.name,
            "title": procedural_title,
            "procedural_title": procedural_title,
            "rank": self.rank,
            "stage": self.stage,
            "aperture_grade": self.aperture_grade,
            "aperture_status": self.aperture_status,
            "primeval_essence": current_essence,
            "max_essence": max_essence,
            "aptitude_percentage": self.aptitude_percentage,
            "stamina": round(self.stamina, 1),
            "max_stamina": self.max_stamina,
            "nourish_progress": self.nourish_progress,
            "essence_multiplier": self.get_essence_multiplier(),
            "essence_color": self.get_essence_color(),
            "essence_type": self.get_essence_type(),
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

    def generate_procedural_title(self, total_strength: int, total_defense: int, dao_marks: Dict[str, int]) -> str:
        """
        Title Hierarchy Engine (Dao Marks > Body Tempering > Baseline Alignment):
        Strictly enforces Dao Mark titles as absolute highest priority.
        Body tempering and raw attribute titles are secondary.
        Rank and karmic alignment titles act as baseline fallbacks.
        """
        alignment = self.alignment_score
        
        # ─── PRIORITY 1: DAO MARKS (Absolute Highest Weight) ───────────────────
        time_marks = dao_marks.get("Time (Chrono) Path", 0)
        blood_marks = dao_marks.get("Blood Path", 0)
        moon_marks = dao_marks.get("Moon Path", 0)
        poison_marks = dao_marks.get("Poison Path", 0)
        transform_marks = dao_marks.get("Transformation Path", 0)
        water_marks = dao_marks.get("Water Path", 0)
        light_marks = dao_marks.get("Light Path", 0)

        # High priority Dao Mark titles
        if blood_marks >= 10:
            if alignment <= -50:
                return "Blood-Sea Demonic Scourge"
            elif alignment > 20:
                return "Crimson Blade Avenger"
            else:
                return "Scarlet Dao Ascetic"
                
        if moon_marks >= 10:
            if alignment <= -50:
                return "Desolate Moon Fiend"
            elif alignment > 20:
                return "Ethereal Moonlight Scholar"
            else:
                return "Cold-Blooded Moonblade"

        if poison_marks >= 15:
            return "Venom-Heart Demonic Fiend" if alignment <= -30 else "Ashen Serpent Alchemist"

        if transform_marks >= 20:
            return "Myriad Beast Chimera Fiend" if alignment <= -30 else "Shapeshifting Paragon"

        if water_marks >= 15:
            return "Azure Tide Wanderer"

        if light_marks >= 15:
            return "Radiant Sun Sovereign" if alignment > 20 else "Blinding Flash Stalker"

        if time_marks >= 500:
            return "Spring Autumn Chrono-Demon" if alignment <= -50 else "Reincarnating Chrono-Wanderer"

        # ─── PRIORITY 2: BODY TEMPERING & RAW STATS (Secondary) ────────────────
        if total_strength >= 30:
            if alignment <= -50:
                return "Demonic Boar-Fist"
            elif alignment > 30:
                return "Righteous Titan-Force"
            else:
                return "Iron-Shouldered Savage"
        elif total_defense >= 25:
            if alignment <= -50:
                return "Impervious Blood-Armor"
            else:
                return "Steel-Skin Vanguard"
        elif self.base_speed >= 20:
            return "Phantom-Step Demon" if alignment <= -50 else "Gale-Striding Courier"
            
        # ─── PRIORITY 3: BASELINE RANK & ALIGNMENT (Fallback) ──────────────────
        if alignment <= -50:
            return "Demonic Scoundrel" if self.rank == 1 else f"Rank {self.rank} Demonic Elder"
        elif alignment > 30:
            return "Righteous Disciple" if self.rank == 1 else f"Rank {self.rank} Righteous Patriarch"
        else:
            return "Solitary Wanderer" if self.rank == 1 else f"Rank {self.rank} Free-Spirited Nomad"

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
            self.nourish_progress = 0.0
            self.essence_type = self.get_essence_type()
            
            # Strict Volume Limit: Always strictly bounded by innate aptitude (e.g. 93.0%)
            self.max_essence = self.aptitude_percentage
            self.primeval_essence = self.max_essence
            
            # Mortal physique tempering from breakthrough
            self.base_strength += 15
            self.base_defense += 10
            self.base_speed += 5
            self.save_to_db()
            
            return {
                "success": True,
                "wall_broken": True,
                "message": f"✨ BREAKTHROUGH ACCOMPLISHED! The crystal wall shattered under your ferocious essence battering! You have ascended to Rank {self.rank} ({self.stage}) with {self.essence_type} (Purity Multiplier: {self.get_essence_multiplier()}x)!",
                "cultivator": self.get_stats()
            }
        else:
            # FAILURE: The wall held strong. Essence dissipated.
            # 15% chance of Aperture Fracture backlash
            fracture_roll = random.random()
            if fracture_roll <= 0.15:
                self.aperture_status = "Fractured"
                self.aptitude_percentage = max(10.0, round(self.aptitude_percentage - 5.0, 1))
                self.max_essence = self.aptitude_percentage
                self.primeval_essence = min(self.primeval_essence, self.max_essence)
                self.save_to_db()
                return {
                    "success": False,
                    "wall_broken": False,
                    "fractured": True,
                    "message": f"💀 SEVERE BACKLASH! The aperture crystal wall resisted your essence onslaught. A hairline fracture cracked across your aperture wall! Aptitude capacity permanently reduced by -5% (Now {self.aptitude_percentage}%). Status: FRACTURED.",
                    "cultivator": self.get_stats()
                }
            else:
                self.save_to_db()
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
        self.save_to_db()
        
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
        self.save_to_db()
        
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
        self.save_to_db()
        
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
        self.save_to_db()

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

        self.save_to_db()
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

    def get_faction_reputation(self, faction_name: str) -> Dict[str, Any]:
        """
        Retrieves standing and reputation for a specific faction.
        """
        rep = self.faction_reputations.get(faction_name, 0)
        if rep <= -60:
            standing = "Hostile / Marked for Death"
        elif rep <= -20:
            standing = "Wary & Suspicious"
        elif rep < 20:
            standing = "Neutral / Uncommitted"
        elif rep < 60:
            standing = "Pragmatic Trading Partner"
        else:
            standing = "Allied Benefactor"

        return {
            "faction": faction_name,
            "reputation": rep,
            "standing": standing,
            "is_hostile": rep < 0
        }

    def extort_faction(self, faction_name: str) -> Dict[str, Any]:
        """
        Demonic Path Action: Armed extortion of clan outpost resources.
        - Yields 80 Primeval Stones.
        - Lowers faction reputation by 40.
        - Shifts alignment score towards Demonic by -15.
        - Triggers an active bounty from that faction on the player.
        """
        loot_stones = 80
        self.spirit_stones += loot_stones
        
        old_rep = self.faction_reputations.get(faction_name, 0)
        new_rep = max(-100, old_rep - 40)
        self.faction_reputations[faction_name] = new_rep
        
        self.alignment_score = max(-100, self.alignment_score - 15)

        # Trigger new active bounty
        import uuid
        bounty_id = f"bounty_{uuid.uuid4().hex[:6]}"
        bounty = {
            "id": bounty_id,
            "issuer": f"{faction_name} Enforcement Watch",
            "reward": f"{loot_stones * 5} Primeval Stones",
            "reason": f"Armed Extortion & Robbery of {faction_name} Outpost Supply Cache",
            "threat_level": "Severe" if new_rep <= -60 else "High"
        }
        self.active_bounties.append(bounty)
        self.save_to_db()

        return {
            "success": True,
            "message": f"☠️ DEMONIC EXTORTION SUCCEEDED! You plundered {loot_stones} Primeval Stones from {faction_name}. Reputation collapsed by -40 (Now {new_rep}). A bounty has been placed on your head!",
            "loot_stones": loot_stones,
            "new_reputation": new_rep,
            "alignment_score": self.alignment_score,
            "bounty": bounty,
            "cultivator": self.get_stats()
        }

    def trade_with_faction(self, faction_name: str, item_id: str, cost: int, gu_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Righteous/Neutral Action: Trade Primeval Stones for faction Gu.
        - Consumes cost Primeval Stones.
        - Adds Gu to Vault / Aperture.
        - Increases faction reputation by +5.
        - Shifts alignment score towards Righteous by +2.
        """
        if self.spirit_stones < cost:
            return {
                "success": False,
                "message": f"Insufficient Primeval Stones! Required: {cost}, Available: {self.spirit_stones}."
            }

        self.spirit_stones -= cost
        
        # Add Gu to vault if capacity allows, else directly to aperture or vault
        added_gu = None
        if gu_payload:
            import uuid
            gu_entry = {
                "id": f"gu_{uuid.uuid4().hex[:6]}",
                "name": gu_payload.get("name", "Purchased Gu"),
                "tier": gu_payload.get("tier", 1),
                "path": gu_payload.get("path", "General Path"),
                "gu_type": gu_payload.get("gu_type", "active"),
                "satiety": 100,
                "hunger": 100,
                "food": gu_payload.get("food", "Primeval Dew"),
                "effect_desc": gu_payload.get("effect_desc", "Acquired via institutional trade."),
                "passive_buff": gu_payload.get("passive_buff"),
                "active_power": gu_payload.get("active_power", 30),
                "essence_cost": gu_payload.get("essence_cost", 10)
            }
            if len(self.vault) < self.get_vault_capacity():
                self.vault.append(gu_entry)
            else:
                self.aperture.append(gu_entry)
            added_gu = gu_entry

        # Faction relation bonus
        old_rep = self.faction_reputations.get(faction_name, 0)
        new_rep = min(100, old_rep + 5)
        self.faction_reputations[faction_name] = new_rep
        self.alignment_score = min(100, self.alignment_score + 2)
        self.save_to_db()

        return {
            "success": True,
            "message": f"🤝 Trade Completed with {faction_name}! Acquired '{gu_payload.get('name', 'Gu')}' for {cost} Primeval Stones. Reputation increased (+5).",
            "gu": added_gu,
            "spirit_stones": self.spirit_stones,
            "new_reputation": new_rep,
            "cultivator": self.get_stats()
        }

    def get_substage_index(self) -> int:
        st = self.stage.lower()
        if "peak" in st:
            return 3
        elif "upper" in st:
            return 2
        elif "middle" in st:
            return 1
        else:
            return 0

    def get_essence_multiplier(self) -> float:
        """
        Exact Exponential Purity Formula:
        substage_index: Initial (0), Middle (1), Upper (2), Peak (3)
        multiplier = (80 ** (rank - 1)) * (2 ** substage_index)
        - 2x increase per micro-stage
        - 10x qualitative jump across major Ranks (e.g. Rank 1 Peak = 8x, Rank 2 Initial = 80x)
        """
        substage_index = self.get_substage_index()
        return float((80 ** max(0, self.rank - 1)) * (2 ** substage_index))

    def calculate_essence_drain(self, beu_cost: float) -> float:
        """
        Actual % Drain = Gu BEU Cost / get_essence_multiplier()
        """
        multiplier = self.get_essence_multiplier()
        return max(0.01, round(beu_cost / multiplier, 3))

    def get_essence_type(self) -> str:
        STAGE_MAP = {
            "initial stage": "Initial",
            "middle stage": "Middle",
            "upper stage": "Upper",
            "peak stage": "Peak"
        }
        st_label = "Initial"
        for k, v in STAGE_MAP.items():
            if v.lower() in self.stage.lower():
                st_label = v
                break
        
        RANK_TYPES = {
            1: f"Rank 1 {st_label} Green Copper Primeval Essence",
            2: f"Rank 2 {st_label} Red Iron Primeval Essence",
            3: f"Rank 3 {st_label} Silver Primeval Essence",
            4: f"Rank 4 {st_label} Gold Primeval Essence",
            5: f"Rank 5 {st_label} Purple Crystal Primeval Essence"
        }
        return RANK_TYPES.get(self.rank, f"Rank {self.rank} {st_label} Primeval Essence")

    def get_essence_color(self) -> str:
        """
        Hex color code representing the primeval essence sea based on Rank and Stage purity.
        """
        st = self.stage.lower()
        if self.rank == 1:
            if "peak" in st: return "#065f46" # Deep Green Copper
            if "upper" in st: return "#15803d" # Dark Green Copper
            if "middle" in st: return "#22c55e" # Green Copper
            return "#86efac" # Pale Green Copper
        elif self.rank == 2:
            if "peak" in st: return "#991b1b" # Purified Silver-Red Charcoal
            if "upper" in st: return "#b91c1c" # Deep Crimson Charcoal
            if "middle" in st: return "#ef4444" # Scarlet Red Iron
            return "#fca5a5" # Pale Red Iron
        elif self.rank == 3:
            if "peak" in st: return "#e2e8f0" # Snow Silver
            return "#94a3b8" # Bright Silver
        elif self.rank == 4:
            if "peak" in st: return "#a16207" # Sun Gold
            return "#eab308" # Bright Gold
        else:
            if "peak" in st: return "#581c87" # Imperial Purple Crystal
            return "#a855f7" # Violet Crystal

    def nourish_aperture(self, drain_percentage: float = 30.0) -> Dict[str, Any]:
        """
        The Nourishment Loop (Micro-Progression):
        Spend Primeval Essence (30%) and Stamina (10) to 'Wash the Aperture Walls'.
        Yields 'Aperture Tempering Progress'. When reaching 100%, advances to next micro-stage.
        """
        self.update_stamina_passive()
        st = self.stage.lower()
        if "peak" in st:
            return {
                "success": False,
                "message": "Peak Bottleneck Reached! The crystal aperture wall has reached its mortal limit for this Rank. Enter Closed Door Cultivation to Shatter the Aperture Wall.",
                "stage": self.stage,
                "nourish_progress": 100.0,
                "cultivator": self.get_stats()
            }

        if self.stamina < 10.0:
            return {
                "success": False,
                "message": f"Insufficient Stamina to wash the aperture walls! (Requires 10 Stamina, Current: {self.stamina:.1f}). Meditate or rest to recover.",
                "stage": self.stage,
                "nourish_progress": self.nourish_progress,
                "cultivator": self.get_stats()
            }

        if self.primeval_essence < drain_percentage:
            return {
                "success": False,
                "message": f"Insufficient Primeval Essence! Washing the aperture walls requires {drain_percentage}% Primeval Sea volume (Current: {self.primeval_essence:.1f}%).",
                "stage": self.stage,
                "nourish_progress": self.nourish_progress,
                "cultivator": self.get_stats()
            }

        # Deduct stamina and essence strictly
        self.stamina = max(0.0, round(self.stamina - 10.0, 1))
        self.primeval_essence = max(0.0, round(self.primeval_essence - drain_percentage, 2))
        
        # Add progress (34% per wash = 3 washes to advance)
        self.nourish_progress = min(100.0, round(self.nourish_progress + 34.0, 1))

        stage_promoted = False
        old_stage = self.stage
        if self.nourish_progress >= 100.0:
            if "initial" in st:
                self.stage = "Middle Stage"
                self.nourish_progress = 0.0
                stage_promoted = True
            elif "middle" in st:
                self.stage = "Upper Stage"
                self.nourish_progress = 0.0
                stage_promoted = True
            elif "upper" in st:
                self.stage = "Peak Stage"
                self.nourish_progress = 0.0
                stage_promoted = True

        self.essence_type = self.get_essence_type()
        self.save_to_db()
        
        if stage_promoted:
            msg = f"✨ STAGE BREAKTHROUGH! By washing the aperture crystal walls, your essence has condensed! Advanced from {old_stage} to {self.stage} (Essence Multiplier: {self.get_essence_multiplier():.0f}x)!"
        else:
            msg = f"🌊 Aperture Washed! Drained {drain_percentage}% Primeval Essence and 10 Stamina to temper the crystal walls. Micro-stage progress: {self.nourish_progress}%."

        return {
            "success": True,
            "stage_promoted": stage_promoted,
            "message": msg,
            "stage": self.stage,
            "nourish_progress": self.nourish_progress,
            "essence_multiplier": self.get_essence_multiplier(),
            "cultivator": self.get_stats()
        }

    def meditate(self, stamina_cost: float = 20.0) -> Dict[str, Any]:
        """
        The 'Meditate' (打坐调息) Action:
        Instead of advancing global time, the player burns Stamina (20 Stamina)
        to immediately trigger their innate recovery_rate, restoring Primeval Essence and HP.
        """
        self.update_stamina_passive()
        
        if self.stamina < stamina_cost:
            return {
                "success": False,
                "message": f"Insufficient Stamina to enter deep meditation! (Requires {stamina_cost:.0f} Stamina, Current: {self.stamina:.1f}). Rest to recover stamina.",
                "cultivator": self.get_stats()
            }
        
        # Deduct Stamina
        self.stamina = max(0.0, round(self.stamina - stamina_cost, 1))
        
        # Recovery rate calculations
        old_essence = self.primeval_essence
        essence_recovery = 30.0
        self.primeval_essence = min(self.aptitude_percentage, round(self.primeval_essence + essence_recovery, 2))
        actual_essence_restored = round(self.primeval_essence - old_essence, 2)
        
        max_hp = self.base_defense * 10
        for gu in self.aperture:
            if gu.get("gu_type") == "passive_body" and gu.get("hunger", 0) >= 20:
                buff = gu.get("passive_buff")
                if buff and buff.get("stat") == "defense":
                    max_hp += buff.get("value", 0) * 10
                    
        old_hp = self.current_hp
        hp_recovery = max(20, int(max_hp * 0.35))
        self.current_hp = min(max_hp, self.current_hp + hp_recovery)
        actual_hp_restored = self.current_hp - old_hp
        self.save_to_db()
        
        return {
            "success": True,
            "stamina_cost": stamina_cost,
            "essence_restored": actual_essence_restored,
            "hp_restored": actual_hp_restored,
            "message": f"🧘 Deep Meditation Completed: Circulated primeval essence through your aperture and meridians. Spent {stamina_cost:.0f} Stamina. Restored +{actual_essence_restored:.1f}% Primeval Essence and +{actual_hp_restored} HP.",
            "cultivator": self.get_stats()
        }

# Global singleton persistent cultivator instance
player_cultivator = CultivatorState()
player_cultivator.load_from_db()


