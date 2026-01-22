
import { Player, Enemy, Projectile, FloatingText, Terrain, Hazard, GoldDrop, Particle } from '../../types';
import { MAP_WIDTH, MAP_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, ENEMIES_PER_STAGE_BASE, ENEMIES_PER_STAGE_SCALING, GOLD_CONFIG, STAGE_TIME_LIMIT } from '../../constants';
import * as TerrainSystem from '../world/terrain';
import * as LootSystem from '../items/loot';
import * as TalentSystem from '../items/talent';

interface StageSetupContext {
    player: Player;
    stageInfo: { totalEnemies: number; spawnedCount: number; killedCount: number; stageCleared: boolean; isBossStage: boolean };
    enemies: Enemy[];
    projectiles: Projectile[];
    floatingTexts: FloatingText[];
    hazards: Hazard[];
    goldDrops: GoldDrop[];
    terrain: Terrain[];
    fireDamageAccumulator: { current: number };
    particles: Particle[];
    camera: { x: number; y: number };
    timers: {
        hurt: { current: number };
        invincibility: { current: number };
        slowed: { current: number };
        timeStop: { current: number };
        speedBoost: { current: number };
        omniForce: { current: number };
        stageTimer: { current: number }; // Added to track stage timer
    };
    currentStage: number;
    initialGold: number;
}

export const initializeStage = (ctx: StageSetupContext) => {
    // Boss every 6 stages
    const isBossStage = ctx.currentStage % 6 === 0;
    const total = isBossStage ? 1 : ENEMIES_PER_STAGE_BASE + (ctx.currentStage - 1) * ENEMIES_PER_STAGE_SCALING;
    
    // Reset Stage Info
    ctx.stageInfo.totalEnemies = total;
    ctx.stageInfo.spawnedCount = 0;
    ctx.stageInfo.killedCount = 0;
    ctx.stageInfo.stageCleared = false;
    ctx.stageInfo.isBossStage = isBossStage;

    // Clear Arrays
    ctx.enemies.length = 0;
    ctx.projectiles.length = 0;
    ctx.floatingTexts.length = 0;
    ctx.hazards.length = 0;
    ctx.goldDrops.length = 0;
    ctx.particles.length = 0;
    ctx.fireDamageAccumulator.current = 0;
    
    // Reset Player Position & State
    ctx.player.x = MAP_WIDTH / 2;
    ctx.player.y = MAP_HEIGHT / 2;
    ctx.player.velocity = { x: 0, y: 0 };
    ctx.player.level = ctx.currentStage;
    ctx.player.gold = ctx.initialGold;
    
    // Reset Shield & Apply Initial Shield from Armor
    const armor1Shield = ctx.player.equipment.armor1?.stats.shield || 0;
    const armor2Shield = ctx.player.equipment.armor2?.stats.shield || 0;
    ctx.player.stats.shield = armor1Shield + armor2Shield;
    
    // Reset Ultimate Charge
    ctx.player.ultimateCharge = 0;
    
    // Reset Camera
    ctx.camera.x = Math.max(0, Math.min(MAP_WIDTH - CANVAS_WIDTH, ctx.player.x - CANVAS_WIDTH / 2));
    ctx.camera.y = Math.max(0, Math.min(MAP_HEIGHT - CANVAS_HEIGHT, ctx.player.y - CANVAS_HEIGHT / 2));

    // Reset Timers
    ctx.timers.hurt.current = 0;
    ctx.timers.invincibility.current = 0;
    ctx.timers.slowed.current = 0;
    ctx.timers.timeStop.current = 0;
    ctx.timers.speedBoost.current = 0;
    ctx.timers.omniForce.current = 0;
    ctx.timers.stageTimer.current = STAGE_TIME_LIMIT;

    // Generate Terrain & Loot
    const newTerrain = TerrainSystem.generateTerrain();
    ctx.terrain.length = 0;
    ctx.terrain.push(...newTerrain);

    // Initial Gold Spawn
    const min = GOLD_CONFIG.INITIAL.MIN;
    const max = GOLD_CONFIG.INITIAL.MAX;
    const val = GOLD_CONFIG.INITIAL.VALUE;
    const goldCount = Math.floor(Math.random() * (max - min + 1)) + min;
    
    const totalValue = goldCount * val;
    const newGold = LootSystem.spawnGold(ctx.terrain, totalValue, goldCount);
    ctx.goldDrops.push(...newGold);
};

export const checkStageClearCondition = (stageInfo: { killedCount: number; totalEnemies: number; stageCleared: boolean; isBossStage: boolean }, stageTimer: number): boolean => {
    if (stageInfo.stageCleared) return false; 

    // Boss Stage: Must kill boss
    if (stageInfo.isBossStage) {
        return stageInfo.killedCount >= stageInfo.totalEnemies;
    }

    // Normal Stage: Kill all OR Timer reaches 0
    if (stageInfo.killedCount >= stageInfo.totalEnemies || stageTimer <= 0) {
        return true;
    }
    return false;
};

export const processStageEndDurability = (player: Player, startHp: number) => {
     const endHp = player.stats.hp;
     const durabilityLoss = TalentSystem.calculateDurabilityLoss(player, startHp, endHp);

     const slots: ('weapon1' | 'weapon2' | 'armor1' | 'armor2')[] = ['weapon1', 'weapon2', 'armor1', 'armor2'];
     
     slots.forEach(slot => {
         const item = player.equipment[slot];
         if (item) {
             item.durability -= durabilityLoss;
             if (item.durability <= 0) {
                 player.equipment[slot] = null;
                 console.log(`${slot} broke!`);
             }
         }
     });
};
