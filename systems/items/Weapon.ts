
import { Item, Rarity, ElementType, WeaponType, UltimateType, Stats, WeaponEnchantment } from '../../types';
import { WEAPON_BASE_CONFIG, RARITY_CONFIG, ULTIMATE_CONFIG, WEAPON_ENCHANTMENT_CONFIG } from '../../constants';
import { getWeightedRandom, calculateRarityValue } from '../utils';

export const generateRandomWeapon = (level: number): Item => {
    const weaponTypes: WeaponType[] = ['SWORD', 'AXE', 'DAGGER', 'PISTOL', 'SPEAR', 'SNIPER', 'BOW', 'BOMB'];
    const elements = Object.values(ElementType);
    
    // 1. Pick Rarity
    const rarity = getWeightedRandom(RARITY_CONFIG) as Rarity;
    const configDef = RARITY_CONFIG[rarity];

    // 2. Pick Type & Element
    const subtype = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    const config = WEAPON_BASE_CONFIG[subtype];
    const name = `${rarity} ${config.name}`;
    const element = elements[Math.floor(Math.random() * elements.length)];

    // 3. Calculate Stats using Range Logic
    // We define a "Global Range" for fluctuation based on base stats + level scaling.
    // Min = Base * 0.9, Max = Base * 1.4 (plus growth)
    
    const levelScaling = level * 1.5;
    
    const calcStat = (baseVal: number, isSpeed: boolean = false, isCrit: boolean = false) => {
        if (isCrit) return baseVal; // Crit usually static base + rarity bonus

        // Base growth logic
        const growingBase = baseVal + (isSpeed ? 0 : levelScaling);
        
        // Define Global Spread (e.g. -10% to +40%)
        const globalMin = growingBase * 0.9;
        const globalMax = growingBase * 1.4;
        
        const val = calculateRarityValue(globalMin, globalMax, configDef.range);
        
        if (isSpeed) return Number(val.toFixed(2));
        return Math.floor(val);
    };

    const finalAttack = calcStat(config.baseStats.attack);
    const finalRange = calcStat(config.baseStats.range);
    const finalKnockback = calcStat(config.baseStats.knockback);
    
    // Attack Speed: higher rarity = higher speed within range
    const finalSpeed = calcStat(config.baseStats.attackSpeed, true);

    let armorOnHit = 0;
    if (config.category === 'MELEE') {
        // Melee Armor Gain Logic
        // Base gain target ~0.5 per second -> per hit = 0.5 / Speed
        const targetPerSec = 0.5 + (level * 0.05);
        const baseAOH = targetPerSec / Math.max(0.1, finalSpeed);
        
        const minAOH = baseAOH * 0.8;
        const maxAOH = baseAOH * 1.5;
        
        armorOnHit = Number(calculateRarityValue(minAOH, maxAOH, configDef.range).toFixed(2));
    }

    // Crit Bonus for higher rarities
    const rarityCritBonus = rarity === Rarity.LEGENDARY ? 0.1 : (rarity === Rarity.EPIC ? 0.05 : 0);

    const stats: Partial<Stats> = {
        attack: finalAttack,
        range: finalRange,
        attackSpeed: finalSpeed,
        knockback: finalKnockback,
        critChance: config.baseStats.critChance + rarityCritBonus,
        armorOnHit: armorOnHit
    };

    // 4. Ultimate Generation
    let randomUlt: UltimateType | undefined;
    if (Math.random() < configDef.ultimateChance) {
        randomUlt = getWeightedRandom(ULTIMATE_CONFIG);
    }

    // 5. Enchantment Generation
    let enchantment: WeaponEnchantment | undefined;
    if (Math.random() < configDef.enchantmentChance) {
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
                // Higher rarity gets better enchantment rolls (top of range)
                // We reuse calculateRarityValue to bias towards the top for better rarities
                const pChance = calculateRarityValue(conf.chanceRange[0], conf.chanceRange[1], configDef.range);
                const pDuration = calculateRarityValue(conf.durationRange[0], conf.durationRange[1], configDef.range);
                
                enchantment = {
                    type: conf.type,
                    chance: Number(pChance.toFixed(2)),
                    duration: Math.floor(pDuration),
                    label: conf.label
                };
            }
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
