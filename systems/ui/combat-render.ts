
import { Item, Projectile, Rarity, ElementType } from '../../types';
import { WEAPON_BASE_CONFIG, RARITY_CONFIG, ELEMENT_CONFIG, DETAIL_COLORS } from '../../constants';

export const drawWeapon = (ctx: CanvasRenderingContext2D, weapon: Item | null, x: number, y: number) => {
    if (!weapon) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);

    const type = weapon.subtype || 'SWORD';
    const rarityColor = RARITY_CONFIG[weapon.rarity].color;
    const elementColor = ELEMENT_CONFIG[weapon.element || ElementType.NONE].color;
    
    // Weapon Trail/Glow
    if (weapon.rarity !== Rarity.COMMON) {
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 8;
    }

    switch(type) {
        case 'SWORD':
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(-4, 30); ctx.lineTo(0, 35); ctx.lineTo(4, 30); ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#94a3b8'; ctx.stroke();
            break;
        case 'AXE':
            ctx.fillStyle = '#71717a';
            ctx.fillRect(-2, 0, 4, 30);
            ctx.fillStyle = '#a1a1aa';
            ctx.beginPath();
            ctx.moveTo(0, 15); ctx.quadraticCurveTo(15, 10, 0, 35); ctx.fill();
            break;
        default:
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(-2, 0, 4, 25);
    }

    // Element Core
    if (weapon.element !== ElementType.NONE) {
        ctx.fillStyle = elementColor;
        ctx.beginPath(); ctx.arc(0, 20, 3, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
};

export const drawProjectile = (ctx: CanvasRenderingContext2D, proj: Projectile) => {
    ctx.save();
    ctx.translate(proj.x, proj.y);
    
    if (proj.isMelee) {
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(angle);
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius, -0.8, 0.8);
        ctx.stroke();
        
        // Inner white streak
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius * 0.9, -0.6, 0.6);
        ctx.stroke();
    } else {
        // Projectile Glow
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // White core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, proj.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
};
