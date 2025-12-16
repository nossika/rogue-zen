
import { Player, Enemy, UltimateType, TalentType, Terrain } from '../../types';
import { ULTIMATE_CONFIG } from '../../constants';

interface UltimateContext {
    player: Player;
    enemies: Enemy[];
    terrain: Terrain[];
    spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit?: boolean) => void;
    timeStopRef: { current: number };
    invincibilityRef: { current: number };
    speedBoostRef: { current: number };
    omniForceRef: { current: number }; 
}

export const activateUltimate = (context: UltimateContext) => {
    const { player: p, enemies, terrain, spawnFloatingText, timeStopRef, invincibilityRef, speedBoostRef, omniForceRef } = context;
    
    if (p.ultimateCharge < 100) return;
    
    let effectMult = 1.0;
    if (p.talent?.type === TalentType.SCIENTIST) {
        effectMult += (p.talent.value2 || 1.0) - 1.0; 
    }

    const activeUltimates = new Set<UltimateType>();
    if (p.equipment.weapon1?.ultimate) activeUltimates.add(p.equipment.weapon1.ultimate);
    if (p.equipment.weapon2?.ultimate) activeUltimates.add(p.equipment.weapon2.ultimate);
    
    if (activeUltimates.size > 0) {
      p.ultimateCharge = 0;
      activeUltimates.forEach(ult => {
          const config = ULTIMATE_CONFIG[ult];
          
          switch (ult) {
            case UltimateType.AOE_BLAST:
              const multiplier = config.baseAmount || 8;
              enemies.forEach(e => {
                const dx = e.x - p.x;
                const dy = e.y - p.y;
                if (Math.sqrt(dx*dx + dy*dy) < 400) {
                  const dmg = (p.stats.attack + 50) * multiplier * effectMult; 
                  e.stats.hp -= dmg;
                  spawnFloatingText(e.x, e.y - 20, Math.round(dmg).toString(), '#fbbf24', true);
                }
              });
              spawnFloatingText(p.x, p.y - 70, "BLAST!", '#fbbf24', true);
              break;
            case UltimateType.SHIELD:
              const percent = config.baseAmount || 0.5;
              const shieldAmount = (p.stats.maxHp * percent) * effectMult;
              p.stats.shield += shieldAmount;
              spawnFloatingText(p.x, p.y - 40, "SHIELD UP!", '#06b6d4', true);
              break;
            case UltimateType.TIME_STOP:
              timeStopRef.current = Math.floor((config.duration || 540) * effectMult); 
              spawnFloatingText(p.x, p.y - 50, "TIME STOP!", '#a855f7', true);
              break;
            case UltimateType.INVINCIBILITY:
              invincibilityRef.current = Math.floor((config.duration || 450) * effectMult); 
              spawnFloatingText(p.x, p.y - 60, "INVINCIBLE!", '#fbbf24', true);
              break;
            case UltimateType.SPEED_BOOST:
              speedBoostRef.current = Math.floor((config.duration || 720) * effectMult); 
              spawnFloatingText(p.x, p.y - 50, "SPEED UP!", '#38bdf8', true);
              break;
            case UltimateType.OMNI_FORCE:
              omniForceRef.current = Math.floor((config.duration || 720) * effectMult); 
              spawnFloatingText(p.x, p.y - 50, "OMNI FORCE!", '#ff0055', true);
              break;
            case UltimateType.BLOCK:
              const isHorizontalMove = Math.abs(Math.cos(p.angle)) > Math.abs(Math.sin(p.angle));
              
              const wallThick = 40;
              const baseLength = config.baseAmount || 160; 
              const wallLen = baseLength * effectMult;
              
              let tx, ty, w, h;
              
              if (isHorizontalMove) {
                  w = wallThick;
                  h = wallLen;
                  const dir = Math.cos(p.angle) > 0 ? 1 : -1;
                  tx = p.x + (dir * 60) - w/2; 
                  ty = p.y - h/2;
              } else {
                  w = wallLen;
                  h = wallThick;
                  const dir = Math.sin(p.angle) > 0 ? 1 : -1;
                  ty = p.y + (dir * 60) - h/2;
                  tx = p.x - w/2;
              }
              
              if (terrain) {
                  terrain.push({
                      id: `wall-ult-${Math.random()}`,
                      x: tx,
                      y: ty,
                      width: w,
                      height: h,
                      type: 'WALL' 
                  });
              }
              spawnFloatingText(p.x, p.y - 50, "WALL!", '#78350f', true);
              break;
          }
      });
    }
};
