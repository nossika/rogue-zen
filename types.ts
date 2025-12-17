
export type Percentage = number; // float from 0 to 1 
export type Range<T = number> = [T, T]; // [min, max]
export type Frame = number; // render frame
export type Position = number; // position of the coordinate system

export type ImageSize = '1K' | '2K' | '4K';

export enum Rarity {
  COMMON = 'Common',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
}

export enum ElementType {
  NONE = 'NONE',
  FIRE = 'FIRE',
  WATER = 'WATER',
  GRASS = 'GRASS',
  EARTH = 'EARTH',
}

export enum UltimateType {
  AOE_BLAST = 'AOE_BLAST',
  SPEED_BOOST = 'SPEED_BOOST',
  SHIELD = 'SHIELD',
  TIME_STOP = 'TIME_STOP',
  INVINCIBILITY = 'INVINCIBILITY',
  OMNI_FORCE = 'OMNI_FORCE', // Universal Element (Replaces CRIT_SURGE)
  BLOCK = 'BLOCK', // Summons a wall
}

export enum TalentType {
  SNIPER = 'SNIPER',       // Buffs Ranged
  FIGHTER = 'FIGHTER',     // Buffs Melee
  ARTISAN = 'ARTISAN',     // Was TANK. Defense Mult & Durability Loss Reduction
  SCIENTIST = 'SCIENTIST', // Ult Charge & Effect
  LUCKY = 'LUCKY',         // Free Reroll & Dodge
}

export type DebuffType = 'SLOW' | 'STUN' | 'BLEED';
export type WeaponCategory = 'MELEE' | 'RANGED' | 'THROWN';

export interface WeaponEnchantment {
  type: DebuffType;
  chance: Percentage; 
  duration: Frame; 
  label: string;
}

export type ArmorEnchantmentType = 'ELEMENTAL_RESIST' | 'BURN_RESIST' | 'POISON_RESIST' | 'STATUS_RESIST';

export interface ArmorEnchantment {
    type: ArmorEnchantmentType;
    value: Percentage; // Percentage reduction (0.5 to 0.9)
    element?: ElementType; // Required if type is ELEMENTAL_RESIST
    label: string; // Description text (e.g. "-50% Fire Dmg")
    title: string; // Display Title (e.g. "Fire Ward")
}

export interface Talent {
  type: TalentType;
  rarity: Rarity; 
  value1: number; // Primary Multiplier/Value (e.g. Dmg, DefMult, Dodge)
  value2?: number; // Secondary Multiplier/Value (e.g. Range, DurabilitySave)
  value3?: number; // Tertiary (e.g. Knockback, ArmorOnHit)
  description: string;
}

// Configuration Interfaces
export interface TalentDefinition {
  weight: number;
  ranges: {
    value1: Range; 
    value2?: Range;
    value3?: Range;
  };
  description: (v1: number, v2?: number, v3?: number) => string;
}

export interface UltimateDefinition {
  weight: number;
  description: string;
  duration?: Frame; // Base frames
  baseAmount?: number; // Base damage/shield amount
}

export interface RarityConfigDefinition {
    color: string;
    weight: number;
    range: Range<Percentage>; // Percentile range (0 to 1) of the stat spread
    ultimateChance: Percentage; 
    enchantmentChance: Percentage; 
}

export type WeaponType = 'SWORD' | 'AXE' | 'DAGGER' | 'PISTOL' | 'SPEAR' | 'SNIPER' | 'BOW' | 'BOMB';
export type ArmorType = 'SHIELD' | 'GLOVES' | 'BOOTS';

export type EnemyType = 'STANDARD' | 'FAST' | 'TANK' | 'RANGED' | 'BOSS' | 'BOMBER' | 'INCINERATOR' | 'ZOMBIE' | 'IRON_BEETLE';
export type BossAbility = 'INVINCIBLE_ARMOR' | 'BERSERKER' | 'HIVE_MIND' | 'BLINK' | 'SPLIT';

export interface EnemyConfigDefinition {
    minStage: number;
    spawnWeight: number;
    color: string;
    
    // Size (radius/width approx)
    radius: number;

    // Stats
    baseHp: number;
    hpGrowth: number; // Per player level
    
    baseAttack: number;
    attackGrowth: number; // Per player level
    
    speedMin: number;
    speedMax: number;
}

export type TerrainType = 'WALL' | 'WATER' | 'MUD' | 'EARTH_WALL';
export type HazardType = 'EXPLOSION' | 'FIRE' | 'POISON';

export interface Terrain {
  id: string;
  x: Position;
  y: Position;
  width: number;
  height: number;
  type: TerrainType;
}

export interface Hazard {
  id: string;
  x: Position;
  y: Position;
  radius: number;
  damage: number;
  duration: Frame; // Frames remaining
  maxDuration: Frame;
  type: HazardType;
  tickRate: Frame; // How often it deals damage (0 for once)
  tickTimer: Frame;
  source: 'PLAYER' | 'ENEMY'; // Who created it
  element: ElementType;
  critChance?: Percentage;
  knockback?: number;
}

export interface GoldDrop {
  id: string;
  x: Position;
  y: Position;
  amount: number;
  collected: boolean;
}

export interface Stats {
  maxHp: number;
  hp: number;
  shield: number; // Temporary HP / Armor Value
  defense: number;
  attack: number;
  attackSpeed: number; // Attacks per second
  range: number;
  moveSpeed: number;
  dodgeChance: Percentage; 
  knockback: number;
  critChance: Percentage; 
  armorOnHit: number; // Shield gained per hit
  ultChargeRate: number; // Passive Ultimate charge per second
}

export interface Item {
  id: string;
  name: string;
  type: 'WEAPON' | 'ARMOR';
  subtype?: WeaponType | ArmorType; // Specific type
  element?: ElementType; // Weapon Element
  rarity: Rarity;
  stats: Partial<Stats>;
  ultimate?: UltimateType; // Only for Weapons now
  ultimateName?: string;
  enchantment?: WeaponEnchantment; // Only for Weapons now
  armorEnchantment?: ArmorEnchantment; // Only for Armor now
  description?: string;
  level: number;
  durability: number; // 0 to 100
  _targetSlot?: 'weapon1' | 'weapon2' | 'armor1' | 'armor2'; // For replacement logic
}

// Special type for upgrade choices that aren't items
export interface StatUpgrade {
    title: string;
    stats?: Partial<Stats>;
    healPercent?: Percentage;
}

export type UpgradeReward = Item | StatUpgrade | Talent;

export interface Entity {
  id: string;
  x: Position;
  y: Position;
  width: number;
  height: number;
  stats: Stats;
  color: string;
  sprite?: string; // Data URL
  dead: boolean;
  angle: number; // For facing direction
  velocity: { x: number; y: number };
}

export interface Player extends Entity {
  equipment: {
    weapon1: Item | null;
    weapon2: Item | null;
    armor1: Item | null;
    armor2: Item | null;
  };
  talent: Talent | null; // One specialized talent slot
  permanentStats: Stats; // Tracks base stats + permanent upgrades (level ups)
  ultimateCharge: number; // 0-100
  level: number; // Current Stage Level
  gold: number;
}

export interface Enemy extends Entity {
  tier: number; // Increases difficulty
  type: EnemyType;
  element: ElementType;
  attackCooldown: Frame;
  summonCooldown?: Frame;
  isMinion?: boolean;
  stunTimer?: Frame; // Legacy, can be merged with debuffs.STUN, keeping for now
  buffCooldown?: Frame; // For Support enemies (e.g. Iron Beetle)
  
  // Status Effects
  debuffs: {
      SLOW: Frame; // Duration in frames
      STUN: Frame;
      BLEED: Frame;
  };

  // Boss Specifics
  bossAbilities?: BossAbility[];
  totalDamageTaken?: number;
  abilityTimers?: Record<string, Frame>;
  
  // Visual state
  deathTimer?: Frame;
}

export interface Projectile {
  id: string;
  x: Position;
  y: Position;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  duration: Frame; // Frames to live
  source: 'PLAYER' | 'ENEMY';
  element: ElementType;
  penetrate: boolean;
  isMelee?: boolean;
  knockback: number;
  critChance: Percentage;
  armorGain: number; // Shield to add on hit
  hitEnemies: Set<string>; // IDs of entities already hit by this projectile
  
  // Weapon Enchantment Proc
  enchantment?: WeaponEnchantment;

  // Bomb Specifics
  isBomb?: boolean;
  isIncendiary?: boolean; // Creates fire zone
  targetX?: Position;
  targetY?: Position;
  maxDuration?: Frame; // Total flight time for lerping if needed, reusing duration currently
}

export interface Particle {
    id: string;
    x: Position;
    y: Position;
    vx: number;
    vy: number;
    life: Frame;
    maxLife: Frame;
    color: string;
    size: number;
}

export interface GameAssets {
  playerSprite: string | null;
  enemySprite: string | null;
  groundTexture: string | null;
}

export interface FloatingText {
  id: string;
  x: Position;
  y: Position;
  text: string;
  color: string;
  duration: Frame; // Frames to live
  opacity: number;
  vy: number; // Float speed
  isCrit?: boolean;
}
