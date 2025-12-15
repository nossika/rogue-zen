
import { Item, Player, Enemy, Projectile, Rarity, ElementType, TalentType } from '../../types';
import { WEAPON_BASE_CONFIG, ELEMENT_CONFIG } from '../../constants';
import { AudioSystem } from '../core/Audio';

export const fireWeapon = (
    player: Player, 
    weapon: Item, 
    enemies: Enemy[], 
    projectiles: Projectile[], 
    cooldownRef: { current: number },
    speedBoost: number
) => {
    if (cooldownRef.current > 0) return;

    const type = weapon.subtype || 'SWORD';
    const config = WEAPON_BASE_CONFIG[type];
    const element = weapon.element || ElementType.NONE;

    const isMelee = config.category === 'MELEE';
    const isRanged = config.category === 'RANGED';
    const isThrown = config.category === 'THROWN';

    let dmgMult = 1.0;
    let speedMult = 1.0;
    let rangeMult = 1.0;
    let knockbackAdd = 0;
    let armorOnHitMult = 1.0;

    const checkTalent = (item: Item | null) => {
        if (!item || !item.talent) return;
        const t = item.talent;
        if (t.type === TalentType.SNIPER && isRanged) {
            rangeMult *= t.value1;
            dmgMult *= (t.value2 || 1);
            knockbackAdd += (t.value3 || 0);
        } else if (t.type === TalentType.FIGHTER && isMelee) {
            speedMult *= t.value1;
            dmgMult *= (t.value2 || 1);
            armorOnHitMult *= (t.value3 || 1);
        }
    };

    checkTalent(player.equipment.armor1);
    checkTalent(player.equipment.armor2);

    const weaponAtk = weapon.stats.attack || config.baseStats.attack;
    const weaponSpeed = weapon.stats.attackSpeed || config.baseStats.attackSpeed;
    const weaponRange = weapon.stats.range || config.baseStats.range;
    const weaponKnockback = weapon.stats.knockback || config.baseStats.knockback;
    const weaponCrit = weapon.stats.critChance || config.baseStats.critChance;
    const weaponArmorOnHit = weapon.stats.armorOnHit !== undefined ? weapon.stats.armorOnHit : config.baseStats.armorOnHit;

    const totalDamage = (player.stats.attack + weaponAtk) * dmgMult;
    const totalSpeedVal = (weaponSpeed * speedMult) + player.stats.attackSpeed; 
    
    const totalRange = (player.stats.range + weaponRange) * rangeMult;
    const totalKnockback = player.stats.knockback + weaponKnockback + knockbackAdd;
    const totalArmorGain = ((player.stats.armorOnHit || 0) + weaponArmorOnHit) * armorOnHitMult;
    
    let totalCritChance = (player.stats.critChance || 0) + weaponCrit;
    
    const effectiveSpeed = Math.max(0.1, totalSpeedVal); 
    const finalSpeedMultiplier = speedBoost > 0 ? effectiveSpeed * 1.5 : effectiveSpeed;

    let closest: Enemy | null = null;
    let minD = Infinity;
    enemies.forEach(e => {
      const d = Math.sqrt((player.x - e.x)**2 + (player.y - e.y)**2);
      if (d < minD) {
        minD = d;
        closest = e;
      }
    });

    if (closest && minD <= totalRange + 50) {
      const target = closest as Enemy;
      const angle = Math.atan2(target.y - player.y, target.x - player.x);
      
      const elementColor = element === ElementType.NONE ? config.color : ELEMENT_CONFIG[element].color;

      let projSpeed = 12;
      let projDuration = 60;
      let projRadius = 6;
      let isBomb = false;
      let targetX, targetY;
      
      if (isMelee) {
          projSpeed = 4;
          projDuration = 15;
          if (type === 'AXE') projRadius = 60;
          else if (type === 'SPEAR') { projRadius = 25; projDuration = 20; projSpeed = 8; }
          else if (type === 'DAGGER') projRadius = 30;
          else projRadius = 40; // Sword
      } else if (isThrown) {
          projSpeed = 8;
          projRadius = 8; 
          isBomb = true;
          const dist = Math.sqrt((target.x - player.x)**2 + (target.y - player.y)**2);
          projDuration = Math.floor(dist / projSpeed);
          targetX = target.x;
          targetY = target.y;
      } else {
          // Ranged
          if (type === 'SNIPER') { projSpeed = 25; projDuration = 40; projRadius = 4; }
          else if (type === 'BOW') { projSpeed = 15; projDuration = 50; projRadius = 5; }
      }

      projectiles.push({
        id: Math.random().toString(),
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * projSpeed,
        vy: Math.sin(angle) * projSpeed,
        damage: totalDamage,
        duration: projDuration,
        maxDuration: projDuration,
        color: elementColor,
        radius: projRadius,
        source: 'PLAYER',
        penetrate: config.penetrate, 
        isMelee,
        knockback: totalKnockback,
        element: element,
        critChance: totalCritChance,
        armorGain: totalArmorGain,
        hitEnemies: new Set(),
        isBomb: isBomb,
        targetX: targetX,
        targetY: targetY,
        enchantment: weapon.enchantment
      });

      AudioSystem.playAttack(isMelee);

      cooldownRef.current = 60 / Math.max(0.1, finalSpeedMultiplier);
    }
};
