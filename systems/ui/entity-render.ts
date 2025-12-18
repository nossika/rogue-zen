
import { Player, Enemy, GameAssets, ElementType } from '../../types';
import { DETAIL_COLORS, ELEMENT_CONFIG } from '../../constants';
import { drawWeapon } from './combat-render';

export const drawPlayer = (
    ctx: CanvasRenderingContext2D, 
    player: Player, 
    assets: GameAssets, 
    hurtTimer: number, 
    invincibilityTimer: number
) => {
    const time = Date.now();
    const isMoving = Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1;
    
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Dynamic Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const shadowSize = 14 + Math.sin(time / 200) * 2;
    ctx.beginPath(); ctx.ellipse(0, 16, shadowSize, shadowSize * 0.5, 0, 0, Math.PI*2); ctx.fill();

    // Squash and Stretch Logic
    let scaleX = 1.0;
    let scaleY = 1.0;
    if (isMoving) {
        scaleX = 1.0 + Math.sin(time / 100) * 0.05;
        scaleY = 1.0 - Math.sin(time / 100) * 0.05;
    } else {
        scaleY = 1.0 + Math.sin(time / 400) * 0.02;
    }
    ctx.scale(scaleX, scaleY);

    if (hurtTimer > 0 || invincibilityTimer > 0) {
       ctx.globalAlpha = 0.6 + Math.sin(time / 30) * 0.3;
    }

    if (invincibilityTimer > 30) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(player.angle + Math.PI/2); 

    const img = document.getElementById('player-asset-img') as HTMLImageElement;
    
    if (assets.playerSprite && img && img.complete) {
        ctx.drawImage(img, -24, -24, 48, 48);
    } else {
        // Procedural Trooper
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.roundRect(-12, -10, 24, 24, 6); ctx.fill();
        
        ctx.fillStyle = player.color;
        ctx.beginPath(); ctx.roundRect(-16, -4, 8, 14, 3); ctx.fill(); 
        ctx.beginPath(); ctx.roundRect(8, -4, 8, 14, 3); ctx.fill();  
        
        const chestGrad = ctx.createLinearGradient(0, -10, 0, 10);
        chestGrad.addColorStop(0, player.color);
        chestGrad.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = chestGrad;
        ctx.beginPath(); ctx.roundRect(-10, -8, 20, 16, 4); ctx.fill();
        
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(0, -4, 11, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath(); ctx.roundRect(-7, -8, 14, 4, 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(-5, -7, 3, 1);
        ctx.globalAlpha = 1.0;
    }

    // Weapons
    const handX = 16;
    const handY = isMoving ? Math.sin(time / 100) * 3 : 0;

    // Right Hand
    ctx.save();
    ctx.translate(handX, handY);
    ctx.fillStyle = DETAIL_COLORS.skin;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
    ctx.rotate(-Math.PI/2); 
    drawWeapon(ctx, player.equipment.weapon1, 0, 0);
    ctx.restore();

    // Left Hand
    ctx.save();
    ctx.translate(-handX, -handY);
    ctx.fillStyle = DETAIL_COLORS.skin;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
    ctx.rotate(-Math.PI/2);
    drawWeapon(ctx, player.equipment.weapon2, 0, 0);
    ctx.restore();

    ctx.restore();
};

const drawSkull = (ctx: CanvasRenderingContext2D, opacity: number) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#fff';
    
    // Cranium
    ctx.beginPath(); ctx.arc(0, -4, 8, 0, Math.PI * 2); ctx.fill();
    
    // Jaw
    ctx.beginPath(); ctx.roundRect(-5, 2, 10, 6, 2); ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -3, 2, 0, Math.PI * 2); ctx.fill();
    
    // Nose hole
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-1, 2); ctx.lineTo(1, 2); ctx.fill();
    
    ctx.restore();
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, assets: GameAssets) => {
    const time = Date.now();
    const baseColor = ELEMENT_CONFIG[e.element].color;

    // --- Death Animation ---
    if (e.dead) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const progress = (e.deathTimer || 0) / 25; // 1 to 0
        const opacity = progress;
        
        // Rise and fade skull
        ctx.translate(0, (1 - progress) * -40);
        drawSkull(ctx, opacity);
        
        ctx.restore();
        return; 
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    
    // Dynamic Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, e.height/2, e.width/2, e.width/4, 0, 0, Math.PI*2); ctx.fill();

    // Movement Wobble & Scale
    const wobble = Math.sin(time / 150 + parseFloat(e.id)) * 0.05;
    ctx.scale(1 + wobble, 1 - wobble);

    // --- Debuff Visuals ---
    if (e.debuffs.SLOW > 0) {
        ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
        ctx.beginPath(); ctx.arc(0, 0, e.width * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (e.debuffs.BLEED > 0) {
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2 + Math.sin(time/50)*1;
        ctx.beginPath(); ctx.arc(0, 0, e.width * 0.6, 0, Math.PI * 2); ctx.stroke();
    }

    // --- Shield Aura ---
    if (e.stats.shield > 0) {
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(time / 100) * 0.2;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sides = 6;
        const r = e.width * 0.65;
        for(let i=0; i<sides; i++) {
            const a = (i/sides) * Math.PI * 2 + (time/1000);
            ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    if (e.type === 'BOSS') {
        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(time / 200) * 0.1;
        ctx.fillStyle = baseColor;
        ctx.beginPath(); ctx.arc(0, 0, e.width * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    ctx.rotate(e.angle);

    // --- Procedural Body Designs ---
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    switch(e.type) {
        case 'TANK':
            ctx.roundRect(-e.width/2, -e.height/2, e.width, e.height, 4);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.strokeRect(-e.width/3, -e.height/3, e.width/1.5, e.height/1.5);
            break;
            
        case 'FAST':
            ctx.moveTo(e.width/2, 0);
            ctx.lineTo(-e.width/2, e.height/2);
            ctx.lineTo(-e.width/4, 0);
            ctx.lineTo(-e.width/2, -e.height/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(-e.width/3, 0, 3, 0, Math.PI*2); ctx.fill();
            break;
            
        case 'RANGED':
            ctx.arc(0, 0, e.width/2.5, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            const orbitDist = e.width * 0.5;
            for(let i=0; i<3; i++) {
                const a = (time/500) + (i * Math.PI * 2 / 3);
                ctx.beginPath(); 
                ctx.arc(Math.cos(a)*orbitDist, Math.sin(a)*orbitDist, 3, 0, Math.PI*2); 
                ctx.fill();
            }
            break;

        case 'BOMBER':
            ctx.arc(0, 0, e.width/2, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = (time % 400 < 200) ? '#ef4444' : '#000';
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
            break;

        case 'ZOMBIE':
            const petals = 8;
            for(let i=0; i<petals*2; i++) {
                const r = (i%2===0) ? e.width/2 : e.width/2.5 + Math.sin(time/200)*2;
                const a = (i / petals) * Math.PI;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;

        case 'IRON_BEETLE':
            ctx.ellipse(0, 0, e.width/2, e.height/3, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-e.width/2, 0); ctx.lineTo(e.width/2, 0); ctx.stroke();
            break;

        case 'BOSS':
            const spikes = 16;
            for(let i=0; i<spikes*2; i++) {
                const r = (i%2===0) ? e.width/2 : e.width/2.5;
                const a = (i / spikes) * Math.PI;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0,0, e.width/4, 0, Math.PI*2); ctx.stroke();
            break;

        default:
            ctx.arc(0, 0, e.width/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
    }

    // --- Eyes ---
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = (e.type === 'BOSS' || e.debuffs.BLEED > 0) ? 8 : 2;
    const eyeSize = e.type === 'BOSS' ? 5 : 3;
    const eyeOffset = e.width/4;
    ctx.beginPath(); ctx.arc(eyeOffset, -e.height/6, eyeSize, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeOffset, e.height/6, eyeSize, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // --- Stun Ring ---
    if (e.debuffs.STUN > 0) {
        ctx.save();
        ctx.rotate(-e.angle); // Keep upright
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
        const rot = time / 100;
        ctx.beginPath(); 
        ctx.ellipse(0, -e.height/2 - 10, 10, 3, rot, 0, Math.PI*2); 
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();

    // --- HUD Bars (HP & Armor/Shield) ---
    if (!e.dead) {
        const barW = e.type === 'BOSS' ? 64 : 34;
        const barH = 4;
        
        // 1. Armor/Shield Bar (Visible above HP)
        if (e.stats.shield > 0) {
            const armorBarY = e.y - e.height/2 - 20;
            // Background
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(e.x - barW/2, armorBarY, barW, barH);
            
            // Shield Fill (Cyan/Slate)
            // Use maxHp or shield baseline to scale. For standard enemies shield equals armor buffer.
            const shieldPct = Math.min(1, e.stats.shield / e.stats.maxHp);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(e.x - barW/2, armorBarY, barW * shieldPct, barH);
            
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(e.x - barW/2, armorBarY, barW, barH);
        }

        // 2. Health Bar
        const hpBarY = e.y - e.height/2 - 14;
        // Background
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(e.x - barW/2, hpBarY, barW, barH);
        
        const hpPct = Math.max(0, e.stats.hp / e.stats.maxHp);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - barW/2, hpBarY, barW * hpPct, barH);
        
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(e.x - barW/2, hpBarY, barW, barH);
    }
};
