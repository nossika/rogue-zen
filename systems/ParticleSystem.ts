
import { Particle } from "../types";

export const createBloodSplatter = (particles: Particle[], x: number, y: number, color: string = '#ef4444') => {
    // Create a small burst of particles
    const count = 4 + Math.floor(Math.random() * 4); // 4-7 particles
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const life = 20 + Math.floor(Math.random() * 15);
        
        particles.push({
            id: Math.random().toString(),
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: life,
            maxLife: life,
            color: color,
            size: 2 + Math.random() * 2
        });
    }
};

export const updateParticles = (particles: Particle[]) => {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Friction
        p.vx *= 0.9;
        p.vy *= 0.9;
        
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
};

export const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
};
