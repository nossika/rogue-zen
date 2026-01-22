
import { Enemy, EnemyType, GameAssets, Terrain, Player, Projectile, ElementType, BossAbility, HazardType, DebuffType } from '../../types';
import { SpatialHashGrid } from '../core/spatial-hash-grid';
import { MAP_WIDTH, MAP_HEIGHT, ENEMY_TYPES_CONFIG, DETAIL_COLORS, ELEMENT_CONFIG, DEBUFF_CONFIG } from '../../constants';
import { checkRectOverlap } from '../utils';
import * as TerrainSystem from '../world/terrain';

export const spawnEnemy = (
    enemies: Enemy[], 
    player: Player, 
    terrain: Terrain[], 
    currentStage: number, 
    stageInfo: { spawnedCount: number, totalEnemies: number }
) => {
    const isBossStage = currentStage % 6 === 0;
    
    if (isBossStage) {
        if (stageInfo.spawnedCount > 0) return; 
    } else {
        if (stageInfo.spawnedCount >= stageInfo.totalEnemies) return;
    }

    let type: EnemyType = 'STANDARD';
    if (isBossStage) {
        type = 'BOSS';
    } else {
        const validTypes = Object.entries(ENEMY_TYPES_CONFIG).filter(([key, config]) => 
            key !== 'BOSS' && currentStage >= config.minStage
        );
        const totalWeight = validTypes.reduce((sum, [_, config]) => sum + config.spawnWeight, 0);
        let randomWeight = Math.random() * totalWeight;
        for (const [key, config] of validTypes) {
            randomWeight -= config.spawnWeight;
            if (randomWeight <= 0) {
                type = key as EnemyType;
                break;
            }
        }
    }

    const config = ENEMY_TYPES_CONFIG[type];
    const width = config.radius * 2;
    const height = config.radius * 2;

    let ex = 0, ey = 0;
    let attempts = 0;
    let validPosition = false;

    while (attempts < 20 && !validPosition) {
        attempts++;
        const spawnX = Math.random() * (MAP_WIDTH - width * 2) + width;
        const spawnY = Math.random() * (MAP_HEIGHT - height * 2) + height;
        
        // Wall Check using zIndex priority
        const hitT = TerrainSystem.getTerrainAt(terrain, spawnX, spawnY, width, height);
        if (hitT?.type === 'WALL' || hitT?.type === 'EARTH_WALL') continue;
        
        const dist = Math.sqrt((spawnX - player.x) ** 2 + (spawnY - player.y) ** 2);
        if (dist < 400 || dist > 1200) continue; 
        
        ex = spawnX;
        ey = spawnY;
        validPosition = true;
    } 
    
    if (!validPosition) {
        let panicAttempts = 0;
        while (panicAttempts < 50 && !validPosition) {
            panicAttempts++;
             const spawnX = Math.random() * (MAP_WIDTH - width * 2) + width;
             const spawnY = Math.random() * (MAP_HEIGHT - height * 2) + height;
             const hitT = TerrainSystem.getTerrainAt(terrain, spawnX, spawnY, width, height);
             if (hitT?.type !== 'WALL' && hitT?.type !== 'EARTH_WALL') {
                 ex = spawnX;
                 ey = spawnY;
                 validPosition = true;
             }
        }
    }

    if (!validPosition) return;
    
    const elements = Object.values(ElementType);
    const element = elements[Math.floor(Math.random() * elements.length)];
    
    let bossAbilities: BossAbility[] = [];
    if (type === 'BOSS') {
        const abilities: BossAbility[] = ['INVINCIBLE_ARMOR', 'BERSERKER', 'HIVE_MIND', 'BLINK', 'SPLIT'];
        const shuffled = abilities.sort(() => 0.5 - Math.random());
        bossAbilities = shuffled.slice(0, 2);
    }

    const maxHp = config.baseHp + (player.level * config.hpGrowth);
    const initialArmor = type === 'IRON_BEETLE' ? maxHp : 0;

    enemies.push({
      id: Math.random().toString(),
      x: ex,
      y: ey,
      width: width,
      height: height,
      color: config.color,
      dead: false,
      angle: 0,
      velocity: { x: 0, y: 0 },
      tier: 1,
      type: type,
      element: element,
      attackCooldown: 0,
      summonCooldown: type === 'BOSS' ? 600 : undefined,
      buffCooldown: type === 'IRON_BEETLE' ? 300 : undefined,
      isMinion: false,
      bossAbilities: bossAbilities,
      totalDamageTaken: 0,
      abilityTimers: {},
      stunTimer: 0,
      debuffs: { SLOW: 0, STUN: 0, BLEED: 0 },
      stats: {
        maxHp: maxHp, 
        hp: maxHp,
        shield: initialArmor,
        attack: config.baseAttack + (player.level * config.attackGrowth),
        defense: 0,
        moveSpeed: config.speedMin + Math.random() * (config.speedMax - config.speedMin),
        attackSpeed: 1,
        range: type === 'BOSS' ? 400 : 30,
        dodgeChance: 0,
        knockback: 0,
        critChance: 0,
        armorOnHit: 0,
        ultChargeRate: 0
      }
    });
    
    if (isBossStage) stageInfo.spawnedCount = 1;
    else stageInfo.spawnedCount++;
};

export const spawnMinion = (enemies: Enemy[], boss: Enemy, terrain: Terrain[]) => {
    const minionTypes: EnemyType[] = ['STANDARD', 'FAST', 'TANK', 'RANGED', 'BOMBER'];
    const type = minionTypes[Math.floor(Math.random() * minionTypes.length)];
    const config = ENEMY_TYPES_CONFIG[type];
    
    let mx = 0, my = 0;
    let valid = false;
    let attempts = 0;
    
    while (!valid && attempts < 10) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        mx = boss.x + Math.cos(angle) * dist;
        my = boss.y + Math.sin(angle) * dist;
        
        if (mx < 20 || mx > MAP_WIDTH - 20 || my < 20 || my > MAP_HEIGHT - 20) continue;
        
        const hitT = TerrainSystem.getTerrainAt(terrain, mx, my, 32, 32);
        if (hitT?.type !== 'WALL' && hitT?.type !== 'EARTH_WALL') valid = true;
    }
    
    if (!valid) return;

    enemies.push({
      id: Math.random().toString(),
      x: mx,
      y: my,
      width: 32,
      height: 32,
      color: config.color,
      dead: false,
      angle: 0,
      velocity: { x: 0, y: 0 },
      tier: 1,
      type: type,
      element: boss.element,
      attackCooldown: 0,
      isMinion: true,
      stunTimer: 0,
      debuffs: { SLOW: 0, STUN: 0, BLEED: 0 },
      stats: {
        maxHp: boss.stats.maxHp * 0.05,
        hp: boss.stats.maxHp * 0.05,
        shield: 0,
        attack: boss.stats.attack * 0.4,
        defense: 0,
        moveSpeed: config.speedMin + Math.random() * (config.speedMax - config.speedMin),
        attackSpeed: 1,
        range: 30,
        dodgeChance: 0,
        knockback: 0,
        critChance: 0,
        armorOnHit: 0,
        ultChargeRate: 0
      }
    });
};

const spawnClone = (original: Enemy, enemies: Enemy[], terrain: Terrain[]) => {
   const clone: Enemy = JSON.parse(JSON.stringify(original));
   clone.id = Math.random().toString();
   clone.debuffs = { SLOW: 0, STUN: 0, BLEED: 0 };
   
   let placed = false;
   const offsets = [{x:60, y:0}, {x:-60, y:0}, {x:0, y:60}, {x:0, y:-60}, {x:40, y:40}, {x:-40, y:40}, {x:40, y:-40}, {x:-40, y:-40}];
   
   for (const off of offsets) {
       const nx = original.x + off.x;
       const ny = original.y + off.y;
       if (nx < 50 || nx > MAP_WIDTH - 50 || ny < 50 || ny > MAP_HEIGHT - 50) continue;
       
       const hitT = TerrainSystem.getTerrainAt(terrain, nx, ny, clone.width, clone.height);
       if (hitT?.type !== 'WALL' && hitT?.type !== 'EARTH_WALL') {
           clone.x = nx;
           clone.y = ny;
           placed = true;
           break;
       }
   }
   
   if (!placed) {
       clone.x = original.x + 20;
       clone.y = original.y + 20;
   }
   
   enemies.push(clone);
};

export const applyDebuff = (enemy: Enemy, type: DebuffType, duration: number) => {
    if (enemy.type === 'BOSS') {
        duration = Math.floor(duration / DEBUFF_CONFIG.BOSS_RESISTANCE);
    }
    if (duration > enemy.debuffs[type]) {
        enemy.debuffs[type] = duration;
    }
};

export const triggerBossAbility = (
    boss: Enemy, 
    ability: BossAbility,
    enemies: Enemy[], 
    terrain: Terrain[], 
    spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit: boolean) => void
) => {
    if (!boss.abilityTimers) boss.abilityTimers = {};

    switch(ability) {
        case 'INVINCIBLE_ARMOR':
            boss.abilityTimers['INVINCIBLE_ARMOR'] = 300;
            spawnFloatingText(boss.x, boss.y - 60, "IMMORTAL!", '#fbbf24', true);
            break;
        case 'BERSERKER':
            boss.abilityTimers['BERSERKER'] = 300;
            spawnFloatingText(boss.x, boss.y - 60, "BERSERK!", '#ef4444', true);
            break;
        case 'HIVE_MIND':
            spawnFloatingText(boss.x, boss.y - 60, "HIVE SWARM!", '#a855f7', true);
            for(let i=0; i<4; i++) spawnMinion(enemies, boss, terrain);
            break;
        case 'BLINK':
            spawnFloatingText(boss.x, boss.y - 60, "BLINK!", '#3b82f6', true);
            for(let i=0; i<10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 300;
                const tx = boss.x + Math.cos(angle) * dist;
                const ty = boss.y + Math.sin(angle) * dist;
                if (tx > 50 && tx < MAP_WIDTH - 50 && ty > 50 && ty < MAP_HEIGHT - 50) {
                    const hitT = TerrainSystem.getTerrainAt(terrain, tx, ty, 60, 60);
                    if (hitT?.type !== 'WALL' && hitT?.type !== 'EARTH_WALL') {
                        boss.x = tx; boss.y = ty; break;
                    }
                }
            }
            break;
        case 'SPLIT':
            spawnFloatingText(boss.x, boss.y - 80, "MITOSIS!", '#ff00ff', true);
            spawnClone(boss, enemies, terrain);
            break;
    }
};

export const updateEnemies = (
    enemies: Enemy[], 
    player: Player, 
    terrain: Terrain[], 
    projectiles: Projectile[], 
    isTimeStop: boolean,
    spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit: boolean) => void,
    spawnSplatter: (x: number, y: number, color?: string) => void,
    onPlayerHit: (damage: number) => void,
    handleCreateHazard?: (x: number, y: number, radius: number, damage: number, type: HazardType, source: 'ENEMY' | 'PLAYER', element: ElementType, critChance?: number, knockback?: number) => void,
    grid?: SpatialHashGrid 
) => {
    const currentCount = enemies.length;
    for(let i=0; i<currentCount; i++) {
        const e = enemies[i];
        if (e.dead) continue;
        if (isTimeStop) {
            if (grid) grid.insert(e);
            continue; 
        }

        if (e.stunTimer && e.stunTimer > 0) {
            e.debuffs.STUN = Math.max(e.debuffs.STUN, e.stunTimer);
            e.stunTimer = 0;
        }

        if (e.debuffs.SLOW > 0) e.debuffs.SLOW--;
        if (e.debuffs.STUN > 0) e.debuffs.STUN--;
        if (e.debuffs.BLEED > 0) e.debuffs.BLEED--;

        const isStunned = e.debuffs.STUN > 0;
        const isSlowed = e.debuffs.SLOW > 0;
        const distToPlayer = Math.sqrt((player.x - e.x) ** 2 + (player.y - e.y) ** 2);
        const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
        e.angle = angleToPlayer;
        
        if (e.type === 'BOSS' && e.abilityTimers) {
            Object.keys(e.abilityTimers).forEach(key => {
                 if (e.abilityTimers![key] > 0) e.abilityTimers![key]--;
            });
        }

        const isBerserk = e.type === 'BOSS' && (e.abilityTimers?.['BERSERKER'] || 0) > 0;
        
        if (!isStunned && e.type === 'IRON_BEETLE' && e.buffCooldown !== undefined) {
            if (e.buffCooldown > 0) e.buffCooldown--;
            if (e.buffCooldown <= 0) {
                const range = 400;
                const nearby = enemies.filter(ally => 
                    !ally.dead && ally.id !== e.id && ally.stats.shield <= 0 &&
                    Math.sqrt((ally.x - e.x)**2 + (ally.y - e.y)**2) < range
                );
                if (nearby.length > 0) {
                    const target = nearby[Math.floor(Math.random() * nearby.length)];
                    target.stats.shield = e.stats.maxHp * 0.3;
                    spawnFloatingText(target.x, target.y - 40, "ARMOR UP!", '#cbd5e1', false);
                    e.buffCooldown = 300;
                }
            }
        }

        if (e.type === 'BOSS') {
            if (e.summonCooldown !== undefined) {
                e.summonCooldown--;
                if (e.summonCooldown <= 0) {
                    spawnMinion(enemies, e, terrain);
                    spawnMinion(enemies, e, terrain);
                    e.summonCooldown = 600; 
                    spawnFloatingText(e.x, e.y - 50, "SUMMON!", '#a855f7', true);
                }
            }
            if (!isStunned) {
                if (e.attackCooldown > 0) e.attackCooldown -= isBerserk ? 1.5 : 1; 
                if (distToPlayer < 500 && e.attackCooldown <= 0) {
                    const elementColor = ELEMENT_CONFIG[e.element].color;
                    for (let offset = -0.3; offset <= 0.3; offset += 0.3) {
                         projectiles.push({
                          id: Math.random().toString(),
                          x: e.x, y: e.y, vx: Math.cos(angleToPlayer + offset) * 4.9, vy: Math.sin(angleToPlayer + offset) * 4.9,
                          damage: e.stats.attack, duration: 100, color: elementColor, radius: 10, source: 'ENEMY',
                          penetrate: false, knockback: 0, element: e.element, critChance: 0, armorGain: 0, hitEnemies: new Set()
                      });
                    }
                    e.attackCooldown = 160; 
                }
            }
        }

        let move = true;
        if (isStunned) move = false;
        if (move && (e.type === 'RANGED' || e.type === 'BOMBER' || e.type === 'INCINERATOR')) {
           const stopDist = (e.type === 'BOMBER' || e.type === 'INCINERATOR' ? 350 : 300);
           if (distToPlayer < stopDist) {
              move = false; 
              if (e.type === 'BOMBER' || e.type === 'INCINERATOR') {
                  if (e.attackCooldown > 0) e.attackCooldown--;
                  if (e.attackCooldown <= 0) {
                      const isIncendiary = e.type === 'INCINERATOR';
                      const flightDuration = 85; 
                      const dx = player.x - e.x;
                      const dy = player.y - e.y;
                      projectiles.push({
                          id: Math.random().toString(),
                          x: e.x, y: e.y, vx: dx / flightDuration, vy: dy / flightDuration,
                          damage: e.stats.attack, duration: flightDuration, maxDuration: flightDuration, 
                          color: isIncendiary ? '#dc2626' : '#000000', radius: 10, source: 'ENEMY',
                          penetrate: true, knockback: 20, element: e.element, critChance: 0, armorGain: 0,
                          isBomb: true, isIncendiary: isIncendiary, targetX: player.x, targetY: player.y, hitEnemies: new Set()
                      });
                      e.attackCooldown = 300; 
                  }
              } else if (e.type === 'RANGED') {
                  if (e.attackCooldown > 0) e.attackCooldown--;
                  if (e.attackCooldown <= 0) {
                      const elementColor = ELEMENT_CONFIG[e.element].color;
                      projectiles.push({
                          id: Math.random().toString(),
                          x: e.x, y: e.y, vx: Math.cos(angleToPlayer) * 4.2, vy: Math.sin(angleToPlayer) * 4.2,
                          damage: e.stats.attack, duration: 80, color: elementColor, radius: 6, source: 'ENEMY',
                          penetrate: false, knockback: 0, element: e.element, critChance: 0, armorGain: 0, hitEnemies: new Set()
                      });
                      e.attackCooldown = 225; 
                  }
              }
           }
        }
        
        if (!isStunned && e.type === 'ZOMBIE' && handleCreateHazard) {
            if (Math.random() < 0.05) handleCreateHazard(e.x, e.y, 25, e.stats.attack * 0.5, 'POISON', 'ENEMY', ElementType.GRASS);
        }

        if (move) {
           let dirX = Math.cos(angleToPlayer);
           let dirY = Math.sin(angleToPlayer);
           const idSeed = parseFloat(e.id.split('-')[1] || '0.5'); 
           const time = Date.now() / 800;
           let noise = Math.sin(time + (idSeed || Math.random() * 10)) * 0.8; 
           if (e.type === 'ZOMBIE') noise *= 2; 
           const cosN = Math.cos(noise);
           const sinN = Math.sin(noise);
           const wanderX = dirX * cosN - dirY * sinN;
           const wanderY = dirX * sinN + dirY * cosN;
           dirX = wanderX;
           dirY = wanderY;

           const repulsionDist = 60; 
           let pushX = 0;
           let pushY = 0;

           for (const t of terrain) {
               if (t.type !== 'WALL' && t.type !== 'EARTH_WALL') continue;
               const cx = Math.max(t.x, Math.min(e.x, t.x + t.width));
               const cy = Math.max(t.y, Math.min(e.y, t.y + t.height));
               const distX = e.x - cx;
               const distY = e.y - cy;
               const distSq = distX * distX + distY * distY;
               if (distSq < repulsionDist * repulsionDist) {
                   const dist = Math.sqrt(distSq) || 0.1;
                   const force = (repulsionDist - dist) / repulsionDist; 
                   pushX += (distX / dist) * force * 3.0; 
                   pushY += (distY / dist) * force * 3.0;
               }
           }

           let finalVx = dirX + pushX;
           let finalVy = dirY + pushY;
           const len = Math.sqrt(finalVx * finalVx + finalVy * finalVy) || 1;
           let speed = e.stats.moveSpeed * (isBerserk ? 2 : 1); 
           if (isSlowed) speed *= DEBUFF_CONFIG.SLOW_SPEED_MULT;
           finalVx = (finalVx / len) * speed;
           finalVy = (finalVy / len) * speed;

           const nextX = e.x + finalVx;
           const hitTX = TerrainSystem.getTerrainAt(terrain, nextX, e.y, e.width, e.height);
           if (hitTX?.type !== 'WALL' && hitTX?.type !== 'EARTH_WALL') e.x = Math.max(20, Math.min(MAP_WIDTH - 20, nextX));

           const nextY = e.y + finalVy;
           const hitTY = TerrainSystem.getTerrainAt(terrain, e.x, nextY, e.width, e.height);
           if (hitTY?.type !== 'WALL' && hitTY?.type !== 'EARTH_WALL') e.y = Math.max(20, Math.min(MAP_HEIGHT - 20, nextY));
        }

        if (grid) grid.insert(e);
        if (!isStunned && distToPlayer < (player.width/2 + e.width/2)) {
           onPlayerHit(e.stats.attack);
           applyDebuff(e, 'STUN', 60);
        }
    }
};
