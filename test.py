#!/usr/bin/env python3
import json


def validate_subroles():
    with open('subroles.json', 'r', encoding='utf-8') as f:
        subroles = json.load(f)

    errors = []
    warnings = []

    expected_totals = {
        'Tank': 12,
        'DPS': 11,
        'Support': 10
    }

    for name, data in subroles.items():
        required_fields = ['attack', 'defense', 'speed', 'precision', 'hp']
        for field in required_fields:
            if field not in data:
                errors.append(f"{name}: Missing field '{field}'")

        if 'attack' in data and not (1 <= data['attack'] <= 6):
            errors.append(f"{name}: Attack {data['attack']} out of range (1-6)")
        if 'defense' in data and not (1 <= data['defense'] <= 6):
            errors.append(f"{name}: Defense {data['defense']} out of range (1-6)")
        if 'speed' in data and not (2 <= data['speed'] <= 5):
            warnings.append(f"{name}: Speed {data['speed']} unusual (expected 2-5)")
        if 'precision' in data and not (0 <= data['precision'] <= 4):
            errors.append(f"{name}: Precision {data['precision']} out of range (0-4)")

        if all(field in data for field in ['attack', 'defense', 'speed', 'precision']):
            total = data['attack'] + data['defense'] + data['speed'] + data['precision']

            if 'roles' in data:
                roles = data['roles']
                if 'Tank' in roles:
                    expected = 12
                elif 'DPS' in roles or 'Support' in roles:
                    expected = 11
            elif 'role' in data:
                expected = expected_totals.get(data['role'], 11)
            else:
                errors.append(f"{name}: No role or roles field")
                continue

            if total != expected:
                errors.append(f"{name}: Total {total} != expected {expected} for role(s)")

        if 'hp' in data:
            if data['hp'] < 5 or data['hp'] > 11:
                warnings.append(f"{name}: HP {data['hp']} unusual (expected 5-11)")

    if errors:
        print("❌ ERRORS:")
        for error in errors:
            print(f"  - {error}")
    else:
        print("✅ No errors found")

    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  - {warning}")

    if not errors and not warnings:
        print("\n🎉 All validations passed!")

    return len(errors) == 0


if __name__ == '__main__':
    success = validate_subroles()
    exit(0 if success else 1)
