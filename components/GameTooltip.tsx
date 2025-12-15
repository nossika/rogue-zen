
import React from 'react';
import { Item, UltimateType, Stats } from '../types';
import { RARITY_CONFIG, ELEMENT_CONFIG, ULTIMATE_CONFIG } from '../constants';
import { UltimateIcon } from './Ultimate';

interface TooltipData {
  type: 'ITEM' | 'ULTIMATE' | 'STATS';
  content: Item | UltimateType[] | Stats;
  x: number;
  y: number;
}

interface GameTooltipProps {
    tooltip: TooltipData | null;
    onClose: () => void;
}

export const GameTooltip: React.FC<GameTooltipProps> = ({ tooltip, onClose }) => {
    if (!tooltip) return null;

    return (
        <div 
          className="fixed z-[60] bg-gray-900/95 border border-gray-500 rounded-lg p-3 shadow-xl text-xs w-64 animate-in fade-in duration-200"
          style={{ top: tooltip.y, left: tooltip.x }}
          onClick={(e) => {
              e.stopPropagation();
              onClose();
          }} 
        >
            {tooltip.type === 'ITEM' ? (
                (() => {
                  const item = tooltip.content as Item;
                  let durColor = 'bg-green-500';
                  if (item.durability < 25) durColor = 'bg-red-500';
                  else if (item.durability < 50) durColor = 'bg-yellow-500';

                  return (
                      <>
                          <div className="flex justify-between items-start border-b border-gray-700 pb-2 mb-2">
                              <div>
                                  <div className="font-bold text-sm" style={{ color: RARITY_CONFIG[item.rarity].color }}>{item.name}</div>
                                  <div className="text-gray-400 text-[10px] uppercase">{item.rarity} {item.subtype || 'SHIELD'} - LVL {item.level}</div>
                              </div>
                              {item.element && item.element !== 'NONE' && (
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
                                  <span className="text-gray-300">{ULTIMATE_CONFIG[item.ultimate].description}</span>
                              </div>
                          )}
                          {item.enchantment && (
                              <div className="bg-purple-900/30 p-2 rounded text-[10px] border border-purple-700/50 mt-1">
                                  <span className="text-purple-400 font-bold block mb-1">ENCHANTMENT: {item.enchantment.label}</span>
                                  <span className="text-gray-300">
                                      {Math.round(item.enchantment.chance * 100)}% Chance to {item.enchantment.type} for {(item.enchantment.duration/60).toFixed(1)}s
                                  </span>
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
              <>
                   <h4 className="text-xs text-gray-400 font-bold uppercase mb-2 border-b border-gray-700 pb-1">Character Stats</h4>
                   <div className="space-y-1 text-xs">
                       {(() => {
                           const stats = tooltip.content as Stats;
                           return (
                               <>
                                 <div className="flex justify-between"><span className="text-gray-400">Attack</span><span className="text-green-400 font-mono">{stats.attack}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Defense</span><span className="text-blue-400 font-mono">{stats.defense.toFixed(1)}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Move Spd</span><span className="text-yellow-400 font-mono">{stats.moveSpeed.toFixed(1)}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Crit Rate</span><span className="text-pink-400 font-mono">{(stats.critChance * 100).toFixed(0)}%</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Range</span><span className="text-purple-400 font-mono">{stats.range}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Knockback</span><span className="text-orange-400 font-mono">{stats.knockback}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Armor/Hit</span><span className="text-cyan-400 font-mono">{stats.armorOnHit.toFixed(2)}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Block Chance</span><span className="text-green-400 font-mono">{(stats.blockChance * 100).toFixed(0)}%</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Dodge Chance</span><span className="text-green-400 font-mono">{(stats.dodgeChance * 100).toFixed(0)}%</span></div>
                                 <div className="flex justify-between"><span className="text-gray-400">Ult Charge</span><span className="text-yellow-400 font-mono">{stats.ultChargeRate.toFixed(1)}/s</span></div>
                               </>
                           )
                       })()}
                   </div>
              </>
            ) : (
                <>
                  <div className="font-bold text-sm text-yellow-400 border-b border-gray-700 pb-2 mb-2">Active Ultimate Skills</div>
                  <div className="space-y-3">
                      {(tooltip.content as UltimateType[]).map((ult, idx) => (
                          <div key={idx} className="flex gap-2">
                              <div className="mt-0.5"><UltimateIcon type={ult} /></div>
                              <div>
                                  <div className="font-bold text-white">{ult.replace(/_/g, ' ')}</div>
                                  <div className="text-gray-400">{ULTIMATE_CONFIG[ult].description}</div>
                              </div>
                          </div>
                      ))}
                  </div>
                </>
            )}
        </div>
    )
};
