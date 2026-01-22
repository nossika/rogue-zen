
import { Player, Enemy, Projectile, FloatingText, Terrain, Hazard, GoldDrop, Particle, UltimateType, ElementType, HazardType } from '../../types';
import { SpatialHashGrid } from './spatial-hash-grid';
import { gameEvents, EVENTS } from './events';
import * as PlayerSystem from '../entities/player';
import * as EnemySystem from '../entities/enemy';
import * as WeaponSystem from '../combat/weapon';
import * as ProjectileSystem from '../combat/projectile';
import * as LootSystem from '../items/loot';
import * as HazardSystem from '../combat/hazard';
import * as StageSystem from './stage';
import * as ParticleSystem from '../ui/particle';
import * as FloatingTextSystem from '../ui/floating-text';
import { GOLD_CONFIG } from '../../constants';
import { AudioSystem } from './audio';

export interface GameContext {
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    floatingTexts: FloatingText[];
    terrain: Terrain[];
    hazards: Hazard[];
    goldDrops: GoldDrop[];
    particles: Particle[];
    spatialGrid: SpatialHashGrid;
    stageInfo: { totalEnemies: number; spawnedCount: number; killedCount: number; stageCleared: boolean; isBossStage: boolean };
    timers: {
        timeStop: number;
        invincibility: number;
        hurt: number;
        slowed: number;
        speedBoost: number;
        omniForce: number;
        spawn: number;
        stageClear: number;
        stageTimer: number; // Added stage timer
    };
    cooldowns: {
        weapon1: number;
        weapon2: number;
    };
    currentStage: number;
    initialGold: number;
    fireDamageAccumulator: { current: number };
}

export const updateGameTick = (ctx: GameContext, deltaTime: number) => {
    // 1. Update Global Timers
    if (ctx.timers.timeStop > 0) ctx.timers.timeStop--;
    if (ctx.timers.invincibility > 0) ctx.timers.invincibility--;
    if (ctx.timers.hurt > 0) ctx.timers.hurt--;
    if (ctx.timers.slowed > 0) ctx.timers.slowed--;
    if (ctx.timers.speedBoost > 0) ctx.timers.speedBoost--;
    if (ctx.timers.omniForce > 0) ctx.timers.omniForce--;

    const isTimeStop = ctx.timers.timeStop > 0;
    const isOmniForce = ctx.timers.omniForce > 0;

    // Stage Timer logic
    if (!isTimeStop && !ctx.stageInfo.isBossStage && !ctx.stageInfo.stageCleared && ctx.timers.stageClear === 0) {
        // deltaTime is in ms. Decrement timer.
        ctx.timers.stageTimer = Math.max(0, ctx.timers.stageTimer - (deltaTime / 1000));
    }

    // 2. Spawning Logic
    if (!isTimeStop) {
        if (!ctx.stageInfo.isBossStage || ctx.stageInfo.spawnedCount === 0) {
            ctx.timers.spawn += deltaTime;
            if (ctx.timers.spawn > 500) {
                EnemySystem.spawnEnemy(ctx.enemies, ctx.player, ctx.terrain, ctx.currentStage, ctx.stageInfo);
                ctx.timers.spawn = 0;
            }
        }
    }

    // 3. Spatial Grid Refresh
    ctx.spatialGrid.clear();

    // 4. Systems Update
    PlayerSystem.updatePlayerMovement(
        ctx.player, 
        {}, 
        ctx.terrain, 
        ctx.timers.speedBoost, 
        ctx.timers.slowed > 0 ? 0.5 : 0
    );
    
    EnemySystem.updateEnemies(
        ctx.enemies, 
        ctx.player, 
        ctx.terrain, 
        ctx.projectiles, 
        isTimeStop,
        (x, y, txt, col, crit) => gameEvents.emit(EVENTS.SPAWN_FLOATING_TEXT, x, y, txt, col, crit),
        (x, y, col) => gameEvents.emit(EVENTS.SPAWN_SPLATTER, x, y, col),
        (dmg) => gameEvents.emit(EVENTS.PLAYER_HIT, dmg),
        (x, y, r, d, t, s, e, c, k) => gameEvents.emit(EVENTS.CREATE_HAZARD, x, y, r, d, t, s, e, c, k),
        ctx.spatialGrid
    );

    ProjectileSystem.updateProjectiles(
        ctx.projectiles, 
        ctx.enemies, 
        ctx.player, 
        ctx.terrain, 
        (x, y, txt, col, crit) => gameEvents.emit(EVENTS.SPAWN_FLOATING_TEXT, x, y, txt, col, crit),
        (x, y, col) => gameEvents.emit(EVENTS.SPAWN_SPLATTER, x, y, col),
        (dmg) => gameEvents.emit(EVENTS.PLAYER_HIT, dmg),
        (x, y, r, d, t, s, e, c, k) => gameEvents.emit(EVENTS.CREATE_HAZARD, x, y, r, d, t, s, e, c, k),
        isOmniForce,
        ctx.spatialGrid
    );

    LootSystem.updateLoot(
        ctx.player, 
        ctx.goldDrops, 
        (x, y, txt, col) => gameEvents.emit(EVENTS.SPAWN_FLOATING_TEXT, x, y, txt, col)
    );

    HazardSystem.updateHazards(
        ctx.hazards, 
        ctx.player, 
        ctx.enemies, 
        ctx.terrain, 
        1, 
        ctx.fireDamageAccumulator, 
        (x, y, txt, col, crit) => gameEvents.emit(EVENTS.SPAWN_FLOATING_TEXT, x, y, txt, col, crit),
        (dmg, ign, sil, slow) => gameEvents.emit(EVENTS.PLAYER_HIT, dmg, ign, sil, slow),
        (x, y, col) => gameEvents.emit(EVENTS.SPAWN_SPLATTER, x, y, col)
    );

    ParticleSystem.updateParticles(ctx.particles);
    FloatingTextSystem.updateFloatingTexts(ctx.floatingTexts);

    // 5. Combat
    if (ctx.cooldowns.weapon1 > 0) ctx.cooldowns.weapon1--;
    if (ctx.cooldowns.weapon2 > 0) ctx.cooldowns.weapon2--;

    const cd1 = { current: ctx.cooldowns.weapon1 };
    const cd2 = { current: ctx.cooldowns.weapon2 };

    if (ctx.player.equipment.weapon1) {
        WeaponSystem.fireWeapon(ctx.player, ctx.player.equipment.weapon1, ctx.enemies, ctx.projectiles, cd1, ctx.timers.speedBoost);
    }
    if (ctx.player.equipment.weapon2) {
        WeaponSystem.fireWeapon(ctx.player, ctx.player.equipment.weapon2, ctx.enemies, ctx.projectiles, cd2, ctx.timers.speedBoost);
    }
    
    ctx.cooldowns.weapon1 = cd1.current;
    ctx.cooldowns.weapon2 = cd2.current;

    handleEntityCleanup(ctx);

    if (ctx.player.stats.ultChargeRate > 0) {
        ctx.player.ultimateCharge = Math.min(100, ctx.player.ultimateCharge + (ctx.player.stats.ultChargeRate / 60));
    }
};

const handleEntityCleanup = (ctx: GameContext) => {
    for (let i = ctx.enemies.length - 1; i >= 0; i--) {
        const e = ctx.enemies[i];
        if (e.stats.hp <= 0 && !e.dead) {
            e.dead = true;
            e.deathTimer = 25;
            
            const isLast = ctx.enemies.filter(en => !en.isMinion && !en.dead).length === 0;
            
            if (e.type === 'BOSS') {
                AudioSystem.playKill();
                const drops = LootSystem.spawnGold(ctx.terrain, GOLD_CONFIG.BOSS.VALUE);
                if (isLast || ctx.stageInfo.isBossStage) {
                    drops.forEach(d => {
                        ctx.player.gold += d.amount;
                        gameEvents.emit(EVENTS.SPAWN_FLOATING_TEXT, ctx.player.x, ctx.player.y - 40, `+${d.amount} Gold`, '#fbbf24');
                        AudioSystem.playGoldPickup();
                    });
                } else {
                    drops.forEach(d => {
                        d.x = e.x + (Math.random()*40-20);
                        d.y = e.y + (Math.random()*40-20);
                        ctx.goldDrops.push(d);
                    });
                }
            } else if (!e.isMinion) {
                AudioSystem.playKill();
                if (Math.random() < GOLD_CONFIG.ENEMY.CHANCE) {
                    const drops = LootSystem.spawnGold(ctx.terrain, GOLD_CONFIG.ENEMY.VALUE);
                    if (isLast) {
                        drops.forEach(d => {
                            ctx.player.gold += d.amount;
                            gameEvents.emit(EVENTS.SPAWN_FLOATING_TEXT, ctx.player.x, ctx.player.y - 40, `+${d.amount} Gold`, '#fbbf24');
                            AudioSystem.playGoldPickup();
                        });
                    } else {
                        drops.forEach(d => {
                            d.x = e.x + (Math.random()*20-10);
                            d.y = e.y + (Math.random()*20-10);
                            ctx.goldDrops.push(d);
                        });
                    }
                }
            }
        }
        
        if (e.dead) {
            if (e.deathTimer && e.deathTimer > 0) {
                e.deathTimer--;
            } else {
                ctx.enemies.splice(i, 1);
                if (!e.isMinion) ctx.stageInfo.killedCount++;
            }
        }
    }
};
