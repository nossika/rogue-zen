
import { Terrain, TerrainType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TERRAIN_CONFIG } from '../constants';
import { checkRectOverlap } from './utils';

export const generateTerrain = (): Terrain[] => {
  const newTerrain: Terrain[] = [];
  const count = Math.floor(25 + Math.random() * 15); // Increased terrain count for larger map
  
  // Safety Zone definition (Center of map)
  const safeX = MAP_WIDTH / 2 - 150;
  const safeY = MAP_HEIGHT / 2 - 150;
  const safeW = 300;
  const safeH = 300;

  for (let i = 0; i < count; i++) {
      let tType: TerrainType = 'WALL';
      const roll = Math.random();
      if (roll > 0.85) tType = 'WATER';
      else if (roll > 0.70) tType = 'MUD';
      else if (roll > 0.40) tType = 'EARTH_WALL'; // 30% Earth Wall
      else tType = 'WALL'; // 40% Stone Wall
      
      let tx, ty, tw, th;
      let attempts = 0;
      let valid = false;
      
      do {
          if (tType === 'WALL' || tType === 'EARTH_WALL') {
              const isVertical = Math.random() > 0.5;
              if (isVertical) {
                  tw = 30 + Math.random() * 20;    
                  th = 150 + Math.random() * 250;  
              } else {
                  tw = 150 + Math.random() * 250;  
                  th = 30 + Math.random() * 20;    
              }
          } else {
              tw = 80 + Math.random() * 100;
              th = 80 + Math.random() * 100;
          }
          
          tx = Math.random() * (MAP_WIDTH - tw);
          ty = Math.random() * (MAP_HEIGHT - th);
          
          const overlapsSafeZone = 
              tx < safeX + safeW &&
              tx + tw > safeX &&
              ty < safeY + safeH &&
              ty + th > safeY;

          if (!overlapsSafeZone) {
              valid = true;
          }
          attempts++;
      } while (!valid && attempts < 20);

      if (valid) {
          if (tType === 'EARTH_WALL') {
              // Generate Earth Walls as clusters of small blocks for destructibility
              const blockSize = 40;
              const cols = Math.ceil(tw! / blockSize);
              const rows = Math.ceil(th! / blockSize);
              
              for (let r = 0; r < rows; r++) {
                  for (let c = 0; c < cols; c++) {
                      // Skip some blocks randomly to make it look organic? 
                      // No, solid wall is better for "Wall".
                      newTerrain.push({
                          id: `ew-${i}-${r}-${c}`,
                          x: tx! + c * blockSize,
                          y: ty! + r * blockSize,
                          width: blockSize,
                          height: blockSize,
                          type: 'EARTH_WALL'
                      });
                  }
              }
          } else {
              newTerrain.push({
                  id: `t-${i}`,
                  x: tx!,
                  y: ty!,
                  width: tw!,
                  height: th!,
                  type: tType
              });
          }
      }
  }
  return newTerrain;
};

export const drawTerrain = (ctx: CanvasRenderingContext2D, terrain: Terrain[]) => {
    terrain.forEach(t => {
        const conf = TERRAIN_CONFIG[t.type];
        ctx.fillStyle = conf.color;
        
        if (t.type === 'WALL') {
            ctx.fillRect(t.x, t.y, t.width, t.height);
            // Stone bevel
            const bevelH = Math.min(10, t.height * 0.4);
            const bevelW = Math.min(5, t.width * 0.4);
            ctx.fillStyle = '#475569';
            ctx.fillRect(t.x, t.y, t.width, bevelH);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(t.x + t.width - bevelW, t.y, bevelW, t.height);
        } else if (t.type === 'EARTH_WALL') {
            ctx.fillRect(t.x, t.y, t.width, t.height);
            // Earth texture details
            ctx.fillStyle = '#451a03'; // Darker brown specs
            // Use deterministic seed for consistent rendering based on ID
            const seed = parseInt(t.id.split('-').pop() || '0'); 
            
            // Draw a simple pattern so it looks like a block but tiled
            ctx.fillRect(t.x + 4, t.y + 4, t.width - 8, t.height - 8);
            
            ctx.fillStyle = '#92400e'; // Lighter speck
            ctx.beginPath();
            ctx.rect(t.x + (seed % 20), t.y + (seed % 20), 4, 4);
            ctx.fill();

        } else if (t.type === 'WATER') {
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 20);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(t.x + 30, t.y + 30, 10, 0, Math.PI*2); ctx.stroke();
        } else {
            // MUD or other
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.width, t.height, 10);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for(let i=0; i<3; i++) {
                const offsetX = (t.x * i * 17) % t.width;
                const offsetY = (t.y * i * 23) % t.height;
                ctx.beginPath(); 
                ctx.arc(t.x + offsetX, t.y + offsetY, 2, 0, Math.PI*2); 
                ctx.fill();
            }
        }
    });
};

export const getTerrainAt = (terrain: Terrain[], x: number, y: number, w: number, h: number): TerrainType | null => {
    for (const t of terrain) {
        if (t.type === 'WALL' || t.type === 'EARTH_WALL') {
             if (checkRectOverlap(x - 10, y - 10, 20, 20, t.x, t.y, t.width, t.height)) {
                 return t.type;
             }
        } else {
             if (x > t.x && x < t.x + t.width && y > t.y && y < t.y + t.height) {
                 return t.type;
             }
        }
    }
    return null;
};
