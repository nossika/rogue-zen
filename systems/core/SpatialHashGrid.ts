
import { Enemy } from '../../types';

// Optimization: Spatial Hash Grid Class for Collision
export class SpatialHashGrid {
  private cellSize: number;
  private buckets: Map<string, Enemy[]>;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.buckets = new Map();
  }

  clear() {
    this.buckets.clear();
  }

  insert(enemy: Enemy) {
    // We register the enemy in every cell they touch (simple bounding box approximation)
    // For simplicity in this game, registration by center point is usually sufficient 
    // if we check neighboring cells during query.
    const key = this.getKey(enemy.x, enemy.y);
    if (!this.buckets.has(key)) {
      this.buckets.set(key, []);
    }
    this.buckets.get(key)!.push(enemy);
  }

  // Get potential enemies near a point (x,y) with a search radius
  query(x: number, y: number, radius: number = 0): Enemy[] {
    const results: Enemy[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize) + 1; // Check neighbors
    
    const centerCol = Math.floor(x / this.cellSize);
    const centerRow = Math.floor(y / this.cellSize);

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const key = `${centerCol + i},${centerRow + j}`;
            const bucket = this.buckets.get(key);
            if (bucket) {
                // Optimization: Push individually to avoid creating new array spread overhead
                for(let k=0; k<bucket.length; k++) {
                    results.push(bucket[k]);
                }
            }
        }
    }
    return results;
  }

  private getKey(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
