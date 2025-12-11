
import { Enemy, EnemyType, GameAssets, Terrain, Player, Projectile, ElementType, BossAbility, SpatialHashGrid, HazardType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, ENEMY_TYPES_CONFIG, DETAIL_COLORS, ELEMENT_CONFIG } from '../constants';
import { checkRectOverlap } from './utils';

export const spawnEnemy = (
    enemies: Enemy[], 
    player: Player, 
    terrain: Terrain[], 
    currentStage: number, 
    stageInfo: { spawnedCount: number, totalEnemies: number }
) => {
    // Boss Stage Logic: Only spawn boss initially
    // Update: Boss every 6 stages
    const isBossStage = currentStage % 6 === 0;
    
    if (isBossStage) {
        if (stageInfo.spawnedCount > 0) return; // Only 1 Boss
    } else {
        if (stageInfo.spawnedCount >= stageInfo.totalEnemies) return;
    }

    // DETERMINE TYPE FIRST to know dimensions for collision check
    const tierMultiplier = 1 + (player.level * 0.15);
    let type: EnemyType = 'STANDARD';
    if (isBossStage) {
        type = 'BOSS';
    } else {
        const rand = Math.random();
        // Hierarchy: INCINERATOR > ZOMBIE > BOMBER > RANGED > FAST > TANK
        if (currentStage >= 6 && rand > 0.90) type = 'INCINERATOR'; 
        else if (currentStage >= 5 && rand > 0.80) type = 'ZOMBIE';
        else if (currentStage >= 4 && rand > 0.68) type = 'BOMBER'; 
        else if (currentStage >= 3 && rand > 0.55) type = 'RANGED'; 
        else if (currentStage >= 2 && rand > 0.40) type = 'FAST';
        else if (currentStage >= 2 && rand > 0.20) type = 'TANK';
    }

    const config = ENEMY_TYPES_CONFIG[type];
    const width = 32 * config.sizeMult;
    const height = 32 * config.sizeMult;

    let ex = 0, ey = 0;
    let attempts = 0;
    let validPosition = false;

    // First try: Valid spawn near player
    while (attempts < 20 && !validPosition) {
        attempts++;
        // Spawn somewhat near player but random
        // MAP_WIDTH/HEIGHT check ensures we don't spawn half-off map
        const spawnX = Math.random() * (MAP_WIDTH - width * 2) + width;
        const spawnY = Math.random() * (MAP_HEIGHT - height * 2) + height;
        
        // Wall Check
        let inWall = false;
        for (const t of terrain) {
            if ((t.type === 'WALL' || t.type === 'EARTH_WALL')) {
                // Check exact rectangle overlap + small buffer
                if (checkRectOverlap(spawnX - width/2, spawnY - height/2, width, height, t.x, t.y, t.width, t.height)) {
                    inWall = true;
                    break;
                }
            }
        }
        if (inWall) continue;
        
        // Distance Check (Don't spawn too close or too far)
        const dist = Math.sqrt((spawnX - player.x) ** 2 + (spawnY - player.y) ** 2);
        if (dist < 400 || dist > 1200) continue; 
        
        ex = spawnX;
        ey = spawnY;
        validPosition = true;
    } 
    
    // Fallback: If attempts fail, find ANY valid spot on the map (ignore player distance)
    if (!validPosition) {
        let panicAttempts = 0;
        while (panicAttempts < 50 && !validPosition) {
            panicAttempts++;
             const spawnX = Math.random() * (MAP_WIDTH - width * 2) + width;
             const spawnY = Math.random() * (MAP_HEIGHT - height * 2) + height;

             let inWall = false;
             for (const t of terrain) {
                if ((t.type === 'WALL' || t.type === 'EARTH_WALL')) {
                    if (checkRectOverlap(spawnX - width/2, spawnY - height/2, width, height, t.x, t.y, t.width, t.height)) {
                        inWall = true;
                        break;
                    }
                }
             }
             if (!inWall) {
                 ex = spawnX;
                 ey = spawnY;
                 validPosition = true;
             }
        }
    }

    // If still invalid, abort spawn to prevent bug
    if (!validPosition) return;
    
    // Pick Element (20% each)
    const elements = Object.values(ElementType);
    const element = elements[Math.floor(Math.random() * elements.length)];
    
    // Pick Random Boss Ability
    let bossAbilities: BossAbility[] = [];
    if (type === 'BOSS') {
        const abilities: BossAbility[] = ['INVINCIBLE_ARMOR', 'BERSERKER', 'HIVE_MIND', 'BLINK', 'SPLIT'];
        // Shuffle and pick 2 unique
        const shuffled = abilities.sort(() => 0.5 - Math.random());
        bossAbilities = shuffled.slice(0, 2);
    }

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
      summonCooldown: type === 'BOSS' ? 600 : undefined, // Boss summons every ~10s (600 frames)
      isMinion: false,
      bossAbilities: bossAbilities,
      totalDamageTaken: 0,
      abilityTimers: {},
      stunTimer: 0,
      stats: {
        maxHp: 20 * tierMultiplier * config.hpMult, 
        hp: 20 * tierMultiplier * config.hpMult,
        shield: 0,
        attack: 10 * tierMultiplier * config.attackMult,
        defense: 0,
        moveSpeed: (2 + Math.random() * 1.5) * config.speedMult,
        attackSpeed: 1,
        range: type === 'BOSS' ? 400 : 30,
        blockChance: type === 'BOSS' ? 0.3 : 0,
        dodgeChance: 0,
        knockback: 0,
        critChance: 0,
        armorOnHit: 0,
        ultChargeRate: 0
      }
    });
    
    // Increment spawn count logic
    if (isBossStage) {
        stageInfo.spawnedCount = 1; // Boss counts as 1 spawn
    } else {
        stageInfo.spawnedCount++;
    }
};

export const spawnMinion = (enemies: Enemy[], boss: Enemy, terrain: Terrain[]) => {
    // Pick random type for minion
    const minionTypes: EnemyType[] = ['STANDARD', 'FAST', 'TANK', 'RANGED', 'BOMBER'];
    const type = minionTypes[Math.floor(Math.random() * minionTypes.length)];
    const config = ENEMY_TYPES_CONFIG[type];
    
    // Try to find valid spawn location for minion
    let mx = 0, my = 0;
    let valid = false;
    let attempts = 0;
    
    while (!valid && attempts < 10) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        mx = boss.x + Math.cos(angle) * dist;
        my = boss.y + Math.sin(angle) * dist;
        
        // Bounds check
        if (mx < 20 || mx > MAP_WIDTH - 20 || my < 20 || my > MAP_HEIGHT - 20) continue;
        
        let inWall = false;
        // Check standard size 32x32 for minions
        for (const t of terrain) {
            if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && 
                 checkRectOverlap(mx - 16, my - 16, 32, 32, t.x, t.y, t.width, t.height)) {
                inWall = true;
                break;
            }
        }
        if (!inWall) valid = true;
    }
    
    if (!valid) return; // Skip spawn if blocked

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
      element: boss.element, // Minions share boss element
      attackCooldown: 0,
      isMinion: true,
      stunTimer: 0,
      stats: {
        maxHp: boss.stats.maxHp * 0.05, // Minions are relatively weak
        hp: boss.stats.maxHp * 0.05,
        shield: 0,
        attack: boss.stats.attack * 0.4,
        defense: 0,
        moveSpeed: (2 + Math.random() * 1.5) * config.speedMult,
        attackSpeed: 1,
        range: 30,
        blockChance: 0,
        dodgeChance: 0,
        knockback: 0,
        critChance: 0,
        armorOnHit: 0,
        ultChargeRate: 0
      }
    });
};

const spawnClone = (original: Enemy, enemies: Enemy[], terrain: Terrain[]) => {
   // Deep Copy
   const clone: Enemy = JSON.parse(JSON.stringify(original));
   clone.id = Math.random().toString();
   
   // Find valid spot nearby
   let placed = false;
   const offsets = [{x:60, y:0}, {x:-60, y:0}, {x:0, y:60}, {x:0, y:-60}, {x:40, y:40}, {x:-40, y:40}, {x:40, y:-40}, {x:-40, y:-40}];
   
   for (const off of offsets) {
       const nx = original.x + off.x;
       const ny = original.y + off.y;
       // Check bounds
       if (nx < 50 || nx > MAP_WIDTH - 50 || ny < 50 || ny > MAP_HEIGHT - 50) continue;
       
       let inWall = false;
       for (const t of terrain) {
           if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && 
               checkRectOverlap(nx - clone.width/2, ny - clone.height/2, clone.width, clone.height, t.x, t.y, t.width, t.height)) {
               inWall = true; 
               break;
           }
       }
       if (!inWall) {
           clone.x = nx;
           clone.y = ny;
           placed = true;
           break;
       }
   }
   
   if (!placed) {
       // Fallback: Just spawn slightly offset
       clone.x = original.x + 20;
       clone.y = original.y + 20;
   }
   
   enemies.push(clone);
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
            boss.abilityTimers['INVINCIBLE_ARMOR'] = 300; // 5 seconds
            spawnFloatingText(boss.x, boss.y - 60, "IMMORTAL!", '#fbbf24', true);
            break;
        case 'BERSERKER':
            boss.abilityTimers['BERSERKER'] = 300; // 5 seconds
            spawnFloatingText(boss.x, boss.y - 60, "BERSERK!", '#ef4444', true);
            break;
        case 'HIVE_MIND':
            spawnFloatingText(boss.x, boss.y - 60, "HIVE SWARM!", '#a855f7', true);
            // Summon double the automatic amount (2 * 2 = 4)
            for(let i=0; i<4; i++) spawnMinion(enemies, boss, terrain);
            break;
        case 'BLINK':
            spawnFloatingText(boss.x, boss.y - 60, "BLINK!", '#3b82f6', true);
            // Teleport Logic
            for(let i=0; i<10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 300;
                const tx = boss.x + Math.cos(angle) * dist;
                const ty = boss.y + Math.sin(angle) * dist;
                
                if (tx > 50 && tx < MAP_WIDTH - 50 && ty > 50 && ty < MAP_HEIGHT - 50) {
                    let valid = true;
                    for (const t of terrain) {
                        if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && checkRectOverlap(tx - 30, ty - 30, 60, 60, t.x, t.y, t.width, t.height)) {
                            valid = false; break;
                        }
                    }
                    if (valid) {
                        boss.x = tx;
                        boss.y = ty;
                        break;
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
    onPlayerHit: (damage: number) => void,
    handleCreateHazard?: (x: number, y: number, radius: number, damage: number, type: HazardType, source: 'ENEMY' | 'PLAYER') => void,
    grid?: SpatialHashGrid // Optional for backward compatibility but used for optimization
) => {
    if (isTimeStop) return;

    // Use a loop that allows modifying the array (for summons)
    const currentCount = enemies.length;
    for(let i=0; i<currentCount; i++) {
        const e = enemies[i];
        
        // Handle Stun
        if (e.stunTimer && e.stunTimer > 0) {
            e.stunTimer--;
        }

        const distToPlayer = Math.sqrt((player.x - e.x) ** 2 + (player.y - e.y) ** 2);
        const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
        
        // Update facing angle smoothly
        e.angle = angleToPlayer;
        
        // Update Boss Active Ability Timers
        if (e.type === 'BOSS' && e.abilityTimers) {
            Object.keys(e.abilityTimers).forEach(key => {
                 if (e.abilityTimers![key] > 0) e.abilityTimers![key]--;
            });
        }

        const isBerserk = e.type === 'BOSS' && (e.abilityTimers?.['BERSERKER'] || 0) > 0;
        
        // --- BOSS LOGIC ---
        if (e.type === 'BOSS') {
            // Summoning Logic (Base mechanic)
            if (e.summonCooldown !== undefined) {
                e.summonCooldown--;
                if (e.summonCooldown <= 0) {
                    // Spawn 2 minions every 10s
                    spawnMinion(enemies, e, terrain);
                    spawnMinion(enemies, e, terrain);
                    e.summonCooldown = 600; // Reset 10s (600 frames)
                    spawnFloatingText(e.x, e.y - 50, "SUMMON!", '#a855f7', true);
                }
            }

            // Attack Logic
            if (e.attackCooldown > 0) {
                 // Berserker Cooldown Reduction (1.5x speed -> cooldown ticks 1.5x faster or just reduce base)
                 // Simply ticking faster effectively reduces cooldown
                 e.attackCooldown -= isBerserk ? 1.5 : 1; 
            }
            
            if (distToPlayer < 500 && e.attackCooldown <= 0) {
                const elementColor = ELEMENT_CONFIG[e.element].color;
                // Fire spread of 3
                for (let offset = -0.3; offset <= 0.3; offset += 0.3) {
                     projectiles.push({
                      id: Math.random().toString(),
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(angleToPlayer + offset) * 4.9, // Reduced from 7 (-30%)
                      vy: Math.sin(angleToPlayer + offset) * 4.9,
                      damage: e.stats.attack,
                      duration: 100,
                      color: elementColor,
                      radius: 10,
                      source: 'ENEMY',
                      penetrate: false,
                      knockback: 0,
                      element: e.element,
                      critChance: 0,
                      armorGain: 0,
                      hitEnemies: new Set()
                  });
                }
                e.attackCooldown = 160; // Increased cooldown (was 130) -> Slower frequency (~20%)
            }
        }

        // --- RANGED, BOMBER & INCINERATOR LOGIC ---
        let move = true;
        
        // Stunned enemies cannot move
        if (e.stunTimer && e.stunTimer > 0) {
            move = false;
        }

        // Updated: Boss is excluded from this stop logic so it moves continuously
        if (move && (e.type === 'RANGED' || e.type === 'BOMBER' || e.type === 'INCINERATOR')) {
           const stopDist = (e.type === 'BOMBER' || e.type === 'INCINERATOR' ? 350 : 300);
           if (distToPlayer < stopDist) {
              move = false; 
              
              if (e.type === 'BOMBER' || e.type === 'INCINERATOR') {
                  if (e.attackCooldown > 0) e.attackCooldown--;
                  if (e.attackCooldown <= 0) {
                      // Toss Bomb at player location
                      const isIncendiary = e.type === 'INCINERATOR';
                      const elementColor = ELEMENT_CONFIG[e.element].color;
                      
                      // Slow down projectile speed by ~30% -> Increase duration by ~43%
                      // Original: 60 frames -> New: ~85 frames
                      const flightDuration = 85; 

                      // Determine velocity to reach player in duration
                      const dx = player.x - e.x;
                      const dy = player.y - e.y;
                      
                      projectiles.push({
                          id: Math.random().toString(),
                          x: e.x,
                          y: e.y,
                          vx: dx / flightDuration, 
                          vy: dy / flightDuration,
                          damage: e.stats.attack,
                          duration: flightDuration,
                          maxDuration: flightDuration, 
                          color: isIncendiary ? '#dc2626' : '#000000',
                          radius: 10,
                          source: 'ENEMY',
                          penetrate: true, // Ignore walls during flight
                          knockback: 20,
                          element: e.element,
                          critChance: 0,
                          armorGain: 0,
                          isBomb: true,
                          isIncendiary: isIncendiary,
                          targetX: player.x,
                          targetY: player.y,
                          hitEnemies: new Set()
                      });
                      e.attackCooldown = 300; // Slow attack (5s)
                  }
              }
              else if (e.type === 'RANGED') {
                  if (e.attackCooldown > 0) e.attackCooldown--;
                  if (e.attackCooldown <= 0) {
                      const elementColor = ELEMENT_CONFIG[e.element].color;
                      projectiles.push({
                          id: Math.random().toString(),
                          x: e.x,
                          y: e.y,
                          vx: Math.cos(angleToPlayer) * 4.2, 
                          vy: Math.sin(angleToPlayer) * 4.2,
                          damage: e.stats.attack,
                          duration: 80,
                          color: elementColor,
                          radius: 6,
                          source: 'ENEMY',
                          penetrate: false,
                          knockback: 0,
                          element: e.element,
                          critChance: 0,
                          armorGain: 0,
                          hitEnemies: new Set()
                      });
                      e.attackCooldown = 225; // Reduced frequency (was 180) -> 20% slower
                  }
              }
           }
        }
        
        // Manual check for boss attack cooldown tick if it's moving
        if (e.type === 'BOSS' && e.attackCooldown > 0) {
            // Already handled in the BOSS LOGIC block above, but good to be safe if logic moves
        }

        // --- ZOMBIE LOGIC: Drop Poison ---
        if (e.type === 'ZOMBIE' && handleCreateHazard && e.stunTimer <= 0) {
            // Drop poison trail occasionally
            // 5% chance per frame (approx every 1.2s at 60fps), but check not to overlap too much?
            // Actually random overlap is fine for poison puddles.
            if (Math.random() < 0.05) {
                // Damage is half attack power, but ticks rapidly
                handleCreateHazard(e.x, e.y, 25, e.stats.attack * 0.5, 'POISON', 'ENEMY');
            }
        }

        if (move) {
           // --- FLUID MOVEMENT AI (Steering Behaviors) ---

           // 1. SEEK: Basic vector towards player
           let dirX = Math.cos(angleToPlayer);
           let dirY = Math.sin(angleToPlayer);

           // 2. WANDER: Add randomness (Perlin-ish noise based on time + ID)
           const idSeed = parseFloat(e.id.split('-')[1] || '0.5'); 
           const time = Date.now() / 800;
           let noise = Math.sin(time + (idSeed || Math.random() * 10)) * 0.8; 
           
           // Zombies wander more erratically (higher noise influence)
           if (e.type === 'ZOMBIE') {
               noise *= 2.5; 
           }

           // Rotate the seek vector by the noise
           const cosN = Math.cos(noise);
           const sinN = Math.sin(noise);
           const wanderX = dirX * cosN - dirY * sinN;
           const wanderY = dirX * sinN + dirY * cosN;

           dirX = wanderX;
           dirY = wanderY;

           // 3. AVOIDANCE (Repulsion Field)
           const repulsionDist = 60; 
           let pushX = 0;
           let pushY = 0;

           for (const t of terrain) {
               if (t.type !== 'WALL' && t.type !== 'EARTH_WALL') continue;
               
               // Find closest point on the wall rectangle to the enemy center
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

           // Combine forces
           let finalVx = dirX + pushX;
           let finalVy = dirY + pushY;

           // Normalize to max speed
           const len = Math.sqrt(finalVx * finalVx + finalVy * finalVy) || 1;
           const speed = e.stats.moveSpeed * (isBerserk ? 2 : 1); // Double speed if Berserk
           finalVx = (finalVx / len) * speed;
           finalVy = (finalVy / len) * speed;

           // --- PHYSICS & COLLISION RESOLUTION ---
           const nextX = e.x + finalVx;
           let hitX = false;
           for (const t of terrain) {
               if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && checkRectOverlap(nextX - e.width/2, e.y - e.height/2, e.width, e.height, t.x, t.y, t.width, t.height)) {
                   hitX = true; break;
               }
           }
           if (!hitX) e.x = Math.max(20, Math.min(MAP_WIDTH - 20, nextX));

           // Y Axis
           const nextY = e.y + finalVy;
           let hitY = false;
           for (const t of terrain) {
               if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && checkRectOverlap(e.x - e.width/2, nextY - e.height/2, e.width, e.height, t.x, t.y, t.width, t.height)) {
                   hitY = true; break;
               }
           }
           if (!hitY) e.y = Math.max(20, Math.min(MAP_HEIGHT - 20, nextY));
        }

        // Register in Spatial Grid
        if (grid) {
            grid.insert(e);
        }

        // Collision with player
        if (distToPlayer < (player.width/2 + e.width/2)) {
           // Apply damage
           onPlayerHit(e.stats.attack);
           // Stun enemy for 1s (60 frames)
           e.stunTimer = 60;
        }
    }
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, assets: GameAssets) => {
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // Elemental Aura for Boss
    if (e.type === 'BOSS') {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = ELEMENT_CONFIG[e.element].color;
        ctx.beginPath();
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.arc(0, 0, (e.width/1.5) + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Ability Visuals
    if (e.type === 'BOSS' && e.abilityTimers) {
        if (e.abilityTimers['INVINCIBLE_ARMOR'] > 0) {
            ctx.save();
            ctx.strokeStyle = '#fbbf24'; // Gold
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.7 + Math.sin(Date.now()/50)*0.3;
            ctx.beginPath(); ctx.arc(0, 0, e.width/1.2, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        } 
        if (e.abilityTimers['BERSERKER'] > 0) {
            ctx.save();
            ctx.fillStyle = '#ef4444'; 
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(0, 0, e.width/1.2, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }

    // Boss Crown
    if (e.type === 'BOSS') {
        ctx.save();
        ctx.translate(0, -e.height/2 - 10);
        ctx.fillStyle = '#fbbf24'; // Gold
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-15, -10);
        ctx.lineTo(-5, -5);
        ctx.lineTo(0, -15);
        ctx.lineTo(5, -5);
        ctx.lineTo(15, -10);
        ctx.lineTo(10, 0);
        ctx.fill();
        ctx.restore();
    }

    // --- PROCEDURAL DRAWING ---
    // Color depends on Element
    const baseColor = ELEMENT_CONFIG[e.element].color;
    
    // Rotate towards movement direction (or player)
    ctx.rotate(e.angle);

    ctx.fillStyle = baseColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    ctx.beginPath();

    switch(e.type) {
        case 'FAST':
            // Triangle / Arrowhead
            ctx.moveTo(e.width/2, 0);
            ctx.lineTo(-e.width/2, e.height/2);
            ctx.lineTo(-e.width/3, 0); // Indent back
            ctx.lineTo(-e.width/2, -e.height/2);
            break;
            
        case 'TANK':
            // Square / Octagon-ish
            const w = e.width/2;
            ctx.moveTo(w, w/2);
            ctx.lineTo(w/2, w);
            ctx.lineTo(-w/2, w);
            ctx.lineTo(-w, w/2);
            ctx.lineTo(-w, -w/2);
            ctx.lineTo(-w/2, -w);
            ctx.lineTo(w/2, -w);
            ctx.lineTo(w, -w/2);
            break;

        case 'RANGED':
            // Diamond / Star
            ctx.moveTo(e.width/1.5, 0);
            ctx.lineTo(0, e.height/3);
            ctx.lineTo(-e.width/1.5, 0);
            ctx.lineTo(0, -e.height/3);
            // Winglets
            ctx.moveTo(0, e.height/3);
            ctx.lineTo(0, e.height/1.5);
            ctx.moveTo(0, -e.height/3);
            ctx.lineTo(0, -e.height/1.5);
            break;
        
        case 'BOMBER':
        case 'INCINERATOR':
             // Round bomb bag shape
             ctx.arc(0, 0, e.width/2, 0, Math.PI * 2);
             // Fuse connector
             ctx.moveTo(e.width/3, -e.height/3);
             ctx.lineTo(e.width/2, -e.height/2);
             break;

        case 'ZOMBIE':
             // Irregular / Jagged blob
             const zRad = e.width/2;
             const jags = 7;
             for(let i=0; i<jags*2; i++) {
                 const angle = (i / (jags*2)) * Math.PI * 2;
                 // Irregular radius
                 const offset = (i % 2 === 0) ? 0 : -5;
                 const r = zRad + offset;
                 if(i===0) ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r);
                 else ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
             }
             break;

        case 'BOSS':
            // Complex Spiky Shape
            const spikes = 12;
            const rOuter = e.width/2;
            const rInner = e.width/3;
            for(let i=0; i<spikes*2; i++) {
                const r = (i%2===0) ? rOuter : rInner;
                const a = (i / (spikes*2)) * Math.PI * 2;
                if (i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            break;

        case 'STANDARD':
        default:
            // Spiky Circle
            const s = 8;
            for(let i=0; i<s*2; i++) {
                const r = (i%2===0) ? e.width/2 : e.width/2 - 4;
                const a = (i / (s*2)) * Math.PI * 2;
                if (i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            break;
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Bomber Special Detail: Fuse Spark
    if (e.type === 'BOMBER' || e.type === 'INCINERATOR') {
        const isIncinerator = e.type === 'INCINERATOR';
        ctx.fillStyle = isIncinerator ? '#7f1d1d' : '#111'; // Darker tank for Incinerator
        ctx.beginPath(); ctx.arc(0, 0, e.width/3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.width/2, -e.height/2);
        ctx.quadraticCurveTo(e.width/2 + 5, -e.height/2 - 10, e.width/2 + 10, -e.height/2 - 5);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        // Spark
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(e.width/2 + 10, -e.height/2 - 5, 3, 0, Math.PI*2); ctx.fill();
        }
    }

    // Inner Glow / Gradient overlay (except bomber which is darker)
    if (e.type !== 'BOMBER' && e.type !== 'INCINERATOR') {
        const grad = ctx.createRadialGradient(0,0, e.width/5, 0,0, e.width/2);
        grad.addColorStop(0, 'rgba(255,255,255,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // Eyes
    ctx.fillStyle = DETAIL_COLORS.enemyEye;
    ctx.shadowColor = DETAIL_COLORS.enemyEye;
    ctx.shadowBlur = 10;
    
    if (e.type === 'BOSS') {
         // Many eyes
         ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(-12, -8, 5, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(12, -8, 5, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(0, 10, 4, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'FAST') {
         // Cyclops visor
         ctx.beginPath();
         ctx.ellipse(4, 0, 4, 8, 0, 0, Math.PI*2);
         ctx.fill();
    } else if (e.type === 'BOMBER' || e.type === 'INCINERATOR') {
         // Goggles
         const isIncinerator = e.type === 'INCINERATOR';
         ctx.fillStyle = '#333';
         ctx.beginPath(); ctx.arc(-6, -4, 6, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(6, -4, 6, 0, Math.PI*2); ctx.fill();
         ctx.fillStyle = isIncinerator ? '#fca5a5' : '#4ade80'; // Red glow for incinerator, Green for bomber
         ctx.beginPath(); ctx.arc(-6, -4, 4, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(6, -4, 4, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'ZOMBIE') {
        // One big eye, one small eye
        ctx.beginPath(); ctx.arc(-6, -4, 5, 0, Math.PI*2); ctx.fill(); // Big
        ctx.beginPath(); ctx.arc(6, -2, 2, 0, Math.PI*2); ctx.fill();  // Small
        // Drool
        ctx.fillStyle = '#a3e635';
        ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI*2); ctx.fill();
    } else {
        // Standard two eyes
        ctx.beginPath(); ctx.ellipse(6, -4, 4, 2, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, 4, 4, 2, 0, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    // Remove rotation for health bar
    ctx.restore();
    ctx.save();
    ctx.translate(e.x, e.y);
    
    const hpPct = Math.max(0, e.stats.hp / e.stats.maxHp);
    const barWidth = e.type === 'BOSS' ? 64 : 32;
    ctx.fillStyle = '#333';
    ctx.fillRect(-barWidth/2, -e.height/2 - 12, barWidth, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-barWidth/2, -e.height/2 - 12, barWidth * hpPct, 5);
    
    ctx.restore();
};
