"""
Overworld System - 5 Regions of Reverend Insanity's World
Each region has explorable Nodes (important locations).
Entering a Node drops the player into the 15x15 local tile grid explorer.
"""

from typing import List, Dict, Any, Optional
from app.engine.world_gen import MACRO_REGIONS, LEGACY_REGION_MAP

# 5 canonical macro regions from Reverend Insanity lore with explorable nodes
OVERWORLD_REGIONS = {
    "southern_border_gu_yue": {
        "id": "southern_border_gu_yue",
        "name": "Southern Border: Gu Yue Sector",
        "chinese_name": "南疆古月界域",
        "desc": "Humid karst mountains thick with bamboo forests, venomous swamps, and ancient Gu Yue clan grounds.",
        "position": {"x": 50, "y": 78},
        "biome": "Southern Border Mountain",
        "color": "#2D5A27",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "nodes": [
            {
                "id": "qing_mao_mountain",
                "name": "Qing Mao Mountain",
                "chinese_name": "青茂山",
                "desc": "A remote mountain within the Gu Yue Clan's territory. Rich in Gu worms and spiritual energy. Fang Yuan's starting ground.",
                "type": "starter",
                "region_id": "southern_border_gu_yue",
                "position": {"x": 45, "y": 50},
                "dominant_biome": "Bamboo Forest",
                "unlocked": True
            },
            {
                "id": "gu_yue_clan",
                "name": "Gu Yue Clan",
                "chinese_name": "固岳氏族",
                "desc": "A medium-tier mortal clan with ancient roots. The Clan Elder rules with an iron fist. Refinement workshops and a clan treasury lie within.",
                "type": "sect",
                "region_id": "southern_border_gu_yue",
                "position": {"x": 52, "y": 42},
                "dominant_biome": "Sect Grounds",
                "unlocked": True
            },
            {
                "id": "venom_swamp_depths",
                "name": "Venom Swamp Depths",
                "chinese_name": "毒沼深处",
                "desc": "Fluorescent toxic marshes teeming with poisonous Gu. A deadly paradise for poison path cultivators.",
                "type": "wilderness",
                "region_id": "southern_border_gu_yue",
                "position": {"x": 47, "y": 76},
                "dominant_biome": "Venom Swamp",
                "unlocked": False
            }
        ]
    },
    "central_continent_spirit_affinity": {
        "id": "central_continent_spirit_affinity",
        "name": "Central Continent: Spirit Affinity Sector",
        "chinese_name": "中洲灵缘界域",
        "desc": "The most powerful land under heaven. Home to supreme righteous sects and towering pavilions of ancient wisdom.",
        "position": {"x": 50, "y": 45},
        "biome": "Central Continent Plains",
        "color": "#8B6914",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "nodes": [
            {
                "id": "spirit_affinity_house",
                "name": "Spirit Affinity House",
                "chinese_name": "灵缘斋",
                "desc": "One of the ten great ancient righteous sects of the Central Continent.",
                "type": "sect",
                "region_id": "central_continent_spirit_affinity",
                "position": {"x": 50, "y": 45},
                "dominant_biome": "Sect Grounds",
                "unlocked": True
            },
            {
                "id": "heavenly_court",
                "name": "Heavenly Court Ruins",
                "chinese_name": "天庭遗址",
                "desc": "Ancient shattered remains of Heavenly Court's outer walls. Immense primeval stone deposits lie buried.",
                "type": "ruins",
                "region_id": "central_continent_spirit_affinity",
                "position": {"x": 48, "y": 38},
                "dominant_biome": "Ancient Ruins",
                "unlocked": False
            }
        ]
    },
    "western_desert_thousand_li": {
        "id": "western_desert_thousand_li",
        "name": "Western Desert: Thousand Li Dunes",
        "chinese_name": "西漠千里流沙",
        "desc": "Scorching endless dunes and eroded stone obelisks. Sand path and earth path Gu thrive here.",
        "position": {"x": 18, "y": 45},
        "biome": "Western Desert Dunes",
        "color": "#D97706",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "nodes": [
            {
                "id": "ancient_obelisk_field",
                "name": "Ancient Obelisk Field",
                "chinese_name": "古碑阵",
                "desc": "Dozens of eroded stone pillars etched with forgotten Gu dao inscriptions.",
                "type": "ruins",
                "region_id": "western_desert_thousand_li",
                "position": {"x": 20, "y": 42},
                "dominant_biome": "Ancient Ruins",
                "unlocked": False
            },
            {
                "id": "sand_spirit_vein",
                "name": "Desert Spirit Vein",
                "chinese_name": "沙漠灵脉",
                "desc": "A partially buried primeval stone vein running beneath the western dunes.",
                "type": "resource",
                "region_id": "western_desert_thousand_li",
                "position": {"x": 15, "y": 50},
                "dominant_biome": "Spirit Veins",
                "unlocked": False
            }
        ]
    },
    "northern_plains_ge_tribe": {
        "id": "northern_plains_ge_tribe",
        "name": "Northern Plains: Ge Tribe Grassland",
        "chinese_name": "北原葛家草场",
        "desc": "Vast frozen steppes and wind-swept grasslands roamed by beast cultivator tribes and wolf packs.",
        "position": {"x": 50, "y": 15},
        "biome": "Northern Plains Grassland",
        "color": "#4A7FA5",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "nodes": [
            {
                "id": "iron_wolf_camp",
                "name": "Iron Wolf Camp",
                "chinese_name": "铁狼营地",
                "desc": "A nomadic beast cultivator encampment. Wild strength Gu and wolf blood Gu are plentiful here.",
                "type": "camp",
                "region_id": "northern_plains_ge_tribe",
                "position": {"x": 48, "y": 20},
                "dominant_biome": "Mountain Pass",
                "unlocked": False
            },
            {
                "id": "frost_spirit_vein",
                "name": "Frost Spirit Vein",
                "chinese_name": "霜灵脉",
                "desc": "A natural frozen primeval stone vein. Ice Gu and speed Gu are abundant near its surface.",
                "type": "resource",
                "region_id": "northern_plains_ge_tribe",
                "position": {"x": 55, "y": 18},
                "dominant_biome": "Spirit Veins",
                "unlocked": False
            }
        ]
    },
    "eastern_sea_blue_wave": {
        "id": "eastern_sea_blue_wave",
        "name": "Eastern Sea: Blue Wave Archipelago",
        "chinese_name": "东海碧波群岛",
        "desc": "Endless crashing seas with jagged island archipelagos. Sea path Gu Masters and trade caravans navigate these waters.",
        "position": {"x": 82, "y": 45},
        "biome": "Eastern Sea Reef",
        "color": "#1A4A6E",
        "travel_toll_stamina": 40,
        "travel_toll_stones": 100,
        "nodes": [
            {
                "id": "jade_sea_island",
                "name": "Jade Sea Island",
                "chinese_name": "碧海岛",
                "desc": "A lush volcanic island with healing hot springs and rare sea Gu.",
                "type": "island",
                "region_id": "eastern_sea_blue_wave",
                "position": {"x": 80, "y": 40},
                "dominant_biome": "Spirit Veins",
                "unlocked": False
            },
            {
                "id": "sea_cliff_cave",
                "name": "Sea Cliff Cave",
                "chinese_name": "海崖洞窟",
                "desc": "Vast caverns beneath the eastern cliffs, carved by centuries of crashing tides.",
                "type": "ruins",
                "region_id": "eastern_sea_blue_wave",
                "position": {"x": 85, "y": 50},
                "dominant_biome": "Ancient Ruins",
                "unlocked": False
            }
        ]
    }
}

# Alias mappings for legacy compatibility
OVERWORLD_REGIONS["southern_border"] = OVERWORLD_REGIONS["southern_border_gu_yue"]
OVERWORLD_REGIONS["central_continent"] = OVERWORLD_REGIONS["central_continent_spirit_affinity"]
OVERWORLD_REGIONS["western_desert"] = OVERWORLD_REGIONS["western_desert_thousand_li"]
OVERWORLD_REGIONS["northern_plains"] = OVERWORLD_REGIONS["northern_plains_ge_tribe"]
OVERWORLD_REGIONS["eastern_sea"] = OVERWORLD_REGIONS["eastern_sea_blue_wave"]

def resolve_region_id(region_id: Any) -> str:
    if isinstance(region_id, int) and region_id in LEGACY_REGION_MAP:
        return LEGACY_REGION_MAP[region_id]
    s = str(region_id)
    if s in LEGACY_REGION_MAP:
        return LEGACY_REGION_MAP[s]
    if s in MACRO_REGIONS:
        return s
    return "southern_border_gu_yue"

def get_all_regions() -> List[Dict[str, Any]]:
    canonical_keys = [
        "southern_border_gu_yue",
        "central_continent_spirit_affinity",
        "western_desert_thousand_li",
        "northern_plains_ge_tribe",
        "eastern_sea_blue_wave"
    ]
    regions = []
    for key in canonical_keys:
        r = OVERWORLD_REGIONS[key]
        region_summary = {k: v for k, v in r.items() if k != "nodes"}
        region_summary["node_count"] = len(r.get("nodes", []))
        regions.append(region_summary)
    return regions

def get_region_nodes(region_id: str) -> Optional[List[Dict[str, Any]]]:
    canonical_id = resolve_region_id(region_id)
    region = OVERWORLD_REGIONS.get(canonical_id)
    if not region:
        return None
    return region.get("nodes", [])

def get_node(region_id: str, node_id: str) -> Optional[Dict[str, Any]]:
    canonical_id = resolve_region_id(region_id)
    region = OVERWORLD_REGIONS.get(canonical_id)
    if not region:
        return None
    return next((n for n in region.get("nodes", []) if n["id"] == node_id), None)
