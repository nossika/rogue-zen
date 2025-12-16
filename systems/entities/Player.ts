
import { Player, GameAssets, Terrain, TerrainType, FloatingText } from '../../types';
import { MAP_WIDTH, MAP_HEIGHT, DETAIL_COLORS } from '../../constants';
import { checkRectOverlap } from '../utils';
import * as FloatingTextSystem from '../ui/FloatingText';

export const updatePlayerMovement = (
    player: Player, 
    keys: { [key: string]: boolean }, 
    terrain: Terrain[],
    speedBoost: number,
    slowStrength: number = 0 // Changed from boolean to number (0 to 1)
) => {
    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      player.angle = Math.atan2(dy, dx);
    }

    let terrainType: TerrainType | null = null;
    for (const t of terrain) {
        if ((t.type !== 'WALL' && t.type !== 'EARTH_WALL') && player.x > t.x && player.x < t.x + t.width && player.y > t.y && player.y < t.y + t.height) {
            terrainType = t.type;
            break;
        }
    }

    let speed = player.stats.moveSpeed;
    if (speedBoost > 0) speed *= 1.5;
    if (slowStrength > 0) speed *= (1.0 - slowStrength); 
    if (terrainType === 'MUD') speed *= 0.5;

    const targetVx = dx * speed;
    const targetVy = dy * speed;

    if (terrainType === 'WATER') {
        const friction = 0.05; 
        player.velocity.x += (targetVx - player.velocity.x) * friction;
        player.velocity.y += (targetVy - player.velocity.y) * friction;
    } else {
        player.velocity.x = targetVx;
        player.velocity.y = targetVy;
    }

    let nextX = player.x + player.velocity.x;
    let hitWallX = false;
    for (const t of terrain) {
        if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && checkRectOverlap(nextX - 10, player.y - 10, 20, 20, t.x, t.y, t.width, t.height)) {
            hitWallX = true;
            player.velocity.x = 0; 
            break;
        }
    }
    if (!hitWallX) player.x = Math.max(10, Math.min(MAP_WIDTH - 10, nextX));

    let nextY = player.y + player.velocity.y;
    let hitWallY = false;
    for (const t of terrain) {
        if ((t.type === 'WALL' || t.type === 'EARTH_WALL') && checkRectOverlap(player.x - 10, nextY - 10, 20, 20, t.x, t.y, t.width, t.height)) {
            hitWallY = true;
            player.velocity.y = 0; 
            break;
        }
    }
    if (!hitWallY) player.y = Math.max(10, Math.min(MAP_HEIGHT - 10, nextY));
};

export const handlePlayerDamage = (
    player: Player,
    damage: number,
    timers: { invincibility: { current: number }, hurt: { current: number }, slowed: { current: number } },
    floatingTexts: FloatingText[],
    spawnSplatter: (x: number, y: number, color?: string) => void,
    ignoreShield: boolean = false,
    silent: boolean = false,
    slowIntensity: number = 0.5
) => {
    if (timers.invincibility.current > 0 || timers.hurt.current > 0) return;

    // Dodge Check
    if (!ignoreShield && Math.random() < player.stats.dodgeChance) {
        FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 30, "DODGE", '#4ade80');
        return;
    }

    // Capture HP before damage
    const startHp = player.stats.hp;

    if (ignoreShield) {
        player.stats.hp -= damage;
        spawnSplatter(player.x, player.y, '#ef4444'); // Always splatter on direct HP damage
        if (!silent && damage >= 1) {
            FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(damage)}`, '#ef4444');
        }
    } else {
       const rawDmg = Math.max(1, damage - player.stats.defense);
       if (player.stats.shield > 0) {
           if (player.stats.shield >= rawDmg) {
               player.stats.shield -= rawDmg;
               FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(rawDmg)}`, '#9ca3af');
               // No Splatter - Shield Absorbed
           } else {
               const remaining = rawDmg - player.stats.shield;
               player.stats.shield = 0;
               player.stats.hp -= remaining;
               spawnSplatter(player.x, player.y, '#ef4444'); // Splatter on bleed-through
               FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(rawDmg)}`, '#ef4444');
           }
       } else {
           player.stats.hp -= rawDmg;
           spawnSplatter(player.x, player.y, '#ef4444'); // Splatter on full HP hit
           FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(rawDmg)}`, '#ef4444');
       }
    }
    
    // Ultimate Charge Logic: Only charge if HP was lost
    const endHp = player.stats.hp;
    const hpLost = startHp - endHp;
    if (hpLost > 0) {
        player.ultimateCharge = Math.min(100, player.ultimateCharge + hpLost);
    }

    // Apply Slow / Invincibility
    // Note: Even if ignoreShield is true (hazards), we now trigger slow and invincibility as requested
    let finalSlowDuration = 30;
    
    // Apply Status Resistance
    const armors = [player.equipment.armor1, player.equipment.armor2];
    for (const armor of armors) {
        if (armor && armor.armorEnchantment && armor.armorEnchantment.type === 'STATUS_RESIST') {
            finalSlowDuration *= (1.0 - armor.armorEnchantment.value);
        }
    }

    timers.invincibility.current = 30; 
    timers.slowed.current = finalSlowDuration;
};
