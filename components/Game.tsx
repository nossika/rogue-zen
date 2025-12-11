
import React, { useRef, useEffect, useState } from 'react';
import { Player, Enemy, Projectile, GameAssets, Stats, Item, UltimateType, Rarity, FloatingText, Terrain, ElementType, ArmorType, Hazard, HazardType, GoldDrop, TalentType, SpatialHashGrid, UpgradeReward } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT, INITIAL_PLAYER_STATS, COLOR_PALETTE, RARITY_COLORS, ENEMIES_PER_STAGE_BASE, ENEMIES_PER_STAGE_SCALING, TERRAIN_CONFIG, ELEMENT_CONFIG, ULTIMATE_DESCRIPTIONS, DETAIL_COLORS, GOLD_VALUES } from '../constants';
import { Shield, Zap, Clock, Star, Flame, Bomb, User, Sword, Axe, Crosshair, HelpCircle, PocketKnife, Shovel, Drill, BowArrow, Hand, Footprints, Target, Coins, Wrench } from 'lucide-react';

// Systems
import * as TerrainSystem from '../systems/TerrainSystem';
import * as PlayerSystem from '../systems/PlayerSystem';
import * as EnemySystem from '../systems/EnemySystem';
import * as WeaponSystem from '../systems/WeaponSystem';
import * as ProjectileSystem from '../systems/ProjectileSystem';
import * as LootSystem from '../systems/LootSystem';
import * as HazardSystem from '../systems/HazardSystem';
import * as TalentSystem from '../systems/TalentSystem';
import * as UltimateSystem from '../systems/UltimateSystem';
import * as RenderSystem from '../systems/RenderSystem';
import * as CameraSystem from '../systems/CameraSystem';

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
    x: MAP_WIDTH / 2, // Center on Map
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
      // Initial Basic Sword
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
  const hazardsRef = useRef<Hazard[]>([]); // Hazard System
  const goldDropsRef = useRef<GoldDrop[]>([]); // Gold Drops
  const fireDamageAccumulatorRef = useRef<number>(0); // Buffer for fire damage text
  
  // Optimization: Spatial Grid
  const spatialGridRef = useRef<SpatialHashGrid>(new SpatialHashGrid(150)); // 150px buckets

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
  const omniForceRef = useRef<number>(0); // Replaced critSurge

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
  
  // Removed showStats state, used tooltip instead
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  
  // Detect mobile for UI adjustments
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
      const checkMobile = () => {
          setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Developer Backdoor: Press 'n' 10 times quickly to skip stage
  useEffect(() => {
    let pressCount = 0;
    let lastTime = 0;

    const handleDevKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        const now = Date.now();
        if (now - lastTime > 400) { // Reset if more than 400ms between presses
          pressCount = 1;
        } else {
          pressCount++;
        }
        lastTime = now;

        if (pressCount >= 10) {
          // Trigger Stage Clear
          stageInfoRef.current.stageCleared = true;
          onStageClearWrapper();
          pressCount = 0;
          // Visual feedback for cheat
          floatingTextsRef.current.push({
             id: Math.random().toString(),
             x: playerRef.current.x,
             y: playerRef.current.y - 50,
             text: "DEV SKIP",
             color: "#00ff00",
             duration: 60,
             opacity: 1,
             vy: -2,
             isCrit: true
          });
        }
      }
    };

    window.addEventListener('keydown', handleDevKey);
    return () => window.removeEventListener('keydown', handleDevKey);
  }, [onStageClear]);

  const spawnFloatingText = (x: number, y: number, text: string, color: string, isCrit: boolean = false) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x: x + (Math.random() * 20 - 10),
      y: y,
      text,
      color,
      duration: 40,
      opacity: 1,
      vy: -1.5,
      isCrit
    });
  };

  const handleActivateUltimate = () => {
      UltimateSystem.activateUltimate({
          player: playerRef.current,
          enemies: enemiesRef.current,
          spawnFloatingText,
          timeStopRef,
          invincibilityRef,
          speedBoostRef,
          omniForceRef
      });
  };

  const onStageClearWrapper = () => {
     const p = playerRef.current;
     
     // Calculate Durability Loss using TalentSystem
     const durabilityLoss = TalentSystem.checkDurabilityLoss(p);

     // Apply Durability Loss & Remove Broken Items
     const slots: ('weapon1' | 'weapon2' | 'armor1' | 'armor2')[] = ['weapon1', 'weapon2', 'armor1', 'armor2'];
     
     slots.forEach(slot => {
         const item = p.equipment[slot];
         if (item) {
             item.durability -= durabilityLoss;
             // Check break
             if (item.durability <= 0) {
                 p.equipment[slot] = null;
                 console.log(`${slot} broke!`);
             }
         }
     });

     onStageClear({ ...p });
  };

  // --- USE INPUT HOOK ---
  const { keysRef, handleJoystickMove } = useGameInput(onPauseToggle, handleActivateUltimate);

  // --- SETUP STAGE ---
  useEffect(() => {
    // Boss every 6 stages
    const isBossStage = currentStage % 6 === 0;
    const total = isBossStage ? 1 : ENEMIES_PER_STAGE_BASE + (currentStage - 1) * ENEMIES_PER_STAGE_SCALING;
    
    stageInfoRef.current = {
      totalEnemies: total,
      spawnedCount: 0,
      killedCount: 0,
      stageCleared: false,
      isBossStage: isBossStage
    };
    enemiesRef.current = [];
    projectilesRef.current = [];
    floatingTextsRef.current = [];
    hazardsRef.current = [];
    goldDropsRef.current = [];
    fireDamageAccumulatorRef.current = 0;
    
    playerRef.current.x = MAP_WIDTH / 2;
    playerRef.current.y = MAP_HEIGHT / 2;
    playerRef.current.velocity = { x: 0, y: 0 };
    playerRef.current.level = currentStage;
    playerRef.current.gold = initialGold;
    
    // Reset Shield for new stage AND Apply Initial Shield from Armor(s)
    const armor1Shield = playerRef.current.equipment.armor1?.stats.shield || 0;
    const armor2Shield = playerRef.current.equipment.armor2?.stats.shield || 0;
    playerRef.current.stats.shield = armor1Shield + armor2Shield;
    
    cameraRef.current = {
        x: Math.max(0, Math.min(MAP_WIDTH - CANVAS_WIDTH, playerRef.current.x - CANVAS_WIDTH / 2)),
        y: Math.max(0, Math.min(MAP_HEIGHT - CANVAS_HEIGHT, playerRef.current.y - CANVAS_HEIGHT / 2))
    };

    hurtTimerRef.current = 0;
    invincibilityRef.current = 0;
    slowedTimerRef.current = 0;
    timeStopRef.current = 0;
    speedBoostRef.current = 0;
    omniForceRef.current = 0;
    terrainRef.current = TerrainSystem.generateTerrain();

    // Spawn Random Gold Drops via LootSystem (1 to 5)
    const goldCount = Math.floor(Math.random() * 5) + 1;
    goldDropsRef.current = LootSystem.spawnGold(terrainRef.current, goldCount);

  }, [currentStage, initialGold]); 

  // Re-calculate Stats Logic
  useEffect(() => {
    const p = playerRef.current;

    if (upgradeChosen) {
      // Determine if reward is an Item (has rarity) or StatUpgrade
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
           // Armor Logic
           if (item._targetSlot === 'armor1') {
               p.equipment.armor1 = item;
           } else if (item._targetSlot === 'armor2') {
               p.equipment.armor2 = item;
           } else {
               if (!p.equipment.armor1) p.equipment.armor1 = item;
               else if (!p.equipment.armor2) p.equipment.armor2 = item;
               else p.equipment.armor1 = item;
           }

           // Add immediate shield from new item if applicable
           if (item.stats.shield) {
               p.stats.shield += item.stats.shield;
           }
        }
      } else {
         // Handle StatUpgrade - Apply to PERMANENT STATS
         const upgrade = upgradeChosen as any; 
         
         if (upgrade.healPercent) {
             const healAmt = p.permanentStats.maxHp * upgrade.healPercent;
             p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + healAmt);
             spawnFloatingText(p.x, p.y - 40, `+${Math.round(healAmt)} HP`, '#4ade80');
         } else if (upgrade.stats) {
             Object.entries(upgrade.stats).forEach(([key, val]) => {
                // Update permanent base stats
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
    }
    
    // Always recalculate effective stats using the new system
    TalentSystem.calculatePlayerStats(p);

  }, [upgradeChosen, onUpgradeApplied]);

  // Handle Hazard Creation Wrapper to pass into ProjectileSystem
  const handleCreateHazard = (x: number, y: number, radius: number, damage: number, type: HazardType, source: 'ENEMY' | 'PLAYER') => {
      HazardSystem.createHazard(hazardsRef.current, x, y, radius, damage, type, source);
  };

  const handlePlayerHit = (damage: number, ignoreShield = false, silent = false) => {
      const p = playerRef.current;
      if (invincibilityRef.current > 0 || hurtTimerRef.current > 0) return;

      // Dodge Check
      if (!ignoreShield && Math.random() < p.stats.dodgeChance) {
          spawnFloatingText(p.x, p.y - 30, "DODGE", '#4ade80');
          return;
      }

      const isBlocked = !ignoreShield && Math.random() <= p.stats.blockChance;

      if (!isBlocked) {
          if (ignoreShield) {
              p.stats.hp -= damage;
              if (!silent && damage >= 1) {
                  spawnFloatingText(p.x, p.y - 20, `${Math.round(damage)}`, '#ef4444');
              }
          } else {
             const rawDmg = Math.max(1, damage - p.stats.defense);
             if (p.stats.shield > 0) {
                 if (p.stats.shield >= rawDmg) {
                     p.stats.shield -= rawDmg;
                     spawnFloatingText(p.x, p.y - 20, `${Math.round(rawDmg)}`, '#9ca3af');
                 } else {
                     const remaining = rawDmg - p.stats.shield;
                     p.stats.shield = 0;
                     p.stats.hp -= remaining;
                     spawnFloatingText(p.x, p.y - 20, `${Math.round(rawDmg)}`, '#ef4444');
                 }
             } else {
                 p.stats.hp -= rawDmg;
                 spawnFloatingText(p.x, p.y - 20, `${Math.round(rawDmg)}`, '#ef4444');
             }
          }
          
          p.ultimateCharge = Math.min(100, p.ultimateCharge + (ignoreShield ? damage : Math.max(1, damage - p.stats.defense)));

          if (!ignoreShield) {
              invincibilityRef.current = 30; 
              slowedTimerRef.current = 30;
          }
      } else {
          if (!silent) spawnFloatingText(p.x, p.y - 20, "BLOCKED", '#94a3b8');
      }
  };

  const update = (dt: number) => {
    const p = playerRef.current;
    if (p.dead || stageInfoRef.current.stageCleared) return;

    // --- SPATIAL GRID UPDATE ---
    // Clear and rebuild grid every frame for accurate collision detection
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

    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
      const ft = floatingTextsRef.current[i];
      ft.y += ft.vy;
      ft.duration--;
      ft.opacity = Math.max(0, ft.duration / 15);
      if (ft.duration <= 0) floatingTextsRef.current.splice(i, 1);
    }
    
    // --- UPDATES VIA SYSTEMS ---
    LootSystem.updateLoot(p, goldDropsRef.current, spawnFloatingText);
    
    HazardSystem.updateHazards(
        hazardsRef.current, 
        p, 
        enemiesRef.current, 
        terrainRef.current, 
        dt, 
        fireDamageAccumulatorRef, 
        spawnFloatingText, 
        handlePlayerHit
    );

    if (timeStopRef.current <= 0) {
      spawnTimerRef.current--;
      if (spawnTimerRef.current <= 0) {
        EnemySystem.spawnEnemy(enemiesRef.current, p, terrainRef.current, currentStage, stageInfoRef.current);
        const count = enemiesRef.current.length;
        spawnTimerRef.current = count > 10 ? 60 : 30; 
      }

      EnemySystem.updateEnemies(
          enemiesRef.current, 
          p, 
          terrainRef.current, 
          projectilesRef.current, 
          timeStopRef.current > 0, 
          spawnFloatingText,
          handlePlayerHit,
          handleCreateHazard, // Pass hazard creation logic
          spatialGridRef.current 
      );
    }

    if (p.equipment.weapon1) WeaponSystem.fireWeapon(p, p.equipment.weapon1, enemiesRef.current, projectilesRef.current, cooldown1Ref, speedBoostRef.current);
    if (p.equipment.weapon2) WeaponSystem.fireWeapon(p, p.equipment.weapon2, enemiesRef.current, projectilesRef.current, cooldown2Ref, speedBoostRef.current);

    ProjectileSystem.updateProjectiles(
        projectilesRef.current, 
        enemiesRef.current, 
        p, 
        terrainRef.current, 
        spawnFloatingText,
        handlePlayerHit,
        handleCreateHazard,
        omniForceRef.current > 0, // Is OMNI FORCE active
        spatialGridRef.current // Pass Grid for fast queries
    );

    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
       if (enemiesRef.current[i].stats.hp <= 0) {
         const enemy = enemiesRef.current[i];
         enemiesRef.current.splice(i, 1);
         
         // GOLD REWARD LOGIC
         let goldReward = 0;
         if (enemy.type === 'BOSS') {
             // Check if any other bosses exist (Handling Split/Clone logic)
             const remainingBosses = enemiesRef.current.filter(e => e.type === 'BOSS' && !e.dead).length;
             
             if (remainingBosses === 0) {
                 goldReward = GOLD_VALUES.BOSS_KILL;
                 stageInfoRef.current.stageCleared = true;
                 onStageClearWrapper();
                 if (p.gold) p.gold += goldReward; else p.gold = goldReward;
             } else {
                 // Boss killed but clone remains, give partial reward or none?
                 // Let's give small reward for the kill itself
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

    if (!stageInfoRef.current.isBossStage && 
        stageInfoRef.current.killedCount >= stageInfoRef.current.totalEnemies && 
        !stageInfoRef.current.stageCleared) {
        stageInfoRef.current.stageCleared = true;
        onStageClearWrapper();
    }

    if (p.stats.hp <= 0) {
      p.dead = true;
      onGameOver(p.level);
    }

    // --- UI THROTTLING ---
    // Only update React state every 6 frames (~10fps update rate)
    // This significantly reduces main thread load from React reconciliation
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
  
  const handleClickItem = (item: Item | null) => {
      if (!isMobile || !item) return;
      if (tooltip && tooltip.type === 'ITEM' && tooltip.content === item) {
          setTooltip(null);
      } else {
         setTooltip({
             type: 'ITEM',
             content: item,
             x: window.innerWidth / 2 - 128, 
             y: window.innerHeight / 2
         });
      }
  };

  const handleMouseEnterUlt = (e: React.MouseEvent) => {
    if (isMobile) return;
    const p = playerRef.current;
    const ults: UltimateType[] = [];
    if (p.equipment.weapon1?.ultimate) ults.push(p.equipment.weapon1.ultimate);
    if (p.equipment.weapon2?.ultimate) ults.push(p.equipment.weapon2.ultimate);
    // Armor talent does not contribute to list
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

  const renderIconForSlot = (item: Item | null, fallbackIcon: React.ReactNode) => {
      if (!item) return fallbackIcon;
      const size = isMobile ? 16 : 20;
      if (item.type === 'ARMOR') {
          switch(item.subtype) {
              case 'GLOVES': return <Hand size={size} />;
              case 'BOOTS': return <Footprints size={size} />;
              case 'SHIELD': 
              default: return <Shield size={size} />;
          }
      }
      switch(item.subtype) {
          case 'AXE': return <Axe size={size} />;
          case 'DAGGER': return <PocketKnife size={size} className="rotate-45" />;
          case 'PISTOL': return <Drill size={size} />;
          case 'SPEAR': return <Shovel size={size} className="-rotate-45" />;
          case 'SNIPER': return <Crosshair size={size} className="text-red-400" />;
          case 'BOW': return <BowArrow size={size} className="rotate-45" />; 
          case 'SWORD': return <Sword size={size} />;
          default: return <HelpCircle size={size} />;
      }
  };

  const renderWeaponSlot = (item: Item | null, defaultIcon: React.ReactNode) => {
      return (
         <div 
            className="flex flex-col items-center cursor-help"
            onMouseEnter={(e) => handleMouseEnterItem(item, e)}
            onMouseLeave={() => !isMobile && setTooltip(null)}
            onClick={() => handleClickItem(item)}
         >
             <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-800 border-2 rounded flex items-center justify-center relative transition-colors hover:bg-gray-700
                ${item ? 'border-'+RARITY_COLORS[item.rarity].replace('#','') : 'border-gray-600'}`}
                style={{ borderColor: item ? RARITY_COLORS[item.rarity] : undefined }}
             >
                <div className="text-white drop-shadow-md">
                    {renderIconForSlot(item, defaultIcon)}
                </div>
                {item && item.element && item.element !== ElementType.NONE && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-black flex items-center justify-center text-[8px]"
                         style={{ backgroundColor: ELEMENT_CONFIG[item.element].color }}
                    >
                       {ELEMENT_CONFIG[item.element].icon}
                    </div>
                 )}
                 {item && item.durability < 30 && (
                     <div className="absolute -top-1 -right-1">
                        <Wrench size={10} className="text-red-500 animate-pulse" fill="currentColor" />
                     </div>
                 )}
             </div>
         </div>
      );
  };

  const renderUltimateIcon = (type?: UltimateType) => {
      const size = isMobile ? 12 : 16;
      switch(type) {
          case UltimateType.SHIELD: return <Shield size={size} className="text-cyan-400" fill="currentColor" />;
          case UltimateType.AOE_BLAST: return <Bomb size={size} className="text-orange-400" fill="currentColor" />;
          case UltimateType.TIME_STOP: return <Clock size={size} className="text-purple-400" />;
          case UltimateType.INVINCIBILITY: return <Star size={size} className="text-yellow-400" fill="currentColor" />;
          case UltimateType.SPEED_BOOST: return <Zap size={size} className="text-blue-400" fill="currentColor" />;
          case UltimateType.OMNI_FORCE: return <Flame size={size} className="text-red-500" fill="currentColor" />;
          default: return <Star size={size} className="text-gray-400" />;
      }
  };

  const renderTooltip = () => {
      if (!tooltip) return null;
      return (
          <div 
            className="fixed z-[60] bg-gray-900/95 border border-gray-500 rounded-lg p-3 shadow-xl text-xs w-64 animate-in fade-in duration-200"
            style={{ top: tooltip.y, left: tooltip.x }}
            onClick={() => setTooltip(null)} 
          >
              {tooltip.type === 'ITEM' ? (
                  (() => {
                    const item = tooltip.content as Item;
                    // Durability Color
                    let durColor = 'bg-green-500';
                    if (item.durability < 25) durColor = 'bg-red-500';
                    else if (item.durability < 50) durColor = 'bg-yellow-500';

                    return (
                        <>
                            <div className="flex justify-between items-start border-b border-gray-700 pb-2 mb-2">
                                <div>
                                    <div className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
                                    <div className="text-gray-400 text-[10px] uppercase">{item.rarity} {item.subtype || 'SHIELD'} - LVL {item.level}</div>
                                </div>
                                {item.element && item.element !== ElementType.NONE && (
                                    <div className="text-lg" title={ELEMENT_CONFIG[item.element].label}>{ELEMENT_CONFIG[item.element].icon}</div>
                                )}
                            </div>
                            
                            <div className="mb-2">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                    <span>Durability</span>
                                    <span>{Math.floor(item.durability)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${durColor} transition-all`} style={{ width: `${item.durability}%` }} />
                                </div>
                            </div>

                            <div className="space-y-1 mb-2">
                                {item.stats.attack && <div className="flex justify-between"><span className="text-gray-400">Attack</span> <span className="text-green-400">{item.stats.attack}</span></div>}
                                {item.stats.defense && <div className="flex justify-between"><span className="text-gray-400">Defense</span> <span className="text-blue-400">{item.stats.defense}</span></div>}
                                {item.stats.attackSpeed && <div className="flex justify-between"><span className="text-gray-400">Speed</span> <span className="text-yellow-400">{item.stats.attackSpeed.toFixed(2)}</span></div>}
                                {item.stats.armorOnHit !== undefined && <div className="flex justify-between"><span className="text-gray-400">Armor/Hit</span> <span className="text-cyan-400">{item.stats.armorOnHit.toFixed(2)}</span></div>}
                                {item.stats.range && <div className="flex justify-between"><span className="text-gray-400">Range</span> <span className="text-purple-400">{item.stats.range}</span></div>}
                                {item.stats.knockback !== undefined && <div className="flex justify-between"><span className="text-gray-400">Knockback</span> <span className="text-orange-400">{item.stats.knockback}</span></div>}
                                {item.stats.critChance && <div className="flex justify-between"><span className="text-gray-400">Crit</span> <span className="text-pink-400">{(item.stats.critChance*100).toFixed(0)}%</span></div>}
                                {item.stats.shield && <div className="flex justify-between"><span className="text-gray-400">Init Shield</span> <span className="text-cyan-400">+{item.stats.shield}</span></div>}
                                {item.stats.moveSpeed && <div className="flex justify-between"><span className="text-gray-400">Move Spd</span> <span className="text-yellow-400">+{item.stats.moveSpeed.toFixed(1)}</span></div>}
                                {item.stats.ultChargeRate && <div className="flex justify-between"><span className="text-gray-400">Ult Charge</span> <span className="text-yellow-400">+{item.stats.ultChargeRate.toFixed(1)}/s</span></div>}
                                {item.stats.blockChance !== undefined && <div className="flex justify-between"><span className="text-gray-400">Block Chance</span> <span className="text-green-400">+{Math.round(item.stats.blockChance * 100)}%</span></div>}
                                {item.stats.dodgeChance !== undefined && item.stats.dodgeChance > 0 && <div className="flex justify-between"><span className="text-gray-400">Dodge Chance</span> <span className="text-green-400">+{Math.round(item.stats.dodgeChance * 100)}%</span></div>}
                            </div>
                            {item.ultimate && (
                                <div className="bg-gray-800 p-2 rounded text-[10px] border border-gray-700">
                                    <span className="text-yellow-400 font-bold block mb-1">ULTIMATE: {item.ultimateName}</span>
                                    <span className="text-gray-300">{ULTIMATE_DESCRIPTIONS[item.ultimate]}</span>
                                </div>
                            )}
                            {item.talent && (
                                <div className="bg-blue-900/30 p-2 rounded text-[10px] border border-blue-700/50 mt-1">
                                    <span className="text-blue-400 font-bold block mb-1">TALENT: {item.talent.type}</span>
                                    <span className="text-gray-300">{item.talent.description}</span>
                                </div>
                            )}
                        </>
                    )
                  })()
              ) : tooltip.type === 'STATS' ? (
                // Character Stats Tooltip Content
                <>
                     <h4 className="text-xs text-gray-400 font-bold uppercase mb-2 border-b border-gray-700 pb-1">Character Stats</h4>
                     <div className="space-y-1 text-xs">
                         <div className="flex justify-between"><span className="text-gray-400">Attack</span><span className="text-green-400 font-mono">{uiState.stats.attack}</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Defense</span><span className="text-blue-400 font-mono">{uiState.stats.defense.toFixed(1)}</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Move Spd</span><span className="text-yellow-400 font-mono">{uiState.stats.moveSpeed.toFixed(1)}</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Crit Rate</span><span className="text-pink-400 font-mono">{(uiState.stats.critChance * 100).toFixed(0)}%</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Range</span><span className="text-purple-400 font-mono">{uiState.stats.range}</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Knockback</span><span className="text-orange-400 font-mono">{uiState.stats.knockback}</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Armor/Hit</span><span className="text-cyan-400 font-mono">{uiState.stats.armorOnHit.toFixed(2)}</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Block Chance</span><span className="text-green-400 font-mono">{(uiState.stats.blockChance * 100).toFixed(0)}%</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Dodge Chance</span><span className="text-green-400 font-mono">{(uiState.stats.dodgeChance * 100).toFixed(0)}%</span></div>
                         <div className="flex justify-between"><span className="text-gray-400">Ult Charge</span><span className="text-yellow-400 font-mono">{uiState.stats.ultChargeRate.toFixed(1)}/s</span></div>
                     </div>
                </>
              ) : (
                  <>
                    <div className="font-bold text-sm text-yellow-400 border-b border-gray-700 pb-2 mb-2">Active Ultimate Skills</div>
                    <div className="space-y-3">
                        {(tooltip.content as UltimateType[]).map((ult, idx) => (
                            <div key={idx} className="flex gap-2">
                                <div className="mt-0.5">{renderUltimateIcon(ult)}</div>
                                <div>
                                    <div className="font-bold text-white">{ult.replace(/_/g, ' ')}</div>
                                    <div className="text-gray-400">{ULTIMATE_DESCRIPTIONS[ult]}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                  </>
              )}
          </div>
      )
  };

  const effectiveMax = Math.max(uiState.maxHp, uiState.hp + uiState.shield);
  const hpPercent = (uiState.hp / effectiveMax) * 100;
  const shieldPercent = (uiState.shield / effectiveMax) * 100;

  return (
    <div className="relative w-full h-full shadow-2xl rounded-xl overflow-hidden border-4 border-gray-700 bg-black touch-none mx-auto">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block w-full h-full object-contain bg-[#1a1a2e]" />
      <img id="player-asset-img" src={assets.playerSprite || ''} className="hidden" alt="" />
      <img id="enemy-asset-img" src={assets.enemySprite || ''} className="hidden" alt="" />

      {/* HUD Container */}
      <div className="absolute top-0 left-0 w-full p-2 md:p-4 pointer-events-none flex justify-between items-start">
         <div className="flex flex-col gap-2 pointer-events-auto">
            {/* HP Bar Row with Gold */}
            <div className="flex items-center gap-2">
                <div className={`${isMobile ? 'w-40 h-4' : 'w-64 h-6'} bg-gray-900 border-2 border-gray-600 rounded-full relative overflow-hidden flex`}>
                    <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${hpPercent}%` }} />
                    <div className="h-full bg-gray-400 transition-all duration-300" style={{ width: `${shieldPercent}%` }} />
                    <span className={`absolute inset-0 flex items-center justify-center ${isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-white drop-shadow-md z-10`}>
                        {Math.ceil(uiState.hp)} 
                        {uiState.shield > 0 && <span className="text-gray-300 ml-1"> (+{Math.ceil(uiState.shield)})</span>}
                        <span className="mx-1">/</span>
                        {Math.ceil(uiState.maxHp)}
                    </span>
                </div>

                {/* Gold Counter Moved Here */}
                <div className="flex items-center gap-1.5 bg-gray-900/80 border border-yellow-600/50 rounded-full px-3 py-0.5 w-fit h-full">
                    <Coins size={isMobile ? 12 : 14} className="text-yellow-400" />
                    <span className={`text-yellow-100 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>{Math.floor(uiState.gold)}</span>
                </div>
            </div>
            
            {/* Ultimate Bar */}
            {uiState.hasUltimate && (
              <div className="flex items-center gap-2 cursor-help" onMouseEnter={handleMouseEnterUlt} onMouseLeave={() => !isMobile && setTooltip(null)}>
                  <div className={`flex gap-1 bg-gray-900 border border-gray-600 rounded px-1 ${isMobile ? 'h-4' : 'h-6'} items-center`}>
                     {uiState.activeUltimates.map((u, i) => (
                        <div key={i} className={`${uiState.ult >= 100 ? 'opacity-100' : 'opacity-40 grayscale'} transition-all`}>
                            {renderUltimateIcon(u)}
                        </div>
                     ))}
                  </div>
                  <div className={`${isMobile ? 'w-32 h-3' : 'w-56 h-4'} bg-gray-900 border border-gray-600 rounded-full relative overflow-hidden animate-in slide-in-from-left duration-300`}>
                      <div className={`h-full transition-all duration-300 ${uiState.ult >= 100 ? 'bg-yellow-300 animate-pulse shadow-[0_0_10px_#facc15]' : 'bg-yellow-500'}`} style={{ width: `${Math.floor(uiState.ult)}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/70">ULTIMATE {Math.floor(uiState.ult)}%</span>
                  </div>
              </div>
            )}

            {/* Equipment Slots */}
            <div className="flex items-center gap-1 md:gap-2 mt-1">
                 <div 
                    className="relative cursor-help"
                    onMouseEnter={handleMouseEnterStats}
                    onMouseLeave={() => !isMobile && setTooltip(null)}
                 >
                     <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-800 border-2 border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 hover:border-white transition-colors`}>
                         <User size={isMobile ? 16 : 20} className="text-white" />
                     </div>
                 </div>

                 {renderWeaponSlot(uiState.weapon1, <Sword size={isMobile ? 16 : 20} className="text-gray-600" />)}
                 {renderWeaponSlot(uiState.weapon2, <Sword size={isMobile ? 16 : 20} className="text-gray-600" />)}
                 {renderWeaponSlot(uiState.armor1, <Shield size={isMobile ? 16 : 20} className="text-gray-600" />)}
                 {renderWeaponSlot(uiState.armor2, <Shield size={isMobile ? 16 : 20} className="text-gray-600" />)}
            </div>
         </div>

         {/* Stage Info */}
         <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 top-4">
             <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-pixel text-white drop-shadow-lg whitespace-nowrap`}>
                {stageInfoRef.current.isBossStage ? <span className="text-red-500 animate-pulse">BOSS FIGHT</span> : `STAGE ${currentStage}`}
             </h2>
             {!stageInfoRef.current.isBossStage && (
                 <div className="text-red-400 font-bold text-xs md:text-lg mt-1 animate-pulse">
                    ENEMIES: {uiState.enemiesLeft}
                 </div>
             )}
         </div>
         <div className="w-10"></div> 
      </div>
      
      {renderTooltip()}
      
      {/* Mobile Controls Overlay */}
      {isMobile && !isPaused && (
          <>
            <VirtualJoystick onMove={handleJoystickMove} forceLandscape={isPortrait} />
            
            <button 
                className={`absolute bottom-8 right-8 w-20 h-20 rounded-full border-4 border-white/20 shadow-lg flex items-center justify-center active:scale-95 transition-transform backdrop-blur-sm z-50
                    ${uiState.hasUltimate && uiState.ult >= 100 ? 'bg-yellow-500/80 animate-pulse border-yellow-200' : 'bg-gray-700/50'}`}
                onTouchStart={(e) => { e.preventDefault(); handleActivateUltimate(); }}
            >
                <Target size={32} className="text-white" />
            </button>
          </>
      )}

    </div>
  );
};

export default Game;
