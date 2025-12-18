
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player, Enemy, Projectile, GameAssets, Stats, Item, UltimateType, FloatingText, Terrain, Hazard, HazardType, GoldDrop, UpgradeReward, Particle, ElementType, Talent } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT, INITIAL_PLAYER_STATS, COLOR_PALETTE, INITIAL_PLAYER_WEAPON } from '../constants';
import { SpatialHashGrid } from '@/systems/core/spatial-hash-grid';
import { gameEvents, EVENTS } from '@/systems/core/events';
import { GameContext, updateGameTick } from '@/systems/core/engine';

// Sub-components
import { GameHUD } from './GameHUD';
import { GameTooltip } from './GameTooltip';
import { UltimateButton } from './Ultimate';

// Systems
import * as PlayerSystem from '@/systems/entities/player';
import * as TalentSystem from '@/systems/items/talent';
import * as UltimateSystem from '@/systems/combat/ultimate';
import * as RenderSystem from '@/systems/core/render';
import * as CameraSystem from '@/systems/core/camera';
import * as StageSystem from '@/systems/core/stage';
import * as FloatingTextSystem from '@/systems/ui/floating-text';
import * as ParticleSystem from '@/systems/ui/particle';
import { AudioSystem } from '@/systems/core/audio';

// Hooks
import { useGameInput } from '../hooks/use-game-input';
import VirtualJoystick from './VirtualJoystick';

interface GameProps {
  assets: GameAssets;
  currentStage: number;
  onGameOver: (score: number) => void;
  onStageClear: (player: Player) => void;
  isPaused: boolean;
  onPauseToggle: () => void;
  upgradeChosen?: UpgradeReward | null;
  onUpgradeApplied: () => void;
  isPortrait?: boolean;
  initialGold: number;
  initialPlayer?: Player | null;
}

interface TooltipData {
  type: 'ITEM' | 'ULTIMATE' | 'STATS' | 'TALENT';
  content: Item | UltimateType[] | Stats | Talent;
  x: number;
  y: number;
}

const Game: React.FC<GameProps> = ({ 
  assets, 
  currentStage,
  onGameOver, 
  onStageClear, 
  isPaused, 
  onPauseToggle, 
  upgradeChosen, 
  onUpgradeApplied,
  isPortrait,
  initialGold,
  initialPlayer
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineCtxRef = useRef<GameContext | null>(null);
  const lastTimeRef = useRef<number>(0);
  const uiUpdateFrameRef = useRef<number>(0);
  const cameraRef = useRef({ x: 0, y: 0 });
  const lastAppliedUpgradeRef = useRef<string | null>(null);

  const [uiState, setUiState] = useState({
    hp: 100, maxHp: 100, shield: 0, ult: 0, enemiesLeft: 0, gold: initialGold,
    weapon1: null as Item | null, weapon2: null as Item | null,
    armor1: null as Item | null, armor2: null as Item | null,
    hasUltimate: false, activeUltimates: [] as UltimateType[],
    stats: { ...INITIAL_PLAYER_STATS }, talent: null as Talent | null
  });
  
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const spawnFloatingText = useCallback((x: number, y: number, text: string, color: string, isCrit: boolean = false) => {
    if (engineCtxRef.current) FloatingTextSystem.createFloatingText(engineCtxRef.current.floatingTexts, x, y, text, color, isCrit);
  }, []);

  const spawnSplatter = useCallback((x: number, y: number, color?: string) => {
    if (engineCtxRef.current) ParticleSystem.createBloodSplatter(engineCtxRef.current.particles, x, y, color);
  }, []);

  const handlePlayerHit = useCallback((damage: number, ignoreShield = false, silent = false, slowIntensity = 0.5) => {
      const ctx = engineCtxRef.current;
      if (!ctx) return;
      if (ctx.timers.invincibility <= 0 && ctx.timers.hurt <= 0) AudioSystem.playDamage();

      PlayerSystem.handlePlayerDamage(
          ctx.player, damage,
          { 
              invincibility: { get current() { return ctx.timers.invincibility }, set current(v) { ctx.timers.invincibility = v } },
              hurt: { get current() { return ctx.timers.hurt }, set current(v) { ctx.timers.hurt = v } },
              slowed: { get current() { return ctx.timers.slowed }, set current(v) { ctx.timers.slowed = v } }
          },
          ctx.floatingTexts, spawnSplatter, ignoreShield, silent, slowIntensity
      );
  }, [spawnSplatter]);

  const handleCreateHazard = useCallback((x: number, y: number, radius: number, damage: number, type: HazardType, source: 'ENEMY' | 'PLAYER', element: ElementType = ElementType.NONE, critChance: number = 0, knockback: number = 0) => {
      if (engineCtxRef.current) {
          const hazards = engineCtxRef.current.hazards;
          let duration = 480; 
          if (type === 'EXPLOSION') duration = 15;
          else if (type === 'POISON') duration = 720;
          hazards.push({ id: Math.random().toString(), x, y, radius, damage, duration, maxDuration: duration, type, tickRate: 0, tickTimer: 0, source, element, critChance, knockback });
      }
  }, []);

  useEffect(() => {
      gameEvents.on(EVENTS.SPAWN_FLOATING_TEXT, spawnFloatingText);
      gameEvents.on(EVENTS.SPAWN_SPLATTER, spawnSplatter);
      gameEvents.on(EVENTS.PLAYER_HIT, handlePlayerHit);
      gameEvents.on(EVENTS.CREATE_HAZARD, handleCreateHazard);
      return () => {
          gameEvents.off(EVENTS.SPAWN_FLOATING_TEXT, spawnFloatingText);
          gameEvents.off(EVENTS.SPAWN_SPLATTER, spawnSplatter);
          gameEvents.off(EVENTS.PLAYER_HIT, handlePlayerHit);
          gameEvents.off(EVENTS.CREATE_HAZARD, handleCreateHazard);
      };
  }, [spawnFloatingText, spawnSplatter, handlePlayerHit, handleCreateHazard]);

  const handleActivateUltimate = () => {
      const ctx = engineCtxRef.current;
      if (!ctx) return;
      UltimateSystem.activateUltimate({
          player: ctx.player, enemies: ctx.enemies, terrain: ctx.terrain, spawnFloatingText,
          timeStopRef: { get current() { return ctx.timers.timeStop }, set current(v) { ctx.timers.timeStop = v } },
          invincibilityRef: { get current() { return ctx.timers.invincibility }, set current(v) { ctx.timers.invincibility = v } },
          speedBoostRef: { get current() { return ctx.timers.speedBoost }, set current(v) { ctx.timers.speedBoost = v } },
          omniForceRef: { get current() { return ctx.timers.omniForce }, set current(v) { ctx.timers.omniForce = v } }
      });
  };

  const handleDevSkip = () => {
      if (!engineCtxRef.current) return;
      engineCtxRef.current.stageInfo.stageCleared = true;
      const p = engineCtxRef.current.player;
      StageSystem.processStageEndDurability(p, p.stats.hp);
      onStageClear({ ...p });
      spawnFloatingText(p.x, p.y - 50, "DEV SKIP", "#00ff00", true);
  };

  const { keysRef, handleJoystickMove } = useGameInput(onPauseToggle, handleActivateUltimate, handleDevSkip);

  useEffect(() => {
    const player: Player = initialPlayer ? JSON.parse(JSON.stringify(initialPlayer)) : {
        id: 'player', x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, width: 32, height: 32,
        stats: { ...INITIAL_PLAYER_STATS }, permanentStats: { ...INITIAL_PLAYER_STATS },
        velocity: { x: 0, y: 0 }, color: COLOR_PALETTE.player, dead: false, angle: 0,
        equipment: { weapon1: { ...INITIAL_PLAYER_WEAPON }, weapon2: null, armor1: null, armor2: null },
        talent: null, ultimateCharge: 0, level: 1, gold: initialGold
    };

    player.x = MAP_WIDTH / 2;
    player.y = MAP_HEIGHT / 2;
    player.gold = initialGold;

    const ctx: GameContext = {
        player, enemies: [], projectiles: [], floatingTexts: [], terrain: [], hazards: [], goldDrops: [], particles: [],
        spatialGrid: new SpatialHashGrid(150),
        stageInfo: { totalEnemies: 0, spawnedCount: 0, killedCount: 0, stageCleared: false, isBossStage: false },
        timers: { timeStop: 0, invincibility: 0, hurt: 0, slowed: 0, speedBoost: 0, omniForce: 0, spawn: 0, stageClear: 0 },
        cooldowns: { weapon1: 0, weapon2: 0 },
        currentStage, initialGold, fireDamageAccumulator: { current: 0 }
    };

    StageSystem.initializeStage({
        player: ctx.player, stageInfo: ctx.stageInfo, enemies: ctx.enemies, projectiles: ctx.projectiles,
        floatingTexts: ctx.floatingTexts, hazards: ctx.hazards, goldDrops: ctx.goldDrops, terrain: ctx.terrain,
        fireDamageAccumulator: ctx.fireDamageAccumulator, particles: ctx.particles, camera: cameraRef.current,
        timers: {
            hurt: { get current() { return ctx.timers.hurt }, set current(v) { ctx.timers.hurt = v } },
            invincibility: { get current() { return ctx.timers.invincibility }, set current(v) { ctx.timers.invincibility = v } },
            slowed: { get current() { return ctx.timers.slowed }, set current(v) { ctx.timers.slowed = v } },
            timeStop: { get current() { return ctx.timers.timeStop }, set current(v) { ctx.timers.timeStop = v } },
            speedBoost: { get current() { return ctx.timers.speedBoost }, set current(v) { ctx.timers.speedBoost = v } },
            omniForce: { get current() { return ctx.timers.omniForce }, set current(v) { ctx.timers.omniForce = v } }
        },
        currentStage, initialGold
    });

    engineCtxRef.current = ctx;
    TalentSystem.calculatePlayerStats(ctx.player);
  }, [currentStage, initialGold, initialPlayer]);

  useEffect(() => {
    const ctx = engineCtxRef.current;
    if (upgradeChosen && ctx) {
      const upgradeId = (upgradeChosen as any).id || (upgradeChosen as any).title || JSON.stringify(upgradeChosen);
      if (lastAppliedUpgradeRef.current === upgradeId) return;
      lastAppliedUpgradeRef.current = upgradeId;

      const p = ctx.player;
      if ('type' in upgradeChosen && 'value1' in upgradeChosen) p.talent = upgradeChosen as Talent;
      else if ('rarity' in upgradeChosen) {
        const item = upgradeChosen as Item;
        const slot = item._targetSlot || (item.type === 'WEAPON' ? (p.equipment.weapon1 ? 'weapon2' : 'weapon1') : (p.equipment.armor1 ? 'armor2' : 'armor1'));
        p.equipment[slot as keyof typeof p.equipment] = item;
      } else {
         const upgrade = upgradeChosen as any; 
         if (upgrade.healPercent) p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + p.permanentStats.maxHp * upgrade.healPercent);
         else if (upgrade.stats) Object.entries(upgrade.stats).forEach(([k, v]) => { if ((p.permanentStats as any)[k] !== undefined) (p.permanentStats as any)[k] += v; });
      }
      onUpgradeApplied();
      TalentSystem.calculatePlayerStats(p);
    }
  }, [upgradeChosen, onUpgradeApplied]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = (timestamp: number) => {
      const ctx = engineCtxRef.current;
      if (isPaused || !ctx) {
        lastTimeRef.current = timestamp;
        animationFrameId = requestAnimationFrame(loop);
        return;
      }
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      PlayerSystem.updatePlayerMovement(ctx.player, keysRef.current, ctx.terrain, ctx.timers.speedBoost, ctx.timers.slowed > 0 ? 0.5 : 0);

      updateGameTick(ctx, deltaTime);

      if (ctx.player.stats.hp <= 0 && !ctx.player.dead) {
          ctx.player.dead = true;
          onGameOver(currentStage);
      }
      if (StageSystem.checkStageClearCondition(ctx.stageInfo) && ctx.timers.stageClear === 0) ctx.timers.stageClear = 1;
      if (ctx.timers.stageClear > 0) {
          ctx.timers.stageClear++;
          if (ctx.timers.stageClear > 60) {
              StageSystem.processStageEndDurability(ctx.player, ctx.player.stats.hp);
              onStageClear({ ...ctx.player });
              ctx.timers.stageClear = 0;
          }
      }

      CameraSystem.updateCamera(cameraRef.current, ctx.player);
      const canvasCtx = canvasRef.current?.getContext('2d');
      if (canvasCtx) {
          RenderSystem.drawGame({
              ctx: canvasCtx, camera: cameraRef.current, terrain: ctx.terrain, hazards: ctx.hazards, goldDrops: ctx.goldDrops,
              player: ctx.player, enemies: ctx.enemies, projectiles: ctx.projectiles, floatingTexts: ctx.floatingTexts,
              particles: ctx.particles, assets, hurtTimer: ctx.timers.hurt, invincibilityTimer: ctx.timers.invincibility,
              omniForceActive: ctx.timers.omniForce > 0
          });
      }

      uiUpdateFrameRef.current++;
      if (uiUpdateFrameRef.current % 5 === 0) {
          const p = ctx.player;
          setUiState({
             hp: p.stats.hp, maxHp: p.stats.maxHp, shield: p.stats.shield, ult: p.ultimateCharge, gold: p.gold,
             enemiesLeft: ctx.stageInfo.totalEnemies - ctx.stageInfo.killedCount,
             weapon1: p.equipment.weapon1, weapon2: p.equipment.weapon2, armor1: p.equipment.armor1, armor2: p.equipment.armor2,
             hasUltimate: !!(p.equipment.weapon1?.ultimate || p.equipment.weapon2?.ultimate),
             activeUltimates: [p.equipment.weapon1?.ultimate, p.equipment.weapon2?.ultimate].filter(Boolean) as UltimateType[],
             stats: p.stats, talent: p.talent
          });
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, currentStage, onGameOver, onStageClear, assets]);

  return (
    <div className="relative w-full h-full cursor-crosshair select-none overflow-hidden touch-none" onClick={() => setTooltip(null)}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain bg-black" />
        <GameHUD uiState={uiState} currentStage={currentStage} isBossStage={engineCtxRef.current?.stageInfo.isBossStage || false} isMobile={isMobile}
            onMouseEnterItem={() => {}} onMouseLeaveItem={() => {}} onClickItem={(item, e) => {
                if (!item) return; e.stopPropagation();
                setTooltip({ type: 'ITEM', content: item, x: Math.min(e.clientX, window.innerWidth - 260), y: Math.min(e.clientY, window.innerHeight - 200) });
            }}
            onMouseEnterStats={() => {}} onClickStats={(e) => {
                e.stopPropagation(); setTooltip({ type: 'STATS', content: uiState.stats, x: Math.min(e.clientX, window.innerWidth - 260), y: e.clientY + 20 });
            }}
            onMouseEnterUlt={() => {}} onClickUlt={(e) => {
                e.stopPropagation(); setTooltip({ type: 'ULTIMATE', content: uiState.activeUltimates, x: Math.min(e.clientX, window.innerWidth - 260), y: e.clientY + 20 });
            }}
            onMouseEnterTalent={() => {}} onClickTalent={(t, e) => {
                if (!t) return; e.stopPropagation();
                setTooltip({ type: 'TALENT', content: t, x: Math.min(e.clientX, window.innerWidth - 260), y: e.clientY + 20 });
            }}
        />
        <UltimateButton hasUltimate={uiState.hasUltimate} ult={uiState.ult} activeUltimates={uiState.activeUltimates} isMobile={isMobile} onActivate={handleActivateUltimate} />
        {tooltip && <GameTooltip tooltip={tooltip} onClose={() => setTooltip(null)} />}
        {isMobile && !isPaused && <VirtualJoystick onMove={handleJoystickMove} forceLandscape={isPortrait} />}
    </div>
  );
};

export default Game;
