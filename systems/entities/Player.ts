
import { Player, GameAssets, Terrain, TerrainType, FloatingText } from '../../types';
import { MAP_WIDTH, MAP_HEIGHT, DETAIL_COLORS } from '../../constants';
import { checkRectOverlap } from '../utils';
import { drawWeapon } from '../combat/Weapon';
import * as FloatingTextSystem from '../ui/FloatingText';

export const updatePlayerMovement = (
    player: Player, 
    keys: { [key: string]: boolean }, 
    terrain: Terrain[],
    speedBoost: number,
    isSlowed: boolean // New Parameter
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
    if (isSlowed) speed *= 0.5; // Apply 50% slow
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
    silent: boolean = false
) => {
    if (timers.invincibility.current > 0 || timers.hurt.current > 0) return;

    // Dodge Check
    if (!ignoreShield && Math.random() < player.stats.dodgeChance) {
        FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 30, "DODGE", '#4ade80');
        return;
    }

    const isBlocked = !ignoreShield && Math.random() <= player.stats.blockChance;

    if (!isBlocked) {
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
        
        // Ultimate Charge on Damage Taken
        player.ultimateCharge = Math.min(100, player.ultimateCharge + (ignoreShield ? damage : Math.max(1, damage - player.stats.defense)));

        if (!ignoreShield) {
            timers.invincibility.current = 30; 
            timers.slowed.current = 30;
        }
    } else {
        if (!silent) FloatingTextSystem.createFloatingText(floatingTexts, player.x, player.y - 20, "BLOCKED", '#94a3b8');
    }
};

export const drawPlayer = (
    ctx: CanvasRenderingContext2D, 
    player: Player, 
    assets: GameAssets, 
    hurtTimer: number, 
    invincibilityTimer: number
) => {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // I-Frames Visual
    if (hurtTimer > 0 || invincibilityTimer > 0) {
       ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 20) * 0.4;
    }

    // Ultimate Effect Halo
    if (invincibilityTimer > 30) { // Distinction between Ult Invincibility vs I-frame
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); 
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; ctx.fill();
      ctx.strokeStyle = 'gold'; ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.rotate(player.angle + Math.PI/2); // Sprite face up

    const img = document.getElementById('player-asset-img') as HTMLImageElement;
    
    if (assets.playerSprite && img && img.complete) {
        // Draw Sprite Body
        ctx.drawImage(img, -24, -24, 48, 48);
    } else {
        // Draw Procedural Body
        ctx.rotate(-Math.PI/2); // Reset to face right for procedural
        ctx.rotate(player.angle); // Rotate to angle
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = player.color; 
        ctx.beginPath();
        ctx.roundRect(-8, -8, 16, 16, 4);
        ctx.fill();

        ctx.fillStyle = DETAIL_COLORS.skin;
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = player.color;
        ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI/2, -Math.PI/2); ctx.fill(); 
        
        ctx.rotate(-player.angle); // Reset
        ctx.rotate(player.angle + Math.PI/2); // Back to up facing for hands
    }

    // Draw Hands and Weapons ON TOP of Sprite
    // Hands relative to facing UP (since we rotated PI/2)
    const handOffsetX = 14; 
    
    // Right Hand (Weapon 1)
    ctx.save();
    ctx.translate(handOffsetX, 0);
    ctx.fillStyle = DETAIL_COLORS.skin;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); 
    ctx.rotate(-Math.PI/2); 
    drawWeapon(ctx, player.equipment.weapon1, 0, 0);
    ctx.restore();

    // Left Hand (Weapon 2)
    ctx.save();
    ctx.translate(-handOffsetX, 0);
    ctx.fillStyle = DETAIL_COLORS.skin;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); 
    ctx.rotate(-Math.PI/2);
    drawWeapon(ctx, player.equipment.weapon2, 0, 0);
    ctx.restore();

    ctx.restore();
};
