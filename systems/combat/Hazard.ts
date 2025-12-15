
import { Hazard, HazardType, Player, Enemy, Terrain, ElementType } from '../../types';
import * as TerrainSystem from '../world/Terrain';
import { checkRectOverlap, getElementalMultiplier } from '../utils';
import { ELEMENT_CONFIG, DEBUFF_CONFIG } from '../../constants';

export const createHazard = (
    hazards: Hazard[],
    x: number, 
    y: number, 
    radius: number, 
    damage: number, 
    type: HazardType, 
    source: 'ENEMY' | 'PLAYER',
    element: ElementType = ElementType.NONE,
    critChance: number = 0,
    knockback: number = 0
) => {
    let duration = 480; 

    if (type === 'EXPLOSION') {
        duration = 15;
    } else if (type === 'POISON') {
        duration = 720; 
    }
    
    hazards.push({
        id: Math.random().toString(),
        x,
        y,
        radius, 
        damage,
        duration: duration,
        maxDuration: duration,
        type,
        tickRate: 0,
        tickTimer: 0,
        source,
        element,
        critChance,
        knockback
    });
};

export const updateHazards = (
    hazards: Hazard[],
    player: Player,
    enemies: Enemy[],
    terrain: Terrain[],
    dt: number,
    fireDamageAccumulatorRef: { current: number },
    spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit: boolean) => void,
    handlePlayerHit: (damage: number, ignoreShield: boolean, silent: boolean) => void,
    spawnSplatter?: (x: number, y: number, color?: string) => void
) => {
    for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        h.duration--;
        
        let shouldDamage = false;
        
        if (h.type === 'EXPLOSION') {
            if (h.duration === h.maxDuration - 1) shouldDamage = true;
            if (shouldDamage) {
                
                if (h.source === 'ENEMY') {
                    const dPlayer = Math.sqrt((player.x - h.x)**2 + (player.y - h.y)**2);
                    if (dPlayer < h.radius + player.width/2) {
                        handlePlayerHit(h.damage, false, false);
                    }
                } else if (h.source === 'PLAYER') {
                    enemies.forEach(e => {
                        if (e.dead) return; 

                        const d = Math.sqrt((e.x - h.x)**2 + (e.y - h.y)**2);
                        if (d < h.radius + e.width/2) {
                            
                            let multiplier = 1.0;
                            if (h.source === 'PLAYER') {
                                multiplier = getElementalMultiplier(h.element, e.element);
                            }
                            
                            const isCrit = Math.random() < (h.critChance || 0);
                            
                            let finalDamage = h.damage * multiplier;
                            if (isCrit) finalDamage *= 2;
                            
                            if (e.debuffs.BLEED > 0) {
                                finalDamage *= DEBUFF_CONFIG.BLEED_DAMAGE_MULT;
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
                                if (spawnSplatter) spawnSplatter(e.x, e.y, '#ef4444');
                            }
                            
                            let textColor = '#ffffff'; 
                            
                            if (hitShield && damageToHp <= 0) {
                                textColor = '#cbd5e1'; 
                            } else if (multiplier >= 3.0) {
                                textColor = ELEMENT_CONFIG[h.element].color; 
                            } else if (multiplier <= 0.5) {
                                textColor = '#9ca3af'; 
                            }
                            
                            let textStr = Math.round(finalDamage).toString();
                            if (isCrit) textStr += "!";
                            
                            spawnFloatingText(e.x, e.y - 20, textStr, textColor, isCrit);

                            if (h.knockback && h.knockback > 0 && e.stats.shield <= 0) {
                                let kbStrength = h.knockback;
                                if (e.type === 'BOSS') {
                                    kbStrength /= DEBUFF_CONFIG.BOSS_RESISTANCE;
                                }
                                
                                const angle = Math.atan2(e.y - h.y, e.x - h.x);
                                const kbX = Math.cos(angle) * kbStrength;
                                const kbY = Math.sin(angle) * kbStrength;
                                
                                if (!TerrainSystem.getTerrainAt(terrain, e.x + kbX, e.y, 20, 20)?.includes('WALL')) e.x += kbX;
                                if (!TerrainSystem.getTerrainAt(terrain, e.x, e.y + kbY, 20, 20)?.includes('WALL')) e.y += kbY;
                            }
                        }
                    });
                }

                terrain.forEach(t => {
                    if (t.type === 'EARTH_WALL') {
                        if (checkRectOverlap(h.x - h.radius, h.y - h.radius, h.radius*2, h.radius*2, t.x, t.y, t.width, t.height)) {
                            t.type = 'MUD';
                        }
                    }
                });
            }
        } else if (h.type === 'FIRE' || h.type === 'POISON') {
            const hitThreshold = h.radius + player.width / 2;
            const dx = player.x - h.x;
            const dy = player.y - h.y;
            const distSq = dx*dx + dy*dy;
            
            const playerHit = distSq < hitThreshold * hitThreshold;

            const damageTick = h.damage * dt;

            const centerTerrain = TerrainSystem.getTerrainAt(terrain, h.x, h.y, 1, 1);
            if ((h.type === 'FIRE' && centerTerrain === 'WATER') || 
                (h.type === 'POISON' && centerTerrain === 'MUD')) {
                hazards.splice(i, 1);
                continue;
            }

            if (playerHit) {
                const playerTerrain = TerrainSystem.getTerrainAt(terrain, player.x, player.y, 1, 1);
                const isSafe = (h.type === 'FIRE' && playerTerrain === 'WATER') || 
                               (h.type === 'POISON' && playerTerrain === 'MUD');

                if (!isSafe) {
                    fireDamageAccumulatorRef.current += damageTick;
                    handlePlayerHit(damageTick, true, true); 
                    if (fireDamageAccumulatorRef.current >= 5) {
                        const color = h.type === 'POISON' ? '#a3e635' : '#ef4444';
                        spawnFloatingText(player.x, player.y - 30, `${Math.floor(fireDamageAccumulatorRef.current)}`, color, false);
                        fireDamageAccumulatorRef.current = 0;
                    }
                }
            }
            
            enemies.forEach(e => {
                 if (e.dead) return; 

                 const edx = e.x - h.x;
                 const edy = e.y - h.y;
                 const eDistSq = edx*edx + edy*edy;
                 const eHitThreshold = h.radius + e.width / 2;
                 
                 if (eDistSq < eHitThreshold * eHitThreshold) {
                     if (h.type === 'POISON' && e.type === 'ZOMBIE') return;

                     const enemyTerrain = TerrainSystem.getTerrainAt(terrain, e.x, e.y, 1, 1);
                     const isSafe = (h.type === 'FIRE' && enemyTerrain === 'WATER') || 
                                    (h.type === 'POISON' && enemyTerrain === 'MUD');
                     
                     if (!isSafe) {
                         if (e.stats.shield > 0) {
                             if (e.stats.shield >= damageTick) {
                                 e.stats.shield -= damageTick;
                             } else {
                                 const remaining = damageTick - e.stats.shield;
                                 e.stats.shield = 0;
                                 e.stats.hp -= remaining;
                             }
                         } else {
                             let finalTick = damageTick;
                             if (e.debuffs.BLEED > 0) {
                                 finalTick *= DEBUFF_CONFIG.BLEED_DAMAGE_MULT;
                             }
                             e.stats.hp -= finalTick;
                         }
                     }
                 }
            });
        }
        if (h.duration <= 0) {
            hazards.splice(i, 1);
        }
    }
};

export const drawHazards = (ctx: CanvasRenderingContext2D, hazards: Hazard[], terrain: Terrain[]) => {
    hazards.forEach(h => {
        ctx.save();
        
        if (h.type === 'EXPLOSION') {
            ctx.translate(h.x, h.y);
            const progress = 1 - (h.duration / h.maxDuration);
            let color = '239, 68, 68'; 
            
            ctx.fillStyle = `rgba(${color}, ${1 - progress})`; 
            ctx.beginPath(); ctx.arc(0, 0, h.radius * progress, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = `rgba(255, 200, 0, ${1 - progress})`;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, h.radius * progress, 0, Math.PI*2); ctx.stroke();
        } else if (h.type === 'FIRE' || h.type === 'POISON') {
            const size = h.radius * 2;
            const hx = h.x - h.radius;
            const hy = h.y - h.radius;
            const isPoison = h.type === 'POISON';

            const intersectingImmune = terrain.filter(t => 
                ((isPoison && t.type === 'MUD') || (!isPoison && t.type === 'WATER')) && 
                checkRectOverlap(hx, hy, size, size, t.x, t.y, t.width, t.height)
            );

            ctx.save(); 
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.clip(); 

            ctx.beginPath();
            ctx.rect(hx, hy, size, size); 
            
            intersectingImmune.forEach(w => {
                ctx.rect(w.x, w.y, w.width, w.height);
            });

            const baseColor = isPoison ? 'rgba(163, 230, 53, 0.3)' : 'rgba(185, 28, 28, 0.2)'; 
            const shadowColor = isPoison ? '#a3e635' : '#ef4444';

            ctx.fillStyle = baseColor;
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = 0; 
            ctx.fill('evenodd'); 
            
            ctx.restore(); 

            const circumference = 2 * Math.PI * h.radius;
            const itemSpacing = 20; 
            const itemCount = Math.floor(circumference / itemSpacing);
            const step = (Math.PI * 2) / itemCount;
            const time = Date.now();

            const isPointImmune = (px: number, py: number) => {
                return intersectingImmune.some(w => 
                    px >= w.x && px <= w.x + w.width && 
                    py >= w.y && py <= w.y + w.height
                );
            };

            const drawEffect = (fx: number, fy: number, seed: number) => {
                if (isPointImmune(fx, fy)) return;

                ctx.save();
                ctx.translate(fx, fy);
                
                if (isPoison) {
                    const bubbleScale = 0.5 + Math.sin(time / 200 + seed) * 0.3;
                    ctx.scale(bubbleScale, bubbleScale);
                    ctx.fillStyle = '#bef264'; 
                    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#65a30d';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    const flicker = Math.sin(time / 150 + seed) * 0.2;
                    const scale = 0.8 + flicker;
                    
                    ctx.scale(scale, scale);
                    ctx.fillStyle = seed % 2 === 0 ? '#fbbf24' : '#f59e0b'; 
                    
                    ctx.beginPath();
                    ctx.moveTo(0, -8);
                    ctx.quadraticCurveTo(4, 0, 0, 4);
                    ctx.quadraticCurveTo(-4, 0, 0, -8);
                    ctx.fill();
                }
                
                ctx.restore();
            };

            for (let i = 0; i < itemCount; i++) {
                const angle = i * step;
                const fx = h.x + Math.cos(angle) * h.radius;
                const fy = h.y + Math.sin(angle) * h.radius;
                drawEffect(fx, fy, i * 100);
            }
            
            if (isPoison) {
                for(let i=0; i<3; i++) {
                    const angle = (Date.now() / 1000) + (i * 2);
                    const dist = h.radius * 0.5;
                    const bx = h.x + Math.cos(angle) * dist;
                    const by = h.y + Math.sin(angle) * dist;
                    drawEffect(bx, by, i * 500);
                }
            }
        }
        ctx.restore();
    });
};
