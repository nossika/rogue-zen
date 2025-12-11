
import { Item, Player, Enemy, Projectile, Rarity, ElementType, TalentType, WeaponType, UltimateType, Stats } from '../types';
import { WEAPON_BASE_CONFIG, DETAIL_COLORS, RARITY_COLORS, ELEMENT_CONFIG } from '../constants';

export const generateRandomWeapon = (level: number): Item => {
    const weaponTypes: WeaponType[] = ['SWORD', 'AXE', 'DAGGER', 'PISTOL', 'SPEAR', 'SNIPER', 'BOW'];
    const elements = Object.values(ElementType);
    
    // Rarity Logic
    const rarityRoll = Math.random();
    let rarity = Rarity.COMMON;
    if (rarityRoll > 0.9) rarity = Rarity.LEGENDARY;
    else if (rarityRoll > 0.7) rarity = Rarity.EPIC;
    else if (rarityRoll > 0.4) rarity = Rarity.RARE;

    const rarityMult = { [Rarity.COMMON]: 1.0, [Rarity.RARE]: 1.25, [Rarity.EPIC]: 1.5, [Rarity.LEGENDARY]: 2.0 };
    const rm = rarityMult[rarity];

    const subtype = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    const config = WEAPON_BASE_CONFIG[subtype];
    const name = `${rarity} ${config.name}`;
    
    // Randomized Stats logic
    const randomize = (val: number) => val * (0.85 + Math.random() * 0.3);
    
    const baseAtk = (config.baseStats.attack + level * 1.5) * rm;
    const finalAttack = Math.floor(randomize(baseAtk));
    
    const finalSpeed = Number((randomize(config.baseStats.attackSpeed) * (rarity === Rarity.LEGENDARY ? 1.2 : 1.0)).toFixed(2));
    
    let armorOnHit = 0;
    const isMelee = ['SWORD', 'AXE', 'DAGGER', 'SPEAR'].includes(subtype);
    if (isMelee) {
        let targetAPS = 0; 
        if (rarity === Rarity.COMMON) targetAPS = 0.2;
        else if (rarity === Rarity.RARE) targetAPS = 0.5;
        else if (rarity === Rarity.EPIC) targetAPS = 0.9;
        else if (rarity === Rarity.LEGENDARY) targetAPS = 1.4;
        
        armorOnHit = targetAPS / Math.max(0.1, finalSpeed);
        armorOnHit = randomize(armorOnHit);
    }

    const stats: Partial<Stats> = {
        attack: finalAttack,
        range: Math.floor(randomize(config.baseStats.range)),
        attackSpeed: finalSpeed,
        knockback: Math.floor(randomize(config.baseStats.knockback * rm)),
        critChance: config.baseStats.critChance + (rarity === Rarity.LEGENDARY ? 0.05 : 0),
        armorOnHit: Number(armorOnHit.toFixed(2))
    };

    const element = elements[Math.floor(Math.random() * elements.length)];

    // Weapon Ultimate Logic
    const ultKeys = Object.values(UltimateType);
    const randomUlt = rarity !== Rarity.COMMON && Math.random() > 0.6 
    ? ultKeys[Math.floor(Math.random() * ultKeys.length)] 
    : undefined;

    return {
        id: Math.random().toString(),
        name,
        type: 'WEAPON',
        subtype,
        rarity,
        level,
        stats,
        ultimate: randomUlt,
        ultimateName: randomUlt ? randomUlt.replace(/_/g, ' ') : undefined,
        element,
        durability: 100
    };
};

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

    // Apply Talent Multipliers from Armor
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
    // Speed: Weapon Base * Multiplier + Player Additive. Note: Higher AttackSpeed is faster attacks (more attacks per sec)
    // Logic below calculates cooldown, where Cooldown = 60 / AttacksPerSec
    const totalSpeedVal = (weaponSpeed * speedMult) + player.stats.attackSpeed; 
    
    const totalRange = (player.stats.range + weaponRange) * rangeMult;
    const totalKnockback = player.stats.knockback + weaponKnockback + knockbackAdd;
    const totalArmorGain = ((player.stats.armorOnHit || 0) + weaponArmorOnHit) * armorOnHitMult;
    
    // Crit Calculation: Player Base + Weapon Base
    let totalCritChance = (player.stats.critChance || 0) + weaponCrit;
    
    // Effective Cooldown Calculation
    // Use Weapon Speed + Player Speed Stat modifier
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
      
      if (isMelee) {
          projSpeed = 4;
          projDuration = 15;
          if (type === 'AXE') projRadius = 60;
          else if (type === 'SPEAR') { projRadius = 25; projDuration = 20; projSpeed = 8; }
          else if (type === 'DAGGER') projRadius = 30;
          else projRadius = 40; // Sword
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
        color: elementColor,
        radius: projRadius,
        source: 'PLAYER',
        penetrate: config.penetrate, 
        isMelee,
        knockback: totalKnockback,
        element: element,
        critChance: totalCritChance,
        armorGain: totalArmorGain,
        hitEnemies: new Set()
      });

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
             ctx.fillRect(-2, -5, 4, 45); // Long shaft
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.beginPath();
             ctx.moveTo(-4, 40);
             ctx.lineTo(0, 55); // Tip
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
             ctx.fillRect(-3, 0, 6, 40); // Long barrel
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-4, -5, 8, 15); // Stock
             // Scope
             ctx.fillStyle = '#000';
             ctx.fillRect(-5, 15, 2, 10);
             // Tip
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : '#000';
             ctx.fillRect(-3, 38, 6, 4);
             break;
        case 'BOW':
             ctx.strokeStyle = DETAIL_COLORS.wood;
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.arc(0, 15, 20, Math.PI, 0); // Bow arc
             ctx.stroke();
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(-20, 15);
             ctx.lineTo(20, 15); // String
             ctx.stroke();
             // Arrow
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.fillRect(-2, 5, 4, 25); 
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
    
    // Element Indicator Dot
    if (element !== ElementType.NONE) {
        ctx.fillStyle = elementColor;
        ctx.shadowColor = elementColor;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
};
