
import { Item, ArmorType, Rarity, Stats, ElementType, ArmorEnchantment } from '../../types';
import { RARITY_CONFIG, ARMOR_BASE_CONFIG, ARMOR_ENCHANTMENT_CONFIG, ELEMENT_CONFIG } from '../../constants';
import { getWeightedRandom } from '../utils';

export const generateRandomArmor = (level: number): Item => {
    const armorTypes: ArmorType[] = ['SHIELD', 'GLOVES', 'BOOTS'];
    
    // Use weighted random from config
    const rarity = getWeightedRandom(RARITY_CONFIG) as Rarity;
    const configDef = RARITY_CONFIG[rarity];

    const rm = configDef.statMult;

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

    // Generate Enchantment
    let armorEnchantment: ArmorEnchantment | undefined;
    
    const keys = Object.keys(ARMOR_ENCHANTMENT_CONFIG);
    const totalWeight = keys.reduce((sum, key) => sum + ARMOR_ENCHANTMENT_CONFIG[key].weight, 0);
    let randWeight = Math.random() * totalWeight;
    let selectedKey = 'NONE';
    for (const key of keys) {
        randWeight -= ARMOR_ENCHANTMENT_CONFIG[key].weight;
        if (randWeight <= 0) {
            selectedKey = key;
            break;
        }
    }

    if (selectedKey !== 'NONE') {
        const conf = ARMOR_ENCHANTMENT_CONFIG[selectedKey];
        if (conf.valueRange && conf.type) {
             const value = conf.valueRange[0] + Math.random() * (conf.valueRange[1] - conf.valueRange[0]);
             const percent = Math.round(value * 100);
             
             let label = '';
             let title = '';
             let element: ElementType | undefined;
             
             switch (conf.type) {
                 case 'ELEMENTAL_RESIST':
                     // Pick random element (excluding NONE)
                     const elems = [ElementType.FIRE, ElementType.WATER, ElementType.GRASS, ElementType.EARTH];
                     element = elems[Math.floor(Math.random() * elems.length)];
                     title = `${ELEMENT_CONFIG[element].label} Ward`;
                     label = `-${percent}% ${ELEMENT_CONFIG[element].label} Dmg`;
                     break;
                 case 'BURN_RESIST':
                     title = 'Heat Shield';
                     label = `-${percent}% Burn Dmg`;
                     break;
                 case 'POISON_RESIST':
                     title = 'Antidote System';
                     label = `-${percent}% Poison Dmg`;
                     break;
                 case 'STATUS_RESIST':
                     title = 'Clear Mind';
                     label = `-${percent}% Status Duration`;
                     break;
             }
             
             armorEnchantment = {
                 type: conf.type,
                 value: Number(value.toFixed(2)),
                 element,
                 label,
                 title
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
        element: ElementType.NONE,
        armorEnchantment,
        durability: 100
    };
};
