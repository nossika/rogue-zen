
import { Item, Player, Enemy, Projectile, Rarity, ElementType, TalentType } from '../../types';
import { WEAPON_BASE_CONFIG, DETAIL_COLORS, RARITY_COLORS, ELEMENT_CONFIG } from '../../constants';
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

    const isMelee = ['SWORD', 'AXE', 'DAGGER', 'SPEAR'].includes(type);
    const isRanged = ['PISTOL', 'SNIPER', 'BOW'].includes(type);

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
      } else if (type === 'BOMB') {
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

export const drawWeapon = (ctx: CanvasRenderingContext2D, weapon: Item | null, x: number, y: number) => {
    if (!weapon) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);

    const type = weapon.subtype || 'SWORD';
    const rarityColor = RARITY_COLORS[weapon.rarity];
    const element = weapon.element || ElementType.NONE;
    const elementColor = ELEMENT_CONFIG[element].color;
    
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    switch(type) {
        case 'AXE':
            ctx.fillStyle = DETAIL_COLORS.wood;
            ctx.fillRect(-3, 0, 6, 25);
            ctx.fillStyle = DETAIL_COLORS.darkSteel;
            ctx.beginPath();
            ctx.moveTo(-3, 5);
            ctx.quadraticCurveTo(-15, 0, -3, 15);
            ctx.moveTo(3, 5);
            ctx.quadraticCurveTo(15, 0, 3, 15);
            ctx.fill();
            ctx.strokeStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
            ctx.lineWidth = 2;
            ctx.stroke();
            break;
        case 'DAGGER':
             ctx.fillStyle = '#111';
             ctx.fillRect(-2, 0, 4, 8);
             ctx.fillStyle = DETAIL_COLORS.gold;
             ctx.fillRect(-6, 8, 12, 2);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.beginPath();
             ctx.moveTo(-3, 10);
             ctx.lineTo(0, 25);
             ctx.lineTo(3, 10);
             ctx.fill();
             break;
        case 'SPEAR':
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-2, -5, 4, 45); 
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.beginPath();
             ctx.moveTo(-4, 40);
             ctx.lineTo(0, 55); 
             ctx.lineTo(4, 40);
             ctx.fill();
             break;
        case 'PISTOL':
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-3, 0, 6, 10);
             ctx.fillStyle = '#333';
             ctx.fillRect(-3, 5, 6, 10);
             ctx.fillStyle = DETAIL_COLORS.darkSteel;
             ctx.fillRect(-2, 10, 4, 15);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.fillRect(-2, 10, 4, 12);
             break;
        case 'SNIPER':
             ctx.fillStyle = '#1e293b';
             ctx.fillRect(-3, 0, 6, 40); 
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-4, -5, 8, 15); 
             ctx.fillStyle = '#000';
             ctx.fillRect(-5, 15, 2, 10);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : '#000';
             ctx.fillRect(-3, 38, 6, 4);
             break;
        case 'BOW':
             ctx.strokeStyle = DETAIL_COLORS.wood;
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.arc(0, 15, 20, Math.PI, 0); 
             ctx.stroke();
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(-20, 15);
             ctx.lineTo(20, 15); 
             ctx.stroke();
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.fillRect(-2, 5, 4, 25); 
             break;
        case 'BOMB':
             ctx.fillStyle = '#333';
             ctx.beginPath(); ctx.arc(0, 12, 8, 0, Math.PI * 2); ctx.fill();
             ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 1.5;
             ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(4, 0, 0, -2); ctx.stroke();
             ctx.fillStyle = '#facc15';
             ctx.beginPath(); ctx.arc(0, -2, 2, 0, Math.PI * 2); ctx.fill();
             break;
        case 'SWORD':
        default:
             ctx.fillStyle = DETAIL_COLORS.gold;
             ctx.beginPath(); ctx.arc(0, -2, 3, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-2, 0, 4, 8);
             ctx.fillStyle = DETAIL_COLORS.gold;
             ctx.fillRect(-8, 8, 16, 3);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.beginPath();
             ctx.moveTo(-4, 11);
             ctx.lineTo(0, 40);
             ctx.lineTo(4, 11);
             ctx.fill();
             ctx.fillStyle = DETAIL_COLORS.darkSteel;
             ctx.fillRect(-1, 11, 2, 20);
             break;
    }

    if (weapon.rarity !== Rarity.COMMON) {
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -5, 10, 10); 
    }
    
    if (element !== ElementType.NONE) {
        ctx.fillStyle = elementColor;
        ctx.shadowColor = elementColor;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
};
