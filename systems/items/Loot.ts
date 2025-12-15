
import { GoldDrop, Player, Terrain } from '../../types';
import { MAP_WIDTH, MAP_HEIGHT } from '../../constants';
import * as TerrainSystem from '../world/Terrain';
import { AudioSystem } from '../core/Audio';

export const spawnGold = (terrain: Terrain[], totalValue: number, count: number = 1): GoldDrop[] => {
    const drops: GoldDrop[] = [];
    const valuePerDrop = Math.max(1, Math.floor(totalValue / count));

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
                amount: valuePerDrop,
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
        if (dist < 40) { 
            player.gold += drop.amount;
            spawnFloatingText(player.x, player.y - 40, `+${drop.amount} Gold`, '#fbbf24');
            AudioSystem.playGoldPickup();
            goldDrops.splice(i, 1);
        }
    }
};
