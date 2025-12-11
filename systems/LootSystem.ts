
import { GoldDrop, Player, Terrain } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, GOLD_VALUES } from '../constants';
import * as TerrainSystem from './TerrainSystem';

export const spawnGold = (terrain: Terrain[], count: number): GoldDrop[] => {
    const drops: GoldDrop[] = [];
    for(let i=0; i<count; i++) {
        let gx, gy;
        let attempts = 0;
        let valid = false;
        do {
            gx = Math.random() * (MAP_WIDTH - 100) + 50;
            gy = Math.random() * (MAP_HEIGHT - 100) + 50;
            const t = TerrainSystem.getTerrainAt(terrain, gx, gy, 30, 30);
            if (t !== 'WALL') valid = true;
            attempts++;
        } while(!valid && attempts < 20);

        if (valid) {
            drops.push({
                id: `gold-${Math.random()}`,
                x: gx!,
                y: gy!,
                amount: GOLD_VALUES.NUGGET,
                collected: false
            });
        }
    }
    return drops;
};

export const updateLoot = (
    player: Player, 
    goldDrops: GoldDrop[], 
    spawnFloatingText: (x: number, y: number, text: string, color: string) => void
) => {
    for (let i = goldDrops.length - 1; i >= 0; i--) {
        const drop = goldDrops[i];
        const dist = Math.sqrt((player.x - drop.x)**2 + (player.y - drop.y)**2);
        if (dist < 40) { // Pickup Radius
            player.gold += drop.amount;
            spawnFloatingText(player.x, player.y - 40, `+${drop.amount} Gold`, '#fbbf24');
            goldDrops.splice(i, 1);
        }
    }
};

export const drawLoot = (ctx: CanvasRenderingContext2D, goldDrops: GoldDrop[]) => {
    goldDrops.forEach(g => {
        ctx.save();
        ctx.translate(g.x, g.y);
        // Bobbing effect
        const bob = Math.sin(Date.now() / 200) * 3;
        ctx.translate(0, bob);
        
        // Glow
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        
        // Coin Shape
        ctx.fillStyle = '#f59e0b'; // Amber-500
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fbbf24'; // Amber-400
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        
        // Shine
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    });
};
