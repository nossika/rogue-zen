# RogueZen

A high-octane 2D action roguelike built with React 19 and TypeScript. Navigate a cybernetic trooper through elemental chaos, managing fragile gear while unleashing devastating "Zen" abilities.

## 🚀 Live Demo
**[Play RogueZen Online](https://roguezen-556568459512.us-west1.run.app/)**

## 🎮 Game Overview

### ⚔️ Core Gameplay
- **Auto-Combat**: Focus on positioning. The system automatically targets the nearest threats.
- **Elemental Matrix**: Strategic combat based on the cycle: **Fire 🔥 > Grass 🌿 > Earth 🪨 > Water 💧 > Fire 🔥**.
  - *Advantage*: **3x Damage** dealt.
  - *Disadvantage*: **0.5x Damage** dealt.
- **Zen Ultimates**: Charge your meter by dealing/taking damage to trigger screen-clearing effects like **Time Stop**, **Invincibility**, or **Omni-Force**.
- **Durability System**: Every hit you take damages your gear. Broken items are permanently lost. Balance your aggression with equipment preservation.

### 🕹 Controls
- **Movement**: `WASD` / `Arrow Keys` (Desktop) or **Virtual Joystick** (Mobile).
- **Ultimate**: `Spacebar` or **Ult Button**.
- **Pause/Menu**: `Esc` or **Top-right button**.

---

## 🛠 Developer Documentation

### 🏗 Architecture: Decoupled Systems
The project has been refactored from a monolithic React structure into a **Data-Driven Engine** pattern:

1.  **The Engine (`/systems/core/Engine.ts`)**: 
    - The "Brain" of the game. It handles the physics step, collision detection, and state transitions.
    - Operates independently of the React render cycle to ensure logic consistency.
2.  **The Event Bus (`/systems/core/Events.ts`)**:
    - A centralized `EventEmitter` used to decouple systems. 
    - Example: `CombatSystem` emits `PLAYER_HIT`, which is caught by the `AudioSystem` for SFX and `Game.tsx` for UI vibration/HUD updates.
3.  **Spatial Partitioning (`SpatialHashGrid.ts`)**:
    - Optimizes collision queries from $O(N^2)$ to $O(N)$ by indexing entities in a dynamic grid.
4.  **Procedural Systems**:
    - **World**: Density-based terrain generation.
    - **Loot**: Rarity-weighted item generation with dynamic stat scaling based on `currentStage`.
    - **Audio**: Procedural synthesis using the **Web Audio API** (no external MP3/WAV dependencies).

### 📈 Numerical Logic
- **Damage Calculation**: `(Base + WeaponAtk) * ElementalMult * TalentMult * Crit(2x)`.
- **Durability Loss**: Calculated per-stage based on `TotalHPLost / MaxHP`. Artisan talents can mitigate this by up to 80%.
- **Scaling**: Enemies gain `+HP` and `+Attack` per stage, while item rarity tiers unlock higher potential stat rolls.

### 🚀 Performance Optimizations
- **Canvas Rendering**: Efficient direct-to-pixel rendering with camera-space culling.
- **UI Throttling**: The React HUD only synchronizes with the Engine state every 5 frames to minimize VDOM overhead.
- **Asset-less Design**: High-performance SVG-in-JS and procedural audio ensure sub-second load times.
