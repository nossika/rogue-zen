
import React from 'react';
import { Item, UltimateType, Stats, Player, Talent } from '../types';
import { Coins, User, Sword, Shield, Wrench, Sparkles } from 'lucide-react';
import { ItemIcon } from './ItemIcon';
import { UltimateIcon } from './Ultimate';
import { TalentIcon } from './TalentIcon';
import { RARITY_CONFIG, ELEMENT_CONFIG } from '../constants';

interface GameHUDProps {
    uiState: {
        hp: number;
        maxHp: number;
        shield: number;
        ult: number;
        gold: number;
        weapon1: Item | null;
        weapon2: Item | null;
        armor1: Item | null;
        armor2: Item | null;
        hasUltimate: boolean;
        activeUltimates: UltimateType[];
        stats: Stats;
        enemiesLeft: number;
        talent: Talent | null; // Added Talent State
    };
    currentStage: number;
    isBossStage: boolean;
    isMobile: boolean;
    onMouseEnterItem: (item: Item | null, e: React.MouseEvent) => void;
    onMouseLeaveItem: () => void;
    onClickItem: (item: Item | null, e: React.MouseEvent) => void;
    onMouseEnterStats: (e: React.MouseEvent) => void;
    onClickStats: (e: React.MouseEvent) => void;
    onMouseEnterUlt: (e: React.MouseEvent) => void;
    onClickUlt: (e: React.MouseEvent) => void;
    onMouseEnterTalent: (talent: Talent | null, e: React.MouseEvent) => void;
    onClickTalent: (talent: Talent | null, e: React.MouseEvent) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
    uiState,
    currentStage,
    isBossStage,
    isMobile,
    onMouseEnterItem,
    onMouseLeaveItem,
    onClickItem,
    onMouseEnterStats,
    onClickStats,
    onMouseEnterUlt,
    onClickUlt,
    onMouseEnterTalent,
    onClickTalent
}) => {
    const effectiveMax = Math.max(uiState.maxHp, uiState.hp + uiState.shield);
    const hpPercent = (uiState.hp / effectiveMax) * 100;
    const shieldPercent = (uiState.shield / effectiveMax) * 100;

    const renderWeaponSlot = (item: Item | null, defaultIcon: React.ReactNode) => {
        return (
           <div 
              className="flex flex-col items-center cursor-help"
              onMouseEnter={(e) => onMouseEnterItem(item, e)}
              onMouseLeave={onMouseLeaveItem}
              onClick={(e) => onClickItem(item, e)}
           >
               <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-800 border-2 rounded flex items-center justify-center relative transition-colors hover:bg-gray-700
                  ${item ? 'border-'+RARITY_CONFIG[item.rarity].color.replace('#','') : 'border-gray-600'}`}
                  style={{ borderColor: item ? RARITY_CONFIG[item.rarity].color : undefined }}
               >
                  <div className="text-white drop-shadow-md z-10">
                      <ItemIcon item={item} size={isMobile ? 16 : 20} fallback={defaultIcon} />
                  </div>
  
                  {item && (
                       <div className="absolute bottom-[2px] left-[2px] right-[2px] h-[3px] bg-gray-900 rounded-full overflow-hidden border border-gray-600/50">
                           <div 
                              className="h-full transition-all duration-300"
                              style={{ 
                                  width: `${Math.max(0, item.durability)}%`,
                                  backgroundColor: item.durability < 25 ? '#ef4444' : item.durability < 50 ? '#eab308' : '#22c55e'
                              }} 
                           />
                       </div>
                   )}
  
                  {item && item.element && item.element !== 'NONE' && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-black flex items-center justify-center text-[8px] z-10"
                           style={{ backgroundColor: ELEMENT_CONFIG[item.element].color }}
                      >
                         {ELEMENT_CONFIG[item.element].icon}
                      </div>
                   )}
                   {item && item.durability < 30 && (
                       <div className="absolute -top-1 -right-1 z-10">
                          <Wrench size={10} className="text-red-500 animate-pulse" fill="currentColor" />
                       </div>
                   )}
               </div>
           </div>
        );
    };

    return (
        <div className="absolute top-0 left-0 w-full p-2 md:p-4 pointer-events-none flex justify-between items-start">
            <div className="flex flex-col gap-2 pointer-events-auto">
               {/* HP Bar & Gold */}
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
   
                   <div className="flex items-center gap-1.5 bg-gray-900/80 border border-yellow-600/50 rounded-full px-3 py-0.5 w-fit h-full">
                       <Coins size={isMobile ? 12 : 14} className="text-yellow-400" />
                       <span className={`text-yellow-100 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>{Math.floor(uiState.gold)}</span>
                   </div>
               </div>
               
               {/* Small Ult Bar */}
               {uiState.hasUltimate && (
                 <div className="flex items-center gap-2 cursor-help" onMouseEnter={onMouseEnterUlt} onMouseLeave={onMouseLeaveItem} onClick={onClickUlt}>
                     <div className={`flex gap-1 bg-gray-900 border border-gray-600 rounded px-1 ${isMobile ? 'h-4' : 'h-6'} items-center`}>
                        {uiState.activeUltimates.map((u, i) => (
                           <div key={i} className={`${uiState.ult >= 100 ? 'opacity-100' : 'opacity-40 grayscale'} transition-all`}>
                               <UltimateIcon type={u} size={14} />
                           </div>
                        ))}
                     </div>
                     <div className={`${isMobile ? 'w-32 h-3' : 'w-56 h-4'} bg-gray-900 border border-gray-600 rounded-full relative overflow-hidden animate-in slide-in-from-left duration-300`}>
                         <div className={`h-full transition-all duration-300 ${uiState.ult >= 100 ? 'bg-yellow-300 animate-pulse shadow-[0_0_10px_#facc15]' : 'bg-yellow-500'}`} style={{ width: `${Math.floor(uiState.ult)}%` }} />
                         <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/70">ULTIMATE {Math.floor(uiState.ult)}%</span>
                     </div>
                 </div>
               )}
   
               {/* Slots */}
               <div className="flex items-center gap-1 md:gap-2 mt-1">
                    <div 
                       className="relative cursor-help"
                       onMouseEnter={onMouseEnterStats}
                       onMouseLeave={onMouseLeaveItem}
                       onClick={onClickStats}
                    >
                        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-800 border-2 border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 hover:border-white transition-colors`}>
                            <User size={isMobile ? 16 : 20} className="text-white" />
                        </div>
                    </div>
                    
                    {/* Talent Slot */}
                    <div 
                       className="relative cursor-help"
                       onMouseEnter={(e) => onMouseEnterTalent(uiState.talent, e)}
                       onMouseLeave={onMouseLeaveItem}
                       onClick={(e) => onClickTalent(uiState.talent, e)}
                    >
                        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-800 border-2 flex items-center justify-center relative transition-colors hover:bg-gray-700
                           ${uiState.talent ? 'border-blue-500' : 'border-gray-600 rounded-full'}`}
                           style={{ 
                               borderRadius: uiState.talent ? '25%' : '50%',
                               borderColor: uiState.talent ? RARITY_CONFIG[uiState.talent.rarity].color : undefined
                           }}
                        >
                            <TalentIcon type={uiState.talent?.type || null} size={isMobile ? 16 : 20} className={uiState.talent ? 'text-white' : 'text-gray-600'} />
                        </div>
                    </div>
   
                    <div className="w-px h-8 bg-gray-700 mx-1"></div>

                    {renderWeaponSlot(uiState.weapon1, <Sword size={isMobile ? 16 : 20} className="text-gray-600" />)}
                    {renderWeaponSlot(uiState.weapon2, <Sword size={isMobile ? 16 : 20} className="text-gray-600" />)}
                    {renderWeaponSlot(uiState.armor1, <Shield size={isMobile ? 16 : 20} className="text-gray-600" />)}
                    {renderWeaponSlot(uiState.armor2, <Shield size={isMobile ? 16 : 20} className="text-gray-600" />)}
               </div>
            </div>
   
            {/* Stage Info Centered */}
            <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 top-4">
                <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-pixel text-white drop-shadow-lg whitespace-nowrap`}>
                   {isBossStage ? <span className="text-red-500 animate-pulse">BOSS FIGHT</span> : `STAGE ${currentStage}`}
                </h2>
                {!isBossStage && (
                    <div className="text-red-400 font-bold text-xs md:text-lg mt-1 animate-pulse">
                       ENEMIES: {uiState.enemiesLeft}
                    </div>
                )}
            </div>
            <div className="w-10"></div> 
         </div>
    );
};
