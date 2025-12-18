
import { Terrain, Hazard, GoldDrop } from '../../types';
import { TERRAIN_CONFIG, ELEMENT_CONFIG } from '../../constants';
import { checkRectOverlap } from '../utils';

export const drawTerrain = (ctx: CanvasRenderingContext2D, terrain: Terrain[]) => {
    const time = Date.now() / 1000;

    terrain.forEach(t => {
        const conf = TERRAIN_CONFIG[t.type];
        
        ctx.save();
        
        if (t.type === 'WALL' || t.type === 'EARTH_WALL') {
            // 1. Draw Side/Depth (Shadow)
            ctx.fillStyle = t.type === 'WALL' ? '#1e293b' : '#451a03';
            ctx.fillRect(t.x, t.y, t.width, t.height);
            
            // 2. Draw Top Face (Highlight)
            const topMargin = 6;
            ctx.fillStyle = conf.color;
            ctx.fillRect(t.x, t.y, t.width, t.height - topMargin);
            
            // 3. Add Procedural Texture
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#000';
            const seed = parseInt(t.id.split('-').pop() || '0');
            for(let i=0; i<3; i++) {
                const ox = (seed * (i+1) * 17) % (t.width - 10);
                const oy = (seed * (i+1) * 23) % (t.height - 15);
                ctx.fillRect(t.x + ox, t.y + oy, 8, 2);
            }
            ctx.globalAlpha = 1.0;

            // 4. Bevel line
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(t.x + 1, t.y + 1, t.width - 2, t.height - topMargin - 2);

        } else if (t.type === 'WATER') {
            // Animated Water
            const grad = ctx.createLinearGradient(t.x, t.y, t.x + t.width, t.y + t.height);
            grad.addColorStop(0, '#0ea5e9');
            grad.addColorStop(1, '#0284c7');
            ctx.fillStyle = grad;
            
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 12);
            ctx.fill();

            // Specular Ripples
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            for(let i=0; i<2; i++) {
                const shift = (time * 0.5 + i * 0.5) % 1;
                const rX = t.x + 20 + (t.width - 40) * ((i * 0.7 + time * 0.1) % 1);
                const rY = t.y + 20 + (t.height - 40) * ((i * 0.3 + time * 0.05) % 1);
                ctx.beginPath();
                ctx.arc(rX, rY, 5 + shift * 15, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (t.type === 'MUD') {
            ctx.fillStyle = conf.color;
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 8);
            ctx.fill();
            
            // Mud bubbles/grain
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for(let i=0; i<5; i++) {
                const bx = t.x + (Math.sin(time + i) * 0.5 + 0.5) * t.width;
                const by = t.y + (Math.cos(time * 0.8 + i) * 0.5 + 0.5) * t.height;
                ctx.beginPath();
                ctx.arc(bx, by, 2 + Math.sin(time + i)*1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    });
};

export const drawHazards = (ctx: CanvasRenderingContext2D, hazards: Hazard[], terrain: Terrain[]) => {
    hazards.forEach(h => {
        ctx.save();
        
        if (h.type === 'EXPLOSION') {
            ctx.translate(h.x, h.y);
            const progress = 1 - (h.duration / h.maxDuration);
            
            // Multi-layered blast
            const grad = ctx.createRadialGradient(0,0,0,0,0, h.radius * progress);
            grad.addColorStop(0, 'white');
            grad.addColorStop(0.2, '#facc15');
            grad.addColorStop(0.6, '#ef4444');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, h.radius * progress, 0, Math.PI*2); ctx.fill();
        } else if (h.type === 'FIRE' || h.type === 'POISON') {
            const isPoison = h.type === 'POISON';
            const time = Date.now() / 150;
            
            // Draw Ground Aura
            ctx.globalAlpha = 0.3 + Math.sin(time * 0.5) * 0.1;
            ctx.fillStyle = isPoison ? '#84cc16' : '#ef4444';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw Particles inside
            ctx.globalAlpha = 1.0;
            for(let i=0; i<6; i++) {
                const angle = (time * 0.2) + (i * Math.PI * 2 / 6);
                const r = h.radius * (0.3 + Math.sin(time * 0.3 + i) * 0.4);
                const px = h.x + Math.cos(angle) * r;
                const py = h.y + Math.sin(angle) * r;
                
                ctx.fillStyle = isPoison ? '#bef264' : '#fcd34d';
                ctx.beginPath();
                ctx.arc(px, py, 2 + Math.sin(time + i)*2, 0, Math.PI*2);
                ctx.fill();
            }
        }
        ctx.restore();
    });
};

export const drawLoot = (ctx: CanvasRenderingContext2D, goldDrops: GoldDrop[]) => {
    const time = Date.now();
    goldDrops.forEach(g => {
        ctx.save();
        ctx.translate(g.x, g.y);
        const bob = Math.sin(time / 200) * 4;
        ctx.translate(0, bob);
        
        // Halo
        const glow = 10 + Math.sin(time / 150) * 5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = glow;
        
        // Coin Shape
        ctx.fillStyle = '#f59e0b'; 
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fbbf24'; 
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        
        // Inner detail (Star or Line)
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.stroke();
        
        ctx.restore();
    });
};
