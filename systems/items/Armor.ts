
import { Item, ArmorType, Rarity, TalentType, Talent, Stats, ElementType } from '../../types';
import { TALENT_CONFIG } from '../../constants';
import { getWeightedRandom } from '../utils';

export const generateRandomArmor = (level: number): Item => {
    const armorTypes: ArmorType[] = ['SHIELD', 'GLOVES', 'BOOTS'];
    
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
            ultChargeRate: Number((0.2 * rm).toFixed(2)) 
        };
    }

    const talentChance = rarity === Rarity.COMMON ? 0.2 : rarity === Rarity.RARE ? 0.5 : rarity === Rarity.EPIC ? 0.8 : 1.0;
    let armorTalent: Talent | undefined;

    if (Math.random() <= talentChance) {
        const tType = getWeightedRandom(TALENT_CONFIG);
        const config = TALENT_CONFIG[tType];
        
        const lerp = (range: [number, number], isInt = false) => {
            const val = range[0] + (range[1] - range[0]) * rf;
            return isInt ? Math.floor(val) : Number(val.toFixed(2));
        };

        const v1 = lerp(config.ranges.value1);
        const v2 = config.ranges.value2 ? lerp(config.ranges.value2) : undefined;
        const v3 = config.ranges.value3 ? lerp(config.ranges.value3, tType === TalentType.SNIPER) : undefined;

        armorTalent = {
            type: tType,
            value1: v1,
            value2: v2,
            value3: v3,
            description: config.description(v1, v2, v3)
        };
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
