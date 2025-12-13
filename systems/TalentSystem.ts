
import { Player, Item, TalentType } from '../types';

export const calculatePlayerStats = (player: Player) => {
    const p = player;
    const a1 = p.equipment.armor1;
    const a2 = p.equipment.armor2;

    // Use permanentStats as the base (includes initial + level up upgrades)
    const base = p.permanentStats;
    
    // Sum item stats
    const a1s = a1?.stats || {};
    const a2s = a2?.stats || {};

    // Calculate Totals (Base + Equipment)
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

    // Apply Talents Multipliers
    let blockChanceAdd = 0;
    let dodgeChanceAdd = 0;
    let chargeRateMult = 1.0;
    let defenseMult = 1.0;
    
    const applyTalentStats = (item: Item | null) => {
        if (!item?.talent) return;
        if (item.talent.type === TalentType.ARTISAN) {
            // ARTISAN provides defense multiplier
            defenseMult += (item.talent.value1 - 1.0); 
        } else if (item.talent.type === TalentType.SCIENTIST) {
            chargeRateMult += (item.talent.value1 - 1.0);
        } else if (item.talent.type === TalentType.LUCKY) {
            dodgeChanceAdd += item.talent.value1;
        }
    };
    applyTalentStats(a1);
    applyTalentStats(a2);

    // Set Final Effective Stats
    // Note: Current HP is managed by game loop, MaxHP is calculated here
    p.stats.maxHp = totalMaxHp;
    // Update current HP cap if needed, but don't heal automatically unless handled elsewhere
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
     // Formula: 5% Fixed + (HP Loss % * 10%)
     // Example: Start 70, End 40. Loss 30. Max 100. Ratio 0.3.
     // 5 + (0.3 * 100 * 0.1) = 5 + 3 = 8%.
     
     const maxHp = player.stats.maxHp;
     const lostHp = Math.max(0, startHp - endHp);
     const lostRatio = lostHp / maxHp; // 0.0 to 1.0
     
     // Base calculation
     const baseLoss = 5 + (lostRatio * 10);

     // Calculate Durability Reduction Logic (ARTISAN Talent)
     let durabilitySave = 0;
     const checkTank = (item: Item | null) => {
         if (item?.talent?.type === TalentType.ARTISAN) {
             durabilitySave += (item.talent.value2 || 0);
         }
     };
     checkTank(player.equipment.armor1);
     checkTank(player.equipment.armor2);

     // Cap reduction at 100% (value of 1.0)
     const reductionMult = Math.max(0, 1.0 - durabilitySave);
     return baseLoss * reductionMult; 
};
