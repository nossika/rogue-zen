
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
}

export enum TalentType {
  SNIPER = 'SNIPER',       // Buffs Ranged
  FIGHTER = 'FIGHTER',     // Buffs Melee
  TANK = 'TANK',           // Defense Mult & Durability Loss Reduction
  SCIENTIST = 'SCIENTIST', // Ult Charge & Effect
  LUCKY = 'LUCKY',         // Free Reroll & Dodge
}

export interface Talent {
  type: TalentType;
  value1: number; // Primary Multiplier/Value (e.g. Dmg, DefMult, Dodge)
  value2?: number; // Secondary Multiplier/Value (e.g. Range, DurabilitySave)
  value3?: number; // Tertiary (e.g. Knockback, ArmorOnHit)
  description: string;
}

export type WeaponType = 'SWORD' | 'AXE' | 'DAGGER' | 'PISTOL' | 'SPEAR' | 'SNIPER' | 'BOW';
export type ArmorType = 'SHIELD' | 'GLOVES' | 'BOOTS';

export type EnemyType = 'STANDARD' | 'FAST' | 'TANK' | 'RANGED' | 'BOSS' | 'BOMBER' | 'INCINERATOR' | 'ZOMBIE';
export type BossAbility = 'INVINCIBLE_ARMOR' | 'BERSERKER' | 'HIVE_MIND' | 'BLINK' | 'SPLIT';

export type TerrainType = 'WALL' | 'WATER' | 'MUD' | 'EARTH_WALL';
export type HazardType = 'EXPLOSION' | 'FIRE' | 'POISON';

export interface Terrain {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: TerrainType;
}

export interface Hazard {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number; // Frames remaining
  maxDuration: number;
  type: HazardType;
  tickRate: number; // How often it deals damage (0 for once)
  tickTimer: number;
  source: 'PLAYER' | 'ENEMY'; // Who created it (to determine friendly fire if needed, currently assumes Enemy source hurts Player)
}

export interface GoldDrop {
  id: string;
  x: number;
  y: number;
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
  blockChance: number; // 0-1
  dodgeChance: number; // 0-1
  knockback: number;
  critChance: number; // 0-1
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
  talent?: Talent; // Only for Armor now
  description?: string;
  level: number;
  durability: number; // 0 to 100
  _targetSlot?: 'weapon1' | 'weapon2' | 'armor1' | 'armor2'; // For replacement logic
}

// Special type for upgrade choices that aren't items
export interface StatUpgrade {
    title: string;
    stats?: Partial<Stats>;
    healPercent?: number;
}

export type UpgradeReward = Item | StatUpgrade;

export interface Entity {
  id: string;
  x: number;
  y: number;
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
  permanentStats: Stats; // Tracks base stats + permanent upgrades (level ups)
  ultimateCharge: number; // 0-100
  level: number; // Current Stage Level
  gold: number;
}

export interface Enemy extends Entity {
  tier: number; // Increases difficulty
  type: EnemyType;
  element: ElementType;
  attackCooldown: number;
  summonCooldown?: number;
  isMinion?: boolean;
  stunTimer?: number; // Timer for when enemy hits player and stops
  
  // Boss Specifics
  bossAbilities?: BossAbility[];
  totalDamageTaken?: number;
  abilityTimers?: Record<string, number>; 
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  duration: number; // Frames to live
  source: 'PLAYER' | 'ENEMY';
  element: ElementType;
  penetrate: boolean;
  isMelee?: boolean;
  knockback: number;
  critChance: number;
  armorGain: number; // Shield to add on hit
  hitEnemies: Set<string>; // IDs of entities already hit by this projectile
  
  // Bomb Specifics
  isBomb?: boolean;
  isIncendiary?: boolean; // Creates fire zone
  targetX?: number;
  targetY?: number;
  maxDuration?: number; // Total flight time for lerping if needed, reusing duration currently
}

export interface GameAssets {
  playerSprite: string | null;
  enemySprite: string | null;
  groundTexture: string | null;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  duration: number; // Frames to live
  opacity: number;
  vy: number; // Float speed
  isCrit?: boolean;
}

// Optimization: Spatial Hash Grid Class for Collision
export class SpatialHashGrid {
  private cellSize: number;
  private buckets: Map<string, Enemy[]>;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.buckets = new Map();
  }

  clear() {
    this.buckets.clear();
  }

  insert(enemy: Enemy) {
    // We register the enemy in every cell they touch (simple bounding box approximation)
    // For simplicity in this game, registration by center point is usually sufficient 
    // if we check neighboring cells during query.
    const key = this.getKey(enemy.x, enemy.y);
    if (!this.buckets.has(key)) {
      this.buckets.set(key, []);
    }
    this.buckets.get(key)!.push(enemy);
  }

  // Get potential enemies near a point (x,y) with a search radius
  query(x: number, y: number, radius: number = 0): Enemy[] {
    const results: Enemy[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize) + 1; // Check neighbors
    
    const centerCol = Math.floor(x / this.cellSize);
    const centerRow = Math.floor(y / this.cellSize);

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const key = `${centerCol + i},${centerRow + j}`;
            const bucket = this.buckets.get(key);
            if (bucket) {
                // Optimization: Push individually to avoid creating new array spread overhead
                for(let k=0; k<bucket.length; k++) {
                    results.push(bucket[k]);
                }
            }
        }
    }
    return results;
  }

  private getKey(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
