
import { Item, ArmorType, Rarity, TalentType, Talent, Stats, ElementType } from '../../types';
import { TALENT_CONFIG, RARITY_CONFIG, ARMOR_BASE_CONFIG } from '../../constants';
import { getWeightedRandom } from '../utils';

export const generateRandomArmor = (level: number): Item => {
    const armorTypes: ArmorType[] = ['SHIELD', 'GLOVES', 'BOOTS'];
    
    // Use weighted random from config
    const rarity = getWeightedRandom(RARITY_CONFIG) as Rarity;
    const configDef = RARITY_CONFIG[rarity];

    const rm = configDef.statMult;
    const rf = configDef.talentStrength;

    const subtype = armorTypes[Math.floor(Math.random() * armorTypes.length)];
    const armorConfig = ARMOR_BASE_CONFIG[subtype];
    const name = `${rarity} ${armorConfig.name}`;
    
    const stats: Partial<Stats> = {};
    
    // Apply base stats and per-level scaling
    for (const key of Object.keys(armorConfig.baseStats) as Array<keyof Stats>) {
        const base = armorConfig.baseStats[key] || 0;
        const perLevel = armorConfig.perLevelStats?.[key] || 0;
        const total = (base + (perLevel * level)) * rm;
        
        // Float precision handling
        if (key === 'attackSpeed' || key === 'moveSpeed' || key === 'ultChargeRate') {
            stats[key] = Number(total.toFixed(2));
        } else {
            stats[key] = Math.floor(total);
        }
    }

    const talentChance = configDef.talentChance;
    let armorTalent: Talent | undefined;

    if (Math.random() <= talentChance) {
        const tType = getWeightedRandom(TALENT_CONFIG) as TalentType;
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
