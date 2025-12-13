
import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import LevelUpModal from './components/LevelUpModal';
import { Player, Item, Stats, GameAssets, ElementType, UpgradeReward } from './types';
import { Play, Pause, Skull, RotateCcw, HelpCircle, X, Keyboard, Swords, ArrowRight, Home } from 'lucide-react';
import { DEFAULT_PLAYER_SPRITE, DEFAULT_ENEMY_SPRITE } from './defaultAssets';
import { ELEMENT_CONFIG } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'GAME_OVER'>('MENU');
  
  // Initialize with high-quality default SVGs
  const [assets] = useState<GameAssets>({
    playerSprite: DEFAULT_PLAYER_SPRITE,
    enemySprite: DEFAULT_ENEMY_SPRITE,
    groundTexture: null,
  });
  
  const [upgradeChosen, setUpgradeChosen] = useState<UpgradeReward | null>(null);
  const [currentStage, setCurrentStage] = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const [playerSnapshot, setPlayerSnapshot] = useState<Player | null>(null);
  const [persistentGold, setPersistentGold] = useState(0); // Track gold across stages
  const [gameKey, setGameKey] = useState(0); // Key to force re-mount on restart
  const [showHelp, setShowHelp] = useState(false);
  
  // Explicit dimensions to handle mobile address bar (dvh equivalent via JS)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPortrait = dimensions.width < dimensions.height;

  const startGame = () => {
    setGameState('PLAYING');
    setUpgradeChosen(null);
    setCurrentStage(1);
    setPlayerSnapshot(null);
    setPersistentGold(0); // Reset gold on new run
    setGameKey(prev => prev + 1); // Force complete reset of Game component
  };

  const handleGameOver = (stage: number) => {
    setGameState('GAME_OVER');
    setFinalScore(stage);
  };

  const handleStageClear = (playerData: Player) => {
    setPlayerSnapshot(playerData);
    setPersistentGold(playerData.gold); // Sync gold from game state
    setGameState('STAGE_CLEAR');
  };

  const handleUpgradeSelect = (reward: UpgradeReward, remainingGold: number) => {
    setUpgradeChosen(reward);
    setPersistentGold(remainingGold); // Update gold after potential rerolls
    setCurrentStage(prev => prev + 1);
    setGameState('PLAYING');
  };

  const toggleHelp = () => {
      const willShow = !showHelp;
      setShowHelp(willShow);
      if (willShow && gameState === 'PLAYING') {
          setGameState('PAUSED');
      }
  };

  // Wrapper style for forced landscape
  // If Portrait: Rotate 90deg and swap W/H to fit the screen
  const containerStyle: React.CSSProperties = isPortrait ? {
    width: `${dimensions.height}px`, 
    height: `${dimensions.width}px`,
    transform: 'rotate(90deg)',
    transformOrigin: 'center center',
    position: 'absolute',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    overflow: 'hidden'
  } : {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    overflow: 'hidden',
    position: 'relative'
  };

  return (
    <div className="fixed inset-0 bg-gray-900 font-sans overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black pointer-events-none" />

      {/* Main Game Container - Rotates if Portrait */}
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        
        {gameState === 'MENU' && (
          <div className="z-10 text-center space-y-8 animate-in fade-in duration-700 px-4">
            <h1 className="text-4xl md:text-7xl font-pixel text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">
              ROGUE ZEN
            </h1>
            <p className="text-gray-400 text-sm md:text-lg max-w-md mx-auto">
              Clear stages. Upgrade gear. Survive.
            </p>
            
            <div className="flex flex-col gap-4 w-full md:w-64 mx-auto">
              <button 
                onClick={startGame}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105"
              >
                <Play fill="currentColor" /> START RUN
              </button>
              <button
                onClick={toggleHelp}
                className="flex items-center justify-center gap-3 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg transition-all"
              >
                <HelpCircle size={20} /> HOW TO PLAY
              </button>
            </div>
          </div>
        )}

        {(gameState === 'PLAYING' || gameState === 'STAGE_CLEAR' || gameState === 'PAUSED' || gameState === 'GAME_OVER') && (
          <div className="relative z-10 w-full h-full flex justify-center items-center">
            {/* Add Key to force reset on restart */}
            <Game 
                key={gameKey} 
                assets={assets}
                currentStage={currentStage}
                onGameOver={handleGameOver}
                onStageClear={handleStageClear}
                isPaused={gameState !== 'PLAYING'}
                onPauseToggle={() => setGameState(prev => prev === 'PAUSED' ? 'PLAYING' : 'PAUSED')}
                upgradeChosen={upgradeChosen}
                onUpgradeApplied={() => setUpgradeChosen(null)}
                isPortrait={isPortrait}
                initialGold={persistentGold}
            />
            
            {/* In-Game Controls (Top Right) */}
            <div className="absolute top-2 right-2 md:top-4 md:right-4 flex gap-2 z-[60]">
                <button 
                  onClick={toggleHelp}
                  className="w-10 h-10 flex items-center justify-center bg-gray-800/80 rounded-full border-2 border-gray-600 text-white hover:bg-gray-700 hover:border-yellow-400 transition-colors"
                  title="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setGameState(prev => prev === 'PAUSED' ? 'PLAYING' : 'PAUSED')}
                  className="w-10 h-10 flex items-center justify-center bg-gray-800/80 rounded-full border-2 border-gray-600 text-white hover:bg-gray-700 hover:border-white transition-colors"
                  title="Pause"
                >
                  {gameState === 'PAUSED' ? <Play className="w-5 h-5" fill="currentColor" /> : <Pause className="w-5 h-5" fill="currentColor" />}
                </button>
            </div>
          </div>
        )}

        {/* Overlays */}
        {gameState === 'STAGE_CLEAR' && playerSnapshot && (
          <LevelUpModal 
            level={currentStage} 
            player={playerSnapshot}
            onSelect={handleUpgradeSelect} 
          />
        )}

        {gameState === 'PAUSED' && !showHelp && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="text-center bg-gray-900 border border-gray-600 p-8 rounded-xl shadow-2xl w-full max-w-sm">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-wider">PAUSED</h2>
              <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setGameState('PLAYING')}
                    className="px-6 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 flex items-center justify-center gap-2"
                  >
                    <Play size={18} fill="currentColor" /> RESUME
                  </button>
                  <button 
                    onClick={() => setShowHelp(true)}
                    className="px-6 py-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 border border-gray-500 flex items-center justify-center gap-2"
                  >
                    <HelpCircle size={18} /> HELP
                  </button>
                  <button 
                    onClick={() => setGameState('MENU')}
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-500 border border-red-400 flex items-center justify-center gap-2"
                  >
                    <Home size={18} /> MAIN MENU
                  </button>
              </div>
            </div>
          </div>
        )}

        {showHelp && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
              {/* Use max-h-[90dvh] for mobile safety */}
              <div className="bg-gray-900 border-2 border-purple-500 rounded-2xl p-4 md:p-8 max-w-4xl w-full relative shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
                  <button 
                      onClick={() => setShowHelp(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  >
                      <X size={32} />
                  </button>
                  
                  <h2 className="text-2xl md:text-3xl font-pixel text-center text-purple-400 mb-6 md:mb-8 underline decoration-purple-500/30 underline-offset-8">GAME GUIDE</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      {/* Controls */}
                      <div className="bg-gray-800/50 p-4 md:p-6 rounded-xl border border-gray-700">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                              <Keyboard className="text-yellow-400" /> Controls
                          </h3>
                          <ul className="space-y-4 text-gray-300 text-sm md:text-base">
                              <li className="flex items-center justify-between">
                                  <span>Move</span>
                                  <div className="flex items-center gap-1">
                                      <span className="bg-gray-700 px-2 py-1 rounded border border-gray-600 font-mono text-xs md:text-sm">WASD</span>
                                      <span className="text-gray-500 text-xs">or Joystick</span>
                                  </div>
                              </li>
                              <li className="flex items-center justify-between">
                                  <span>Ultimate Skill</span>
                                  <span className="bg-gray-700 px-3 py-1 rounded border border-gray-600 font-mono text-xs md:text-sm">SPACE / Btn</span>
                              </li>
                              <li className="flex items-center justify-between">
                                  <span>Pause / Back</span>
                                  <span className="bg-gray-700 px-3 py-1 rounded border border-gray-600 font-mono text-xs md:text-sm">ESC</span>
                              </li>
                          </ul>
                      </div>

                      {/* Gameplay */}
                      <div className="bg-gray-800/50 p-4 md:p-6 rounded-xl border border-gray-700">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                              <Swords className="text-red-400" /> Mechanics
                          </h3>
                          <ul className="space-y-2 text-gray-300 text-xs md:text-sm list-disc list-inside">
                              <li>Weapons auto-fire when enemies are in range.</li>
                              <li>Collect <strong>Gold</strong> to reroll rewards.</li>
                              <li>Defeat Bosses every 5 stages.</li>
                              <li>Collect <strong>Armor</strong> to gain passive stats and Shields.</li>
                              <li>Charge your <strong>Ultimate</strong> by dealing and taking damage.</li>
                          </ul>
                      </div>
                  </div>

                  {/* Elemental System Circular */}
                  <div className="mt-8 bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                      <h3 className="text-xl font-bold text-white mb-6 text-center">Elemental Mastery</h3>
                      
                      <div className="relative w-64 h-64 mx-auto scale-75 md:scale-100 origin-center">
                          {/* Central Decoration */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="text-center opacity-20 text-gray-400">
                                  <Swords size={48} className="mx-auto mb-1" />
                                  <span className="text-[10px] font-bold tracking-widest">CYCLE</span>
                              </div>
                          </div>

                          {/* WATER (Top) */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center transform -translate-y-2">
                              <div className="w-12 h-12 rounded-full border-2 bg-gray-900 flex items-center justify-center text-xl shadow-[0_0_10px_currentColor] z-10"
                                    style={{ borderColor: ELEMENT_CONFIG.WATER.color, color: ELEMENT_CONFIG.WATER.color }}>
                                  {ELEMENT_CONFIG.WATER.icon}
                              </div>
                              <span className="text-[10px] font-bold mt-1" style={{ color: ELEMENT_CONFIG.WATER.color }}>WATER</span>
                          </div>

                          {/* FIRE (Right) */}
                          <div className="absolute top-1/2 right-0 -translate-y-1/2 flex flex-col items-center transform translate-x-2">
                              <div className="w-12 h-12 rounded-full border-2 bg-gray-900 flex items-center justify-center text-xl shadow-[0_0_10px_currentColor] z-10"
                                    style={{ borderColor: ELEMENT_CONFIG.FIRE.color, color: ELEMENT_CONFIG.FIRE.color }}>
                                  {ELEMENT_CONFIG.FIRE.icon}
                              </div>
                              <span className="text-[10px] font-bold mt-1" style={{ color: ELEMENT_CONFIG.FIRE.color }}>FIRE</span>
                          </div>

                          {/* GRASS (Bottom) */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center transform translate-y-2">
                              <span className="text-[10px] font-bold mb-1" style={{ color: ELEMENT_CONFIG.GRASS.color }}>GRASS</span>
                              <div className="w-12 h-12 rounded-full border-2 bg-gray-900 flex items-center justify-center text-xl shadow-[0_0_10px_currentColor] z-10"
                                    style={{ borderColor: ELEMENT_CONFIG.GRASS.color, color: ELEMENT_CONFIG.GRASS.color }}>
                                  {ELEMENT_CONFIG.GRASS.icon}
                              </div>
                          </div>

                          {/* EARTH (Left) */}
                          <div className="absolute top-1/2 left-0 -translate-y-1/2 flex flex-col items-center transform -translate-x-2">
                              <div className="w-12 h-12 rounded-full border-2 bg-gray-900 flex items-center justify-center text-xl shadow-[0_0_10px_currentColor] z-10"
                                    style={{ borderColor: ELEMENT_CONFIG.EARTH.color, color: ELEMENT_CONFIG.EARTH.color }}>
                                  {ELEMENT_CONFIG.EARTH.icon}
                              </div>
                              <span className="text-[10px] font-bold mt-1" style={{ color: ELEMENT_CONFIG.EARTH.color }}>EARTH</span>
                          </div>

                          {/* Arrows */}
                          {/* Water -> Fire (Top Right quadrant) */}
                          <div className="absolute top-1/4 right-1/4 translate-x-2 -translate-y-2 text-gray-500">
                              <ArrowRight size={24} className="rotate-45" />
                          </div>

                          {/* Fire -> Grass (Bottom Right quadrant) */}
                          <div className="absolute bottom-1/4 right-1/4 translate-x-2 translate-y-2 text-gray-500">
                              <ArrowRight size={24} className="rotate-135" />
                          </div>

                          {/* Grass -> Earth (Bottom Left quadrant) */}
                          <div className="absolute bottom-1/4 left-1/4 -translate-x-2 translate-y-2 text-gray-500">
                              <ArrowRight size={24} className="rotate-[225deg]" />
                          </div>

                          {/* Earth -> Water (Top Left quadrant) */}
                          <div className="absolute top-1/4 left-1/4 -translate-x-2 -translate-y-2 text-gray-500">
                              <ArrowRight size={24} className="rotate-[315deg]" />
                          </div>
                      </div>
                      
                      <div className="text-center mt-6 text-xs md:text-sm text-gray-400">
                          <span className="text-green-400 font-bold">3.0x Damage</span> vs Weakness &nbsp;|&nbsp; <span className="text-gray-500 font-bold">0.5x Damage</span> vs Resistance
                      </div>
                  </div>

                  <div className="mt-8 text-center">
                      <button 
                          onClick={() => setShowHelp(false)}
                          className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg"
                      >
                          GOT IT
                      </button>
                  </div>
              </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/90 backdrop-blur-md animate-in zoom-in duration-300 p-4">
            <div className="text-center space-y-6">
              <Skull className="w-16 h-16 md:w-24 md:h-24 text-black mx-auto" />
              <h2 className="text-4xl md:text-6xl font-pixel text-white">YOU DIED</h2>
              <p className="text-xl md:text-2xl text-red-200">Stage Reached: {finalScore}</p>
              <button 
                onClick={() => setGameState('MENU')}
                className="px-8 py-4 bg-black text-red-500 font-bold text-xl rounded border-2 border-red-500 hover:bg-red-500 hover:text-black transition-colors"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
