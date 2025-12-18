
import { Terrain, TerrainType } from '../../types';
import { MAP_WIDTH, MAP_HEIGHT, TERRAIN_CONFIG } from '../../constants';
import { checkRectOverlap } from '../utils';

export const generateTerrain = (): Terrain[] => {
  const newTerrain: Terrain[] = [];
  const mapArea = MAP_WIDTH * MAP_HEIGHT;
  
  const safeX = MAP_WIDTH / 2 - 150;
  const safeY = MAP_HEIGHT / 2 - 150;
  const safeW = 300;
  const safeH = 300;

  // Build a list of terrain types to generate based on density
  const spawnQueue: TerrainType[] = [];
  (Object.keys(TERRAIN_CONFIG) as TerrainType[]).forEach(type => {
      const density = TERRAIN_CONFIG[type].density;
      const count = Math.floor(mapArea * density);
      for (let i = 0; i < count; i++) {
          spawnQueue.push(type);
      }
  });

  // Shuffle the queue to mix generation order
  for (let i = spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spawnQueue[i], spawnQueue[j]] = [spawnQueue[j], spawnQueue[i]];
  }

  spawnQueue.forEach((tType, i) => {
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
              const blockSize = 40;
              const cols = Math.ceil(tw! / blockSize);
              const rows = Math.ceil(th! / blockSize);
              
              for (let r = 0; r < rows; r++) {
                  for (let c = 0; c < cols; c++) {
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
  });

  return newTerrain;
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
