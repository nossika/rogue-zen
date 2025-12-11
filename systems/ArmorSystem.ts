
import { Item, ArmorType, Rarity, TalentType, Talent, Stats, ElementType } from '../types';

export const generateRandomArmor = (level: number): Item => {
    const armorTypes: ArmorType[] = ['SHIELD', 'GLOVES', 'BOOTS'];
    
    // Rarity Logic
    const rarityRoll = Math.random();
    let rarity = Rarity.COMMON;
    if (rarityRoll > 0.9) rarity = Rarity.LEGENDARY;
    else if (rarityRoll > 0.7) rarity = Rarity.EPIC;
    else if (rarityRoll > 0.4) rarity = Rarity.RARE;

    const rarityMult = { [Rarity.COMMON]: 1.0, [Rarity.RARE]: 1.25, [Rarity.EPIC]: 1.5, [Rarity.LEGENDARY]: 2.0 };
    const rm = rarityMult[rarity];
    const rf = rarity === Rarity.COMMON ? 0 : rarity === Rarity.RARE ? 0.33 : rarity === Rarity.EPIC ? 0.66 : 1;

    const subtype = armorTypes[Math.floor(Math.random() * armorTypes.length)];
    let stats: Partial<Stats> = {};
    let name = "Item";

    if (subtype === 'SHIELD') {
        name = `${rarity} Shield`;
        stats = {
            defense: Math.floor((2 + level * 1.5) * rm),
            shield: Math.floor(20 * rm * (1 + level * 0.1))
        };
    } else if (subtype === 'GLOVES') {
        name = `${rarity} Gloves`;
        stats = {
            range: Math.floor(30 * rm),
            attackSpeed: Number((0.1 * rm).toFixed(2))
        };
    } else if (subtype === 'BOOTS') {
        name = `${rarity} Boots`;
        stats = {
            moveSpeed: Number((0.5 * rm).toFixed(1)),
            ultChargeRate: Number((0.2 * rm).toFixed(2)) // +0.2% - 0.8% per sec
        };
    }

    // ARMOR TALENT GENERATION
    // Chance to have talent: Common 20%, Rare 50%, Epic 80%, Legend 100%
    const talentChance = rarity === Rarity.COMMON ? 0.2 : rarity === Rarity.RARE ? 0.5 : rarity === Rarity.EPIC ? 0.8 : 1.0;
    let armorTalent: Talent | undefined;

    if (Math.random() <= talentChance) {
        const types = Object.values(TalentType);
        const tType = types[Math.floor(Math.random() * types.length)];
        
        // Helper to lerp value based on rarity factor (rf)
        const lerp = (min: number, max: number) => Number((min + (max - min) * rf).toFixed(2));

        if (tType === TalentType.SNIPER) {
            const rangeMult = lerp(1.2, 1.8);
            const dmgMult = lerp(1.2, 2.0);
            const kbAdd = Math.floor(lerp(1, 5));
            armorTalent = {
                type: TalentType.SNIPER,
                value1: rangeMult, // Range
                value2: dmgMult,   // Damage
                value3: kbAdd,     // Knockback
                description: `Ranged Wpn: Range x${rangeMult}, Dmg x${dmgMult}, KB +${kbAdd}`
            };
        } else if (tType === TalentType.FIGHTER) {
            const spdMult = lerp(1.2, 1.8);
            const dmgMult = lerp(1.2, 2.0);
            const aohMult = lerp(1.2, 2.0);
            armorTalent = {
                type: TalentType.FIGHTER,
                value1: spdMult, // Speed
                value2: dmgMult, // Damage
                value3: aohMult, // ArmorOnHit
                description: `Melee Wpn: Spd x${spdMult}, Dmg x${dmgMult}, Armor/Hit x${aohMult}`
            };
        } else if (tType === TalentType.TANK) {
            // Update: Tank now provides Defense Multiplier (1.5-2.5) instead of Block
            const defMult = lerp(1.5, 2.5);
            const durabilitySave = lerp(0.5, 1.0); // 50% to 100% reduction
            armorTalent = {
                type: TalentType.TANK,
                value1: defMult,  // Total Def Multiplier
                value2: durabilitySave,  // Durability Save
                description: `Total Defense x${defMult}, Durability Loss Reduced by ${(durabilitySave*100).toFixed(0)}%`
            };
        } else if (tType === TalentType.SCIENTIST) {
            // Determine bounds based on rarity
            const minBase = 1.2 + (rf * 0.8); // 1.2, 1.46, 1.72, 2.0
            const maxBase = 1.5 + (rf * 1.0); // 1.5, 1.83, 2.16, 2.5
            
            // Generate two distinct random values within the range
            const genVal = () => Number((minBase + Math.random() * (maxBase - minBase)).toFixed(2));
            
            const chargeMult = genVal();
            const effectMult = genVal();
            
            armorTalent = {
                type: TalentType.SCIENTIST,
                value1: chargeMult, // Charge Rate
                value2: effectMult, // Effect
                description: `Ult Charge x${chargeMult}, Ult Effect x${effectMult}`
            };
        } else if (tType === TalentType.LUCKY) {
            // New: Lucky Talent
            const dodgeChance = lerp(0.1, 0.3);
            armorTalent = {
                type: TalentType.LUCKY,
                value1: dodgeChance, // Dodge Chance
                value2: 1,           // Free Reroll count (1 per item)
                description: `Free Reroll per Stage, Dodge Chance +${(dodgeChance*100).toFixed(0)}%`
            };
        }
    }

    return {
        id: Math.random().toString(),
        name,
        type: 'ARMOR',
        subtype,
        rarity,
        level,
        stats,
        talent: armorTalent,
        element: ElementType.NONE,
        durability: 100
    };
};
