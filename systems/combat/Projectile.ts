
import { Projectile, Player, Enemy, Terrain, ElementType, HazardType, SpatialHashGrid } from '../../types';
import { checkRectOverlap, getElementalMultiplier } from '../utils';
import { getTerrainAt } from '../world/Terrain';
import { ELEMENT_CONFIG, DEBUFF_CONFIG } from '../../constants';
import { triggerBossAbility, applyDebuff } from '../entities/Enemy';

export const updateProjectiles = (
    projectiles: Projectile[],
    enemies: Enemy[],
    player: Player,
    terrain: Terrain[],
    spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit: boolean) => void,
    spawnSplatter: (x: number, y: number, color?: string) => void,
    onPlayerHit: (damage: number) => void,
    createHazard: (x: number, y: number, radius: number, damage: number, type: HazardType, source: 'ENEMY' | 'PLAYER', element?: ElementType, critChance?: number, knockback?: number) => void,
    isOmniForceActive: boolean, 
    grid?: SpatialHashGrid 
) => {
    for (let i = projectiles.length - 1; i >= 0; i--) {
       const proj = projectiles[i];
       
       proj.x += proj.vx;
       proj.y += proj.vy;
       proj.duration--;
       
       if (proj.duration <= 0) {
         if (proj.isBomb) {
             const baseRadius = 80;
             
             if (proj.isIncendiary) {
                 createHazard(proj.x, proj.y, baseRadius * 1.25, 28, 'FIRE', 'ENEMY', ElementType.FIRE);
             } else {
                 createHazard(proj.x, proj.y, baseRadius, proj.damage, 'EXPLOSION', proj.source, proj.element, proj.critChance, proj.knockback);
             }
         }

         projectiles.splice(i, 1);
         continue;
       }
       
       if (!proj.isBomb) {
           let hitWall = false;
           for (const t of terrain) {
               if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && checkRectOverlap(proj.x - proj.radius, proj.y - proj.radius, proj.radius*2, proj.radius*2, t.x, t.y, t.width, t.height)) {
                   
                   if (t.type === 'EARTH_WALL') {
                       t.type = 'MUD'; 
                   }

                   hitWall = true;
                   break; 
               }
           }
           
           if (hitWall && !proj.isMelee) {
               projectiles.splice(i, 1);
               continue;
           }
       }

       if (proj.isBomb) {
           continue; 
       }

       if (proj.source === 'PLAYER') {
         let hit = false;
         
         const targets = grid ? grid.query(proj.x, proj.y, proj.radius + 32) : enemies; 

         for (const e of targets) {
            if (e.dead) continue; 

            const d = Math.sqrt((e.x - proj.x)**2 + (e.y - proj.y)**2);
            if (d < e.width + proj.radius) {
              
              if (proj.hitEnemies.has(e.id)) continue;

              if (e.type === 'BOSS' && e.bossAbilities?.includes('INVINCIBLE_ARMOR') && (e.abilityTimers?.['INVINCIBLE_ARMOR'] || 0) > 0) {
                  spawnFloatingText(e.x, e.y - 20, "IMMUNE", '#fbbf24', false);
                  hit = true;
                  proj.hitEnemies.add(e.id);
                  if (!proj.penetrate) break;
                  continue; 
              }

              let multiplier = getElementalMultiplier(proj.element, e.element);
              
              if (isOmniForceActive) {
                  multiplier = 3.0; 
              }

              let finalDamage = 0;

              if (multiplier <= 0.5) {
                  finalDamage = proj.damage * 0.5;
              } else {
                  finalDamage = proj.damage * multiplier;
              }
              
              if (e.debuffs.BLEED > 0) {
                  finalDamage *= DEBUFF_CONFIG.BLEED_DAMAGE_MULT;
              }

              const isCrit = Math.random() < proj.critChance;
              if (isCrit) {
                  finalDamage *= 2;
              }

              if (proj.enchantment && Math.random() < proj.enchantment.chance) {
                  applyDebuff(e, proj.enchantment.type, proj.enchantment.duration);
              }

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

              if (damageToHp > 0) {
                  spawnSplatter(e.x, e.y, '#ef4444');
              }
              
              if (e.type === 'BOSS' && e.bossAbilities) {
                  const prevDamage = e.totalDamageTaken || 0;
                  const currentDamage = prevDamage + finalDamage;
                  e.totalDamageTaken = currentDamage;

                  const prevPct = prevDamage / e.stats.maxHp;
                  const currPct = currentDamage / e.stats.maxHp;

                  e.bossAbilities.forEach(ability => {
                      let step = 0.3; 
                      if (ability === 'BLINK') step = 0.1; 
                      else if (ability === 'HIVE_MIND') step = 0.2; 
                      else if (ability === 'SPLIT') step = 0.6; 
                      
                      const prevStepIndex = Math.floor(prevPct / step);
                      const currStepIndex = Math.floor(currPct / step);
                      
                      if (currStepIndex > prevStepIndex) {
                          triggerBossAbility(e, ability, enemies, terrain, spawnFloatingText);
                      }
                  });
              }
              
              player.ultimateCharge = Math.min(100, player.ultimateCharge + 1);
              
              if (proj.armorGain > 0) {
                  player.stats.shield += proj.armorGain;
              }
              
              let textColor = '#ffffff'; 
              
              if (hitShield && damageToHp <= 0) {
                  textColor = '#cbd5e1'; 
              } else if (multiplier >= 3.0) {
                  textColor = ELEMENT_CONFIG[proj.element].color; 
              } else if (multiplier <= 0.5) {
                  textColor = '#9ca3af';
              }
              
              let textStr = Math.round(finalDamage).toString();
              if (isCrit) textStr += "!";
              
              spawnFloatingText(e.x, e.y - 20, textStr, textColor, isCrit);
              
              if (e.stats.shield <= 0) {
                  let kbStrength = proj.knockback;
                  
                  if (e.type === 'BOSS') {
                      kbStrength /= DEBUFF_CONFIG.BOSS_RESISTANCE;
                  }

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
               if (!proj.hitEnemies.has(player.id)) {
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
       // Calculate parabolic arc
       let arc = 0;
       if (proj.maxDuration) {
           const progress = 1 - (proj.duration / proj.maxDuration);
           arc = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
       }
       
       // Visual "Height" affects Scale and Y-offset (Upward)
       // Base scale 0.8, grows to ~1.6 at peak
       const heightScale = 0.8 + arc * 0.8; 
       const heightOffset = -arc * 40; // Moves up 40px at peak

       // Draw Ground Shadow first (Independent of bomb height)
       ctx.save();
       ctx.fillStyle = 'rgba(0,0,0,0.3)';
       // Shadow shrinks slightly as bomb goes higher
       const shadowRadius = proj.radius * (1 - arc * 0.3); 
       ctx.beginPath();
       ctx.ellipse(0, 0, shadowRadius, shadowRadius * 0.6, 0, 0, Math.PI * 2);
       ctx.fill();
       ctx.restore();

       // Transform for Bomb Body (Height simulation)
       ctx.translate(0, heightOffset);
       ctx.scale(heightScale, heightScale);
       
       // Bomb Body
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
       ctx.fillStyle = proj.isIncendiary ? '#7f1d1d' : '#1f2937'; 
       ctx.fill();
       
       // Highlight
       ctx.beginPath();
       ctx.arc(-3, -3, 3, 0, Math.PI * 2);
       ctx.fillStyle = proj.isIncendiary ? '#ef4444' : '#4b5563';
       ctx.fill();
       
       // Fuse
       const fuseX = 0;
       const fuseY = -proj.radius;
       ctx.beginPath();
       ctx.moveTo(fuseX, fuseY);
       ctx.quadraticCurveTo(fuseX + 5, fuseY - 10, fuseX + 10, fuseY - 5);
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1.5;
       ctx.stroke();
       
       // Spark
       if (Math.floor(Date.now() / 50) % 2 === 0) {
           ctx.beginPath();
           ctx.arc(fuseX + 10, fuseY - 5, 2 + Math.random()*2, 0, Math.PI*2);
           ctx.fillStyle = '#ef4444';
           ctx.fill();
       }
       
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
