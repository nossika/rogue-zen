
import React, { useRef, useEffect, useState } from 'react';
import { Player, Enemy, Projectile, GameAssets, Stats, Item, UltimateType, FloatingText, Terrain, Hazard, HazardType, GoldDrop, UpgradeReward, Particle, SpatialHashGrid, ElementType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT, INITIAL_PLAYER_STATS, COLOR_PALETTE, INITIAL_PLAYER_WEAPON } from '../constants';

// Sub-components
import { GameHUD } from './GameHUD';
import { GameTooltip } from './GameTooltip';
import { UltimateButton } from './Ultimate';

// Systems
import * as PlayerSystem from '@/systems/entities/Player';
import * as EnemySystem from '@/systems/entities/Enemy';
import * as WeaponSystem from '@/systems/combat/Weapon';
import * as ProjectileSystem from '@/systems/combat/Projectile';
import * as LootSystem from '@/systems/items/Loot';
import * as HazardSystem from '@/systems/combat/Hazard';
import * as TalentSystem from '@/systems/items/Talent';
import * as UltimateSystem from '@/systems/combat/Ultimate';
import * as RenderSystem from '@/systems/core/Render';
import * as CameraSystem from '@/systems/core/Camera';
import * as StageSystem from '@/systems/core/Stage';
import * as FloatingTextSystem from '@/systems/ui/FloatingText';
import * as ParticleSystem from '@/systems/ui/Particle';
import { AudioSystem } from '@/systems/core/Audio';

// Hooks
import { useGameInput } from '../hooks/useGameInput';

// Mobile Controls
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
}

interface TooltipData {
  type: 'ITEM' | 'ULTIMATE' | 'STATS';
  content: Item | UltimateType[] | Stats;
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
  initialGold
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'player',
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    width: 32,
    height: 32,
    stats: { ...INITIAL_PLAYER_STATS },
    permanentStats: { ...INITIAL_PLAYER_STATS },
    velocity: { x: 0, y: 0 },
    color: COLOR_PALETTE.player,
    dead: false,
    angle: 0,
    equipment: { 
      weapon1: { ...INITIAL_PLAYER_WEAPON }, 
      weapon2: null, 
      armor1: null,
      armor2: null 
    },
    ultimateCharge: 0,
    level: 1,
    gold: initialGold
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const terrainRef = useRef<Terrain[]>([]);
  const hazardsRef = useRef<Hazard[]>([]);
  const goldDropsRef = useRef<GoldDrop[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const fireDamageAccumulatorRef = useRef<number>(0);
  const stageStartHpRef = useRef<number>(INITIAL_PLAYER_STATS.hp);
  
  // Optimization: Spatial Grid
  const spatialGridRef = useRef<SpatialHashGrid>(new SpatialHashGrid(150));

  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  
  // UI Throttling
  const uiUpdateFrameRef = useRef<number>(0);
  
  // Camera State
  const cameraRef = useRef({ x: 0, y: 0 });

  const cooldown1Ref = useRef<number>(0);
  const cooldown2Ref = useRef<number>(0);
  
  const stageInfoRef = useRef({
    totalEnemies: 0,
    spawnedCount: 0,
    killedCount: 0,
    stageCleared: false,
    isBossStage: false
  });

  const timeStopRef = useRef<number>(0);
  const invincibilityRef = useRef<number>(0);
  const hurtTimerRef = useRef<number>(0); 
  const slowedTimerRef = useRef<number>(0); 
  const speedBoostRef = useRef<number>(0);
  const omniForceRef = useRef<number>(0); 

  const [uiState, setUiState] = useState({
    hp: 100,
    maxHp: 100,
    shield: 0,
    ult: 0,
    enemiesLeft: 0,
    gold: initialGold,
    weapon1: null as Item | null,
    weapon2: null as Item | null,
    armor1: null as Item | null,
    armor2: null as Item | null,
    hasUltimate: false,
    activeUltimates: [] as UltimateType[],
    stats: { ...INITIAL_PLAYER_STATS }
  });
  
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
      const checkMobile = () => {
          setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const spawnFloatingText = (x: number, y: number, text: string, color: string, isCrit: boolean = false) => {
    FloatingTextSystem.createFloatingText(floatingTextsRef.current, x, y, text, color, isCrit);
  };

  const spawnSplatter = (x: number, y: number, color?: string) => {
      ParticleSystem.createBloodSplatter(particlesRef.current, x, y, color);
  };

  const handleActivateUltimate = () => {
      UltimateSystem.activateUltimate({
          player: playerRef.current,
          enemies: enemiesRef.current,
          terrain: terrainRef.current,
          spawnFloatingText,
          timeStopRef,
          invincibilityRef,
          speedBoostRef,
          omniForceRef
      });
  };

  const onStageClearWrapper = () => {
     const p = playerRef.current;
     StageSystem.processStageEndDurability(p, stageStartHpRef.current);
     onStageClear({ ...p });
  };

  // Developer backdoor triggered via hook
  const handleDevSkip = () => {
      stageInfoRef.current.stageCleared = true;
      onStageClearWrapper();
      spawnFloatingText(playerRef.current.x, playerRef.current.y - 50, "DEV SKIP", "#00ff00", true);
  };

  const { keysRef, handleJoystickMove } = useGameInput(onPauseToggle, handleActivateUltimate, handleDevSkip);

  useEffect(() => {
    StageSystem.initializeStage({
        player: playerRef.current,
        stageInfo: stageInfoRef.current,
        enemies: enemiesRef.current,
        projectiles: projectilesRef.current,
        floatingTexts: floatingTextsRef.current,
        hazards: hazardsRef.current,
        goldDrops: goldDropsRef.current,
        terrain: terrainRef.current,
        fireDamageAccumulator: fireDamageAccumulatorRef,
        particles: particlesRef.current,
        camera: cameraRef.current,
        timers: {
            hurt: hurtTimerRef,
            invincibility: invincibilityRef,
            slowed: slowedTimerRef,
            timeStop: timeStopRef,
            speedBoost: speedBoostRef,
            omniForce: omniForceRef
        },
        currentStage,
        initialGold
    });

    stageStartHpRef.current = playerRef.current.stats.hp;

  }, [currentStage, initialGold]); 

  useEffect(() => {
    const p = playerRef.current;

    if (upgradeChosen) {
      const isItem = 'rarity' in upgradeChosen;
      
      if (isItem) {
        const item = upgradeChosen as Item;
        if (item.type === 'WEAPON') {
           if (item._targetSlot === 'weapon1') {
               p.equipment.weapon1 = item;
           } else if (item._targetSlot === 'weapon2') {
               p.equipment.weapon2 = item;
           } else {
               if (!p.equipment.weapon1) p.equipment.weapon1 = item;
               else if (!p.equipment.weapon2) p.equipment.weapon2 = item;
               else p.equipment.weapon1 = item; 
           }
        } else {
           if (item._targetSlot === 'armor1') {
               p.equipment.armor1 = item;
           } else if (item._targetSlot === 'armor2') {
               p.equipment.armor2 = item;
           } else {
               if (!p.equipment.armor1) p.equipment.armor1 = item;
               else if (!p.equipment.armor2) p.equipment.armor2 = item;
               else p.equipment.armor1 = item;
           }
           if (item.stats.shield) {
               p.stats.shield += item.stats.shield;
           }
        }
      } else {
         const upgrade = upgradeChosen as any; 
         
         if (upgrade.healPercent) {
             const healAmt = p.permanentStats.maxHp * upgrade.healPercent;
             p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + healAmt);
             spawnFloatingText(p.x, p.y - 40, `+${Math.round(healAmt)} HP`, '#4ade80');
         } else if (upgrade.stats) {
             Object.entries(upgrade.stats).forEach(([key, val]) => {
                // @ts-ignore
                if (p.permanentStats[key] !== undefined) p.permanentStats[key] += (val as number);
             });
             // @ts-ignore
             if (upgrade.stats.maxHp) {
                 // @ts-ignore
                 p.stats.hp += upgrade.stats.maxHp;
             }
         }
      }
      onUpgradeApplied();
      stageStartHpRef.current = p.stats.hp;
    }
    
    TalentSystem.calculatePlayerStats(p);

  }, [upgradeChosen, onUpgradeApplied]);

  const handleCreateHazard = (x: number, y: number, radius: number, damage: number, type: HazardType, source: 'ENEMY' | 'PLAYER', element: ElementType = ElementType.NONE, critChance: number = 0, knockback: number = 0) => {
      HazardSystem.createHazard(hazardsRef.current, x, y, radius, damage, type, source, element, critChance, knockback);
  };

  const handlePlayerHit = (damage: number, ignoreShield = false, silent = false) => {
      if (invincibilityRef.current <= 0 && hurtTimerRef.current <= 0) {
          AudioSystem.playDamage();
      }

      PlayerSystem.handlePlayerDamage(
          playerRef.current,
          damage,
          { invincibility: invincibilityRef, hurt: hurtTimerRef, slowed: slowedTimerRef },
          floatingTextsRef.current,
          spawnSplatter,
          ignoreShield,
          silent
      );
  };

  useEffect(() => {
    let animationFrameId: number;

    const loop = (timestamp: number) => {
      if (isPaused) {
        lastTimeRef.current = timestamp;
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Update Timers
      if (timeStopRef.current > 0) timeStopRef.current--;
      if (invincibilityRef.current > 0) invincibilityRef.current--;
      if (hurtTimerRef.current > 0) hurtTimerRef.current--;
      if (slowedTimerRef.current > 0) slowedTimerRef.current--;
      if (speedBoostRef.current > 0) speedBoostRef.current--;
      if (omniForceRef.current > 0) omniForceRef.current--;

      const isTimeStop = timeStopRef.current > 0;
      const isOmniForce = omniForceRef.current > 0;

      // 1. Spawning
      if (!isTimeStop) {
        if (!stageInfoRef.current.isBossStage || stageInfoRef.current.spawnedCount === 0) {
            spawnTimerRef.current += deltaTime;
            if (spawnTimerRef.current > 500) { // Spawn interval
                EnemySystem.spawnEnemy(enemiesRef.current, playerRef.current, terrainRef.current, currentStage, stageInfoRef.current);
                spawnTimerRef.current = 0;
            }
        }
      }

      // 2. Clear Grid
      spatialGridRef.current.clear();

      // 3. Update Entities
      const p = playerRef.current;

      PlayerSystem.updatePlayerMovement(p, keysRef.current, terrainRef.current, speedBoostRef.current, slowedTimerRef.current > 0);
      
      EnemySystem.updateEnemies(
          enemiesRef.current, 
          p, 
          terrainRef.current, 
          projectilesRef.current, 
          isTimeStop,
          spawnFloatingText,
          spawnSplatter,
          handlePlayerHit,
          handleCreateHazard,
          spatialGridRef.current
      );

      ProjectileSystem.updateProjectiles(
          projectilesRef.current, 
          enemiesRef.current, 
          p, 
          terrainRef.current, 
          spawnFloatingText, 
          spawnSplatter, 
          handlePlayerHit,
          handleCreateHazard,
          isOmniForce,
          spatialGridRef.current
      );
      
      LootSystem.updateLoot(p, goldDropsRef.current, spawnFloatingText);
      
      HazardSystem.updateHazards(
          hazardsRef.current, 
          p, 
          enemiesRef.current, 
          terrainRef.current, 
          1, // dt approximation for hazard tick
          fireDamageAccumulatorRef, 
          spawnFloatingText, 
          handlePlayerHit,
          spawnSplatter
      );

      FloatingTextSystem.updateFloatingTexts(floatingTextsRef.current);
      ParticleSystem.updateParticles(particlesRef.current);

      // 4. Combat & Auto-Attack
      if (cooldown1Ref.current > 0) cooldown1Ref.current--;
      if (cooldown2Ref.current > 0) cooldown2Ref.current--;

      if (p.equipment.weapon1) {
          WeaponSystem.fireWeapon(p, p.equipment.weapon1, enemiesRef.current, projectilesRef.current, cooldown1Ref, speedBoostRef.current);
      }
      if (p.equipment.weapon2) {
          WeaponSystem.fireWeapon(p, p.equipment.weapon2, enemiesRef.current, projectilesRef.current, cooldown2Ref, speedBoostRef.current);
      }

      // 5. Cleanup Dead
      let killedThisFrame = 0;
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const e = enemiesRef.current[i];
        if (e.stats.hp <= 0) {
            if (!e.dead) {
                 e.dead = true;
                 e.deathTimer = 25; 
                 
                 killedThisFrame++;
                 
                 if (e.type === 'BOSS') {
                     AudioSystem.playKill(); // Boom
                 } else {
                     AudioSystem.playKill();
                 }

                 if (Math.random() < 0.3 || e.type === 'BOSS') { // 30% gold chance
                    const drops = LootSystem.spawnGold(terrainRef.current, e.type === 'BOSS' ? 10 : 1);
                    drops.forEach(d => {
                        d.x = e.x + (Math.random()*20-10);
                        d.y = e.y + (Math.random()*20-10);
                        goldDropsRef.current.push(d);
                    });
                 }
            }
        }
        
        if (e.dead) {
            if (e.deathTimer && e.deathTimer > 0) {
                e.deathTimer--;
            } else {
                enemiesRef.current.splice(i, 1);
                // Only count non-minions towards stage clear (unless boss stage logic handles it)
                if (!e.isMinion) stageInfoRef.current.killedCount++;
            }
        }
      }

      // Charge Ult passively
      if (p.stats.ultChargeRate > 0) {
          p.ultimateCharge = Math.min(100, p.ultimateCharge + (p.stats.ultChargeRate / 60));
      }

      // 6. Check Win/Loss
      if (p.stats.hp <= 0 && !p.dead) {
          p.dead = true;
          onGameOver(currentStage);
      }

      if (StageSystem.checkStageClearCondition(stageInfoRef.current)) {
           stageInfoRef.current.stageCleared = true;
           onStageClearWrapper();
      }

      // 7. Render
      CameraSystem.updateCamera(cameraRef.current, p);
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            RenderSystem.drawGame({
                ctx,
                camera: cameraRef.current,
                terrain: terrainRef.current,
                hazards: hazardsRef.current,
                goldDrops: goldDropsRef.current,
                player: p,
                enemies: enemiesRef.current,
                projectiles: projectilesRef.current,
                floatingTexts: floatingTextsRef.current,
                particles: particlesRef.current,
                assets,
                hurtTimer: hurtTimerRef.current,
                invincibilityTimer: invincibilityRef.current,
                omniForceActive: isOmniForce
            });
        }
      }

      // 8. Update UI State (Throttled)
      uiUpdateFrameRef.current++;
      if (uiUpdateFrameRef.current % 5 === 0) {
          const activeUlts = [];
          if (p.equipment.weapon1?.ultimate) activeUlts.push(p.equipment.weapon1.ultimate);
          if (p.equipment.weapon2?.ultimate) activeUlts.push(p.equipment.weapon2.ultimate);

          setUiState({
             hp: p.stats.hp,
             maxHp: p.stats.maxHp,
             shield: p.stats.shield,
             ult: p.ultimateCharge,
             gold: p.gold,
             enemiesLeft: stageInfoRef.current.totalEnemies - stageInfoRef.current.killedCount,
             weapon1: p.equipment.weapon1,
             weapon2: p.equipment.weapon2,
             armor1: p.equipment.armor1,
             armor2: p.equipment.armor2,
             hasUltimate: activeUlts.length > 0,
             activeUltimates: activeUlts,
             stats: p.stats
          });
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, currentStage, onGameOver, onStageClear]);

  // Handle Tooltips
  const handleItemClick = (item: Item | null, e: React.MouseEvent) => {
      if (!item) {
          setTooltip(null);
          return;
      }
      e.stopPropagation();
      setTooltip({
          type: 'ITEM',
          content: item,
          x: Math.min(e.clientX, window.innerWidth - 260),
          y: Math.min(e.clientY, window.innerHeight - 200)
      });
  };

  const handleStatsClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setTooltip({
          type: 'STATS',
          content: playerRef.current.stats,
          x: Math.min(e.clientX, window.innerWidth - 260),
          y: e.clientY + 20
      });
  };

  const handleUltClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const activeUlts = [];
    if (playerRef.current.equipment.weapon1?.ultimate) activeUlts.push(playerRef.current.equipment.weapon1.ultimate);
    if (playerRef.current.equipment.weapon2?.ultimate) activeUlts.push(playerRef.current.equipment.weapon2.ultimate);
    
    setTooltip({
        type: 'ULTIMATE',
        content: activeUlts,
        x: Math.min(e.clientX, window.innerWidth - 260),
        y: e.clientY + 20
    });
  };

  return (
    <div 
        className="relative w-full h-full cursor-crosshair select-none overflow-hidden touch-none"
        onClick={() => setTooltip(null)}
    >
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain bg-black"
        />

        <GameHUD 
            uiState={uiState}
            currentStage={currentStage}
            isBossStage={stageInfoRef.current.isBossStage}
            isMobile={isMobile}
            onMouseEnterItem={() => {}} // Tooltips on click mainly for touch support
            onMouseLeaveItem={() => {}}
            onClickItem={handleItemClick}
            onMouseEnterStats={() => {}}
            onClickStats={handleStatsClick}
            onMouseEnterUlt={() => {}}
            onClickUlt={handleUltClick}
        />

        <UltimateButton 
            hasUltimate={uiState.hasUltimate}
            ult={uiState.ult}
            activeUltimates={uiState.activeUltimates}
            isMobile={isMobile}
            onActivate={handleActivateUltimate}
        />

        {tooltip && (
            <GameTooltip 
                tooltip={tooltip} 
                onClose={() => setTooltip(null)} 
            />
        )}

        {isMobile && !isPaused && (
             <VirtualJoystick onMove={handleJoystickMove} forceLandscape={isPortrait} />
        )}
    </div>
  );
};

export default Game;
