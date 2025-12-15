
import { Terrain, Hazard, GoldDrop } from '../../types';
import { TERRAIN_CONFIG, ELEMENT_CONFIG } from '../../constants';
import { checkRectOverlap } from '../utils';

export const drawTerrain = (ctx: CanvasRenderingContext2D, terrain: Terrain[]) => {
    terrain.forEach(t => {
        const conf = TERRAIN_CONFIG[t.type];
        ctx.fillStyle = conf.color;
        
        if (t.type === 'WALL') {
            ctx.fillRect(t.x, t.y, t.width, t.height);
            const bevelH = Math.min(10, t.height * 0.4);
            const bevelW = Math.min(5, t.width * 0.4);
            ctx.fillStyle = '#475569';
            ctx.fillRect(t.x, t.y, t.width, bevelH);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(t.x + t.width - bevelW, t.y, bevelW, t.height);
        } else if (t.type === 'EARTH_WALL') {
            ctx.fillRect(t.x, t.y, t.width, t.height);
            ctx.fillStyle = '#451a03'; 
            const seed = parseInt(t.id.split('-').pop() || '0'); 
            
            ctx.fillRect(t.x + 4, t.y + 4, t.width - 8, t.height - 8);
            
            ctx.fillStyle = '#92400e'; 
            ctx.beginPath();
            ctx.rect(t.x + (seed % 20), t.y + (seed % 20), 4, 4);
            ctx.fill();

        } else if (t.type === 'WATER') {
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 20);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(t.x + 30, t.y + 30, 10, 0, Math.PI*2); ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 10);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for(let i=0; i<3; i++) {
                const offsetX = (t.x * i * 17) % t.width;
                const offsetY = (t.y * i * 23) % t.height;
                ctx.beginPath(); 
                ctx.arc(t.x + offsetX, t.y + offsetY, 2, 0, Math.PI*2); 
                ctx.fill();
            }
        }
    });
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

export const drawLoot = (ctx: CanvasRenderingContext2D, goldDrops: GoldDrop[]) => {
    goldDrops.forEach(g => {
        ctx.save();
        ctx.translate(g.x, g.y);
        const bob = Math.sin(Date.now() / 200) * 3;
        ctx.translate(0, bob);
        
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = '#f59e0b'; 
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fbbf24'; 
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    });
};
