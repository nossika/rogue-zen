
import { Player, Item, TalentType } from '../../types';

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
    const totalBlock = base.blockChance + (a1s.blockChance || 0) + (a2s.blockChance || 0);
    const totalDodge = base.dodgeChance + (a1s.dodgeChance || 0) + (a2s.dodgeChance || 0);
    const totalCrit = base.critChance + (a1s.critChance || 0) + (a2s.critChance || 0);
    const totalKnockback = base.knockback + (a1s.knockback || 0) + (a2s.knockback || 0);
    const totalArmorOnHit = base.armorOnHit + (a1s.armorOnHit || 0) + (a2s.armorOnHit || 0);
    const totalAttack = base.attack + (a1s.attack || 0) + (a2s.attack || 0);
    const totalMaxHp = base.maxHp + (a1s.maxHp || 0) + (a2s.maxHp || 0);

    let blockChanceAdd = 0;
    let dodgeChanceAdd = 0;
    let chargeRateMult = 1.0;
    let defenseMult = 1.0;
    
    const applyTalentStats = (item: Item | null) => {
        if (!item?.talent) return;
        if (item.talent.type === TalentType.ARTISAN) {
            defenseMult += (item.talent.value1 - 1.0); 
        } else if (item.talent.type === TalentType.SCIENTIST) {
            chargeRateMult += (item.talent.value1 - 1.0);
        } else if (item.talent.type === TalentType.LUCKY) {
            dodgeChanceAdd += item.talent.value1;
        }
    };
    applyTalentStats(a1);
    applyTalentStats(a2);

    p.stats.maxHp = totalMaxHp;
    p.stats.hp = Math.min(p.stats.hp, p.stats.maxHp);

    p.stats.defense = totalDefense * defenseMult;
    p.stats.ultChargeRate = totalUltCharge * chargeRateMult;
    p.stats.blockChance = totalBlock + blockChanceAdd;
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
     const checkTank = (item: Item | null) => {
         if (item?.talent?.type === TalentType.ARTISAN) {
             durabilitySave += (item.talent.value2 || 0);
         }
     };
     checkTank(player.equipment.armor1);
     checkTank(player.equipment.armor2);

     const reductionMult = Math.max(0, 1.0 - durabilitySave);
     return baseLoss * reductionMult; 
};
