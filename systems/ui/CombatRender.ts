
import { Item, Projectile, Rarity, ElementType } from '../../types';
import { WEAPON_BASE_CONFIG, RARITY_CONFIG, ELEMENT_CONFIG, DETAIL_COLORS } from '../../constants';

export const drawWeapon = (ctx: CanvasRenderingContext2D, weapon: Item | null, x: number, y: number) => {
    if (!weapon) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);

    const type = weapon.subtype || 'SWORD';
    const rarityColor = RARITY_CONFIG[weapon.rarity].color;
    const element = weapon.element || ElementType.NONE;
    const elementColor = ELEMENT_CONFIG[element].color;
    
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    switch(type) {
        case 'AXE':
            ctx.fillStyle = DETAIL_COLORS.wood;
            ctx.fillRect(-3, 0, 6, 25);
            ctx.fillStyle = DETAIL_COLORS.darkSteel;
            ctx.beginPath();
            ctx.moveTo(-3, 5);
            ctx.quadraticCurveTo(-15, 0, -3, 15);
            ctx.moveTo(3, 5);
            ctx.quadraticCurveTo(15, 0, 3, 15);
            ctx.fill();
            ctx.strokeStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
            ctx.lineWidth = 2;
            ctx.stroke();
            break;
        case 'DAGGER':
             ctx.fillStyle = '#111';
             ctx.fillRect(-2, 0, 4, 8);
             ctx.fillStyle = DETAIL_COLORS.gold;
             ctx.fillRect(-6, 8, 12, 2);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.beginPath();
             ctx.moveTo(-3, 10);
             ctx.lineTo(0, 25);
             ctx.lineTo(3, 10);
             ctx.fill();
             break;
        case 'SPEAR':
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-2, -5, 4, 45); 
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.beginPath();
             ctx.moveTo(-4, 40);
             ctx.lineTo(0, 55); 
             ctx.lineTo(4, 40);
             ctx.fill();
             break;
        case 'PISTOL':
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-3, 0, 6, 10);
             ctx.fillStyle = '#333';
             ctx.fillRect(-3, 5, 6, 10);
             ctx.fillStyle = DETAIL_COLORS.darkSteel;
             ctx.fillRect(-2, 10, 4, 15);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.fillRect(-2, 10, 4, 12);
             break;
        case 'SNIPER':
             ctx.fillStyle = '#1e293b';
             ctx.fillRect(-3, 0, 6, 40); 
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-4, -5, 8, 15); 
             ctx.fillStyle = '#000';
             ctx.fillRect(-5, 15, 2, 10);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : '#000';
             ctx.fillRect(-3, 38, 6, 4);
             break;
        case 'BOW':
             ctx.strokeStyle = DETAIL_COLORS.wood;
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.arc(0, 15, 20, Math.PI, 0); 
             ctx.stroke();
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(-20, 15);
             ctx.lineTo(20, 15); 
             ctx.stroke();
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.fillRect(-2, 5, 4, 25); 
             break;
        case 'BOMB':
             ctx.fillStyle = '#333';
             ctx.beginPath(); ctx.arc(0, 12, 8, 0, Math.PI * 2); ctx.fill();
             ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 1.5;
             ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(4, 0, 0, -2); ctx.stroke();
             ctx.fillStyle = '#facc15';
             ctx.beginPath(); ctx.arc(0, -2, 2, 0, Math.PI * 2); ctx.fill();
             break;
        case 'SWORD':
        default:
             ctx.fillStyle = DETAIL_COLORS.gold;
             ctx.beginPath(); ctx.arc(0, -2, 3, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = DETAIL_COLORS.wood;
             ctx.fillRect(-2, 0, 4, 8);
             ctx.fillStyle = DETAIL_COLORS.gold;
             ctx.fillRect(-8, 8, 16, 3);
             ctx.fillStyle = element !== ElementType.NONE ? elementColor : DETAIL_COLORS.steel;
             ctx.beginPath();
             ctx.moveTo(-4, 11);
             ctx.lineTo(0, 40);
             ctx.lineTo(4, 11);
             ctx.fill();
             ctx.fillStyle = DETAIL_COLORS.darkSteel;
             ctx.fillRect(-1, 11, 2, 20);
             break;
    }

    if (weapon.rarity !== Rarity.COMMON) {
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -5, 10, 10); 
    }
    
    if (element !== ElementType.NONE) {
        ctx.fillStyle = elementColor;
        ctx.shadowColor = elementColor;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
};

export const drawProjectile = (ctx: CanvasRenderingContext2D, proj: Projectile) => {
    ctx.save();
    ctx.translate(proj.x, proj.y);
    if (proj.isMelee) {
       ctx.rotate(Math.atan2(proj.vy, proj.vx));
       
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius, -Math.PI/3, Math.PI/3);
       ctx.strokeStyle = proj.color;
       ctx.lineWidth = 4;
       ctx.shadowColor = proj.color;
       ctx.shadowBlur = 10;
       ctx.stroke();
       
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius * 0.8, -Math.PI/4, Math.PI/4);
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1;
       ctx.stroke();

    } else if (proj.isBomb) {
       // Calculate parabolic arc
       let arc = 0;
       if (proj.maxDuration) {
           const progress = 1 - (proj.duration / proj.maxDuration);
           arc = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
       }
       
       // Visual "Height" affects Scale and Y-offset (Upward)
       // Base scale 0.8, grows to ~1.6 at peak
       const heightScale = 0.8 + arc * 0.8; 
       const heightOffset = -arc * 40; // Moves up 40px at peak

       // Draw Ground Shadow first (Independent of bomb height)
       ctx.save();
       ctx.fillStyle = 'rgba(0,0,0,0.3)';
       // Shadow shrinks slightly as bomb goes higher
       const shadowRadius = proj.radius * (1 - arc * 0.3); 
       ctx.beginPath();
       ctx.ellipse(0, 0, shadowRadius, shadowRadius * 0.6, 0, 0, Math.PI * 2);
       ctx.fill();
       ctx.restore();

       // Transform for Bomb Body (Height simulation)
       ctx.translate(0, heightOffset);
       ctx.scale(heightScale, heightScale);
       
       // Bomb Body
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
       ctx.fillStyle = proj.isIncendiary ? '#7f1d1d' : '#1f2937'; 
       ctx.fill();
       
       // Highlight
       ctx.beginPath();
       ctx.arc(-3, -3, 3, 0, Math.PI * 2);
       ctx.fillStyle = proj.isIncendiary ? '#ef4444' : '#4b5563';
       ctx.fill();
       
       // Fuse
       const fuseX = 0;
       const fuseY = -proj.radius;
       ctx.beginPath();
       ctx.moveTo(fuseX, fuseY);
       ctx.quadraticCurveTo(fuseX + 5, fuseY - 10, fuseX + 10, fuseY - 5);
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1.5;
       ctx.stroke();
       
       // Spark
       if (Math.floor(Date.now() / 50) % 2 === 0) {
           ctx.beginPath();
           ctx.arc(fuseX + 10, fuseY - 5, 2 + Math.random()*2, 0, Math.PI*2);
           ctx.fillStyle = '#ef4444';
           ctx.fill();
       }
       
    } else {
       ctx.shadowColor = proj.color;
       ctx.shadowBlur = 8;
       ctx.beginPath();
       ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
       ctx.fillStyle = proj.color;
       ctx.fill();
       ctx.beginPath();
       ctx.moveTo(0,0);
       ctx.lineTo(-proj.vx * 3, -proj.vy * 3);
       ctx.strokeStyle = proj.color;
       ctx.stroke();
    }
    ctx.restore();
};
