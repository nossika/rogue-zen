import React from 'react';
import { Item } from '../types';
import { Shield, Sword, Axe, PocketKnife, Drill, Shovel, Crosshair, BowArrow, Bomb, HelpCircle, Hand, Footprints } from 'lucide-react';

interface ItemIconProps {
  item: Item | null;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ item, size = 20, className = "", fallback }) => {
  if (!item) return <>{fallback || <HelpCircle size={size} className={className} />}</>;

  // Base rotation classes for specific weapon types to ensure consistency
  let rotationClass = "";
  if (item.subtype === 'DAGGER') rotationClass = "rotate-45";
  if (item.subtype === 'SPEAR') rotationClass = "-rotate-45";
  if (item.subtype === 'BOW') rotationClass = "rotate-45";

  const finalClass = `${rotationClass} ${className}`.trim();
  const props = { size, className: finalClass };

  if (item.type === 'ARMOR') {
      switch(item.subtype) {
          case 'GLOVES': return <Hand {...props} />;
          case 'BOOTS': return <Footprints {...props} />;
          case 'SHIELD': 
          default: return <Shield {...props} />;
      }
  }
  
  switch(item.subtype) {
      case 'AXE': return <Axe {...props} />;
      case 'DAGGER': return <PocketKnife {...props} />;
      case 'PISTOL': return <Drill {...props} />;
      case 'SPEAR': return <Shovel {...props} />;
      case 'SNIPER': return <Crosshair {...props} />;
      case 'BOW': return <BowArrow {...props} />;
      case 'BOMB': return <Bomb {...props} />;
      case 'SWORD': return <Sword {...props} />;
      default: return <HelpCircle {...props} />;
  }
};
