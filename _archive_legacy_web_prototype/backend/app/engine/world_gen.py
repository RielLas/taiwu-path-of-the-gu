import random
import hashlib
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

MACRO_REGIONS = {
    "southern_border_gu_yue": {
        "id": "southern_border_gu_yue",
        "name": "Southern Border: Gu Yue Sector",
        "chinese_name": "南疆古月界域",
        "macro_region": "southern_border",
        "desc": "Humid karst mountains thick with bamboo forests, venomous swamps, and ancient Gu Yue clan grounds.",
        "dominant_biome": "Southern Border Mountain",
        "color": "#2D5A27",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "factions": [
            {"name": "Gu Yue Clan", "offset": (-5, -5), "type": "Righteous Clan Outpost"},
            {"name": "Shang Clan Merchant City", "offset": (6, 5), "type": "Neutral Commercial Caravanserai"}
        ]
    },
    "central_continent_spirit_affinity": {
        "id": "central_continent_spirit_affinity",
        "name": "Central Continent: Spirit Affinity Sector",
        "chinese_name": "中洲灵缘界域",
        "macro_region": "central_continent",
        "desc": "Vast fertile plains and towering sect pavilions under the influence of supreme righteous sects.",
        "dominant_biome": "Central Continent Plains",
        "color": "#8B6914",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "factions": [
            {"name": "Central Continent Sect", "offset": (-6, -4), "type": "Righteous Sect Territory"},
            {"name": "Shang Clan Merchant City", "offset": (5, 6), "type": "Trade Post"}
        ]
    },
    "western_desert_thousand_li": {
        "id": "western_desert_thousand_li",
        "name": "Western Desert: Thousand Li Dunes",
        "chinese_name": "西漠千里流沙",
        "macro_region": "western_desert",
        "desc": "Arid ocean of scorching sand dunes, ancient stone obelisks, and hidden oasis spirit veins.",
        "dominant_biome": "Western Desert Dunes",
        "color": "#D97706",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "factions": [
            {"name": "Shadow Sect Remnants", "offset": (-5, -6), "type": "Ancient Demonic Altar"},
            {"name": "Gu Yue Clan", "offset": (6, 4), "type": "Expedition Camp"}
        ]
    },
    "northern_plains_ge_tribe": {
        "id": "northern_plains_ge_tribe",
        "name": "Northern Plains: Ge Tribe Grassland",
        "chinese_name": "北原葛家草场",
        "macro_region": "northern_plains",
        "desc": "Endless windy grasslands and frozen steppes roamed by beast cultivator tribes and wolf packs.",
        "dominant_biome": "Northern Plains Grassland",
        "color": "#4A7FA5",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "factions": [
            {"name": "Bai Clan", "offset": (-5, -5), "type": "Plains Clan Outpost"},
            {"name": "Xiong Clan", "offset": (6, 6), "type": "Plains Hunting Post"}
        ]
    },
    "eastern_sea_blue_wave": {
        "id": "eastern_sea_blue_wave",
        "name": "Eastern Sea: Blue Wave Archipelago",
        "chinese_name": "东海碧波群岛",
        "macro_region": "eastern_sea",
        "desc": "Endless azure waters, jagged coral reef archipelagos, and rich maritime trade caravans.",
        "dominant_biome": "Eastern Sea Reef",
        "color": "#1A4A6E",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "factions": [
            {"name": "Xiong Clan", "offset": (-6, -5), "type": "Coastal Stronghold"},
            {"name": "Shang Clan Merchant City", "offset": (5, 5), "type": "Maritime Harbor Post"}
        ]
    }
}

LEGACY_REGION_MAP = {
    1: "southern_border_gu_yue",
    2: "central_continent_spirit_affinity",
    3: "western_desert_thousand_li",
    4: "northern_plains_ge_tribe",
    5: "eastern_sea_blue_wave",
    "1": "southern_border_gu_yue",
    "2": "central_continent_spirit_affinity",
    "3": "western_desert_thousand_li",
    "4": "northern_plains_ge_tribe",
    "5": "eastern_sea_blue_wave",
    "southern_border": "southern_border_gu_yue",
    "central_continent": "central_continent_spirit_affinity",
    "western_desert": "western_desert_thousand_li",
    "northern_plains": "northern_plains_ge_tribe",
    "eastern_sea": "eastern_sea_blue_wave"
}

REGION_BIOMES = {
    1: "Southern Border Mountain",
    2: "Central Continent Plains",
    3: "Western Desert Dunes",
    4: "Northern Plains Grassland",
    5: "Eastern Sea Reef"
}

def generate_region(region_id: Any = "southern_border_gu_yue", width: int = 30, height: int = 30, player_start: List[int] = [15, 15]) -> List[Dict[str, Any]]:
    """
    Procedurally generates a 30x30 grid (900 tiles) for a macro-region with deterministic MD5 seed.
    Seeds a Way Station tile at [15, 15], static Spirit Springs, and Faction Outposts.
    """
    # Normalize region_id
    if isinstance(region_id, int) and region_id in LEGACY_REGION_MAP:
        canonical_region_id = LEGACY_REGION_MAP[region_id]
    elif str(region_id) in LEGACY_REGION_MAP:
        canonical_region_id = LEGACY_REGION_MAP[str(region_id)]
    elif str(region_id) in MACRO_REGIONS:
        canonical_region_id = str(region_id)
    else:
        canonical_region_id = "southern_border_gu_yue"

    region_meta = MACRO_REGIONS.get(canonical_region_id, MACRO_REGIONS["southern_border_gu_yue"])
    dominant_biome = region_meta.get("dominant_biome", "Southern Border Mountain")

    # Deterministic integer seed via MD5 hash
    seed = int(hashlib.md5(str(canonical_region_id).encode()).hexdigest(), 16) % (10**8)
    rng = random.Random(seed)

    tiles = []
    px, py = player_start

    # Pre-determine static Spirit Spring locations across quadrants in the 30x30 grid
    spring_coords = set([
        ((px + 7) % width, (py - 7) % height),
        ((px - 8) % width, (py + 8) % height),
        ((px + 6) % width, (py + 9) % height),
        ((px - 9) % width, (py - 6) % height)
    ])

    # Pre-determine Faction Outpost locations from region configuration
    faction_configs = region_meta.get("factions", [])
    faction_coords_map = {}
    for fc in faction_configs:
        ox, oy = fc["offset"]
        fx = (px + ox) % width
        fy = (py + oy) % height
        faction_coords_map[(fx, fy)] = fc

    for y in range(height):
        for x in range(width):
            is_spring = False
            is_faction = False
            is_way_station = False
            tile_faction = None
            tile_faction_type = None
            tile_name = None
            tile_desc = None

            # [15, 15] is the Way Station Caravan Hub
            if (x, y) == (15, 15):
                terrain = "Way Station"
                terrain_type = "way_station"
                tile_biome = dominant_biome
                is_way_station = True
                tile_name = "Way Station Caravan Hub"
                tile_desc = "Inter-regional caravan trading hub and waypoint station connecting the Five Regions."
            elif (x, y) in spring_coords:
                terrain = "Spirit Spring"
                terrain_type = "spirit_spring"
                tile_biome = dominant_biome
                is_spring = True
                tile_name = "Natural Jade Spirit Spring"
                tile_desc = "A crystalline jade aperture fissure gushing with concentrated primeval essence."
            elif (x, y) in faction_coords_map:
                fc = faction_coords_map[(x, y)]
                terrain = "Faction Outpost"
                terrain_type = "faction_outpost"
                tile_biome = dominant_biome
                is_faction = True
                tile_faction = fc["name"]
                tile_faction_type = fc["type"]
                tile_name = f"{fc['name']} Outpost"
                tile_desc = f"Fortified outpost under the authority of {fc['name']}."
            elif rng.random() < 0.65:
                terrain = dominant_biome
                terrain_type = dominant_biome
                tile_biome = dominant_biome
            else:
                terrain = rng.choice(BIOMES)
                terrain_type = terrain
                tile_biome = terrain if terrain in [r["dominant_biome"] for r in MACRO_REGIONS.values()] else dominant_biome

            # Fog of war: reveal tiles within distance 1 of player position
            is_revealed = abs(x - px) <= 1 and abs(y - py) <= 1

            tile = {
                "x": x,
                "y": y,
                "type": terrain_type,
                "terrain": terrain,
                "biome": tile_biome,
                "name": tile_name,
                "desc": tile_desc,
                "is_spirit_spring": is_spring,
                "is_faction_node": is_faction,
                "is_way_station": is_way_station,
                "faction": tile_faction,
                "faction_type": tile_faction_type,
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
