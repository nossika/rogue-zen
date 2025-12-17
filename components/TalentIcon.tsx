import React from 'react';
import { TalentType } from '../types';
import { Crosshair, Swords, Hammer, FlaskConical, Clover, HelpCircle } from 'lucide-react';

interface TalentIconProps {
  type: TalentType | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const TalentIcon: React.FC<TalentIconProps> = ({ type, size = 20, className = "", style }) => {
  if (!type) return <HelpCircle size={size} className={className} style={style} />;
  
  const props = { size, className, style };
  
  switch(type) {
      case TalentType.SNIPER: return <Crosshair {...props} />;
      case TalentType.FIGHTER: return <Swords {...props} />;
      case TalentType.ARTISAN: return <Hammer {...props} />;
      case TalentType.SCIENTIST: return <FlaskConical {...props} />;
      case TalentType.LUCKY: return <Clover {...props} />;
      default: return <HelpCircle {...props} />;
  }
};