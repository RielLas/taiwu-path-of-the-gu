import random
from typing import List, Dict, Any, Optional

BIOMES = [
    "Southern Border Mountain",
    "Northern Plains Grassland",
    "Eastern Sea Reef",
    "Western Desert Dunes",
    "Central Continent Plains",
    "Bamboo Forest",
    "Venom Swamp",
    "Ancient Ruins",
    "Sect Grounds",
    "Spirit Veins",
    "Mountain Pass",
    "Blood Mountain"
]

REGION_BIOMES = {
    1: "Southern Border Mountain",
    2: "Central Continent Plains",
    3: "Ancient Ruins",
    4: "Northern Plains Grassland",
    5: "Eastern Sea Reef"
}

def generate_region(region_id: int, width: int = 15, height: int = 15, player_start: List[int] = [7, 7]) -> List[Dict[str, Any]]:
    """
    Procedurally generates a 15x15 grid of tiles for a region with consistent seed,
    assigning biomes to terrain sectors and injecting static Spirit Spring resource nodes.
    """
    tiles = []
    random.seed(region_id)
    
    dominant_biome = REGION_BIOMES.get(region_id, random.choice(BIOMES))
    px, py = player_start
    
    # Pre-determine static Spirit Spring locations (e.g. 2 static springs per region)
    # Guaranteed not to spawn directly on the player start position [7, 7]
    spring_coords = set([
        ((px + 3) % width, (py - 3) % height),
        ((px - 4) % width, (py + 4) % height)
    ])
    
    for y in range(height):
        for x in range(width):
            if (x, y) == (px, py):
                terrain = "Sect Grounds"
                tile_biome = dominant_biome
            elif (x, y) in spring_coords:
                terrain = "Spirit Spring"
                tile_biome = dominant_biome
            elif random.random() < 0.60:
                terrain = dominant_biome
                tile_biome = dominant_biome
            else:
                terrain = random.choice(BIOMES)
                tile_biome = terrain if terrain in REGION_BIOMES.values() else dominant_biome
                
            # Initial fog of war: reveal tiles within distance 1 of player start
            is_revealed = abs(x - px) <= 1 and abs(y - py) <= 1
            is_spring = terrain == "Spirit Spring"
            
            tile = {
                "x": x,
                "y": y,
                "type": terrain,
                "terrain": terrain,
                "biome": tile_biome,
                "is_spirit_spring": is_spring,
                "harvested": False,
                "is_revealed": is_revealed,
                "discovered": is_revealed
            }
            tiles.append(tile)
            
    return tiles

def generate_tile_encounter(terrain: str) -> Optional[Dict[str, Any]]:
    """
    Generates a context-rich Reverend Insanity style encounter based on terrain/biome.
    """
    # Spirit Springs always trigger a guaranteed encounter if not depleted
    if terrain == "Spirit Spring":
        stones_amount = random.randint(50, 100)
        return {
            "type": "resource",
            "title": "Natural Jade Spirit Spring",
            "desc": f"A crystalline jade aperture fissure gushes with concentrated primeval liquid! You harvest a massive bounty of {stones_amount} Primeval Stones.",
            "reward_type": "spirit_stones",
            "amount": stones_amount,
            "is_spirit_spring": True
        }
        
    roll = random.random()
    if roll > 0.40:
        return None  # 60% peaceful exploration
        
    encounter_tables = {
        "Southern Border Mountain": [
            {
                "type": "resource",
                "title": "Mountain Jade Cache",
                "desc": "Beneath a craggy precipice, you uncover an exposed pocket of primeval ore (+45 Primeval Stones).",
                "reward_type": "spirit_stones",
                "amount": 45
            },
            {
                "type": "combat",
                "title": "Fierce Mountain Boar",
                "desc": "A heavy stone-tusked boar roars and charges to defend its territory!",
                "enemy_name": "Stone Tusk Boar (Rank 1)",
                "enemy_hp": 80,
                "enemy_atk": 22,
                "reward_stones": 30
            },
            {
                "type": "wild_gu",
                "title": "Wild Mountain Gu",
                "desc": "A wild Mountain Boar Gu is foraging among the cliff roots.",
                "action": "capture",
                "wild_gu": {
                    "name": "Black Boar Gu",
                    "tier": 1,
                    "path": "Strength Path",
                    "gu_type": "passive_body",
                    "food": "Raw Pork",
                    "effect_desc": "Infuses the sinews with brute beast strength (+15 Strength).",
                    "passive_buff": {"stat": "strength", "value": 15, "label": "1 Boar Strength"}
                }
            }
        ],
        "Northern Plains Grassland": [
            {
                "type": "combat",
                "title": "Roaming Plains Wolf",
                "desc": "A fierce grassland silver wolf snarls as it stalks you through the tall reeds!",
                "enemy_name": "Grassland Silver Wolf",
                "enemy_hp": 70,
                "enemy_atk": 25,
                "reward_stones": 25
            },
            {
                "type": "resource",
                "title": "Nomadic Trader Stash",
                "desc": "You discover an abandoned nomadic caravan stash with 40 Primeval Stones.",
                "reward_type": "spirit_stones",
                "amount": 40
            }
        ],
        "Eastern Sea Reef": [
            {
                "type": "resource",
                "title": "Tidal Pearl Deposit",
                "desc": "Crashing tides have washed ashore luminous primeval pearl deposits (+50 Primeval Stones).",
                "reward_type": "spirit_stones",
                "amount": 50
            },
            {
                "type": "combat",
                "title": "Reef Crab Monstrosity",
                "desc": "An armored tidal crab snaps its razor claws aggressively!",
                "enemy_name": "Tidal Iron Crab",
                "enemy_hp": 90,
                "enemy_atk": 20,
                "reward_stones": 35
            }
        ],
        "Western Desert Dunes": [
            {
                "type": "combat",
                "title": "Dune Scorpion Ambush",
                "desc": "A venomous giant sand scorpion bursts out of the golden sand dunes!",
                "enemy_name": "Golden Sand Scorpion",
                "enemy_hp": 75,
                "enemy_atk": 28,
                "reward_stones": 30
            },
            {
                "type": "resource",
                "title": "Ancient Desert Oasis",
                "desc": "A hidden oasis springs forth from the arid dunes, yielding 45 Primeval Stones.",
                "reward_type": "spirit_stones",
                "amount": 45
            }
        ],
        "Central Continent Plains": [
            {
                "type": "resource",
                "title": "Central Clan Tribute",
                "desc": "You intercept a merchant convoy tribute containing 50 Primeval Stones.",
                "reward_type": "spirit_stones",
                "amount": 50
            },
            {
                "type": "combat",
                "title": "Central Sect Enforcer",
                "desc": "An arrogant sect enforcer demands your Gu or your life!",
                "enemy_name": "Sect Enforcer (Rank 1 Peak)",
                "enemy_hp": 85,
                "enemy_atk": 26,
                "reward_stones": 35
            }
        ],
        "Bamboo Forest": [
            {
                "type": "wild_gu",
                "title": "Wild Gu Nest Discovered",
                "desc": "Deep within the emerald green bamboo groves, a shimmering jade beetle is absorbing morning dew.",
                "action": "capture",
                "wild_gu": {
                    "name": "Bamboo Boar Gu",
                    "tier": 1,
                    "path": "Strength Path",
                    "gu_type": "passive_body",
                    "food": "Green Bamboo Shoots",
                    "effect_desc": "Nourishes muscles with resilient bamboo fiber and boar strength (+12 Strength).",
                    "passive_buff": {"stat": "strength", "value": 12, "label": "Bamboo Boar Vigor"}
                }
            },
            {
                "type": "resource",
                "title": "Natural Spirit Spring",
                "desc": "A crack in the mossy ground gushes with pure primeval dew. You harvest 25 Primeval Stones.",
                "reward_type": "spirit_stones",
                "amount": 25
            }
        ],
        "Mountain Pass": [
            {
                "type": "wild_gu",
                "title": "Ferocious Mountain Beast",
                "desc": "A furious White Bristle Mountain Boar charges at you! In its heart dwells a wild strength Gu!",
                "action": "capture",
                "wild_gu": {
                    "name": "Black Boar Gu",
                    "tier": 1,
                    "path": "Strength Path",
                    "gu_type": "passive_body",
                    "food": "Raw Pork",
                    "effect_desc": "Infuses the sinews with brute beast strength (+15 Strength).",
                    "passive_buff": {"stat": "strength", "value": 15, "label": "1 Boar Strength"}
                }
            },
            {
                "type": "combat",
                "title": "Rogue Demonic Cultivator",
                "desc": "A lone demonic cultivator in tattered black robes attempts an ambush to rob your Primeval Stones!",
                "enemy_name": "Demonic Rogue (Rank 1 Peak)",
                "enemy_hp": 60,
                "enemy_atk": 25,
                "reward_stones": 25
            }
        ],
        "Venom Swamp": [
            {
                "type": "wild_gu",
                "title": "Poisonous Mists",
                "desc": "Among the bubbling toxic quagmire, a fluorescent centipede coils upon a rotting stump.",
                "action": "capture",
                "wild_gu": {
                    "name": "Poison Dart Gu",
                    "tier": 1,
                    "path": "Poison Path",
                    "gu_type": "active",
                    "food": "Venomous Slime",
                    "effect_desc": "Fires a concentrated needle of corrosive green venom (Deals 45 Poison damage).",
                    "active_power": 45,
                    "essence_cost": 12
                }
            }
        ],
        "Ancient Ruins": [
            {
                "type": "wild_gu",
                "title": "Ancient Gu Master Inheritance",
                "desc": "Inside an eroded stone pavilion, an ancient jade talisman glows with faint defensive dao marks.",
                "action": "capture",
                "wild_gu": {
                    "name": "Brass Skin Gu",
                    "tier": 1,
                    "path": "Transformation Path",
                    "gu_type": "passive_body",
                    "food": "Brass Powder",
                    "effect_desc": "Hardens flesh into metallic bronze (+15 Defense).",
                    "passive_buff": {"stat": "defense", "value": 15, "label": "Brass Skin Armor"}
                }
            },
            {
                "type": "resource",
                "title": "Inheritance Stash",
                "desc": "You uncover a concealed compartment containing 40 ancient Primeval Stones.",
                "reward_type": "spirit_stones",
                "amount": 40
            }
        ],
        "Blood Mountain": [
            {
                "type": "combat",
                "title": "Crimson Wolf Ambush",
                "desc": "A savage blood-red wild wolf lunges from the crimson crags!",
                "enemy_name": "Blood Wolf Beast",
                "enemy_hp": 75,
                "enemy_atk": 30,
                "reward_stones": 30
            }
        ],
        "Sect Grounds": [
            {
                "type": "resource",
                "title": "Clan Monthly Stipend",
                "desc": "You visit the Clan Resource Pavilion and receive your Rank 1 Cultivator allowance.",
                "reward_type": "spirit_stones",
                "amount": 20
            }
        ],
        "Spirit Veins": [
            {
                "type": "resource",
                "title": "Exposed Spirit Vein Ore",
                "desc": "You mine raw primeval ore from the natural vein (+35 Primeval Stones).",
                "reward_type": "spirit_stones",
                "amount": 35
            }
        ]
    }
    
    options = encounter_tables.get(terrain, [
        {
            "type": "resource",
            "title": "Found Primeval Stones",
            "desc": "You scavenge several loose primeval stones hidden beneath the rocks.",
            "reward_type": "spirit_stones",
            "amount": 15
        }
    ])
    
    return random.choice(options)
