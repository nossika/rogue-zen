
import { Rarity, UltimateType, WeaponType, EnemyType, TerrainType, ElementType } from './types';

// Detect mobile device width (simplified check)
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

// Reduce logical resolution on mobile so text/UI remains readable when scaled down by CSS
export const CANVAS_WIDTH = isMobile ? 600 : 1200;
export const CANVAS_HEIGHT = isMobile ? 400 : 800;

export const MAP_WIDTH = 2500;
export const MAP_HEIGHT = 2500;

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
  NUGGET: 25,
  ENEMY_KILL: 1,
  BOSS_KILL: 100,
  MINION_KILL: 0,
};

export const REROLL_COST = {
  BASE: 100,
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
  [ElementType.EARTH]: { color: '#a855f7', label: 'Earth', icon: '🪨' }, 
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

export const ULTIMATE_DESCRIPTIONS: Record<UltimateType, string> = {
  [UltimateType.AOE_BLAST]: "Deals massive damage to all nearby enemies.",
  [UltimateType.SPEED_BOOST]: "Doubles movement and attack speed for 8s.",
  [UltimateType.SHIELD]: "Gain temporary Shield equal to 50% Max HP.",
  [UltimateType.TIME_STOP]: "Freezes enemies in time for 9s.",
  [UltimateType.INVINCIBILITY]: "Become immune to all damage for 7.5s.",
  [UltimateType.OMNI_FORCE]: "Attacks always trigger Elemental Advantage (2x Dmg) for 12s.",
  [UltimateType.BLOCK]: "Summons a large Stone Wall in front of you.",
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
