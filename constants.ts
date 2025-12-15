
import { TerrainType, Stats, Rarity, ElementType, UltimateType, TalentType, WeaponType, TalentDefinition, WeaponCategory, DebuffType, RarityConfigDefinition, UltimateDefinition, Item, ArmorType } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 2000;

export const INITIAL_PLAYER_STATS: Stats = {
    maxHp: 150,
    hp: 150,
    shield: 0,
    defense: 0,
    attack: 5,
    attackSpeed: 0.1,
    range: 10,
    moveSpeed: 2,
    blockChance: 0,
    dodgeChance: 0,
    knockback: 2,
    critChance: 0.02,
    armorOnHit: 0,
    ultChargeRate: 0.5
};

export const INITIAL_PLAYER_WEAPON: Item = {
    id: 'starter_sword',
    name: 'Rusty Sword',
    type: 'WEAPON',
    subtype: 'SWORD',
    element: ElementType.NONE,
    rarity: Rarity.COMMON,
    stats: { attack: 10, range: 100, attackSpeed: 1.2, knockback: 8, critChance: 0.1, armorOnHit: 0 },
    level: 1,
    durability: 100
};

export const COLOR_PALETTE = {
    background: '#0f172a', // slate-900
    player: '#3b82f6', // blue-500
};

export const GOLD_VALUES = {
    NUGGET: 10,
    ENEMY_KILL: 5,
    MINION_KILL: 1,
    BOSS_KILL: 100
};

export const RARITY_CONFIG: Record<Rarity, RarityConfigDefinition> = {
    [Rarity.COMMON]: { 
        color: '#9ca3af', // gray-400
        statMult: 1.0, 
        weight: 60,
        talentChance: 0.2,
        talentStrength: 0,
        meleeArmorTarget: 0.2
    },
    [Rarity.RARE]: { 
        color: '#60a5fa', // blue-400
        statMult: 1.25, 
        weight: 25,
        talentChance: 0.5,
        talentStrength: 0.33,
        meleeArmorTarget: 0.5
    },
    [Rarity.EPIC]: { 
        color: '#a855f7', // purple-500
        statMult: 1.5, 
        weight: 12,
        talentChance: 0.8,
        talentStrength: 0.66,
        meleeArmorTarget: 0.9
    },
    [Rarity.LEGENDARY]: { 
        color: '#fbbf24', // amber-400
        statMult: 2.0, 
        weight: 3,
        talentChance: 1.0,
        talentStrength: 1.0,
        meleeArmorTarget: 1.4
    },
};

export const ELEMENT_CONFIG: Record<ElementType, { color: string, label: string, icon: string }> = {
    [ElementType.NONE]: { color: '#94a3b8', label: 'Neutral', icon: '⚪' },
    [ElementType.FIRE]: { color: '#ef4444', label: 'Fire', icon: '🔥' },
    [ElementType.WATER]: { color: '#3b82f6', label: 'Water', icon: '💧' },
    [ElementType.GRASS]: { color: '#22c55e', label: 'Grass', icon: '🌿' },
    [ElementType.EARTH]: { color: '#a16207', label: 'Earth', icon: '🪨' },
};

export const ELEMENT_ADVANTAGE: Record<ElementType, ElementType> = {
    [ElementType.FIRE]: ElementType.GRASS,
    [ElementType.GRASS]: ElementType.EARTH,
    [ElementType.EARTH]: ElementType.WATER,
    [ElementType.WATER]: ElementType.FIRE,
    [ElementType.NONE]: ElementType.NONE
};

export const REROLL_COST = {
    BASE: 50,
    INCREMENT: 25
};

interface WeaponConfig {
    name: string;
    category: WeaponCategory;
    baseStats: {
        attack: number;
        range: number;
        attackSpeed: number;
        knockback: number;
        critChance: number;
        armorOnHit: number;
    };
    color: string;
    penetrate: boolean;
}

export const WEAPON_BASE_CONFIG: Record<string, WeaponConfig> = {
    SWORD: { name: 'Sword', category: 'MELEE', baseStats: { attack: 15, range: 60, attackSpeed: 1.2, knockback: 15, critChance: 0.1, armorOnHit: 0 }, color: '#94a3b8', penetrate: true },
    AXE: { name: 'Axe', category: 'MELEE', baseStats: { attack: 25, range: 50, attackSpeed: 0.8, knockback: 25, critChance: 0.15, armorOnHit: 0 }, color: '#cbd5e1', penetrate: true },
    DAGGER: { name: 'Dagger', category: 'MELEE', baseStats: { attack: 8, range: 40, attackSpeed: 2.5, knockback: 5, critChance: 0.25, armorOnHit: 0 }, color: '#475569', penetrate: false },
    PISTOL: { name: 'Pistol', category: 'RANGED', baseStats: { attack: 12, range: 300, attackSpeed: 1.5, knockback: 2, critChance: 0.1, armorOnHit: 0 }, color: '#d1d5db', penetrate: false },
    SPEAR: { name: 'Spear', category: 'MELEE', baseStats: { attack: 18, range: 80, attackSpeed: 1.0, knockback: 10, critChance: 0.1, armorOnHit: 0 }, color: '#9ca3af', penetrate: true },
    SNIPER: { name: 'Sniper', category: 'RANGED', baseStats: { attack: 40, range: 600, attackSpeed: 0.5, knockback: 40, critChance: 0.4, armorOnHit: 0 }, color: '#1f293b', penetrate: true },
    BOW: { name: 'Bow', category: 'RANGED', baseStats: { attack: 14, range: 250, attackSpeed: 1.8, knockback: 5, critChance: 0.15, armorOnHit: 0 }, color: '#a855f7', penetrate: false },
    BOMB: { name: 'Bomb', category: 'THROWN', baseStats: { attack: 30, range: 250, attackSpeed: 0.6, knockback: 30, critChance: 0, armorOnHit: 0 }, color: '#000000', penetrate: false },
};

interface ArmorConfig {
    name: string;
    baseStats: Partial<Stats>;
    perLevelStats?: Partial<Stats>;
}

export const ARMOR_BASE_CONFIG: Record<ArmorType, ArmorConfig> = {
    SHIELD: {
        name: 'Shield',
        baseStats: { defense: 2, shield: 20 },
        perLevelStats: { defense: 1.5, shield: 2 }
    },
    GLOVES: {
        name: 'Gloves',
        baseStats: { range: 30, attackSpeed: 0.1 }
    },
    BOOTS: {
        name: 'Boots',
        baseStats: { moveSpeed: 0.5, ultChargeRate: 0.5 }
    }
};

export const ULTIMATE_CONFIG: Record<UltimateType, UltimateDefinition> = {
    [UltimateType.AOE_BLAST]: { weight: 10, baseAmount: 8, description: "Deal massive area damage" },
    [UltimateType.SHIELD]: { weight: 10, baseAmount: 0.5, description: "Gain temporary shield" },
    [UltimateType.TIME_STOP]: { weight: 5, duration: 300, description: "Freeze enemies for a short duration" },
    [UltimateType.INVINCIBILITY]: { weight: 5, duration: 240, description: "Become immune to damage" },
    [UltimateType.SPEED_BOOST]: { weight: 10, duration: 480, description: "Increase movement and attack speed" },
    [UltimateType.OMNI_FORCE]: { weight: 5, duration: 480, description: "Deal effective damage to all elements" },
    [UltimateType.BLOCK]: { weight: 8, baseAmount: 160, description: "Create a wall to block enemies" },
};

interface WeaponEnchantmentConfigDefinition {
    weight: number;
    type?: DebuffType;
    label?: string;
    chanceRange?: [number, number];
    durationRange?: [number, number];
}

export const WEAPON_ENCHANTMENT_CONFIG: Record<string, WeaponEnchantmentConfigDefinition> = {
    NONE: { weight: 70 },
    SLOW: { weight: 10, type: 'SLOW', label: 'Freezing', chanceRange: [0.1, 0.3], durationRange: [60, 180] },
    STUN: { weight: 5, type: 'STUN', label: 'Stunning', chanceRange: [0.05, 0.15], durationRange: [30, 90] },
    BLEED: { weight: 15, type: 'BLEED', label: 'Serrated', chanceRange: [0.2, 0.4], durationRange: [120, 240] },
};

export const DETAIL_COLORS = {
    wood: '#854d0e',
    steel: '#94a3b8',
    darkSteel: '#475569',
    gold: '#fbbf24',
    skin: '#fca5a5',
    enemyEye: '#facc15'
};

export const DEBUFF_CONFIG = {
    SLOW_SPEED_MULT: 0.5,
    BLEED_DAMAGE_MULT: 1.25,
    BOSS_RESISTANCE: 3
};

interface EnemyConfig {
    minStage: number;
    spawnWeight: number;
    sizeMult: number;
    hpMult: number;
    attackMult: number;
    speedMult: number;
    color: string;
}

export const ENEMY_TYPES_CONFIG: Record<string, EnemyConfig> = {
    STANDARD: { minStage: 1, spawnWeight: 50, sizeMult: 1, hpMult: 1, attackMult: 1, speedMult: 1, color: '#ef4444' },
    FAST: { minStage: 2, spawnWeight: 20, sizeMult: 0.8, hpMult: 0.6, attackMult: 0.8, speedMult: 1.5, color: '#fbbf24' },
    TANK: { minStage: 3, spawnWeight: 15, sizeMult: 1.4, hpMult: 2.5, attackMult: 1.2, speedMult: 0.6, color: '#1e3a8a' },
    RANGED: { minStage: 4, spawnWeight: 15, sizeMult: 0.9, hpMult: 0.8, attackMult: 1.1, speedMult: 0.9, color: '#10b981' },
    BOMBER: { minStage: 5, spawnWeight: 10, sizeMult: 1, hpMult: 0.5, attackMult: 3, speedMult: 1.2, color: '#000000' },
    INCINERATOR: { minStage: 8, spawnWeight: 8, sizeMult: 1.1, hpMult: 1.2, attackMult: 1.5, speedMult: 1.0, color: '#b91c1c' },
    ZOMBIE: { minStage: 7, spawnWeight: 20, sizeMult: 1, hpMult: 1.2, attackMult: 0.8, speedMult: 0.5, color: '#65a30d' },
    IRON_BEETLE: { minStage: 6, spawnWeight: 10, sizeMult: 1.3, hpMult: 3.0, attackMult: 0.5, speedMult: 0.4, color: '#475569' },
    BOSS: { minStage: 0, spawnWeight: 0, sizeMult: 3, hpMult: 50, attackMult: 2, speedMult: 0.8, color: '#7e22ce' }
};

export const TALENT_CONFIG: Record<TalentType, TalentDefinition> = {
    [TalentType.SNIPER]: { weight: 1, ranges: { value1: [1.1, 1.3], value2: [1.1, 1.2], value3: [10, 20] }, description: (v1: number) => `+${Math.round((v1-1)*100)}% Range` },
    [TalentType.FIGHTER]: { weight: 1, ranges: { value1: [1.1, 1.2], value2: [1.1, 1.2], value3: [1.1, 1.2] }, description: (v1: number) => `+${Math.round((v1-1)*100)}% Atk Speed` },
    [TalentType.ARTISAN]: { weight: 1, ranges: { value1: [1.1, 1.3], value2: [0.1, 0.3] }, description: (v1: number) => `+${Math.round((v1-1)*100)}% Defense` },
    [TalentType.SCIENTIST]: { weight: 1, ranges: { value1: [1.1, 1.3], value2: [1.1, 1.2] }, description: (v1: number) => `+${Math.round((v1-1)*100)}% Ult Charge` },
    [TalentType.LUCKY]: { weight: 0.5, ranges: { value1: [0.05, 0.15] }, description: (v1: number) => `+${Math.round(v1*100)}% Dodge` },
};

export const ENEMIES_PER_STAGE_BASE = 10;
export const ENEMIES_PER_STAGE_SCALING = 4;

export const TERRAIN_CONFIG: Record<TerrainType, { color: string, label: string, density: number }> = {
  WALL: { color: '#334155', label: 'Wall', density: 0.000003 }, // ~7.5 items on 1600x1600
  EARTH_WALL: { color: '#78350f', label: 'Earth Wall', density: 0.000003 }, // ~7.5 items
  WATER: { color: 'rgba(14, 165, 233, 0.5)', label: 'Water', density: 0.0000015 }, // ~3.8 items
  MUD: { color: 'rgba(67, 20, 7, 0.7)', label: 'Mud', density: 0.0000015 }, // ~3.8 items
};
