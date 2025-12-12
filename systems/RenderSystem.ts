
import { Player, Enemy, Projectile, Terrain, Hazard, GoldDrop, FloatingText, GameAssets, SpatialHashGrid, Particle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT, COLOR_PALETTE, ELEMENT_CONFIG, DETAIL_COLORS } from '../constants';
import * as TerrainSystem from './TerrainSystem';
import * as HazardSystem from './HazardSystem';
import * as LootSystem from './LootSystem';
import * as PlayerSystem from './PlayerSystem';
import * as EnemySystem from './EnemySystem';
import * as ProjectileSystem from './ProjectileSystem';
import * as ParticleSystem from './ParticleSystem';

interface DrawContext {
    ctx: CanvasRenderingContext2D;
    camera: { x: number; y: number };
    terrain: Terrain[];
    hazards: Hazard[];
    goldDrops: GoldDrop[];
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    floatingTexts: FloatingText[];
    particles: Particle[];
    assets: GameAssets;
    hurtTimer: number;
    invincibilityTimer: number;
    omniForceActive: boolean;
}

export const drawGame = ({
    ctx,
    camera,
    terrain,
    hazards,
    goldDrops,
    player,
    enemies,
    projectiles,
    floatingTexts,
    particles,
    assets,
    hurtTimer,
    invincibilityTimer,
    omniForceActive
}: DrawContext) => {
    // Clear viewport
    ctx.fillStyle = COLOR_PALETTE.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw Grid
    ctx.fillStyle = '#2d3748';
    const startX = Math.floor(camera.x / 40) * 40;
    const startY = Math.floor(camera.y / 40) * 40;
    const endX = startX + CANVAS_WIDTH + 40;
    const endY = startY + CANVAS_HEIGHT + 40;

    for (let x = startX; x < endX; x += 40) {
        for (let y = startY; y < endY; y += 40) {
            if (x >= 0 && x <= MAP_WIDTH && y >= 0 && y <= MAP_HEIGHT) {
                ctx.beginPath(); ctx.arc(x,y, 1.5, 0, Math.PI*2); ctx.fill();
            }
        }
    }
    
    // Map Border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw Systems
    TerrainSystem.drawTerrain(ctx, terrain);
    HazardSystem.drawHazards(ctx, hazards, terrain);
    LootSystem.drawLoot(ctx, goldDrops);

    // Buff Visuals
    if (omniForceActive) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 50) * 0.4;
        ctx.fillStyle = '#ff0055';
        ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }
    
    if (player.stats.shield > 0) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.2;
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    // Entities
    PlayerSystem.drawPlayer(ctx, player, assets, hurtTimer, invincibilityTimer);
    enemies.forEach(e => EnemySystem.drawEnemy(ctx, e, assets));
    projectiles.forEach(proj => ProjectileSystem.drawProjectile(ctx, proj));
    
    // Visual Effects
    ParticleSystem.drawParticles(ctx, particles);

    // Floating Text
    floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.opacity;
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = 'black'; 
      if (ft.text === "DODGE") {
          ctx.font = "bold italic 22px 'Roboto', sans-serif";
          ctx.lineWidth = 2;
      } else if (ft.isCrit) {
          ctx.font = "bold 24px 'Roboto', sans-serif"; 
          ctx.lineWidth = 4;
      } else {
          ctx.font = "bold 20px 'Roboto', sans-serif";
          ctx.lineWidth = 3;
      }
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
    
    ctx.restore(); 

    // Off-screen markers for ALL Enemies
    enemies.forEach(e => {
        const relX = e.x - camera.x;
        const relY = e.y - camera.y;
        const pad = 30;
        const isOffScreen = relX < -pad || relX > CANVAS_WIDTH + pad || relY < -pad || relY > CANVAS_HEIGHT + pad;
        
        if (isOffScreen) {
             const cx = CANVAS_WIDTH / 2;
             const cy = CANVAS_HEIGHT / 2;
             const dx = relX - cx;
             const dy = relY - cy;
             const angle = Math.atan2(dy, dx);
             
             const borderL = pad;
             const borderR = CANVAS_WIDTH - pad;
             const borderT = pad;
             const borderB = CANVAS_HEIGHT - pad;
             
             let t = Infinity;
             if (dx > 0) t = Math.min(t, (borderR - cx) / dx);
             else if (dx < 0) t = Math.min(t, (borderL - cx) / dx);
             
             if (dy > 0) t = Math.min(t, (borderB - cy) / dy);
             else if (dy < 0) t = Math.min(t, (borderT - cy) / dy);
             
             const arrowX = cx + t * dx;
             const arrowY = cy + t * dy;
             
             ctx.save();
             ctx.translate(arrowX, arrowY);
             ctx.rotate(angle);
             
             // Different color for Boss vs Normal Enemies
             ctx.fillStyle = e.type === 'BOSS' ? '#a855f7' : '#ef4444';
             
             ctx.beginPath();
             ctx.moveTo(12, 0);
             ctx.lineTo(-8, 8);
             ctx.lineTo(-8, -8);
             ctx.fill();
             
             // Extra flair for boss indicator
             if (e.type === 'BOSS') { 
                 ctx.strokeStyle = '#fff'; 
                 ctx.lineWidth = 2; 
                 ctx.stroke(); 
             }
             ctx.restore();
        }
    });
};
