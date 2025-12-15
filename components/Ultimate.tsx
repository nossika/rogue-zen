import React from 'react';
import { UltimateType } from '../types';
import { Shield, Bomb, Clock, Star, Zap, Flame, BrickWall } from 'lucide-react';

// --- UltimateIcon ---

interface UltimateIconProps {
  type: UltimateType;
  size?: number;
  className?: string;
}

export const UltimateIcon: React.FC<UltimateIconProps> = ({ type, size = 20, className = "" }) => {
  const props = { size, className };
  switch(type) {
      case UltimateType.SHIELD: return <Shield {...props} />;
      case UltimateType.AOE_BLAST: return <Bomb {...props} />;
      case UltimateType.TIME_STOP: return <Clock {...props} />;
      case UltimateType.INVINCIBILITY: return <Star {...props} />;
      case UltimateType.SPEED_BOOST: return <Zap {...props} />;
      case UltimateType.OMNI_FORCE: return <Flame {...props} />;
      case UltimateType.BLOCK: return <BrickWall {...props} />;
      default: return <Star {...props} />;
  }
};

// --- UltimateButton ---

interface UltimateButtonProps {
    hasUltimate: boolean;
    ult: number; // 0-100
    activeUltimates: UltimateType[];
    isMobile: boolean;
    onActivate: () => void;
}

export const UltimateButton: React.FC<UltimateButtonProps> = ({
    hasUltimate,
    ult,
    activeUltimates,
    isMobile,
    onActivate
}) => {
    if (!hasUltimate) return null;
    const isReady = ult >= 100;

    return (
      <button 
          className={`absolute z-50 flex items-center justify-center gap-2 rounded-xl border-2 backdrop-blur-sm transition-all active:scale-95 overflow-hidden
              ${isMobile 
                  ? 'bottom-8 right-8 h-16 min-w-[5rem] px-3' 
                  : 'bottom-6 left-1/2 -translate-x-1/2 h-10 min-w-[8rem] px-4'}
              ${isReady 
                  ? 'bg-yellow-500/40 border-yellow-200/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] animate-pulse cursor-pointer hover:bg-yellow-500/60' 
                  : 'bg-gray-900/20 border-gray-600/30 cursor-not-allowed opacity-60'}`}
           onClick={(e) => {
               if (isMobile) return; 
               onActivate();
               e.currentTarget.blur();
           }}
           onTouchStart={(e) => {
               if (!isMobile) return;
               e.preventDefault();
               onActivate();
           }}
      >
           {!isReady && (
               <div className="absolute bottom-0 left-0 right-0 bg-black/30 transition-all duration-300 pointer-events-none"
                    style={{ height: `${100 - ult}%` }} />
           )}
           
           <div className={`flex items-center gap-2 relative z-10 ${isReady ? 'text-yellow-100 drop-shadow-sm' : 'text-gray-400'}`}>
               {activeUltimates.map((u, i) => (
                  <div key={i}>
                      <UltimateIcon type={u} size={isMobile ? 24 : 18} />
                  </div>
               ))}
           </div>
           
           <div className={`font-pixel font-bold relative z-10 ${isReady ? 'text-yellow-100' : 'text-gray-400'} text-[10px]`}>
               {isReady ? (isMobile ? 'ULT' : 'SPACE') : `${Math.floor(ult)}%`}
           </div>
      </button>
    );
};
