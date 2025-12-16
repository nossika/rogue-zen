
import { Player, TalentType, Talent } from '../../types';
import { TALENT_CONFIG } from '../../constants';
import { getWeightedRandom } from '../utils';

export const calculatePlayerStats = (player: Player) => {
    const p = player;
    const a1 = p.equipment.armor1;
    const a2 = p.equipment.armor2;

    const base = p.permanentStats;
    
    const a1s = a1?.stats || {};
    const a2s = a2?.stats || {};

    const totalDefense = base.defense + (a1s.defense || 0) + (a2s.defense || 0);
    const totalMoveSpeed = base.moveSpeed + (a1s.moveSpeed || 0) + (a2s.moveSpeed || 0);
    const totalAttackSpeed = base.attackSpeed + (a1s.attackSpeed || 0) + (a2s.attackSpeed || 0);
    const totalRange = base.range + (a1s.range || 0) + (a2s.range || 0);
    const totalUltCharge = base.ultChargeRate + (a1s.ultChargeRate || 0) + (a2s.ultChargeRate || 0);
    const totalDodge = base.dodgeChance + (a1s.dodgeChance || 0) + (a2s.dodgeChance || 0);
    const totalCrit = base.critChance + (a1s.critChance || 0) + (a2s.critChance || 0);
    const totalKnockback = base.knockback + (a1s.knockback || 0) + (a2s.knockback || 0);
    const totalArmorOnHit = base.armorOnHit + (a1s.armorOnHit || 0) + (a2s.armorOnHit || 0);
    const totalAttack = base.attack + (a1s.attack || 0) + (a2s.attack || 0);
    const totalMaxHp = base.maxHp + (a1s.maxHp || 0) + (a2s.maxHp || 0);

    let dodgeChanceAdd = 0;
    let chargeRateMult = 1.0;
    let defenseMult = 1.0;
    
    // Apply Active Talent
    if (p.talent) {
        if (p.talent.type === TalentType.ARTISAN) {
            defenseMult += (p.talent.value1 - 1.0); 
        } else if (p.talent.type === TalentType.SCIENTIST) {
            chargeRateMult += (p.talent.value1 - 1.0);
        } else if (p.talent.type === TalentType.LUCKY) {
            dodgeChanceAdd += p.talent.value1;
        }
    }

    p.stats.maxHp = totalMaxHp;
    p.stats.hp = Math.min(p.stats.hp, p.stats.maxHp);

    p.stats.defense = totalDefense * defenseMult;
    p.stats.ultChargeRate = totalUltCharge * chargeRateMult;
    p.stats.dodgeChance = totalDodge + dodgeChanceAdd;
    p.stats.moveSpeed = totalMoveSpeed;
    p.stats.attackSpeed = totalAttackSpeed;
    p.stats.range = totalRange;
    p.stats.critChance = totalCrit;
    p.stats.knockback = totalKnockback;
    p.stats.armorOnHit = totalArmorOnHit;
    p.stats.attack = totalAttack;
};

export const calculateDurabilityLoss = (player: Player, startHp: number, endHp: number): number => {
     const maxHp = player.stats.maxHp;
     const lostHp = Math.max(0, startHp - endHp);
     const lostRatio = lostHp / maxHp; 
     
     const baseLoss = 5 + (lostRatio * 10);

     let durabilitySave = 0;
     if (player.talent?.type === TalentType.ARTISAN) {
         durabilitySave += (player.talent.value2 || 0);
     }

     const reductionMult = Math.max(0, 1.0 - durabilitySave);
     return baseLoss * reductionMult; 
};

export const generateRandomTalent = (): Talent => {
    const tType = getWeightedRandom(TALENT_CONFIG) as TalentType;
    const config = TALENT_CONFIG[tType];
    
    // Boss talents are always strong, random range 
    const strength = Math.random(); 

    const lerp = (range: [number, number]) => {
        const val = range[0] + (range[1] - range[0]) * strength;
        return Number(val.toFixed(2));
    };

    const v1 = lerp(config.ranges.value1);
    const v2 = config.ranges.value2 ? lerp(config.ranges.value2) : undefined;
    const v3 = config.ranges.value3 ? lerp(config.ranges.value3) : undefined;
    
    // Round integer-like values if needed (e.g. range add for Sniper, reroll count for Lucky)
    const finalV3 = (tType === TalentType.SNIPER && v3) ? Math.floor(v3) : v3;
    const finalV2 = (tType === TalentType.LUCKY && v2) ? Math.round(v2) : v2;

    return {
        type: tType,
        value1: v1,
        value2: finalV2,
        value3: finalV3,
        description: config.description(v1, finalV2, finalV3)
    };
};
