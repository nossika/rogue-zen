
import React, { useMemo, useState } from 'react';
import { Item, Player, Rarity, Stats, UltimateType, WeaponType, ElementType, ArmorType, TalentType, Talent, UpgradeReward, StatUpgrade } from '../types';
import { RARITY_COLORS, WEAPON_BASE_CONFIG, DETAIL_COLORS, ELEMENT_CONFIG, REROLL_COST } from '../constants';
import { Shield, Sword, Axe, Crosshair, ArrowRight, Star, Heart, Zap, Move, RefreshCw, Check, X, PocketKnife, Shovel, Drill, BowArrow, Hand, Footprints, Coins, RotateCcw, Activity } from 'lucide-react';
import { generateRandomWeapon } from '../systems/WeaponSystem';
import { generateRandomArmor } from '../systems/ArmorSystem';

interface LevelUpModalProps {
  onSelect: (reward: UpgradeReward, remainingGold: number) => void;
  level: number;
  player: Player;
}

const STAT_LABELS: Record<string, string> = {
  maxHp: "Max HP",
  attack: "Attack",
  defense: "Defense",
  attackSpeed: "Speed",
  moveSpeed: "Move Spd",
  range: "Range",
  knockback: "Knockback",
  critChance: "Crit",
  armorOnHit: "Armor/Hit",
  shield: "Init Shield",
  ultChargeRate: "Ult Charge",
  dodgeChance: "Dodge Chance",
  blockChance: "Block Chance"
};

const LevelUpModal: React.FC<LevelUpModalProps> = ({ onSelect, level, player }) => {
  const [swapMode, setSwapMode] = useState<'NONE' | 'WEAPON' | 'ARMOR'>('NONE');
  const [pendingItem, setPendingItem] = useState<Item | null>(null);
  const [currentGold, setCurrentGold] = useState(player.gold);
  const [rerollCount, setRerollCount] = useState(0);
  const [generationKey, setGenerationKey] = useState(0); // To force regeneration

  // Calculate free rerolls from LUCKY talent
  const freeRerolls = useMemo(() => {
      let count = 0;
      if (player.equipment.armor1?.talent?.type === TalentType.LUCKY) count++;
      if (player.equipment.armor2?.talent?.type === TalentType.LUCKY) count++;
      return count;
  }, [player.equipment]);

  const currentRerollCost = rerollCount < freeRerolls 
    ? 0 
    : REROLL_COST.BASE + ((rerollCount - freeRerolls) * REROLL_COST.INCREMENT);
  
  const canAffordReroll = currentGold >= currentRerollCost || currentRerollCost === 0;

  const rewards = useMemo(() => {
    const options: UpgradeReward[] = [];

    // 1. Fixed Reward: Field Rations (Random 20% - 50%)
    const healPercent = 0.2 + Math.random() * 0.3; // 0.20 to 0.50
    options.push({
        title: "Field Rations",
        healPercent: healPercent
    });

    // 2. Generate 2 Random Rewards
    for (let i = 0; i < 2; i++) {
      const isItem = Math.random() > 0.4; // 60% chance for items
      
      if (isItem) {
        const type = Math.random() > 0.4 ? 'WEAPON' : 'ARMOR'; // 60% weapon
        
        if (type === 'WEAPON') {
             options.push(generateRandomWeapon(level));
        } else {
             options.push(generateRandomArmor(level));
        }
      } else {
        // Stat upgrade
        const statType = Math.floor(Math.random() * 8); 
        let stat: Partial<Stats> = {};
        let label = '';
        switch(statType) {
          case 0: stat = { attack: 3 }; label = "Strength Training"; break;
          case 1: stat = { defense: 2 }; label = "Harden Skin"; break;
          case 2: stat = { maxHp: 30 }; label = "Vitality Boost"; break;
          case 3: stat = { attackSpeed: 0.1 }; label = "Reflexes Up"; break;
          case 4: stat = { moveSpeed: 0.3 }; label = "Lightweight"; break;
          case 5: stat = { knockback: 3 }; label = "Heavy Impact"; break;
          case 6: stat = { range: 20 }; label = "Extended Reach"; break;
          case 7: stat = { critChance: 0.03 }; label = "Eagle Eye"; break;
        }
        
        options.push({
            title: label,
            stats: stat
        });
      }
    }
    return options;
  }, [level, generationKey]); // Regenerate when generationKey changes

  const handleReroll = () => {
      if (canAffordReroll) {
          setCurrentGold(prev => prev - currentRerollCost);
          setRerollCount(prev => prev + 1);
          setGenerationKey(prev => prev + 1);
      }
  };

  const handleInitialSelect = (reward: UpgradeReward) => {
      if ('rarity' in reward) {
          const item = reward as Item;
          if (item.type === 'WEAPON') {
              if (player.equipment.weapon1 && player.equipment.weapon2) {
                  setPendingItem(item);
                  setSwapMode('WEAPON');
                  return;
              }
          } else {
              // Armor Logic
              if (player.equipment.armor1 && player.equipment.armor2) {
                  setPendingItem(item);
                  setSwapMode('ARMOR');
                  return;
              }
          }
      }
      onSelect(reward, currentGold);
  };

  const handleSwapConfirm = (slot: 'weapon1' | 'weapon2' | 'armor1' | 'armor2') => {
      if (!pendingItem) return;
      const finalizedItem = { ...pendingItem, _targetSlot: slot };
      onSelect(finalizedItem, currentGold);
      setSwapMode('NONE');
      setPendingItem(null);
  };

  const renderIcon = (item: Item) => {
      const size = 48;
      // Handle Armor Subtypes
      if (item.type === 'ARMOR') {
          switch(item.subtype) {
              case 'GLOVES': return <Hand size={size} className="text-white drop-shadow-md" />;
              case 'BOOTS': return <Footprints size={size} className="text-white drop-shadow-md" />;
              case 'SHIELD': 
              default: return <Shield size={size} className="text-white drop-shadow-md" />;
          }
      }
      switch(item.subtype) {
          case 'AXE': return <Axe size={size} className="text-white drop-shadow-md" />;
          case 'DAGGER': return <PocketKnife size={size} className="text-white drop-shadow-md rotate-45" />;
          case 'PISTOL': return <Drill size={size} className="text-white drop-shadow-md" />;
          case 'SPEAR': return <Shovel size={size} className="text-white drop-shadow-md -rotate-45" />;
          case 'SNIPER': return <Crosshair size={size} className="text-red-400 drop-shadow-md" />;
          case 'BOW': return <BowArrow size={size} className="text-white drop-shadow-md rotate-45" />; 
          default: return <Sword size={size} className="text-white drop-shadow-md" />;
      }
  };

  const renderStatComparison = (newItem: Item, oldItem: Item | null) => {
     // Union of all keys from both items to show what is gained AND lost
     const allKeys = new Set([
         ...Object.keys(newItem.stats), 
         ...(oldItem ? Object.keys(oldItem.stats) : [])
     ]);
     
     const keysArray = Array.from(allKeys).filter(k => STAT_LABELS[k] !== undefined);

     return (
        <div className="space-y-1 text-xs">
           {keysArray.map(key => {
               const newVal = (newItem.stats as any)[key];
               const oldVal = oldItem ? (oldItem.stats as any)[key] : undefined;
               
               // Skip if both are undefined (shouldn't happen due to set construction)
               if (newVal === undefined && oldVal === undefined) return null;

               const label = STAT_LABELS[key] || key;
               const isPercent = key === 'critChance' || key === 'blockChance' || key === 'dodgeChance';
               
               const formatVal = (v: number | undefined) => {
                   if (v === undefined) return '0';
                   if (isPercent) return `${(v * 100).toFixed(0)}%`;
                   // Integer vs Float logic
                   if (key === 'attack' || key === 'defense' || key === 'range' || key === 'knockback' || key === 'shield') return Math.round(v);
                   return v.toFixed(2);
               };

               const oldDisplay = formatVal(oldVal);
               const newDisplay = formatVal(newVal);
               
               // Determine color based on value change
               let colorClass = 'text-white';
               if (newVal === undefined || (oldVal !== undefined && newVal < oldVal)) colorClass = 'text-red-400'; // Degrade or Loss
               else if (oldVal === undefined || newVal > oldVal) colorClass = 'text-green-400'; // Upgrade or Gain

               // Specific color overrides matching standard UI
               if (key === 'attack') colorClass = newVal > (oldVal||0) ? 'text-green-400' : 'text-red-400';
               if (key === 'defense') colorClass = newVal > (oldVal||0) ? 'text-blue-400' : 'text-red-400';
               if (key === 'shield') colorClass = newVal > (oldVal||0) ? 'text-cyan-400' : 'text-red-400';
               
               // If completely removed (new is undefined), show 0
               return (
                   <div key={key} className="flex justify-between">
                       <span className="text-gray-400">{label}</span>
                       <div className="flex items-center gap-2">
                           <span className="text-gray-500">{oldDisplay}</span>
                           <ArrowRight size={12} className="text-gray-600" />
                           <span className={`font-bold ${colorClass}`}>{newDisplay}</span>
                       </div>
                   </div>
               );
           })}

           {newItem.talent && (
               <div className="pt-2 mt-2 border-t border-gray-600">
                   <span className="text-[10px] uppercase font-bold text-blue-300 block mb-1">New Talent: {newItem.talent.type}</span>
                   <p className="text-[10px] text-gray-300 leading-tight">{newItem.talent.description}</p>
               </div>
           )}

           {/* Show Old Item's Special Properties so user knows what is lost */}
           {(oldItem?.talent || oldItem?.ultimate) && (
               <div className="pt-2 mt-2 border-t border-red-900/50">
                    {oldItem.ultimate && (
                        <div className="text-[10px] text-red-300">
                            <span className="font-bold">Losing Ult:</span> {oldItem.ultimateName}
                        </div>
                    )}
                    {oldItem.talent && (
                        <div className="text-[10px] text-red-300">
                            <span className="font-bold">Losing Talent:</span> {oldItem.talent.description}
                        </div>
                    )}
               </div>
           )}
        </div>
     )
  };

  if (swapMode !== 'NONE' && pendingItem) {
      return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-6 animate-in fade-in duration-300">
             <div className="w-full max-w-4xl text-center">
                 <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Replace which equipment?</h2>
                 <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 mb-6 md:mb-10">
                     {(swapMode === 'WEAPON' || swapMode === 'ARMOR') && (
                         <div className="w-full md:w-80 bg-gray-900 border border-gray-600 rounded-xl overflow-hidden flex flex-col shadow-lg">
                             <div className="bg-gray-800 p-3 text-gray-300 font-bold border-b border-gray-600">
                                 REPLACE: {swapMode === 'ARMOR' ? 'Armor Slot 1' : 'Weapon Slot 1'}
                             </div>
                             <div className="p-4 md:p-6 flex-1 flex flex-col items-center">
                                 {swapMode === 'WEAPON' ? (
                                    <>
                                        {renderIcon(player.equipment.weapon1!)}
                                        <div className="text-lg md:text-xl font-bold mt-2 mb-1 text-white">{player.equipment.weapon1!.name}</div>
                                        {player.equipment.weapon1!.element && player.equipment.weapon1!.element !== ElementType.NONE && (
                                            <div className="flex items-center gap-1 text-sm mb-2" style={{ color: ELEMENT_CONFIG[player.equipment.weapon1!.element].color }}>
                                                {ELEMENT_CONFIG[player.equipment.weapon1!.element].icon} {ELEMENT_CONFIG[player.equipment.weapon1!.element].label}
                                            </div>
                                        )}
                                        <div className="w-full mt-2 md:mt-4 bg-black/40 p-3 rounded">
                                            {renderStatComparison(pendingItem, player.equipment.weapon1)}
                                        </div>
                                    </>
                                 ) : (
                                    <>
                                        {renderIcon(player.equipment.armor1!)}
                                        <div className="text-lg md:text-xl font-bold mt-2 mb-1 text-white">{player.equipment.armor1!.name}</div>
                                        <div className="w-full mt-2 md:mt-4 bg-black/40 p-3 rounded">
                                            {renderStatComparison(pendingItem, player.equipment.armor1)}
                                        </div>
                                    </>
                                 )}
                             </div>
                             <button onClick={() => handleSwapConfirm(swapMode === 'ARMOR' ? 'armor1' : 'weapon1')}
                                className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 md:py-4 transition-colors flex items-center justify-center gap-2">
                                <RefreshCw size={20} /> Confirm Swap
                             </button>
                         </div>
                     )}
                     
                     {/* Second Slot */}
                     <div className="w-full md:w-80 bg-gray-900 border border-gray-600 rounded-xl overflow-hidden flex flex-col shadow-lg">
                         <div className="bg-gray-800 p-3 text-gray-300 font-bold border-b border-gray-600">
                             REPLACE: {swapMode === 'ARMOR' ? 'Armor Slot 2' : 'Weapon Slot 2'}
                         </div>
                         <div className="p-4 md:p-6 flex-1 flex flex-col items-center">
                             {swapMode === 'WEAPON' ? (
                                <>
                                    {renderIcon(player.equipment.weapon2!)}
                                    <div className="text-lg md:text-xl font-bold mt-2 mb-1 text-white">{player.equipment.weapon2!.name}</div>
                                    {player.equipment.weapon2!.element && player.equipment.weapon2!.element !== ElementType.NONE && (
                                        <div className="flex items-center gap-1 text-sm mb-2" style={{ color: ELEMENT_CONFIG[player.equipment.weapon2!.element].color }}>
                                            {ELEMENT_CONFIG[player.equipment.weapon2!.element].icon} {ELEMENT_CONFIG[player.equipment.weapon2!.element].label}
                                        </div>
                                    )}
                                    <div className="w-full mt-2 md:mt-4 bg-black/40 p-3 rounded">
                                        {renderStatComparison(pendingItem, player.equipment.weapon2)}
                                    </div>
                                </>
                             ) : (
                                <>
                                    {renderIcon(player.equipment.armor2!)}
                                    <div className="text-lg md:text-xl font-bold mt-2 mb-1 text-white">{player.equipment.armor2!.name}</div>
                                    <div className="w-full mt-2 md:mt-4 bg-black/40 p-3 rounded">
                                        {renderStatComparison(pendingItem, player.equipment.armor2)}
                                    </div>
                                </>
                             )}
                         </div>
                         <button onClick={() => handleSwapConfirm(swapMode === 'ARMOR' ? 'armor2' : 'weapon2')}
                            className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 md:py-4 transition-colors flex items-center justify-center gap-2">
                            <RefreshCw size={20} /> Confirm Swap
                         </button>
                     </div>
                 </div>
                 <button onClick={() => { setSwapMode('NONE'); setPendingItem(null); }}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-bold flex items-center gap-2 mx-auto">
                    <X size={20} /> Cancel
                 </button>
             </div>
        </div>
      )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 md:p-6 animate-in fade-in duration-300 overflow-y-auto">
      <div className="w-full max-w-5xl my-auto">
        <div className="text-center mb-6 md:mb-10 mt-4 md:mt-0 relative">
            <h2 className="text-3xl md:text-5xl font-pixel text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-sm mb-2">
              STAGE CLEARED!
            </h2>
            <p className="text-gray-400 text-sm md:text-lg mb-4">Choose your reward</p>
            
            <div className="inline-flex items-center gap-4 bg-gray-900/80 px-4 py-2 rounded-full border border-gray-700">
                <div className="flex items-center gap-2 text-yellow-400">
                   <Coins size={20} />
                   <span className="font-bold">{Math.floor(currentGold)}</span>
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <button 
                  onClick={handleReroll}
                  disabled={!canAffordReroll}
                  className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded transition-colors
                    ${canAffordReroll 
                       ? 'bg-purple-700 hover:bg-purple-600 text-white' 
                       : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                >
                    <RotateCcw size={14} />
                    <span>
                        Reroll: {currentRerollCost === 0 ? <span className="text-green-400">FREE</span> : `${currentRerollCost} G`}
                    </span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pb-4">
          {rewards.map((reward, idx) => {
            const isItem = 'rarity' in reward;
            const item = isItem ? (reward as Item) : null;
            const upgrade = !isItem ? (reward as StatUpgrade) : null;

            const title = isItem ? item!.name : upgrade!.title;
            const isHeal = !isItem && (upgrade!.healPercent || 0) > 0;
            
            // Determine Reward Type Badge
            let typeBadge = "ABILITY";
            let typeColor = "bg-blue-600";
            if (isHeal) {
                typeBadge = "HEAL";
                typeColor = "bg-green-600";
            } else if (isItem) {
                if (item!.type === 'WEAPON') {
                    typeBadge = "WEAPON";
                    typeColor = "bg-red-600";
                } else {
                    typeBadge = "ARMOR";
                    typeColor = "bg-indigo-600";
                }
            }

            return (
              <button
                key={idx}
                onClick={() => handleInitialSelect(reward)}
                className={`relative group flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-2xl min-h-[160px]
                  ${isItem ? 'border-' + RARITY_COLORS[item!.rarity].replace('#', '') : 
                    isHeal ? 'border-green-500 hover:border-green-400' : 'border-gray-600 hover:border-white'}`}
                style={{ 
                    borderColor: isItem ? RARITY_COLORS[item!.rarity] : (isHeal ? '#22c55e' : undefined),
                    boxShadow: isItem ? `0 0 20px ${RARITY_COLORS[item!.rarity]}20` : undefined
                }}
              >
                {/* Reward Type Badge */}
                <div className={`absolute top-0 left-0 ${typeColor} text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-20 shadow-md`}>
                    {typeBadge}
                </div>

                <div className={`h-24 md:h-32 w-full flex items-center justify-center relative overflow-hidden
                    ${isItem ? '' : isHeal ? 'bg-green-900/50' : 'bg-gradient-to-br from-gray-700 to-gray-800'}`}
                    style={{ background: isItem ? `radial-gradient(circle at center, ${RARITY_COLORS[item!.rarity]}55, #1f2937)` : undefined }}
                >
                   {isItem ? renderIcon(item!) : isHeal ? (
                       <Heart size={48} className="text-red-500 drop-shadow-lg animate-pulse" fill="currentColor" />
                   ) : (
                       <Zap size={48} className="text-yellow-400 drop-shadow-lg" />
                   )}
                   
                   {isItem && item!.element && item!.element !== ElementType.NONE && (
                      <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center text-lg"
                           style={{ backgroundColor: ELEMENT_CONFIG[item!.element].color }}
                      >
                          {ELEMENT_CONFIG[item!.element].icon}
                      </div>
                   )}
                   
                   {isItem && item!.ultimate && (
                       <div className="absolute bottom-2 right-2 bg-black/60 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/50 flex items-center gap-1">
                           <Star size={10} fill="currentColor" /> Ultimate
                       </div>
                   )}

                   {isItem && item!.talent && (
                       <div className="absolute bottom-2 right-2 bg-blue-900/80 text-blue-200 text-xs px-2 py-1 rounded-full border border-blue-500/50 flex items-center gap-1">
                           <Activity size={10} fill="currentColor" /> Talent
                       </div>
                   )}
                </div>

                <div className="p-4 md:p-5 flex-1 w-full text-left bg-gray-900/95 flex flex-col">
                   <h3 className={`text-lg md:text-xl font-bold mb-1 ${isItem ? 'text-white' : isHeal ? 'text-green-400' : 'text-blue-200'}`}>
                       {title}
                   </h3>
                   
                   {isItem && (
                       <div className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: RARITY_COLORS[item!.rarity] }}>
                           {item!.rarity} {item!.subtype || 'SHIELD'}
                       </div>
                   )}

                   <div className="flex-1">
                      {isItem ? (
                        <div className="space-y-1 text-sm">
                            {item!.stats.attack && <div className="text-gray-300">Attack: {item!.stats.attack}</div>}
                            {item!.stats.attackSpeed && <div className="text-gray-300">Speed: {item!.stats.attackSpeed.toFixed(2)}</div>}
                            {item!.stats.defense && <div className="text-gray-300">Defense: {item!.stats.defense}</div>}
                            {item!.stats.shield && <div className="text-cyan-300">Shield: +{item!.stats.shield}</div>}
                            {item!.stats.range && <div className="text-purple-300">Range: {item!.stats.range}</div>}
                            {item!.stats.knockback !== undefined && <div className="text-orange-300">Knockback: {item!.stats.knockback}</div>}
                            {item!.stats.critChance && <div className="text-pink-300">Crit: {(item!.stats.critChance*100).toFixed(0)}%</div>}
                            {item!.stats.armorOnHit !== undefined && item!.stats.armorOnHit > 0 && <div className="text-cyan-300">Armor/Hit: {item!.stats.armorOnHit.toFixed(2)}</div>}
                            {item!.stats.moveSpeed && <div className="text-yellow-300">Move: +{item!.stats.moveSpeed}</div>}
                            {item!.stats.ultChargeRate && <div className="text-yellow-300">Ult Chg: +{item!.stats.ultChargeRate}/s</div>}
                        </div>
                      ) : (
                          !isHeal && upgrade && upgrade.stats && Object.entries(upgrade.stats).map(([key, val]) => {
                             return <div key={key} className="text-gray-300 text-sm">+{val} {STAT_LABELS[key] || key}</div>
                          })
                      )}
                      {isHeal && <div className="text-green-300 text-sm font-bold">Heal +{Math.round(upgrade!.healPercent! * 100)}% Max HP</div>}
                   </div>

                   {isItem && item!.ultimate && (
                       <div className="mt-4 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200/80 italic">
                           <span className="font-bold block not-italic text-yellow-500 mb-1">
                               Ult: {item!.ultimateName}
                           </span>
                       </div>
                   )}

                   {isItem && item!.talent && (
                       <div className="mt-4 p-2 bg-blue-900/20 border border-blue-700/50 rounded text-xs text-blue-200/90">
                           <span className="font-bold block text-blue-400 mb-1">
                               {item!.talent.type}
                           </span>
                           {item!.talent.description}
                       </div>
                   )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;
