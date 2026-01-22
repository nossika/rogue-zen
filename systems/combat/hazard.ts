
import { Hazard, HazardType, Player, Enemy, Terrain, ElementType } from '../../types';
import * as TerrainSystem from '../world/terrain';
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
    handlePlayerHit: (damage: number, ignoreShield: boolean, silent: boolean, slowIntensity?: number) => void,
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
                        let damage = h.damage;
                        const armors = [player.equipment.armor1, player.equipment.armor2];
                        if (h.element !== ElementType.NONE) {
                             for (const armor of armors) {
                               if (armor && armor.armorEnchantment && 
                                   armor.armorEnchantment.type === 'ELEMENTAL_RESIST' && 
                                   armor.armorEnchantment.element === h.element) {
                                   damage *= (1.0 - armor.armorEnchantment.value);
                               }
                           }
                        }
                        handlePlayerHit(damage, false, false);
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
                            if (damageToHp > 0 && spawnSplatter) {
                                spawnSplatter(e.x, e.y, '#ef4444');
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
                                const hitTCheck = TerrainSystem.getTerrainAt(terrain, e.x + kbX, e.y, 20, 20);
                                if (hitTCheck?.type !== 'WALL' && hitTCheck?.type !== 'EARTH_WALL') e.x += kbX;
                                const hitTCheckY = TerrainSystem.getTerrainAt(terrain, e.x, e.y + kbY, 20, 20);
                                if (hitTCheckY?.type !== 'WALL' && hitTCheckY?.type !== 'EARTH_WALL') e.y += kbY;
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
            let damageTick = h.damage * dt;
            const winnerH = TerrainSystem.getTerrainAt(terrain, h.x, h.y, 1, 1);
            const centerTerrain = winnerH?.type || null;

            if ((h.type === 'FIRE' && centerTerrain === 'WATER') || 
                (h.type === 'POISON' && centerTerrain === 'MUD')) {
                hazards.splice(i, 1);
                continue;
            }
            if (playerHit) {
                const winnerP = TerrainSystem.getTerrainAt(terrain, player.x, player.y, 1, 1);
                const playerTerrain = winnerP?.type || null;
                const isSafe = (h.type === 'FIRE' && playerTerrain === 'WATER') || 
                               (h.type === 'POISON' && playerTerrain === 'MUD');
                if (!isSafe) {
                    const armors = [player.equipment.armor1, player.equipment.armor2];
                    for (const armor of armors) {
                        if (armor && armor.armorEnchantment) {
                             if (h.type === 'FIRE' && armor.armorEnchantment.type === 'BURN_RESIST') {
                                 damageTick *= (1.0 - armor.armorEnchantment.value);
                             }
                             if (h.type === 'POISON' && armor.armorEnchantment.type === 'POISON_RESIST') {
                                 damageTick *= (1.0 - armor.armorEnchantment.value);
                             }
                        }
                    }
                    handlePlayerHit(damageTick, true, false, 0.25);
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
                     const winnerE = TerrainSystem.getTerrainAt(terrain, e.x, e.y, 1, 1);
                     const enemyTerrain = winnerE?.type || null;
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
