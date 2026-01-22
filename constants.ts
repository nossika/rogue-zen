
import { TerrainType, Stats, Rarity, ElementType, UltimateType, TalentType, WeaponType, TalentDefinition, WeaponCategory, DebuffType, RarityConfigDefinition, UltimateDefinition, Item, ArmorType, EnemyConfigDefinition, ArmorEnchantmentType, Range, Percentage, Frame } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const MAP_WIDTH = 1400;
export const MAP_HEIGHT = 1400;

export const STAGE_TIME_LIMIT = 60; // 60 seconds

export const INITIAL_PLAYER_STATS: Stats = {
    maxHp: 150,
    hp: 150,
    shield: 0,
    defense: 5,
    attack: 5,
    attackSpeed: 0,
    range: 0,
    moveSpeed: 2,
    dodgeChance: 0,
    knockback: 0,
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
    stats: { attack: 10, range: 100, attackSpeed: 1, knockback: 10, critChance: 0.2, armorOnHit: 0 },
    level: 1,
    durability: 100
};

export const COLOR_PALETTE = {
    background: '#0f172a', // slate-900
    player: '#3b82f6', // blue-500
};

export const GOLD_CONFIG = {
    ENEMY: {
        CHANCE: 0.3,
        VALUE: 5,
    },
    BOSS: {
        CHANCE: 1.0,
        VALUE: 100,
    },
    INITIAL: {
        MIN: 1,
        MAX: 3,
        VALUE: 30
    }
};

export const RARITY_CONFIG: Record<Rarity, RarityConfigDefinition> = {
    [Rarity.COMMON]: { 
        color: '#9ca3af', // gray-400
        weight: 60,
        range: [0, 0.4],
        ultimateChance: 0,
        enchantmentChance: 0.1
    },
    [Rarity.RARE]: { 
        color: '#60a5fa', // blue-400
        weight: 25,
        range: [0.35, 0.65],
        ultimateChance: 0.1,
        enchantmentChance: 0.3
    },
    [Rarity.EPIC]: { 
        color: '#a855f7', // purple-500
        weight: 12,
        range: [0.6, 0.85],
        ultimateChance: 0.4,
        enchantmentChance: 0.6
    },
    [Rarity.LEGENDARY]: { 
        color: '#fbbf24', // amber-400
        weight: 3,
        range: [0.8, 1.0],
        ultimateChance: 1.0,
        enchantmentChance: 1.0
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
    BASE: 100,
    INCREMENT: 10
};

interface WeaponConfig {
    name: string;
    category: WeaponCategory;
    baseStats: {
        attack: number;
        range: number;
        attackSpeed: number;
        knockback: number;
        critChance: Percentage;
        armorOnHit: number;
    };
    color: string;
    penetrate: boolean;
}

export const WEAPON_BASE_CONFIG: Record<string, WeaponConfig> = {
    SWORD: { name: 'Sword', category: 'MELEE', baseStats: { attack: 15, range: 60, attackSpeed: 1, knockback: 15, critChance: 0.1, armorOnHit: 0 }, color: '#94a3b8', penetrate: true },
    AXE: { name: 'Axe', category: 'MELEE', baseStats: { attack: 25, range: 50, attackSpeed: 0.7, knockback: 25, critChance: 0.15, armorOnHit: 0 }, color: '#71717a', penetrate: true },
    DAGGER: { name: 'Dagger', category: 'MELEE', baseStats: { attack: 8, range: 40, attackSpeed: 2.2, knockback: 5, critChance: 0.25, armorOnHit: 0 }, color: '#475569', penetrate: false },
    PISTOL: { name: 'Pistol', category: 'RANGED', baseStats: { attack: 12, range: 300, attackSpeed: 1.2, knockback: 2, critChance: 0.1, armorOnHit: 0 }, color: '#d1d5db', penetrate: false },
    SPEAR: { name: 'Spear', category: 'MELEE', baseStats: { attack: 18, range: 80, attackSpeed: 0.7, knockback: 10, critChance: 0.1, armorOnHit: 0 }, color: '#9ca3af', penetrate: true },
    SNIPER: { name: 'Sniper', category: 'RANGED', baseStats: { attack: 40, range: 600, attackSpeed: 0.5, knockback: 40, critChance: 0.4, armorOnHit: 0 }, color: '#1f293b', penetrate: false },
    BOW: { name: 'Bow', category: 'RANGED', baseStats: { attack: 14, range: 250, attackSpeed: 1.3, knockback: 5, critChance: 0.15, armorOnHit: 0 }, color: '#a855f7', penetrate: false },
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
        baseStats: { range: 30, attackSpeed: 0.2 }
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
    chanceRange?: Range<Percentage>;
    durationRange?: Range<Frame>;
}

export const WEAPON_ENCHANTMENT_CONFIG: Record<string, WeaponEnchantmentConfigDefinition> = {
    NONE: { weight: 50 },
    SLOW: { weight: 20, type: 'SLOW', label: 'Freezing', chanceRange: [0.1, 0.3], durationRange: [60, 180] },
    STUN: { weight: 15, type: 'STUN', label: 'Stunning', chanceRange: [0.05, 0.15], durationRange: [30, 90] },
    BLEED: { weight: 15, type: 'BLEED', label: 'Serrated', chanceRange: [0.2, 0.4], durationRange: [120, 240] },
};

interface ArmorEnchantmentConfigDefinition {
    weight: number;
    type?: ArmorEnchantmentType;
    valueRange?: Range<Percentage>; 
}

export const ARMOR_ENCHANTMENT_CONFIG: Record<string, ArmorEnchantmentConfigDefinition> = {
    NONE: { weight: 50 },
    ELEMENTAL_RESIST: { weight: 20, type: 'ELEMENTAL_RESIST', valueRange: [0.5, 0.9] },
    BURN_RESIST: { weight: 10, type: 'BURN_RESIST', valueRange: [0.5, 0.9] },
    POISON_RESIST: { weight: 10, type: 'POISON_RESIST', valueRange: [0.5, 0.9] },
    STATUS_RESIST: { weight: 10, type: 'STATUS_RESIST', valueRange: [0.3, 0.5] }
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
    BLEED_DAMAGE_MULT: 1.5,
    BOSS_RESISTANCE: 3
};

// GROWTH VALUES HALVED AS REQUESTED
export const ENEMY_TYPES_CONFIG: Record<string, EnemyConfigDefinition> = {
    STANDARD: { 
        minStage: 1, spawnWeight: 50, color: '#ef4444', 
        radius: 16,
        baseHp: 20, hpGrowth: 1.5, 
        baseAttack: 10, attackGrowth: 0.7,
        speedMin: 0.8, speedMax: 1.8
    },
    FAST: { 
        minStage: 2, spawnWeight: 20, color: '#fbbf24', 
        radius: 12,
        baseHp: 12, hpGrowth: 0.9, 
        baseAttack: 8, attackGrowth: 0.6,
        speedMin: 2, speedMax: 2.8
    },
    TANK: { 
        minStage: 3, spawnWeight: 15, color: '#1e3a8a', 
        radius: 22,
        baseHp: 50, hpGrowth: 3.75, 
        baseAttack: 12, attackGrowth: 0.8,
        speedMin: 0.6, speedMax: 1.2
    },
    RANGED: { 
        minStage: 4, spawnWeight: 15, color: '#10b981', 
        radius: 14,
        baseHp: 16, hpGrowth: 1.2, 
        baseAttack: 10, attackGrowth: 0.8,
        speedMin: 1, speedMax: 1.6
    },
    BOMBER: { 
        minStage: 5, spawnWeight: 10, color: '#000000', 
        radius: 16,
        baseHp: 10, hpGrowth: 0.75, 
        baseAttack: 18, attackGrowth: 1,
        speedMin: 1, speedMax: 1.6
    },
    INCINERATOR: { 
        minStage: 8, spawnWeight: 8, color: '#b91c1c', 
        radius: 18,
        baseHp: 24, hpGrowth: 1.8, 
        baseAttack: 10, attackGrowth: 1,
        speedMin: 1, speedMax: 1.6
    },
    ZOMBIE: { 
        minStage: 7, spawnWeight: 20, color: '#65a30d', 
        radius: 16,
        baseHp: 24, hpGrowth: 1.8, 
        baseAttack: 10, attackGrowth: 0.9,
        speedMin: 1.6, speedMax: 2.4
    },
    IRON_BEETLE: { 
        minStage: 6, spawnWeight: 10, color: '#475569', 
        radius: 20,
        baseHp: 60, hpGrowth: 4.5, 
        baseAttack: 6, attackGrowth: 0.5,
        speedMin: 0.8, speedMax: 1.4
    },
    BOSS: { 
        minStage: 0, spawnWeight: 0, color: '#7e22ce', 
        radius: 48,
        baseHp: 600, hpGrowth: 50, 
        baseAttack: 10, attackGrowth: 1.25,
        speedMin: 1.2, speedMax: 1.7
    }
};

export const TALENT_CONFIG: Record<TalentType, TalentDefinition> = {
    [TalentType.SNIPER]: { 
        weight: 1, 
        ranges: { value1: [1.1, 1.3], value2: [0.5, 1.0], value3: [10, 20] }, 
        description: (v1: number, v2?: number, v3?: number) => 
            `+${Math.round((v1-1)*100)}% Ranged Range` + 
            (v2 ? `\n${Math.round(v2*100)}% Pierce Chance` : '') + 
            (v3 ? `\n+${Math.round(v3)} Ranged Knockback` : '')
    },
    [TalentType.FIGHTER]: { 
        weight: 1, 
        ranges: { value1: [1.1, 1.3], value2: [1.1, 1.5], value3: [1.5, 3.0] }, 
        description: (v1: number, v2?: number, v3?: number) => 
            `+${Math.round((v1-1)*100)}% Melee Speed` + 
            (v2 ? `\n+${Math.round((v2-1)*100)}% Melee Damage` : '') + 
            (v3 ? `\n+${Math.round(((v3 || 1)-1)*100)}% Shield on Hit` : '')
    },
    [TalentType.ARTISAN]: { 
        weight: 1, 
        ranges: { value1: [1.1, 1.5], value2: [0.5, 1] }, 
        description: (v1: number, v2?: number) => 
            `+${Math.round((v1-1)*100)}% Total Defense` +
            (v2 ? `\n-${Math.round(v2*100)}% Durability Loss` : '')
    },
    [TalentType.SCIENTIST]: { 
        weight: 1, 
        ranges: { value1: [1.1, 1.3], value2: [1.2, 1.4] }, 
        description: (v1: number, v2?: number) => 
            `+${Math.round((v1-1)*100)}% Ult Charge Rate` + 
            (v2 ? `\n+${Math.round((v2-1)*100)}% Ult Effectiveness` : '')
    },
    [TalentType.LUCKY]: { 
        weight: 0.5, 
        ranges: { value1: [0.05, 0.15], value2: [1, 2] }, 
        description: (v1: number, v2?: number) => 
            `+${Math.round(v1*100)}% Dodge Chance` +
            (v2 ? `\n+${Math.round(v2)} Free Rerolls` : '')
    },
};

export const ENEMIES_PER_STAGE_BASE = 10;
export const ENEMIES_PER_STAGE_SCALING = 4;

export const TERRAIN_CONFIG: Record<TerrainType, { color: string, label: string, density: number, zIndex: number }> = {
  WALL: { color: '#334155', label: 'Wall', density: 0.000003, zIndex: 100 },
  EARTH_WALL: { color: '#78350f', label: 'Earth Wall', density: 0.000003, zIndex: 90 },
  WATER: { color: 'rgba(14, 165, 233, 0.5)', label: 'Water', density: 0.0000015, zIndex: 10 },
  MUD: { color: 'rgba(67, 20, 7, 0.7)', label: 'Mud', density: 0.0000015, zIndex: 20 },
};
