
import { Item, Rarity, ElementType, WeaponType, UltimateType, Stats, WeaponEnchantment } from '../../types';
import { WEAPON_BASE_CONFIG, RARITY_CONFIG, ULTIMATE_CONFIG, WEAPON_ENCHANTMENT_CONFIG } from '../../constants';
import { getWeightedRandom } from '../utils';

export const generateRandomWeapon = (level: number): Item => {
    const weaponTypes: WeaponType[] = ['SWORD', 'AXE', 'DAGGER', 'PISTOL', 'SPEAR', 'SNIPER', 'BOW', 'BOMB'];
    const elements = Object.values(ElementType);
    
    // Use weighted random from config
    const rarity = getWeightedRandom(RARITY_CONFIG) as Rarity;
    const configDef = RARITY_CONFIG[rarity];

    const subtype = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    const config = WEAPON_BASE_CONFIG[subtype];
    const name = `${rarity} ${config.name}`;
    
    const randomize = (val: number) => val * (0.85 + Math.random() * 0.3);
    
    // Use statMult from config
    const baseAtk = (config.baseStats.attack + level * 1.5) * configDef.statMult;
    const finalAttack = Math.floor(randomize(baseAtk));
    
    const finalSpeed = Number((randomize(config.baseStats.attackSpeed) * (rarity === Rarity.LEGENDARY ? 1.2 : 1.0)).toFixed(2));
    
    let armorOnHit = 0;
    const isMelee = config.category === 'MELEE';
    if (isMelee) {
        // Use meleeArmorTarget from config
        const targetAPS = configDef.meleeArmorTarget;
        
        armorOnHit = targetAPS / Math.max(0.1, finalSpeed);
        armorOnHit = randomize(armorOnHit);
    }

    const stats: Partial<Stats> = {
        attack: finalAttack,
        range: Math.floor(randomize(config.baseStats.range)),
        attackSpeed: finalSpeed,
        knockback: Math.floor(randomize(config.baseStats.knockback * configDef.statMult)),
        critChance: config.baseStats.critChance + (rarity === Rarity.LEGENDARY ? 0.05 : 0),
        armorOnHit: Number(armorOnHit.toFixed(2))
    };

    const element = elements[Math.floor(Math.random() * elements.length)];

    let randomUlt: UltimateType | undefined;
    if (rarity !== Rarity.COMMON && Math.random() > 0.6) {
        randomUlt = getWeightedRandom(ULTIMATE_CONFIG);
    }

    let enchantment: WeaponEnchantment | undefined;
    
    const keys = Object.keys(WEAPON_ENCHANTMENT_CONFIG);
    const totalWeight = keys.reduce((sum, key) => sum + WEAPON_ENCHANTMENT_CONFIG[key].weight, 0);
    let randWeight = Math.random() * totalWeight;
    let selectedKey = 'NONE';
    for (const key of keys) {
        randWeight -= WEAPON_ENCHANTMENT_CONFIG[key].weight;
        if (randWeight <= 0) {
            selectedKey = key;
            break;
        }
    }

    if (selectedKey !== 'NONE') {
        const conf = WEAPON_ENCHANTMENT_CONFIG[selectedKey];
        if (conf.chanceRange && conf.durationRange && conf.type && conf.label) {
            const pChance = conf.chanceRange[0] + Math.random() * (conf.chanceRange[1] - conf.chanceRange[0]);
            const pDuration = conf.durationRange[0] + Math.random() * (conf.durationRange[1] - conf.durationRange[0]);
            
            enchantment = {
                type: conf.type,
                chance: Number(pChance.toFixed(2)),
                duration: Math.floor(pDuration),
                label: conf.label
            };
        }
    }

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
        enchantment,
        durability: 100
    };
};
