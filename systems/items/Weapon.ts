
import { Item, Rarity, ElementType, WeaponType, UltimateType, Stats, WeaponEnchantment } from '../../types';
import { WEAPON_BASE_CONFIG, RARITY_COLORS, ULTIMATE_CONFIG, WEAPON_ENCHANTMENT_CONFIG } from '../../constants';
import { getWeightedRandom } from '../utils';

export const generateRandomWeapon = (level: number): Item => {
    const weaponTypes: WeaponType[] = ['SWORD', 'AXE', 'DAGGER', 'PISTOL', 'SPEAR', 'SNIPER', 'BOW', 'BOMB'];
    const elements = Object.values(ElementType);
    
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
        
        const pChance = conf.chanceRange[0] + Math.random() * (conf.chanceRange[1] - conf.chanceRange[0]);
        const pDuration = conf.durationRange[0] + Math.random() * (conf.durationRange[1] - conf.durationRange[0]);
        
        enchantment = {
            type: conf.type,
            chance: Number(pChance.toFixed(2)),
            duration: Math.floor(pDuration),
            label: conf.label
        };
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
