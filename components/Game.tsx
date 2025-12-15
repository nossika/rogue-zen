
import React, { useRef, useEffect, useState } from 'react';
import { Player, Enemy, Projectile, GameAssets, Stats, Item, UltimateType, Rarity, FloatingText, Terrain, ElementType, Hazard, HazardType, GoldDrop, UpgradeReward, Particle, SpatialHashGrid } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT, INITIAL_PLAYER_STATS, COLOR_PALETTE, GOLD_VALUES } from '../constants';

// Sub-components
import { GameHUD } from './GameHUD';
import { GameTooltip } from './GameTooltip';
import { UltimateButton } from './Ultimate';

// Systems
import * as TerrainSystem from '@/systems/world/Terrain';
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
      weapon1: {
         id: 'starter_sword',
         name: 'Rusty Sword',
         type: 'WEAPON',
         subtype: 'SWORD',
         element: ElementType.NONE,
         rarity: Rarity.COMMON,
         stats: { attack: 10, range: 100, attackSpeed: 1.4, knockback: 8, critChance: 0.1, armorOnHit: 0 },
         level: 1,
         durability: 100
      }, 
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
      FloatingTextSystem.createFloatingText(floatingTextsRef.current, playerRef.current.x, playerRef.current.y - 50, "DEV SKIP", "#00ff00", true);
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
          {
              invincibility: invincibilityRef,
              hurt: hurtTimerRef,
              slowed: slowedTimerRef
          },
          floatingTextsRef.current,
          spawnSplatter,
          ignoreShield,
          silent
      );
  };

  const update = (dt: number) => {
    const p = playerRef.current;
    if (p.dead || stageInfoRef.current.stageCleared) return;

    spatialGridRef.current.clear();
    
    p.ultimateCharge = Math.min(100, p.ultimateCharge + dt * p.stats.ultChargeRate);

    PlayerSystem.updatePlayerMovement(p, keysRef.current, terrainRef.current, speedBoostRef.current, slowedTimerRef.current > 0);

    CameraSystem.updateCamera(cameraRef.current, p);

    if (timeStopRef.current > 0) timeStopRef.current--;
    if (invincibilityRef.current > 0) invincibilityRef.current--;
    if (hurtTimerRef.current > 0) hurtTimerRef.current--;
    if (slowedTimerRef.current > 0) slowedTimerRef.current--;
    if (speedBoostRef.current > 0) speedBoostRef.current--;
    if (omniForceRef.current > 0) omniForceRef.current--;
    if (cooldown1Ref.current > 0) cooldown1Ref.current--;
    if (cooldown2Ref.current > 0) cooldown2Ref.current--;

    FloatingTextSystem.updateFloatingTexts(floatingTextsRef.current);
    ParticleSystem.updateParticles(particlesRef.current);
    
    LootSystem.updateLoot(p, goldDropsRef.current, spawnFloatingText);
    
    HazardSystem.updateHazards(
        hazardsRef.current, 
        p, 
        enemiesRef.current, 
        terrainRef.current, 
        dt, 
        fireDamageAccumulatorRef, 
        spawnFloatingText, 
        handlePlayerHit,
        spawnSplatter
    );

    if (timeStopRef.current <= 0) {
      spawnTimerRef.current--;
      if (spawnTimerRef.current <= 0) {
        EnemySystem.spawnEnemy(enemiesRef.current, p, terrainRef.current, currentStage, stageInfoRef.current);
        const count = enemiesRef.current.length;
        spawnTimerRef.current = count > 10 ? 60 : 30; 
      }
    }

    EnemySystem.updateEnemies(
        enemiesRef.current, 
        p, 
        terrainRef.current, 
        projectilesRef.current, 
        timeStopRef.current > 0, 
        spawnFloatingText,
        spawnSplatter, 
        handlePlayerHit,
        handleCreateHazard, 
        spatialGridRef.current 
    );

    if (p.equipment.weapon1) WeaponSystem.fireWeapon(p, p.equipment.weapon1, enemiesRef.current, projectilesRef.current, cooldown1Ref, speedBoostRef.current);
    if (p.equipment.weapon2) WeaponSystem.fireWeapon(p, p.equipment.weapon2, enemiesRef.current, projectilesRef.current, cooldown2Ref, speedBoostRef.current);

    ProjectileSystem.updateProjectiles(
        projectilesRef.current, 
        enemiesRef.current, 
        p, 
        terrainRef.current, 
        spawnFloatingText,
        spawnSplatter,
        handlePlayerHit,
        handleCreateHazard,
        omniForceRef.current > 0,
        spatialGridRef.current 
    );

    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
       const enemy = enemiesRef.current[i];
       
       if (enemy.stats.hp <= 0) {
           if (!enemy.dead) {
               enemy.dead = true;
               enemy.deathTimer = 25; 
               AudioSystem.playKill();

               let goldReward = 0;
               if (enemy.type === 'BOSS') {
                   const remainingBosses = enemiesRef.current.filter(e => e.type === 'BOSS' && !e.dead && e.id !== enemy.id).length;
                   
                   if (remainingBosses === 0) {
                       goldReward = GOLD_VALUES.BOSS_KILL;
                       stageInfoRef.current.stageCleared = true;
                       onStageClearWrapper();
                       if (p.gold) p.gold += goldReward; else p.gold = goldReward;
                   } else {
                       goldReward = GOLD_VALUES.BOSS_KILL / 2;
                       if (p.gold) p.gold += goldReward; else p.gold = goldReward;
                   }
               } else if (enemy.isMinion) {
                   goldReward = GOLD_VALUES.MINION_KILL;
               } else {
                   goldReward = GOLD_VALUES.ENEMY_KILL;
                   stageInfoRef.current.killedCount++;
               }

               if (goldReward > 0 && enemy.type !== 'BOSS') {
                   p.gold += goldReward;
               }
           }
       }
       
       if (enemy.dead) {
           enemy.deathTimer = (enemy.deathTimer || 0) - 1;
           if (enemy.deathTimer <= 0) {
               enemiesRef.current.splice(i, 1);
           }
       }
    }

    if (StageSystem.checkStageClearCondition(stageInfoRef.current)) {
        stageInfoRef.current.stageCleared = true;
        onStageClearWrapper();
    }

    if (p.stats.hp <= 0) {
      p.dead = true;
      onGameOver(p.level);
    }

    uiUpdateFrameRef.current++;
    if (uiUpdateFrameRef.current % 6 === 0) {
        const activeUlts: UltimateType[] = [];
        if (p.equipment.weapon1?.ultimate) activeUlts.push(p.equipment.weapon1.ultimate);
        if (p.equipment.weapon2?.ultimate) activeUlts.push(p.equipment.weapon2.ultimate);
        
        const uniqueUlts = Array.from(new Set(activeUlts));
        const hasUltimate = uniqueUlts.length > 0;

        setUiState({
          hp: p.stats.hp,
          maxHp: p.stats.maxHp,
          shield: p.stats.shield,
          ult: p.ultimateCharge,
          enemiesLeft: stageInfoRef.current.isBossStage ? 1 : stageInfoRef.current.totalEnemies - stageInfoRef.current.killedCount,
          gold: p.gold,
          weapon1: p.equipment.weapon1,
          weapon2: p.equipment.weapon2,
          armor1: p.equipment.armor1,
          armor2: p.equipment.armor2,
          hasUltimate,
          activeUltimates: uniqueUlts,
          stats: { ...p.stats }
        });
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
      RenderSystem.drawGame({
          ctx,
          camera: cameraRef.current,
          terrain: terrainRef.current,
          hazards: hazardsRef.current,
          goldDrops: goldDropsRef.current,
          player: playerRef.current,
          enemies: enemiesRef.current,
          projectiles: projectilesRef.current,
          floatingTexts: floatingTextsRef.current,
          particles: particlesRef.current,
          assets,
          hurtTimer: hurtTimerRef.current,
          invincibilityTimer: invincibilityRef.current,
          omniForceActive: omniForceRef.current > 0
      });
  };

  useEffect(() => {
    let animationFrameId: number;
    const loop = (time: number) => {
      if (!isPaused) {
         const dt = (time - lastTimeRef.current) / 1000;
         lastTimeRef.current = time;
         update(dt);
      }
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) draw(ctx);
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, assets]); 
  
  const handleMouseEnterItem = (item: Item | null, e: React.MouseEvent) => {
      if (!item || isMobile) return; 
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
          type: 'ITEM',
          content: item,
          x: rect.left,
          y: rect.bottom + 10
      });
  };
  
  const handleMouseEnterStats = (e: React.MouseEvent) => {
      if (isMobile) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
          type: 'STATS',
          content: uiState.stats,
          x: rect.left,
          y: rect.bottom + 10
      });
  };
  
  const handleClickItem = (item: Item | null, e: React.MouseEvent) => {
      if (!isMobile || !item) return;
      e.stopPropagation(); 
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltip && tooltip.type === 'ITEM' && tooltip.content === item) {
          setTooltip(null);
      } else {
         setTooltip({
             type: 'ITEM',
             content: item,
             x: rect.left, 
             y: rect.bottom + 10
         });
      }
  };

  const handleClickStats = (e: React.MouseEvent) => {
      if (!isMobile) return;
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltip && tooltip.type === 'STATS') {
          setTooltip(null);
      } else {
          setTooltip({
              type: 'STATS',
              content: uiState.stats,
              x: rect.left,
              y: rect.bottom + 10
          });
      }
  };

  const handleMouseEnterUlt = (e: React.MouseEvent) => {
    if (isMobile) return;
    const p = playerRef.current;
    const ults: UltimateType[] = [];
    if (p.equipment.weapon1?.ultimate) ults.push(p.equipment.weapon1.ultimate);
    if (p.equipment.weapon2?.ultimate) ults.push(p.equipment.weapon2.ultimate);
    const uniqueUlts = Array.from(new Set(ults));
    if (uniqueUlts.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
        type: 'ULTIMATE',
        content: uniqueUlts,
        x: rect.left,
        y: rect.bottom + 10
    });
  };

  const handleClickUlt = (e: React.MouseEvent) => {
      if (!isMobile) return;
      e.stopPropagation();
      const p = playerRef.current;
      const ults: UltimateType[] = [];
      if (p.equipment.weapon1?.ultimate) ults.push(p.equipment.weapon1.ultimate);
      if (p.equipment.weapon2?.ultimate) ults.push(p.equipment.weapon2.ultimate);
      const uniqueUlts = Array.from(new Set(ults));
      if (uniqueUlts.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltip && tooltip.type === 'ULTIMATE') {
          setTooltip(null);
      } else {
          setTooltip({
              type: 'ULTIMATE',
              content: uniqueUlts,
              x: rect.left,
              y: rect.bottom + 10
          });
      }
  };

  return (
    <div 
        className="relative w-full h-full shadow-2xl rounded-xl overflow-hidden border-4 border-gray-700 bg-black touch-none mx-auto"
        onClick={() => { if(tooltip) setTooltip(null); }}
    >
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block w-full h-full object-contain bg-[#1a1a2e]" />
      <img id="player-asset-img" src={assets.playerSprite || ''} className="hidden" alt="" />
      <img id="enemy-asset-img" src={assets.enemySprite || ''} className="hidden" alt="" />

      <GameHUD 
          uiState={uiState}
          currentStage={currentStage}
          isBossStage={stageInfoRef.current.isBossStage}
          isMobile={isMobile}
          onMouseEnterItem={handleMouseEnterItem}
          onMouseLeaveItem={() => !isMobile && setTooltip(null)}
          onClickItem={handleClickItem}
          onMouseEnterStats={handleMouseEnterStats}
          onClickStats={handleClickStats}
          onMouseEnterUlt={handleMouseEnterUlt}
          onClickUlt={handleClickUlt}
      />
      
      <GameTooltip tooltip={tooltip} onClose={() => setTooltip(null)} />
      
      {!isMobile && !isPaused && (
          <UltimateButton 
              hasUltimate={uiState.hasUltimate}
              ult={uiState.ult}
              activeUltimates={uiState.activeUltimates}
              isMobile={false}
              onActivate={handleActivateUltimate}
          />
      )}

      {isMobile && !isPaused && (
          <>
            <VirtualJoystick onMove={handleJoystickMove} forceLandscape={isPortrait} />
            <UltimateButton 
                hasUltimate={uiState.hasUltimate}
                ult={uiState.ult}
                activeUltimates={uiState.activeUltimates}
                isMobile={true}
                onActivate={handleActivateUltimate}
            />
          </>
      )}

    </div>
  );
};

export default Game;
