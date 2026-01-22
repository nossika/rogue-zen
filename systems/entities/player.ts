
import { Player, GameAssets, Terrain, TerrainType, FloatingText } from '../../types';
import { MAP_WIDTH, MAP_HEIGHT, DETAIL_COLORS } from '../../constants';
import { checkRectOverlap } from '../utils';
import * as TerrainSystem from '../world/terrain';
import * as FloatingTextSystem from '../ui/floating-text';

export const updatePlayerMovement = (
    player: Player, 
    keys: { [key: string]: boolean }, 
    terrain: Terrain[],
    speedBoost: number,
    slowStrength: number = 0
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

    // Use z-index aware terrain check for floors
    const winningTerrain = TerrainSystem.getTerrainAt(terrain, player.x, player.y, 1, 1);
    const terrainType = winningTerrain?.type || null;

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

    // X-Axis Collision
    let nextX = player.x + player.velocity.x;
    const hitTX = TerrainSystem.getTerrainAt(terrain, nextX, player.y, 20, 20);
    if (hitTX?.type === 'WALL' || hitTX?.type === 'EARTH_WALL') {
        player.velocity.x = 0;
    } else {
        player.x = Math.max(10, Math.min(MAP_WIDTH - 10, nextX));
    }

    // Y-Axis Collision
    let nextY = player.y + player.velocity.y;
    const hitTY = TerrainSystem.getTerrainAt(terrain, player.x, nextY, 20, 20);
    if (hitTY?.type === 'WALL' || hitTY?.type === 'EARTH_WALL') {
        player.velocity.y = 0;
    } else {
        player.y = Math.max(10, Math.min(MAP_HEIGHT - 10, nextY));
    }
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

    if (!ignoreShield && Math.random() < player.stats.dodgeChance) {
        FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 30, "DODGE", '#4ade80');
        return;
    }

    const startHp = player.stats.hp;

    if (ignoreShield) {
        player.stats.hp -= damage;
        spawnSplatter(player.x, player.y, '#ef4444');
        if (!silent && damage >= 1) {
            FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(damage)}`, '#ef4444');
        }
    } else {
       const rawDmg = Math.max(1, damage - player.stats.defense);
       if (player.stats.shield > 0) {
           if (player.stats.shield >= rawDmg) {
               player.stats.shield -= rawDmg;
               FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(rawDmg)}`, '#9ca3af');
           } else {
               const remaining = rawDmg - player.stats.shield;
               player.stats.shield = 0;
               player.stats.hp -= remaining;
               spawnSplatter(player.x, player.y, '#ef4444');
               FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(rawDmg)}`, '#ef4444');
           }
       } else {
           player.stats.hp -= rawDmg;
           spawnSplatter(player.x, player.y, '#ef4444');
           FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, `${Math.round(rawDmg)}`, '#ef4444');
       }
    }
    
    const endHp = player.stats.hp;
    const hpLost = startHp - endHp;
    if (hpLost > 0) {
        player.ultimateCharge = Math.min(100, player.ultimateCharge + hpLost);
    }

    let finalSlowDuration = 30;
    const armors = [player.equipment.armor1, player.equipment.armor2];
    for (const armor of armors) {
        if (armor && armor.armorEnchantment && armor.armorEnchantment.type === 'STATUS_RESIST') {
            finalSlowDuration *= (1.0 - armor.armorEnchantment.value);
        }
    }

    timers.invincibility.current = 30; 
    timers.slowed.current = finalSlowDuration;
};
