
import React, { useMemo, useState } from 'react';
import { Player, UpgradeReward, Talent, TalentType } from '../types';
import { REROLL_COST, RARITY_CONFIG } from '../constants';
import { RotateCcw, Coins, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { generateRandomTalent } from '@/systems/items/Talent';
import { TalentIcon } from './TalentIcon';

interface TalentModalProps {
  onSelect: (reward: UpgradeReward, remainingGold: number) => void;
  player: Player;
}

const TalentModal: React.FC<TalentModalProps> = ({ onSelect, player }) => {
  const [currentGold, setCurrentGold] = useState(player.gold);
  const [rerollCount, setRerollCount] = useState(0);
  const [generationKey, setGenerationKey] = useState(0); 

  const freeRerolls = (player.talent?.type === TalentType.LUCKY && player.talent.value2) 
    ? Math.round(player.talent.value2) 
    : 0;

  const currentRerollCost = rerollCount < freeRerolls 
    ? 0 
    : REROLL_COST.BASE + ((rerollCount - freeRerolls) * REROLL_COST.INCREMENT);
  
  const canAffordReroll = currentGold >= currentRerollCost || currentRerollCost === 0;

  // Generate 2 NEW talents every time key changes
  const newTalents = useMemo(() => {
    const options: Talent[] = [];
    for (let i = 0; i < 2; i++) {
        options.push(generateRandomTalent());
    }
    return options;
  }, [generationKey]); 

  const handleReroll = () => {
      if (canAffordReroll) {
          setCurrentGold(prev => prev - currentRerollCost);
          setRerollCount(prev => prev + 1);
          setGenerationKey(prev => prev + 1);
      }
  };

  const getRarityColor = (talent: Talent) => RARITY_CONFIG[talent.rarity]?.color || '#fff';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 md:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-6xl my-auto text-center">
        <div className="mb-6 md:mb-10 mt-4 md:mt-0 relative">
            <h2 className="text-3xl md:text-5xl font-pixel text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-sm mb-2">
              BOSS DEFEATED!
            </h2>
            <p className="text-gray-400 text-sm md:text-lg mb-4">Select a Talent</p>
            
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pb-4 max-w-5xl mx-auto">
          
          {/* Option 1: Keep Current */}
          {player.talent ? (
              <button
                onClick={() => onSelect(player.talent!, currentGold)}
                className="relative group flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 min-h-[220px]"
                style={{ borderColor: getRarityColor(player.talent), boxShadow: `0 0 15px ${getRarityColor(player.talent)}40` }}
              >
                <div className="absolute top-0 left-0 bg-gray-700 text-gray-200 text-[10px] font-bold px-3 py-1 rounded-br-lg z-20 shadow-md flex items-center gap-1">
                    <ShieldCheck size={12} /> EQUIPPED
                </div>

                <div className="h-28 md:h-36 w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800">
                   <TalentIcon type={player.talent.type} size={64} className="drop-shadow-lg transition-colors" style={{ color: getRarityColor(player.talent) }} />
                </div>

                <div className="p-4 flex-1 w-full text-left bg-gray-900/95 flex flex-col border-t border-gray-700">
                   <div className="flex items-center gap-2 mb-1">
                       <h3 className="text-xl font-bold" style={{ color: getRarityColor(player.talent) }}>{player.talent.type}</h3>
                   </div>
                   <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">{player.talent.rarity}</div>
                   <p className="text-gray-400 text-sm whitespace-pre-line leading-relaxed flex-1">
                       {player.talent.description}
                   </p>
                   <div className="mt-4 text-center bg-gray-800 py-2 rounded text-green-400 font-bold text-sm">
                       KEEP CURRENT
                   </div>
                </div>
              </button>
          ) : (
              <div className="flex flex-col h-full bg-gray-800/50 rounded-xl border-2 border-gray-700 border-dashed items-center justify-center p-6 text-gray-500 min-h-[220px]">
                  <p>No Talent Equipped</p>
              </div>
          )}

          {/* Options 2 & 3: New Talents */}
          {newTalents.map((talent, idx) => {
              const rColor = getRarityColor(talent);
              return (
              <button
                key={idx}
                onClick={() => onSelect(talent, currentGold)}
                className="relative group flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 min-h-[220px]"
                style={{ borderColor: rColor, boxShadow: `0 0 15px ${rColor}20` }}
              >
                <div className="absolute top-0 left-0 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg z-20 shadow-md flex items-center gap-1"
                     style={{ backgroundColor: rColor }}
                >
                    <Sparkles size={12} /> NEW REWARD
                </div>

                <div className="h-28 md:h-36 w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800">
                   <TalentIcon type={talent.type} size={64} className="drop-shadow-lg transition-colors" style={{ color: rColor }} />
                </div>

                <div className="p-4 flex-1 w-full text-left bg-gray-900/95 flex flex-col border-t border-blue-900/50">
                   <div className="flex items-center gap-2 mb-1">
                       <h3 className="text-xl font-bold" style={{ color: rColor }}>{talent.type}</h3>
                   </div>
                   <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">{talent.rarity}</div>
                   <p className="text-blue-100/80 text-sm whitespace-pre-line leading-relaxed flex-1">
                       {talent.description}
                   </p>
                   <div className="mt-4 text-center bg-blue-900/40 py-2 rounded text-blue-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                       SELECT <ArrowRight size={14} />
                   </div>
                </div>
              </button>
          )})}
        </div>
      </div>
    </div>
  );
};

export default TalentModal;
