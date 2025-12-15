
import { Player, Enemy, GameAssets } from '../../types';
import { DETAIL_COLORS, ELEMENT_CONFIG } from '../../constants';
import { drawWeapon } from './CombatRender';

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

    // Rotate to face movement direction
    // We assume the model (Sprite or Procedural) is defined facing UP (-Y) in its local space.
    // player.angle 0 is Right (+X). To align Up (-Y) to Right (+X), we rotate +90 deg (PI/2).
    ctx.rotate(player.angle + Math.PI/2); 

    const img = document.getElementById('player-asset-img') as HTMLImageElement;
    
    if (assets.playerSprite && img && img.complete) {
        // Draw Sprite Body
        ctx.drawImage(img, -24, -24, 48, 48);
    } else {
        // Draw Procedural Body
        // Drawn facing UP (-Y) relative to local context
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        // Shadow slightly offset
        ctx.beginPath(); ctx.ellipse(0, 2, 16, 10, 0, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = player.color; 
        ctx.beginPath();
        ctx.roundRect(-8, -8, 16, 16, 4);
        ctx.fill();

        ctx.fillStyle = DETAIL_COLORS.skin;
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
        
        // Visor/Helmet Face (Forward is -Y)
        ctx.fillStyle = player.color;
        ctx.beginPath(); 
        // Arc from 0 to PI anticlockwise draws the top half (Forward)
        ctx.arc(0, 0, 9, 0, Math.PI, true); 
        ctx.fill(); 
        
        // Visor Detail
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -4);
        ctx.quadraticCurveTo(0, -2, 5, -4);
        ctx.stroke();
    }

    // Draw Hands and Weapons ON TOP of Sprite
    // Hands relative to facing UP (Forward is -Y)
    const handOffsetX = 14; 
    
    // Right Hand (Weapon 1) - Local Right is +X
    ctx.save();
    ctx.translate(handOffsetX, 0);
    ctx.fillStyle = DETAIL_COLORS.skin;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); 
    // drawWeapon draws weapon pointing Right (0 deg).
    // We want it pointing Forward (-Y). Rotate -90 deg.
    ctx.rotate(-Math.PI/2); 
    drawWeapon(ctx, player.equipment.weapon1, 0, 0);
    ctx.restore();

    // Left Hand (Weapon 2) - Local Left is -X
    ctx.save();
    ctx.translate(-handOffsetX, 0);
    ctx.fillStyle = DETAIL_COLORS.skin;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); 
    ctx.rotate(-Math.PI/2);
    drawWeapon(ctx, player.equipment.weapon2, 0, 0);
    ctx.restore();

    ctx.restore();
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, assets: GameAssets) => {
    if (e.dead) {
        ctx.save();
        ctx.translate(e.x, e.y);
        
        const timer = e.deathTimer || 0;
        const maxTime = 25;
        const opacity = Math.max(0, timer / maxTime);
        
        const floatY = (1 - opacity) * -20;
        ctx.translate(0, floatY);
        
        ctx.globalAlpha = opacity;
        
        const scale = Math.max(0.6, e.width / 32);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = '#e2e8f0'; 
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        
        ctx.beginPath();
        ctx.arc(0, -5, 11, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-7, 2);
        ctx.lineTo(7, 2);
        ctx.lineTo(7, 10);
        ctx.quadraticCurveTo(7, 12, 5, 12);
        ctx.lineTo(-5, 12);
        ctx.quadraticCurveTo(-7, 12, -7, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#0f172a'; 
        ctx.beginPath(); ctx.ellipse(-4, -3, 3, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -3, 3, 4, 0, 0, Math.PI*2); ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-2, 6);
        ctx.lineTo(2, 6);
        ctx.fill();
        
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-2, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, 6); ctx.lineTo(2, 12); ctx.stroke();

        ctx.restore();
        return; 
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    
    if (e.type === 'BOSS') {
        ctx.save();
        ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.3;
        ctx.fillStyle = ELEMENT_CONFIG[e.element].color;
        ctx.beginPath();
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.arc(0, 0, (e.width/1.5) + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (e.type === 'BOSS' && e.abilityTimers) {
        if (e.abilityTimers['INVINCIBLE_ARMOR'] > 0) {
            ctx.save();
            ctx.strokeStyle = '#fbbf24'; // Gold
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.7 + Math.sin(Date.now()/50)*0.3;
            ctx.beginPath(); ctx.arc(0, 0, e.width/1.2, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        } 
        if (e.abilityTimers['BERSERKER'] > 0) {
            ctx.save();
            ctx.fillStyle = '#ef4444'; 
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(0, 0, e.width/1.2, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }

    if (e.type === 'BOSS') {
        ctx.save();
        ctx.translate(0, -e.height/2 - 10);
        ctx.fillStyle = '#fbbf24'; // Gold
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-15, -10);
        ctx.lineTo(-5, -5);
        ctx.lineTo(0, -15);
        ctx.lineTo(5, -5);
        ctx.lineTo(15, -10);
        ctx.lineTo(10, 0);
        ctx.fill();
        ctx.restore();
    }

    const baseColor = ELEMENT_CONFIG[e.element].color;
    
    ctx.rotate(e.angle);

    ctx.fillStyle = baseColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    ctx.beginPath();

    switch(e.type) {
        case 'FAST':
            ctx.moveTo(e.width/2, 0);
            ctx.lineTo(-e.width/2, e.height/2);
            ctx.lineTo(-e.width/3, 0); 
            ctx.lineTo(-e.width/2, -e.height/2);
            break;
            
        case 'TANK':
            const w = e.width/2;
            ctx.moveTo(w, w/2);
            ctx.lineTo(w/2, w);
            ctx.lineTo(-w/2, w);
            ctx.lineTo(-w, w/2);
            ctx.lineTo(-w, -w/2);
            ctx.lineTo(-w/2, -w);
            ctx.lineTo(w/2, -w);
            ctx.lineTo(w, -w/2);
            break;

        case 'RANGED':
            ctx.moveTo(e.width/1.5, 0);
            ctx.lineTo(0, e.height/3);
            ctx.lineTo(-e.width/1.5, 0);
            ctx.lineTo(0, -e.height/3);
            ctx.moveTo(0, e.height/3);
            ctx.lineTo(0, e.height/1.5);
            ctx.moveTo(0, -e.height/3);
            ctx.lineTo(0, -e.height/1.5);
            break;
        
        case 'BOMBER':
        case 'INCINERATOR':
             ctx.arc(0, 0, e.width/2, 0, Math.PI * 2);
             ctx.moveTo(e.width/3, -e.height/3);
             ctx.lineTo(e.width/2, -e.height/2);
             break;

        case 'ZOMBIE':
             const zRad = e.width/2;
             const jags = 7;
             for(let i=0; i<jags*2; i++) {
                 const angle = (i / (jags*2)) * Math.PI * 2;
                 const offset = (i % 2 === 0) ? 0 : -5;
                 const r = zRad + offset;
                 if(i===0) ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r);
                 else ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
             }
             break;

        case 'IRON_BEETLE':
             ctx.scale(1, 0.8); 
             ctx.arc(0, 0, e.width/2, 0, Math.PI * 2);
             ctx.fill();
             ctx.stroke();
             
             ctx.beginPath();
             ctx.moveTo(-e.width/2, 0);
             ctx.lineTo(e.width/2, 0);
             ctx.stroke();
             
             ctx.beginPath();
             ctx.arc(e.width/2, 0, e.width/4, -Math.PI/2, Math.PI/2);
             ctx.fillStyle = '#64748b'; 
             ctx.fill();
             ctx.stroke();
             ctx.scale(1, 1.25); 
             break;

        case 'BOSS':
            const spikes = 12;
            const rOuter = e.width/2;
            const rInner = e.width/3;
            for(let i=0; i<spikes*2; i++) {
                const r = (i%2===0) ? rOuter : rInner;
                const a = (i / (spikes*2)) * Math.PI * 2;
                if (i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            break;

        case 'STANDARD':
        default:
            const s = 8;
            for(let i=0; i<s*2; i++) {
                const r = (i%2===0) ? e.width/2 : e.width/2 - 4;
                const a = (i / (s*2)) * Math.PI * 2;
                if (i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            break;
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    if ((e.type === 'BOMBER' || e.type === 'INCINERATOR') && !e.dead) {
        const isIncinerator = e.type === 'INCINERATOR';
        ctx.fillStyle = isIncinerator ? '#7f1d1d' : '#111'; 
        ctx.beginPath(); ctx.arc(0, 0, e.width/3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.width/2, -e.height/2);
        ctx.quadraticCurveTo(e.width/2 + 5, -e.height/2 - 10, e.width/2 + 10, -e.height/2 - 5);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(e.width/2 + 10, -e.height/2 - 5, 3, 0, Math.PI*2); ctx.fill();
        }
    }

    if (e.type !== 'BOMBER' && e.type !== 'INCINERATOR') {
        const grad = ctx.createRadialGradient(0,0, e.width/5, 0,0, e.width/2);
        grad.addColorStop(0, 'rgba(255,255,255,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();
    }

    ctx.fillStyle = DETAIL_COLORS.enemyEye;
    ctx.shadowColor = DETAIL_COLORS.enemyEye;
    ctx.shadowBlur = 10;
    
    if (e.type === 'BOSS') {
         ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(-12, -8, 5, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(12, -8, 5, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(0, 10, 4, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'FAST') {
         ctx.beginPath();
         ctx.ellipse(4, 0, 4, 8, 0, 0, Math.PI*2);
         ctx.fill();
    } else if (e.type === 'BOMBER' || e.type === 'INCINERATOR') {
         const isIncinerator = e.type === 'INCINERATOR';
         ctx.fillStyle = '#333';
         ctx.beginPath(); ctx.arc(-6, -4, 6, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(6, -4, 6, 0, Math.PI*2); ctx.fill();
         ctx.fillStyle = isIncinerator ? '#fca5a5' : '#4ade80'; 
         ctx.beginPath(); ctx.arc(-6, -4, 4, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(6, -4, 4, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'ZOMBIE') {
        ctx.beginPath(); ctx.arc(-6, -4, 5, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(6, -2, 2, 0, Math.PI*2); ctx.fill();  
        ctx.fillStyle = '#a3e635';
        ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'IRON_BEETLE') {
        ctx.beginPath(); ctx.arc(10, -5, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, 5, 2, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.ellipse(6, -4, 4, 2, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, 4, 4, 2, 0, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    ctx.restore();
    ctx.save();
    ctx.translate(e.x, e.y);
    
    if (!e.dead) {
        const barY = -e.height/2 - 12;
        
        if (e.debuffs.STUN > 0) {
            ctx.save();
            const wobble = Math.sin(Date.now() / 200) * 5;
            ctx.translate(0, -e.height/2 - 25 + wobble);
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 12px monospace';
            ctx.fillText("ZZZ", -10, 0);
            ctx.restore();
        }

        if (e.debuffs.SLOW > 0) {
            ctx.fillStyle = '#60a5fa'; 
            ctx.beginPath(); ctx.arc(-e.width/2 - 10, 0, 4, 0, Math.PI*2); ctx.fill();
        }

        if (e.debuffs.BLEED > 0) {
            ctx.fillStyle = '#ef4444'; 
            ctx.beginPath(); 
            ctx.moveTo(e.width/2 + 10, 0);
            ctx.lineTo(e.width/2 + 10, 4);
            ctx.arc(e.width/2 + 10, 4, 3, 0, Math.PI);
            ctx.fill();
        }

        const hpPct = Math.max(0, e.stats.hp / e.stats.maxHp);
        const barWidth = e.type === 'BOSS' ? 64 : 32;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth/2, barY, barWidth, 5);
        
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-barWidth/2, barY, barWidth * hpPct, 5);
        
        if (e.stats.shield > 0) {
            const shieldPct = Math.min(1.0, e.stats.shield / e.stats.maxHp);
            
            ctx.fillStyle = '#cbd5e1'; 
            ctx.fillRect(-barWidth/2, barY - 7, barWidth * shieldPct, 4);
            
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barWidth/2, barY - 7, barWidth, 4);
        }
    }
    
    ctx.restore();
};
