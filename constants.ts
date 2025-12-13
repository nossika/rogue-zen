
import { Rarity, UltimateType, WeaponType, EnemyType, TerrainType, ElementType, TalentType, TalentDefinition, UltimateDefinition } from './types';

// Detect mobile device width (simplified check)
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

// Reduce logical resolution on mobile so text/UI remains readable when scaled down by CSS
export const CANVAS_WIDTH = isMobile ? 600 : 1200;
export const CANVAS_HEIGHT = isMobile ? 400 : 800;

// Map Reduced by approx 1/3 (Area)
// Original: 2500x2500 = 6.25M
// Reduced 1 (Previous): 2050x2050
// Reduced 2 (Current): 1600x1600 = 2.56M
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1600;

export const INITIAL_PLAYER_STATS = {
  maxHp: 150,
  hp: 150,
  shield: 0,       // Initialize shield
  defense: 5,
  attack: 5,       // Base Strength (additive)
  attackSpeed: 0,  // Base Speed Modifier (additive)
  range: 0,        // Base Range Modifier (additive)
  moveSpeed: 2.72, // Reduced by 15% from 3.2
  blockChance: 0.1,
  dodgeChance: 0,  // Base Dodge Chance
  knockback: 0,    // Base Knockback Modifier (additive)
  critChance: 0.01, // 1% Base Crit
  armorOnHit: 0,   // Base Armor/Shield Gain on hit
  ultChargeRate: 0.2, // Base passive charge rate
};

export const GOLD_VALUES = {
  NUGGET: 30,
  ENEMY_KILL: 1,
  BOSS_KILL: 100,
  MINION_KILL: 0,
};

export const REROLL_COST = {
  BASE: 80,
  INCREMENT: 20,
};

export const ENEMIES_PER_STAGE_BASE = 12;
export const ENEMIES_PER_STAGE_SCALING = 4;

interface WeaponConfig {
  baseStats: {
    attack: number;
    attackSpeed: number;
    range: number;
    knockback: number;
    critChance: number;
    armorOnHit: number;
  };
  color: string;
  penetrate: boolean;
  name: string;
}

export const WEAPON_BASE_CONFIG: Record<WeaponType, WeaponConfig> = {
  SWORD: { 
    baseStats: { attack: 10, attackSpeed: 0.98, range: 110, knockback: 8, critChance: 0.10, armorOnHit: 0 },
    color: '#e2e8f0', 
    penetrate: true, 
    name: "Sword" 
  },
  AXE: { 
    baseStats: { attack: 28, attackSpeed: 0.49, range: 130, knockback: 25, critChance: 0.05, armorOnHit: 0 },
    color: '#94a3b8', 
    penetrate: true, 
    name: "Axe" 
  },
  DAGGER: { 
    baseStats: { attack: 7, attackSpeed: 1.75, range: 70, knockback: 2, critChance: 0.25, armorOnHit: 0 },
    color: '#f1f5f9', 
    penetrate: false, 
    name: "Dagger" 
  },
  PISTOL: { 
    baseStats: { attack: 10, attackSpeed: 0.7, range: 500, knockback: 1, critChance: 0.15, armorOnHit: 0 },
    color: '#475569', 
    penetrate: false, 
    name: "Pistol" 
  },
  SPEAR: { 
    baseStats: { attack: 16, attackSpeed: 0.56, range: 190, knockback: 15, critChance: 0.12, armorOnHit: 0 },
    color: '#cbd5e1', 
    penetrate: true, 
    name: "Spear" 
  },
  SNIPER: { 
    baseStats: { attack: 45, attackSpeed: 0.28, range: 800, knockback: 40, critChance: 0.40, armorOnHit: 0 },
    color: '#334155', 
    penetrate: true, 
    name: "Sniper" 
  },
  BOW: { 
    baseStats: { attack: 18, attackSpeed: 0.63, range: 350, knockback: 5, critChance: 0.20, armorOnHit: 0 },
    color: '#a855f7', 
    penetrate: false, 
    name: "Bow" 
  },
  BOMB: {
    baseStats: { attack: 35, attackSpeed: 0.4, range: 250, knockback: 30, critChance: 0.10, armorOnHit: 0 },
    color: '#1f2937', 
    penetrate: true, 
    name: "Bomb"
  }
};

interface EnemyConfig {
  hpMult: number;
  speedMult: number;
  sizeMult: number;
  attackMult: number;
  color: string;
  label: string;
  minStage: number; // Stage required to start spawning
  spawnWeight: number; // Relative weight for random selection
}

// Reduced speedMult by ~10% across the board
// Updated Boss stats: HpMult 25->50 (2x), AttackMult 2.5->1.25 (0.5x) to move logic out of spawn function
export const ENEMY_TYPES_CONFIG: Record<EnemyType, EnemyConfig> = {
  STANDARD: { hpMult: 1, speedMult: 0.50, sizeMult: 1, attackMult: 1, color: '#e94560', label: "Minion", minStage: 1, spawnWeight: 40 },
  FAST: { hpMult: 0.5, speedMult: 0.86, sizeMult: 0.7, attackMult: 0.7, color: '#fbbf24', label: "Scout", minStage: 2, spawnWeight: 40 },
  TANK: { hpMult: 2.5, speedMult: 0.29, sizeMult: 1.5, attackMult: 1.5, color: '#7e22ce', label: "Brute", minStage: 2, spawnWeight: 40 },
  RANGED: { hpMult: 0.8, speedMult: 0.43, sizeMult: 0.9, attackMult: 0.8, color: '#22c55e', label: "Shooter", minStage: 3, spawnWeight: 35 },
  BOMBER: { hpMult: 0.9, speedMult: 0.40, sizeMult: 1.1, attackMult: 2.0, color: '#f97316', label: "Bomber", minStage: 4, spawnWeight: 25 },
  ZOMBIE: { hpMult: 2, speedMult: 0.6, sizeMult: 1.1, attackMult: 2.5, color: '#65a30d', label: "Zombie", minStage: 5, spawnWeight: 20 },
  INCINERATOR: { hpMult: 1.0, speedMult: 0.40, sizeMult: 1.1, attackMult: 1.5, color: '#dc2626', label: "Incinerator", minStage: 6, spawnWeight: 20 },
  IRON_BEETLE: { hpMult: 1.5, speedMult: 0.35, sizeMult: 1.2, attackMult: 0.8, color: '#94a3b8', label: "Iron Beetle", minStage: 3, spawnWeight: 25 },
  BOSS: { hpMult: 30, speedMult: 0.22, sizeMult: 3, attackMult: 1.25, color: '#4c1d95', label: "BOSS", minStage: 0, spawnWeight: 0 },
};

export const ELEMENT_CONFIG: Record<ElementType, { color: string, label: string, icon: string }> = {
  [ElementType.NONE]: { color: '#94a3b8', label: 'Normal', icon: '⚪' },
  [ElementType.FIRE]: { color: '#ef4444', label: 'Fire', icon: '🔥' },
  [ElementType.WATER]: { color: '#3b82f6', label: 'Water', icon: '💧' },
  [ElementType.GRASS]: { color: '#22c55e', label: 'Grass', icon: '🌿' },
  [ElementType.EARTH]: { color: '#654321', label: 'Earth', icon: '🪨' }, 
};

// Cycle: Water > Fire > Grass > Earth > Water
export const ELEMENT_WEAKNESS: Record<ElementType, ElementType | null> = {
  [ElementType.NONE]: null,
  [ElementType.FIRE]: ElementType.WATER,
  [ElementType.WATER]: ElementType.EARTH,
  [ElementType.GRASS]: ElementType.FIRE,
  [ElementType.EARTH]: ElementType.GRASS,
};

// Attack -> Defend
// Key beats Value
export const ELEMENT_ADVANTAGE: Record<ElementType, ElementType | null> = {
  [ElementType.NONE]: null,
  [ElementType.FIRE]: ElementType.GRASS,
  [ElementType.WATER]: ElementType.FIRE,
  [ElementType.GRASS]: ElementType.EARTH,
  [ElementType.EARTH]: ElementType.WATER,
};


export const TERRAIN_CONFIG: Record<TerrainType, { color: string, label: string }> = {
  WALL: { color: '#334155', label: 'Wall' }, // Slate-700
  EARTH_WALL: { color: '#78350f', label: 'Earth Wall' }, // Amber-900
  WATER: { color: 'rgba(14, 165, 233, 0.5)', label: 'Water' }, // Sky-500 transparent
  MUD: { color: 'rgba(67, 20, 7, 0.7)', label: 'Mud' }, // Rusty brown
};

// --- CONFIGURATION: ULTIMATES ---
export const ULTIMATE_CONFIG: Record<UltimateType, UltimateDefinition> = {
  [UltimateType.AOE_BLAST]: {
    weight: 20,
    description: "Deals massive damage to all nearby enemies.",
    baseAmount: 8 // Damage Multiplier (Attack + 50) * 8
  },
  [UltimateType.SPEED_BOOST]: {
    weight: 20,
    description: "Doubles movement and attack speed for 12s.",
    duration: 720 // frames (12s)
  },
  [UltimateType.SHIELD]: {
    weight: 25,
    description: "Gain temporary Shield equal to 50% Max HP.",
    baseAmount: 0.5 // 50% Max HP
  },
  [UltimateType.TIME_STOP]: {
    weight: 15,
    description: "Freezes enemies in time for 9s.",
    duration: 540 // frames (9s)
  },
  [UltimateType.INVINCIBILITY]: {
    weight: 10,
    description: "Become immune to all damage for 7.5s.",
    duration: 450 // frames (7.5s)
  },
  [UltimateType.OMNI_FORCE]: {
    weight: 15,
    description: "Attacks always trigger Elemental Advantage (3x Dmg) for 12s.",
    duration: 720 // frames (12s)
  },
  [UltimateType.BLOCK]: {
    weight: 20,
    description: "Summons a large Stone Wall in front of you.",
    baseAmount: 160 // Base wall length
  }
};

// Helper for UI backward compatibility
export const ULTIMATE_DESCRIPTIONS: Record<UltimateType, string> = Object.entries(ULTIMATE_CONFIG).reduce((acc, [key, val]) => {
  acc[key as UltimateType] = val.description;
  return acc;
}, {} as Record<UltimateType, string>);


// --- CONFIGURATION: TALENTS ---
export const TALENT_CONFIG: Record<TalentType, TalentDefinition> = {
  [TalentType.SNIPER]: {
    weight: 20,
    ranges: {
      value1: [1.2, 1.8], // Range Multiplier
      value2: [1.2, 2.0], // Damage Multiplier
      value3: [1, 5]      // Knockback Add (Int)
    },
    description: (v1, v2, v3) => `Ranged Wpn: Range x${v1}, Dmg x${v2}, KB +${v3}`
  },
  [TalentType.FIGHTER]: {
    weight: 20,
    ranges: {
      value1: [1.2, 1.8], // Speed Multiplier
      value2: [1.2, 2.0], // Damage Multiplier
      value3: [1.2, 2.0]  // ArmorOnHit Multiplier
    },
    description: (v1, v2, v3) => `Melee Wpn: Spd x${v1}, Dmg x${v2}, Armor/Hit x${v3}`
  },
  [TalentType.ARTISAN]: {
    weight: 20,
    ranges: {
      value1: [1.5, 2.5], // Defense Multiplier
      value2: [0.5, 1.0]  // Durability Save
    },
    description: (v1, v2) => `Artisan Mastery: Defense x${v1}, Durability Loss -${(v2!*100).toFixed(0)}%`
  },
  [TalentType.SCIENTIST]: {
    weight: 20,
    ranges: {
      value1: [1.2, 2.5], // Charge Rate Multiplier (Combined range logic handled in ArmorSystem for distinctness)
      value2: [1.2, 2.5]  // Effect Multiplier
    },
    description: (v1, v2) => `Ult Charge x${v1}, Ult Effect x${v2}`
  },
  [TalentType.LUCKY]: {
    weight: 15,
    ranges: {
      value1: [0.1, 0.3], // Dodge Chance
      value2: [1, 1]      // Free Rerolls (Fixed)
    },
    description: (v1) => `Free Reroll per Stage, Dodge Chance +${(v1*100).toFixed(0)}%`
  }
};


export const COLOR_PALETTE = {
  background: '#1a1a2e',
  player: '#0f3460',
  enemy: '#e94560',
  projectile: '#fcd307',
  meleeSlash: '#a5f3fc',
  text: '#ffffff',
  uiBg: 'rgba(22, 33, 62, 0.9)',
};

export const DETAIL_COLORS = {
  skin: '#ffdbac',
  wood: '#8b4513',
  steel: '#cbd5e1',
  darkSteel: '#64748b',
  gold: '#fbbf24',
  blood: '#ef4444',
  enemyEye: '#fcd34d',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  [Rarity.COMMON]: '#9ca3af',
  [Rarity.RARE]: '#60a5fa',
  [Rarity.EPIC]: '#a855f7',
  [Rarity.LEGENDARY]: '#fbbf24',
};
