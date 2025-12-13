
import { Projectile, Player, Enemy, Terrain, ElementType, HazardType, SpatialHashGrid } from '../types';
import { checkRectOverlap, getElementalMultiplier } from './utils';
import { getTerrainAt } from './TerrainSystem';
import { ELEMENT_CONFIG } from '../constants';
import { triggerBossAbility } from './EnemySystem';

export const updateProjectiles = (
    projectiles: Projectile[],
    enemies: Enemy[],
    player: Player,
    terrain: Terrain[],
    spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit: boolean) => void,
    spawnSplatter: (x: number, y: number, color?: string) => void,
    onPlayerHit: (damage: number) => void,
    createHazard: (x: number, y: number, radius: number, damage: number, type: HazardType, source: 'ENEMY' | 'PLAYER', element?: ElementType, critChance?: number) => void,
    isOmniForceActive: boolean, // New parameter for Ultimate
    grid?: SpatialHashGrid // Optimization
) => {
    for (let i = projectiles.length - 1; i >= 0; i--) {
       const proj = projectiles[i];
       
       // Move projectile
       proj.x += proj.vx;
       proj.y += proj.vy;
       proj.duration--;
       
       if (proj.duration <= 0) {
         if (proj.isBomb) {
             // Detonate Bomb if time is up (it reached target)
             const baseRadius = 80;
             
             if (proj.isIncendiary) {
                 // Incinerator Bomb: Creates FIRE Hazard (Persistent)
                 // Radius increased by 25% (80 -> 100)
                 // Damage passed is now DPS (40 -> 28 per second) Reduced by 30%
                 createHazard(proj.x, proj.y, baseRadius * 1.25, 28, 'FIRE', 'ENEMY', ElementType.FIRE);
             } else {
                 // Standard Bomb: Creates EXPLOSION Hazard (Instant)
                 createHazard(proj.x, proj.y, baseRadius, proj.damage, 'EXPLOSION', proj.source, proj.element, proj.critChance);
             }
         }

         projectiles.splice(i, 1);
         continue;
       }
       
       // Standard Wall Collision (Skipped for Bombs)
       if (!proj.isBomb) {
           let hitWall = false;
           for (const t of terrain) {
               if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && checkRectOverlap(proj.x - proj.radius, proj.y - proj.radius, proj.radius*2, proj.radius*2, t.x, t.y, t.width, t.height)) {
                   
                   // Earth Wall Instant Destruction Logic
                   if (t.type === 'EARTH_WALL') {
                       t.type = 'MUD'; // Instantly convert single block to Mud
                   }

                   hitWall = true;
                   break; // Stop checking other walls, we hit this one
               }
           }
           
           // If we hit a wall (even if we destroyed it), the projectile stops unless it penetrates
           // Standard logic: projectiles die on wall hit.
           if (hitWall && !proj.isMelee) {
               projectiles.splice(i, 1);
               continue;
           }
       }

       // Entity Hit Detection (Skipped for Bombs in flight)
       if (proj.isBomb) {
           // Bombs do not collide mid-air
           continue; 
       }

       if (proj.source === 'PLAYER') {
         let hit = false;
         
         // OPTIMIZATION: Use Spatial Grid if available, else fallback to full scan
         const targets = grid ? grid.query(proj.x, proj.y, proj.radius + 32) : enemies; // 32 is roughly max enemy radius

         for (const e of targets) {
            // Re-verify exact distance because Grid is just a broad phase
            const d = Math.sqrt((e.x - proj.x)**2 + (e.y - proj.y)**2);
            if (d < e.width + proj.radius) {
              
              // Skip if already hit this enemy
              if (proj.hitEnemies.has(e.id)) continue;

              // BOSS ABILITY CHECK: INVINCIBLE_ARMOR
              if (e.type === 'BOSS' && e.bossAbilities?.includes('INVINCIBLE_ARMOR') && (e.abilityTimers?.['INVINCIBLE_ARMOR'] || 0) > 0) {
                  spawnFloatingText(e.x, e.y - 20, "IMMUNE", '#fbbf24', false);
                  hit = true;
                  proj.hitEnemies.add(e.id);
                  if (!proj.penetrate) break;
                  continue; // Skip damage application
              }

              // Elemental Damage Calculation
              let multiplier = getElementalMultiplier(proj.element, e.element);
              
              // OMNI FORCE: Force Advantage if active
              if (isOmniForceActive) {
                  multiplier = 3.0; // 3x Damage
              }

              let finalDamage = 0;

              // Thresholds: Advantage >= 3.0, Disadvantage <= 0.5
              if (multiplier <= 0.5) {
                  // Disadvantage: 0.5x Damage
                  finalDamage = proj.damage * 0.5;
              } else {
                  // Standard or Advantage (3x)
                  finalDamage = proj.damage * multiplier;
              }
              
              // Critical Hit Calculation
              const isCrit = Math.random() < proj.critChance;
              if (isCrit) {
                  finalDamage *= 2;
              }

              // ARMOR / SHIELD LOGIC
              let damageToHp = finalDamage;
              let hitShield = false;
              if (e.stats.shield > 0) {
                  hitShield = true;
                  if (e.stats.shield >= finalDamage) {
                      e.stats.shield -= finalDamage;
                      damageToHp = 0;
                  } else {
                      damageToHp = finalDamage - e.stats.shield;
                      e.stats.shield = 0;
                  }
              }

              e.stats.hp -= damageToHp;

              // BLOOD SPLATTER LOGIC
              if (damageToHp > 0) {
                  // If damage went to HP, spawn blood
                  spawnSplatter(e.x, e.y, '#ef4444');
              }
              
              // BOSS TRIGGER LOGIC
              if (e.type === 'BOSS' && e.bossAbilities) {
                  const prevDamage = e.totalDamageTaken || 0;
                  const currentDamage = prevDamage + finalDamage;
                  e.totalDamageTaken = currentDamage;

                  const prevPct = prevDamage / e.stats.maxHp;
                  const currPct = currentDamage / e.stats.maxHp;

                  e.bossAbilities.forEach(ability => {
                      let step = 0.3; // Default 30%
                      if (ability === 'BLINK') step = 0.1; // 10%
                      else if (ability === 'HIVE_MIND') step = 0.2; // 20%
                      else if (ability === 'SPLIT') step = 0.6; // 60%
                      
                      // Check if we crossed a step boundary
                      const prevStepIndex = Math.floor(prevPct / step);
                      const currStepIndex = Math.floor(currPct / step);
                      
                      if (currStepIndex > prevStepIndex) {
                          triggerBossAbility(e, ability, enemies, terrain, spawnFloatingText);
                      }
                  });
              }
              
              // Gain Ultimate Charge on Hit (1%)
              player.ultimateCharge = Math.min(100, player.ultimateCharge + 1);
              
              // Gain Armor on Hit (Shield)
              if (proj.armorGain > 0) {
                  player.stats.shield += proj.armorGain;
              }
              
              // Color Logic based on Element Matchup
              let textColor = '#ffffff'; // Default Neutral
              
              if (hitShield && damageToHp <= 0) {
                  // Blocked by Armor entirely
                  textColor = '#cbd5e1'; // Silver
              } else if (multiplier >= 3.0) {
                  // Advantage: Attacker color
                  textColor = ELEMENT_CONFIG[proj.element].color; 
              } else if (multiplier <= 0.5) {
                  // Disadvantage: Gray
                  textColor = '#9ca3af';
              }
              
              let textStr = Math.round(finalDamage).toString();
              if (isCrit) textStr += "!";
              
              spawnFloatingText(e.x, e.y - 20, textStr, textColor, isCrit);
              
              // KNOCKBACK LOGIC
              // Only apply knockback if Enemy Shield is depleted
              if (e.stats.shield <= 0) {
                  const kbStrength = proj.knockback;
                  let angle = 0;
                  if (proj.isMelee) {
                      angle = Math.atan2(e.y - player.y, e.x - player.x);
                  } else {
                      angle = Math.atan2(proj.vy, proj.vx);
                  }
                  
                  const kbX = Math.cos(angle) * kbStrength;
                  const kbY = Math.sin(angle) * kbStrength;
                  
                  if (!getTerrainAt(terrain, e.x + kbX, e.y, 20, 20)?.includes('WALL')) e.x += kbX;
                  if (!getTerrainAt(terrain, e.x, e.y + kbY, 20, 20)?.includes('WALL')) e.y += kbY;
              } else {
                  // Visual feedback for blocked knockback?
                  // Maybe small shake or sound, currently simple no-op
              }

              hit = true;
              proj.hitEnemies.add(e.id);
              if (!proj.penetrate) break;
            }
         }
         if (hit && !proj.penetrate) projectiles.splice(i, 1);
       } 
       else if (proj.source === 'ENEMY') {
           const d = Math.sqrt((player.x - proj.x)**2 + (player.y - proj.y)**2);
           if (d < player.width/2 + proj.radius) {
               // Check if player already hit by this specific projectile
               if (!proj.hitEnemies.has(player.id)) {
                   // Player damage (currently no element on player armor, so 1x)
                   onPlayerHit(proj.damage);
                   proj.hitEnemies.add(player.id);
                   projectiles.splice(i, 1);
               }
           }
       }
    }
};

export const drawProjectile = (ctx: CanvasRenderingContext2D, proj: Projectile) => {
    ctx.save();
    ctx.translate(proj.x, proj.y);
    if (proj.isMelee) {
       ctx.rotate(Math.atan2(proj.vy, proj.vx));
       
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius, -Math.PI/3, Math.PI/3);
       ctx.strokeStyle = proj.color;
       ctx.lineWidth = 4;
       ctx.shadowColor = proj.color;
       ctx.shadowBlur = 10;
       ctx.stroke();
       
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius * 0.8, -Math.PI/4, Math.PI/4);
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1;
       ctx.stroke();

    } else if (proj.isBomb) {
       // Draw Bomb
       // Scale pulsating effect based on duration remaining to simulate "ticking" or height arc
       const scale = 1 + Math.sin(proj.duration * 0.5) * 0.1;
       ctx.scale(scale, scale);
       
       ctx.shadowColor = '#000';
       ctx.shadowBlur = 5;
       
       // Core
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
       ctx.fillStyle = proj.isIncendiary ? '#7f1d1d' : '#000000'; // Dark red for Incendiary
       ctx.fill();
       
       // Highlight
       ctx.beginPath();
       ctx.arc(-3, -3, 3, 0, Math.PI * 2);
       ctx.fillStyle = proj.isIncendiary ? '#ef4444' : '#666';
       ctx.fill();
       
       // Fuse spark
       const fuseX = 0;
       const fuseY = -proj.radius;
       ctx.beginPath();
       ctx.moveTo(fuseX, fuseY);
       ctx.quadraticCurveTo(fuseX + 5, fuseY - 10, fuseX + 10, fuseY - 5);
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1.5;
       ctx.stroke();
       
       ctx.beginPath();
       ctx.arc(fuseX + 10, fuseY - 5, 2 + Math.random()*2, 0, Math.PI*2);
       ctx.fillStyle = '#ef4444';
       ctx.fill();
       
    } else {
       ctx.shadowColor = proj.color;
       ctx.shadowBlur = 8;
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
       ctx.fillStyle = proj.color;
       ctx.fill();
       ctx.beginPath();
       ctx.moveTo(0,0);
       ctx.lineTo(-proj.vx * 3, -proj.vy * 3);
       ctx.strokeStyle = proj.color;
       ctx.stroke();
    }
    ctx.restore();
};
