#!/usr/bin/env python3
"""
Calculate fighter value scores from fighters.json.

Value formula:
    value = attack + defense + speed + subrole_bonus

- fighters.json must be in the same folder as this script.
- Works on Windows 11 (and other OSes) with Python 3.8+.
"""

import json
import os
from typing import Dict, Any, Tuple, List


# === CONFIG: sub-role bonus table ==========================================

# You can tweak these values however you like.
# Any subRole not listed here will use DEFAULT_SUBROLE_BONUS.
SUBROLE_BONUS_TABLE: Dict[str, int] = {
    "Paladin": 1,
    "BruiserTank": 1,
    "Defender": 1,
    "Skirmisher": 1,
    "SpiritGuide": 1,
    "Trickster": 1,
    "Healer": 1,
    "Caster": 1,
    # Add more specific sub-roles here if you want different weights
}

DEFAULT_SUBROLE_BONUS = 1  # used for any non-empty subRole not in the table
EMPTY_SUBROLE_BONUS = 0    # used if subRole is missing or empty


# === CORE LOGIC ============================================================

def get_script_dir() -> str:
    """Return the absolute directory where this script lives."""
    return os.path.dirname(os.path.abspath(__file__))


def load_json_dict(filename: str) -> Dict[str, Any]:
    """
    Load a JSON file expected to contain an object at the top level.
    """
    script_dir = get_script_dir()
    json_path = os.path.join(script_dir, filename)

    if not os.path.isfile(json_path):
        raise FileNotFoundError(
            f"{filename} not found in: {script_dir}\n"
            f"Expected file at: {json_path}"
        )

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError(f"{filename} must contain a JSON object at the top level.")

    return data


def load_fighters_json() -> Dict[str, Any]:
    """
    Load fighters.json from the same directory as this script.

    Returns a dict: { fighter_id: fighter_data, ... }
    """
    return load_json_dict("fighters.json")


def load_subroles_json() -> Dict[str, Any]:
    """Load subroles.json from the same directory as this script."""
    return load_json_dict("subroles.json")


def apply_subrole_stats(
    fighters: Dict[str, Any], subroles: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Populate attack/defense/speed/role on fighters using their subRole template.
    """
    for fdata in fighters.values():
        subrole = str(fdata.get("subRole", "") or "")
        subrole_stats = subroles.get(subrole, {}) if isinstance(subroles, dict) else {}

        fdata["role"] = fdata.get("role") or subrole_stats.get("role", "")
        fdata["attack"] = int(fdata.get("attack", subrole_stats.get("attack", 0)))
        fdata["defense"] = int(fdata.get("defense", subrole_stats.get("defense", 0)))
        fdata["speed"] = int(fdata.get("speed", subrole_stats.get("speed", 0)))

    return fighters


def get_subrole_bonus(subrole: str) -> int:
    """
    Return the bonus for a given subRole string.
    """
    if not subrole:
        return EMPTY_SUBROLE_BONUS

    return SUBROLE_BONUS_TABLE.get(subrole, DEFAULT_SUBROLE_BONUS)


def compute_fighter_value(fighter: Dict[str, Any]) -> int:
    """
    Compute value = attack + defense + speed + subrole_bonus for a fighter dict.
    Missing stats default to 0.
    """
    attack = int(fighter.get("attack", 0))
    defense = int(fighter.get("defense", 0))
    speed = int(fighter.get("speed", 0))
    subrole = str(fighter.get("subRole", "") or "")
    subrole_bonus = get_subrole_bonus(subrole)

    return attack + defense + speed + subrole_bonus


def build_value_table(fighters: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any], int]]:
    """
    Build a list of (fighter_id, fighter_data, value) and sort by value desc.
    """
    rows: List[Tuple[str, Dict[str, Any], int]] = []
    for fid, fdata in fighters.items():
        value = compute_fighter_value(fdata)
        rows.append((fid, fdata, value))

    # sort by value desc, then by id for stable ordering
    rows.sort(key=lambda row: (-row[2], row[0]))
    return rows


def print_value_table(rows: List[Tuple[str, Dict[str, Any], int]]) -> None:
    """
    Print a formatted table of fighters and their value scores.
    """
    # Determine column widths
    id_width = max(len("ID"), max((len(fid) for fid, _, _ in rows), default=2))
    name_width = max(len("Name"), max((len(r[1].get("name", "")) for r in rows), default=4))
    role_width = max(len("Role"), max((len(r[1].get("role", "")) for r in rows), default=4))
    subrole_width = max(len("SubRole"), max((len(str(r[1].get("subRole", ""))) for r in rows), default=7))

    header = (
        f"{'ID'.ljust(id_width)}  "
        f"{'Name'.ljust(name_width)}  "
        f"{'Role'.ljust(role_width)}  "
        f"{'SubRole'.ljust(subrole_width)}  "
        f"{'Atk':>3}  {'Def':>3}  {'Spd':>3}  {'Bonus':>5}  {'Value':>5}"
    )

    print(header)
    print("-" * len(header))

    for fid, fdata, val in rows:
        name = str(fdata.get("name", ""))
        role = str(fdata.get("role", ""))
        subrole = str(fdata.get("subRole", ""))
        attack = int(fdata.get("attack", 0))
        defense = int(fdata.get("defense", 0))
        speed = int(fdata.get("speed", 0))
        bonus = get_subrole_bonus(subrole)

        line = (
            f"{fid.ljust(id_width)}  "
            f"{name.ljust(name_width)}  "
            f"{role.ljust(role_width)}  "
            f"{subrole.ljust(subrole_width)}  "
            f"{attack:>3}  {defense:>3}  {speed:>3}  {bonus:>5}  {val:>5}"
        )
        print(line)


def main() -> None:
    try:
        fighters = load_fighters_json()
        subroles = load_subroles_json()
    except (FileNotFoundError, ValueError) as e:
        print(f"[ERROR] {e}")
        return

    fighters = apply_subrole_stats(fighters, subroles)
    rows = build_value_table(fighters)
    print_value_table(rows)


if __name__ == "__main__":
    main()
