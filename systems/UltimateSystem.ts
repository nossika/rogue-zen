
import { Player, Enemy, UltimateType, TalentType, Item } from '../types';

interface UltimateContext {
    player: Player;
    enemies: Enemy[];
    spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit?: boolean) => void;
    timeStopRef: { current: number };
    invincibilityRef: { current: number };
    speedBoostRef: { current: number };
    omniForceRef: { current: number }; // Replaced critSurgeRef
}

export const activateUltimate = (context: UltimateContext) => {
    const { player: p, enemies, spawnFloatingText, timeStopRef, invincibilityRef, speedBoostRef, omniForceRef } = context;
    
    if (p.ultimateCharge < 100) return;
    
    // Check for Scientist Talent Multipliers
    let effectMult = 1.0;
    const checkScientist = (item: Item | null) => {
        if (item?.talent?.type === TalentType.SCIENTIST) {
            effectMult += (item.talent.value2 || 1.0) - 1.0; // Additive stacking for multipliers over 1
        }
    };
    checkScientist(p.equipment.armor1);
    checkScientist(p.equipment.armor2);

    const activeUltimates = new Set<UltimateType>();
    if (p.equipment.weapon1?.ultimate) activeUltimates.add(p.equipment.weapon1.ultimate);
    if (p.equipment.weapon2?.ultimate) activeUltimates.add(p.equipment.weapon2.ultimate);
    
    if (activeUltimates.size > 0) {
      p.ultimateCharge = 0;
      activeUltimates.forEach(ult => {
          switch (ult) {
            case UltimateType.AOE_BLAST:
              enemies.forEach(e => {
                const dx = e.x - p.x;
                const dy = e.y - p.y;
                if (Math.sqrt(dx*dx + dy*dy) < 400) {
                  const dmg = (p.stats.attack + 50) * 8 * effectMult; 
                  e.stats.hp -= dmg;
                  spawnFloatingText(e.x, e.y - 20, Math.round(dmg).toString(), '#fbbf24', true);
                }
              });
              spawnFloatingText(p.x, p.y - 70, "BLAST!", '#fbbf24', true);
              break;
            case UltimateType.SHIELD:
              const shieldAmount = (p.stats.maxHp * 0.5) * effectMult;
              p.stats.shield += shieldAmount;
              spawnFloatingText(p.x, p.y - 40, "SHIELD UP!", '#06b6d4', true);
              break;
            case UltimateType.TIME_STOP:
              // Buffed: 6s -> 9s (540 frames)
              timeStopRef.current = Math.floor(540 * effectMult); 
              spawnFloatingText(p.x, p.y - 50, "TIME STOP!", '#a855f7', true);
              break;
            case UltimateType.INVINCIBILITY:
              // Buffed: 5s -> 7.5s (450 frames)
              invincibilityRef.current = Math.floor(450 * effectMult); 
              spawnFloatingText(p.x, p.y - 60, "INVINCIBLE!", '#fbbf24', true);
              break;
            case UltimateType.SPEED_BOOST:
              // Buffed: 8s -> 12s (720 frames)
              speedBoostRef.current = Math.floor(720 * effectMult); 
              spawnFloatingText(p.x, p.y - 50, "SPEED UP!", '#38bdf8', true);
              break;
            case UltimateType.OMNI_FORCE:
              // 12s (720 frames)
              omniForceRef.current = Math.floor(720 * effectMult); 
              spawnFloatingText(p.x, p.y - 50, "OMNI FORCE!", '#ff0055', true);
              break;
          }
      });
    }
};
