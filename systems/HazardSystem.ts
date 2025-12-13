
import { Hazard, HazardType, Player, Enemy, Terrain, ElementType } from '../types';
import * as TerrainSystem from './TerrainSystem';
import { checkRectOverlap, getElementalMultiplier } from './utils';
import { ELEMENT_CONFIG } from '../constants';

export const createHazard = (
    hazards: Hazard[],
    x: number, 
    y: number, 
    radius: number, 
    damage: number, 
    type: HazardType, 
    source: 'ENEMY' | 'PLAYER',
    element: ElementType = ElementType.NONE,
    critChance: number = 0
) => {
    // Explosion is short, Fire/Poison are longer persistent fields
    let duration = 480; // Default for FIRE (8s)

    if (type === 'EXPLOSION') {
        duration = 15;
    } else if (type === 'POISON') {
        duration = 720; // 12 seconds
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
        critChance
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
                    // Damage Player
                    const dPlayer = Math.sqrt((player.x - h.x)**2 + (player.y - h.y)**2);
                    if (dPlayer < h.radius + player.width/2) {
                        handlePlayerHit(h.damage, false, false);
                    }
                } else if (h.source === 'PLAYER') {
                    // Damage Enemies
                    enemies.forEach(e => {
                        const d = Math.sqrt((e.x - h.x)**2 + (e.y - h.y)**2);
                        if (d < h.radius + e.width/2) {
                            
                            // Elemental Calculation
                            let multiplier = 1.0;
                            if (h.source === 'PLAYER') {
                                multiplier = getElementalMultiplier(h.element, e.element);
                            }
                            
                            // Crit Calculation
                            const isCrit = Math.random() < (h.critChance || 0);
                            
                            // Apply elemental multiplier & Crit
                            let finalDamage = h.damage * multiplier;
                            if (isCrit) finalDamage *= 2;
                            
                            // Damage Application logic
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
                            
                            // Visuals
                            if (damageToHp > 0) {
                                if (spawnSplatter) spawnSplatter(e.x, e.y, '#ef4444');
                            }
                            
                            // Color logic based on multiplier
                            let textColor = '#ffffff'; // Default neutral (White)
                            
                            if (hitShield && damageToHp <= 0) {
                                textColor = '#cbd5e1'; // Silver (Blocked)
                            } else if (multiplier >= 3.0) {
                                textColor = ELEMENT_CONFIG[h.element].color; // Strong Element Color
                            } else if (multiplier <= 0.5) {
                                textColor = '#9ca3af'; // Gray (Weak)
                            }
                            
                            let textStr = Math.round(finalDamage).toString();
                            if (isCrit) textStr += "!";
                            
                            spawnFloatingText(e.x, e.y - 20, textStr, textColor, isCrit);
                        }
                    });
                }

                // Damage Earth Walls (Destructible Terrain)
                // Need to iterate terrain because Explosion breaks Earth Walls
                terrain.forEach(t => {
                    if (t.type === 'EARTH_WALL') {
                        // Check overlap
                        if (checkRectOverlap(h.x - h.radius, h.y - h.radius, h.radius*2, h.radius*2, t.x, t.y, t.width, t.height)) {
                            // Instant destruction for explosions
                            t.type = 'MUD';
                        }
                    }
                });
            }
        } else if (h.type === 'FIRE' || h.type === 'POISON') {
            // Circular Hitbox Logic
            const hitThreshold = h.radius + player.width / 2;
            const dx = player.x - h.x;
            const dy = player.y - h.y;
            const distSq = dx*dx + dy*dy;
            
            const playerHit = distSq < hitThreshold * hitThreshold;

            const damageTick = h.damage * dt;

            // Check immunity terrain (Fire -> Water, Poison -> Mud)
            // If the hazard itself is centered on immune terrain, it dissipates fast or doesn't work
            const centerTerrain = TerrainSystem.getTerrainAt(terrain, h.x, h.y, 1, 1);
            if ((h.type === 'FIRE' && centerTerrain === 'WATER') || 
                (h.type === 'POISON' && centerTerrain === 'MUD')) {
                // Instantly remove hazard if it lands on invalid terrain
                hazards.splice(i, 1);
                continue;
            }

            if (playerHit) {
                const playerTerrain = TerrainSystem.getTerrainAt(terrain, player.x, player.y, 1, 1);
                // Player safe from Fire in Water
                // Player safe from Poison in Mud (maybe? prompt said hazard doesn't work on mud, assume player standing on mud is safe too)
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
                 const edx = e.x - h.x;
                 const edy = e.y - h.y;
                 const eDistSq = edx*edx + edy*edy;
                 const eHitThreshold = h.radius + e.width / 2;
                 
                 if (eDistSq < eHitThreshold * eHitThreshold) {
                     // Specific Immunities
                     if (h.type === 'POISON' && e.type === 'ZOMBIE') return;

                     const enemyTerrain = TerrainSystem.getTerrainAt(terrain, e.x, e.y, 1, 1);
                     const isSafe = (h.type === 'FIRE' && enemyTerrain === 'WATER') || 
                                    (h.type === 'POISON' && enemyTerrain === 'MUD');
                     
                     if (!isSafe) {
                         // Apply damage to shield first
                         if (e.stats.shield > 0) {
                             if (e.stats.shield >= damageTick) {
                                 e.stats.shield -= damageTick;
                                 // Shield absorbed it, no splatter (implicitly)
                             } else {
                                 const remaining = damageTick - e.stats.shield;
                                 e.stats.shield = 0;
                                 e.stats.hp -= remaining;
                                 // Splatter not easily triggered here because it's a constant tick... 
                                 // visual noise might be too high if we splatter every frame.
                                 // Let's skip splatter for continuous hazards to keep it clean, or implement an accumulator like player.
                             }
                         } else {
                             e.stats.hp -= damageTick;
                             // Skip splatter for continuous damage ticks to avoid perf issues/visual noise
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
            // Color based on Element?
            let color = '239, 68, 68'; // Red default
            if (h.element !== ElementType.NONE && ELEMENT_CONFIG[h.element]) {
                const hex = ELEMENT_CONFIG[h.element].color;
                // Convert hex to rgb for rgba usage (simple approximation or keep red for explosion feel)
                // Let's keep the explosion visual consistently fiery/orange unless we want colored explosions.
                // Standard game feel usually keeps explosions orange/red.
            }
            
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

            // 1. Find overlapping immune tiles (Fire -> Water, Poison -> Mud)
            const intersectingImmune = terrain.filter(t => 
                ((isPoison && t.type === 'MUD') || (!isPoison && t.type === 'WATER')) && 
                checkRectOverlap(hx, hy, size, size, t.x, t.y, t.width, t.height)
            );

            // 2. Draw Area (Circle with holes where immune terrain is)
            ctx.save(); // Save context for clip
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.clip(); // Clip drawing to the circle

            // Prepare 'evenodd' fill
            ctx.beginPath();
            // Add a rectangle covering the whole circle (Positive space)
            ctx.rect(hx, hy, size, size); 
            
            // Add intersecting immune rects (Negative space via evenodd)
            intersectingImmune.forEach(w => {
                ctx.rect(w.x, w.y, w.width, w.height);
            });

            const baseColor = isPoison ? 'rgba(163, 230, 53, 0.3)' : 'rgba(185, 28, 28, 0.2)'; // Lime for poison, Red for fire
            const shadowColor = isPoison ? '#a3e635' : '#ef4444';

            ctx.fillStyle = baseColor;
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = 0; 
            ctx.fill('evenodd'); // Fill circle, leaving holes for immune terrain
            
            ctx.restore(); // Remove clip

            // 3. Draw Edge Effects (Flames or Bubbles)
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
                    // Draw Bubbles
                    const bubbleScale = 0.5 + Math.sin(time / 200 + seed) * 0.3;
                    ctx.scale(bubbleScale, bubbleScale);
                    ctx.fillStyle = '#bef264'; // Lighter lime
                    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#65a30d';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    // Draw Flames
                    const flicker = Math.sin(time / 150 + seed) * 0.2;
                    const scale = 0.8 + flicker;
                    
                    ctx.scale(scale, scale);
                    ctx.fillStyle = seed % 2 === 0 ? '#fbbf24' : '#f59e0b'; // Amber
                    
                    // Draw simple flame shape
                    ctx.beginPath();
                    ctx.moveTo(0, -8);
                    ctx.quadraticCurveTo(4, 0, 0, 4);
                    ctx.quadraticCurveTo(-4, 0, 0, -8);
                    ctx.fill();
                }
                
                ctx.restore();
            };

            // Loop around the circumference (and a few inside for poison)
            for (let i = 0; i < itemCount; i++) {
                const angle = i * step;
                const fx = h.x + Math.cos(angle) * h.radius;
                const fy = h.y + Math.sin(angle) * h.radius;
                drawEffect(fx, fy, i * 100);
            }
            
            // Extra internal bubbles for poison
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
