
// Default Player: A Cybernetic Trooper (Top Down)
// Features: Blue armor, Cyan visor, glowing core
const playerSvg = `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="armorGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#172554" />
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Shoulders -->
  <rect x="10" y="20" width="12" height="24" rx="4" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1"/>
  <rect x="42" y="20" width="12" height="24" rx="4" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1"/>
  
  <!-- Main Body -->
  <circle cx="32" cy="32" r="18" fill="url(#armorGrad)" stroke="#2563eb" stroke-width="2"/>
  
  <!-- Helmet / Head -->
  <circle cx="32" cy="32" r="12" fill="#475569" />
  
  <!-- Visor (Glowing) -->
  <path d="M26 30 Q32 34 38 30" stroke="#06b6d4" stroke-width="3" fill="none" filter="url(#glow)"/>
  
  <!-- Backpack / Tech Bits -->
  <rect x="24" y="50" width="16" height="6" fill="#64748b" rx="2"/>
  <circle cx="32" cy="53" r="2" fill="#06b6d4" filter="url(#glow)"/>
</svg>
`;

// Default Enemy: A Void Spiked Blob
// Features: Red/Purple gradient, spikes, yellow eyes
const enemySvg = `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="monsterGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#581c87" />
    </radialGradient>
  </defs>
  
  <g transform="translate(32,32)">
    <!-- Spikes -->
    <path d="M0 -28 L6 -16 L20 -20 L16 -6 L28 0 L16 6 L20 20 L6 16 L0 28 L-6 16 L-20 20 L-16 6 L-28 0 L-16 -6 L-20 -20 L-6 -16 Z" 
          fill="url(#monsterGrad)" stroke="#7f1d1d" stroke-width="1">
       <animateTransform attributeName="transform" type="scale" values="1;1.05;1" dur="0.5s" repeatCount="indefinite" />
    </path>
    
    <!-- Eyes -->
    <path d="M-10 -8 L-4 -4 L-10 0 Z" fill="#fcd34d" />
    <path d="M10 -8 L4 -4 L10 0 Z" fill="#fcd34d" />
    
    <!-- Mouth -->
    <path d="M-6 8 Q0 12 6 8" stroke="#000" stroke-width="2" fill="none"/>
  </g>
</svg>
`;

export const DEFAULT_PLAYER_SPRITE = `data:image/svg+xml;base64,${btoa(playerSvg)}`;
export const DEFAULT_ENEMY_SPRITE = `data:image/svg+xml;base64,${btoa(enemySvg)}`;
