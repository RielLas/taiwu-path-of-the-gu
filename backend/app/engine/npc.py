"""
NPC & Predator Matrix Engine (Righteous Enforcers & Bounty Hunters)
Tracks dynamic predator entities pursuing Demonic Cultivators across Overworld sectors.
"""

import random
from typing import List, Dict, Any, Optional

class RighteousEnforcer:
    def __init__(
        self,
        enforcer_id: str = "enforcer_tie_001",
        name: str = "Tie Clan Righteous Enforcer",
        title: str = "Tie Clan Divine Inquisitor",
        rank: int = 1,
        stage: str = "Peak Stage",
        hp: int = 140,
        atk: int = 28,
        stamina: float = 100.0,
        pos: Optional[List[int]] = None
    ):
        self.id: str = enforcer_id
        self.name: str = name
        self.title: str = title
        self.rank: int = rank
        self.stage: str = stage
        self.max_hp: int = hp
        self.hp: int = hp
        self.atk: int = atk
        self.stamina: float = stamina
        self.max_stamina: float = 100.0
        self.pos: List[int] = pos if pos is not None else [0, 0]
        self.active: bool = False
        self.status: str = "hunting"  # "hunting", "meditating", "intercepted", "defeated"
        self.reward_stones: int = random.randint(50, 150)
        
        # Rank-appropriate Gu loadout for combat and plunder drops
        self.equipped_gu: List[Dict[str, Any]] = [
            {
                "id": "gu_iron_lock",
                "name": "Iron Lock Gu",
                "tier": max(1, rank),
                "path": "Metal Path",
                "gu_type": "active",
                "food": "Iron Filings",
                "effect_desc": "Binds the target in razor-sharp iron chains dealing 30 damage.",
                "active_power": 30 + (rank * 5),
                "essence_cost": 10
            },
            {
                "id": "gu_righteous_chain",
                "name": "Righteous Chain Gu",
                "tier": max(1, rank),
                "path": "Rule Path",
                "gu_type": "active",
                "food": "Pure Spring Water",
                "effect_desc": "Manifests ethereal golden chains to punish demonic transgressions (Deals 35 Rule damage).",
                "active_power": 35 + (rank * 5),
                "essence_cost": 12
            },
            {
                "id": "gu_tie_bronze_skin",
                "name": "Tie Bronze Skin Gu",
                "tier": max(1, rank),
                "path": "Transformation Path",
                "gu_type": "passive_body",
                "food": "Bronze Ore Nuggets",
                "effect_desc": "Transforms cultivator's epidermis into bronze alloy (+20 Defense).",
                "passive_buff": {"stat": "defense", "value": 20, "label": "Tie Clan Bronze Skin"},
                "active_power": 0,
                "essence_cost": 0
            }
        ]

    def spawn(self, player_pos: List[int], grid_width: int = 15, grid_height: int = 15, player_rank: int = 1) -> None:
        """
        Spawns the Enforcer at the furthest edge corner from the player's current position.
        """
        self.rank = max(1, player_rank)
        self.stage = "Peak Stage" if self.rank == 1 else "Middle Stage"
        self.max_hp = 120 + (self.rank * 30)
        self.hp = self.max_hp
        self.atk = 24 + (self.rank * 8)
        self.reward_stones = random.randint(50, 150)
        self.stamina = 100.0
        self.active = True
        self.status = "hunting"

        # Edge corners of the grid
        corners = [
            [0, 0],
            [grid_width - 1, 0],
            [0, grid_height - 1],
            [grid_width - 1, grid_height - 1]
        ]
        px, py = player_pos
        # Pick the corner with the largest Manhattan distance
        furthest_corner = max(corners, key=lambda c: abs(c[0] - px) + abs(c[1] - py))
        self.pos = [furthest_corner[0], furthest_corner[1]]

    def step_towards(self, player_pos: List[int]) -> Dict[str, Any]:
        """
        Pathfinding Chase Engine:
        Calculates Manhattan distance to the player and moves 1 tile closer, deducting 2 Stamina.
        If Stamina reaches 0 (or < 2), pauses to 'Meditate' (+30 Stamina).
        """
        if not self.active or self.status == "defeated":
            return {"active": False}

        px, py = player_pos
        ex, ey = self.pos

        # Check if already at player position
        if ex == px and ey == py:
            self.status = "intercepted"
            return {
                "active": True,
                "moved": False,
                "meditating": False,
                "pos": self.pos,
                "stamina": self.stamina,
                "intercepted": True,
                "message": f"⚖️ {self.name} has cornered you!"
            }

        # Check Stamina for movement
        if self.stamina < 2.0:
            # Pause to meditate and recover stamina
            self.stamina = min(self.max_stamina, round(self.stamina + 30.0, 1))
            self.status = "meditating"
            return {
                "active": True,
                "moved": False,
                "meditating": True,
                "pos": self.pos,
                "stamina": self.stamina,
                "intercepted": False,
                "message": f"🧘 {self.name} paused to meditate and recover stamina (⚡ {self.stamina:.0f}/100)."
            }

        # Calculate directional movement towards player
        dx = 1 if px > ex else (-1 if px < ex else 0)
        dy = 1 if py > ey else (-1 if py < ey else 0)

        # Move 1 tile along largest axis of distance
        if abs(px - ex) >= abs(py - ey) and dx != 0:
            self.pos = [ex + dx, ey]
        elif dy != 0:
            self.pos = [ex, ey + dy]
        elif dx != 0:
            self.pos = [ex + dx, ey]

        self.stamina = max(0.0, round(self.stamina - 2.0, 1))
        self.status = "hunting"

        intercepted = (self.pos[0] == px and self.pos[1] == py)
        if intercepted:
            self.status = "intercepted"

        return {
            "active": True,
            "moved": True,
            "meditating": False,
            "pos": self.pos,
            "stamina": self.stamina,
            "intercepted": intercepted,
            "message": f"🗡️ {self.name} moved towards [{self.pos[0]}, {self.pos[1]}] (⚡ {self.stamina:.0f}/100)!" if not intercepted else f"⚖️ AMBUSH! {self.name} intercepted you at [{px}, {py}]!"
        }

    def generate_loot(self) -> Dict[str, Any]:
        """
        The Plunder Table:
        50-150 Primeval Stones, plus 30% chance to drop one of the Enforcer's equipped Gu worms.
        """
        stones = random.randint(50, 150)
        dropped_gu = None
        if random.random() <= 0.30 and len(self.equipped_gu) > 0:
            chosen = random.choice(self.equipped_gu)
            dropped_gu = {
                "id": f"{chosen['id']}_{random.randint(100, 999)}",
                "name": chosen["name"],
                "tier": chosen["tier"],
                "path": chosen["path"],
                "gu_type": chosen["gu_type"],
                "satiety": 100,
                "hunger": 100,
                "food": chosen.get("food", "Primeval Dew"),
                "effect_desc": chosen.get("effect_desc", "Plundered from a defeated Righteous Enforcer."),
                "passive_buff": chosen.get("passive_buff"),
                "active_power": chosen.get("active_power", 0),
                "essence_cost": chosen.get("essence_cost", 10)
            }
        
        return {
            "stones": stones,
            "dropped_gu": dropped_gu
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "title": self.title,
            "rank": self.rank,
            "stage": self.stage,
            "hp": self.hp,
            "max_hp": self.max_hp,
            "atk": self.atk,
            "stamina": round(self.stamina, 1),
            "max_stamina": self.max_stamina,
            "pos": self.pos,
            "active": self.active,
            "status": self.status,
            "reward_stones": self.reward_stones,
            "equipped_gu": self.equipped_gu
        }


class EnforcerManager:
    def __init__(self):
        self.enforcer: RighteousEnforcer = RighteousEnforcer()

    def check_and_update(self, player_cultivator, auto_spawn: bool = True) -> Optional[Dict[str, Any]]:
        """
        Checks demonic alignment and active bounty triggers to spawn or update the Enforcer.
        """
        alignment = player_cultivator.alignment_score
        bounties = player_cultivator.active_bounties
        
        # Calculate total numeric bounty
        total_bounty = 0
        for b in bounties:
            reward_str = b.get("reward", "0")
            digits = "".join(ch for ch in reward_str if ch.isdigit())
            if digits:
                total_bounty += int(digits)

        # Trigger conditions: Alignment <= -50 (Demonic) OR Total bounty >= 300
        should_spawn = (alignment <= -50) or (total_bounty >= 300)

        if should_spawn:
            if not self.enforcer.active or self.enforcer.status == "defeated":
                if auto_spawn:
                    self.enforcer.spawn(player_cultivator.player_pos, 15, 15, player_cultivator.rank)
            return self.enforcer.to_dict()
        else:
            if self.enforcer.active:
                self.enforcer.active = False
            return None

    def on_player_action(self, player_cultivator) -> Dict[str, Any]:
        """
        Called whenever player performs a grid move or overworld action.
        Moves enforcer 1 tile closer and checks for interception.
        """
        self.check_and_update(player_cultivator, auto_spawn=True)
        if not self.enforcer.active or self.enforcer.status == "defeated":
            return {"active": False, "enforcer": None}

        step_res = self.enforcer.step_towards(player_cultivator.player_pos)
        return {
            "active": True,
            "enforcer": self.enforcer.to_dict(),
            "step": step_res
        }


enforcer_manager = EnforcerManager()
