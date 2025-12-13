
import { ElementType } from "../types";
import { ELEMENT_ADVANTAGE } from "../constants";

export const checkRectOverlap = (x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) => {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
};

export const getElementalMultiplier = (attacker: ElementType, defender: ElementType): number => {
    if (attacker === ElementType.NONE || defender === ElementType.NONE) return 1.0;
    
    // Check Advantage (3x)
    if (ELEMENT_ADVANTAGE[attacker] === defender) {
        return 3.0;
    }

    // Check Disadvantage (0.5x)
    // If Attacker is the target of Defender's Advantage, then Attacker is weak
    if (ELEMENT_ADVANTAGE[defender] === attacker) {
        return 0.5;
    }

    return 1.0;
};

// Generic weighted random picker
// items: key -> { weight: number, ... }
export function getWeightedRandom<T extends string>(config: Record<T, { weight: number }>): T {
    const keys = Object.keys(config) as T[];
    const totalWeight = keys.reduce((sum, key) => sum + config[key].weight, 0);
    
    let random = Math.random() * totalWeight;
    for (const key of keys) {
        random -= config[key].weight;
        if (random <= 0) {
            return key;
        }
    }
    return keys[0]; // Fallback
}
