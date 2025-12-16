
import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import LevelUpModal from './components/LevelUpModal';
import TalentModal from './components/TalentModal';
import { Player, UpgradeReward, GameAssets } from './types';
import { Play, Pause, Skull, RotateCcw, HelpCircle, X, Keyboard, Swords, ArrowRight, Home } from 'lucide-react';
import { DEFAULT_PLAYER_SPRITE, DEFAULT_ENEMY_SPRITE } from './defaultAssets';
import { AudioSystem } from '@/systems/core/Audio';

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

  // Audio State Management
  useEffect(() => {
      if (gameState === 'PLAYING') {
          AudioSystem.startMusic();
      } else if (gameState === 'MENU' || gameState === 'GAME_OVER') {
          AudioSystem.stopMusic();
      }
      // Keep music playing during Pause/Stage Clear, maybe lower volume or just keep it ambient
  }, [gameState]);

  const isPortrait = dimensions.width < dimensions.height;

  const startGame = () => {
    // Initialize Audio Context on user interaction
    AudioSystem.init();
    AudioSystem.startMusic();

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
    AudioSystem.playStageClear();
  };

  const handleUpgradeSelect = (reward: UpgradeReward, remainingGold: number) => {
    setUpgradeChosen(reward);
    setPersistentGold(remainingGold); // Update gold after potential rerolls
    setCurrentStage(prev => prev + 1);
    setGameState('PLAYING');
    AudioSystem.playLevelUp();
  };

  const toggleHelp = () => {
      const willShow = !showHelp;
      setShowHelp(willShow);
      if (willShow && gameState === 'PLAYING') {
          setGameState('PAUSED');
      }
  };

  // Wrapper style for forced landscape
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
          // If Boss Stage (every 6 levels), show TalentModal, otherwise standard LevelUp
          (currentStage % 6 === 0) ? (
            <TalentModal 
              player={playerSnapshot} 
              onSelect={handleUpgradeSelect} 
            />
          ) : (
            <LevelUpModal 
              level={currentStage} 
              player={playerSnapshot}
              onSelect={handleUpgradeSelect} 
            />
          )
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
                    className="px-6 py-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 flex items-center justify-center gap-2"
                  >
                     <HelpCircle size={18} /> HOW TO PLAY
                  </button>
                  <button 
                    onClick={() => setGameState('MENU')}
                    className="px-6 py-3 bg-red-900/50 text-red-200 font-bold rounded hover:bg-red-800/50 flex items-center justify-center gap-2 border border-red-800/50"
                  >
                    <Home size={18} /> MAIN MENU
                  </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/80 backdrop-blur-md p-4 animate-in fade-in duration-1000">
               <div className="text-center max-w-md w-full">
                   <div className="mb-6 animate-bounce">
                       <Skull size={80} className="text-red-500 mx-auto drop-shadow-xl" />
                   </div>
                   <h2 className="text-5xl md:text-7xl font-pixel text-red-500 drop-shadow-lg mb-2">GAME OVER</h2>
                   <div className="text-2xl text-white mb-8">
                       STAGE REATTAINED: <span className="font-bold text-yellow-400">{finalScore}</span>
                   </div>
                   
                   <div className="flex flex-col gap-4">
                       <button 
                         onClick={startGame}
                         className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-xl hover:shadow-red-500/30 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                       >
                         <RotateCcw /> RESTART
                       </button>
                       <button 
                         onClick={() => setGameState('MENU')}
                         className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition-colors"
                       >
                         MAIN MENU
                       </button>
                   </div>
               </div>
           </div>
        )}

        {showHelp && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-gray-900 border border-gray-600 rounded-xl max-w-2xl w-full shadow-2xl relative flex flex-col max-h-full">
                    <button 
                        onClick={toggleHelp}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">
                            <HelpCircle className="text-yellow-400" /> How to Play
                        </h2>
                        
                        <div className="space-y-6 text-gray-300">
                            <section>
                                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                    <Keyboard className="text-blue-400" /> Controls
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-800 p-4 rounded-lg">
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span>Movement</span>
                                        <span className="font-mono text-white">WASD / Arrows / Joystick</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span>Ultimate Ability</span>
                                        <span className="font-mono text-white">SPACE / Button</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span>Pause</span>
                                        <span className="font-mono text-white">ESC</span>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                    <Swords className="text-red-400" /> Gameplay Mechanics
                                </h3>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li><strong className="text-white">Auto-Attack:</strong> Characters attack automatically when enemies are in range.</li>
                                    <li><strong className="text-white">Elements:</strong> <span className="text-red-400">Fire</span> {'>'} <span className="text-green-400">Grass</span> {'>'} <span className="text-yellow-700">Earth</span> {'>'} <span className="text-blue-400">Water</span> {'>'} <span className="text-red-400">Fire</span>. Advantage deals <strong>3x Damage</strong>!</li>
                                    <li><strong className="text-white">Gear:</strong> You can hold 2 Weapons and 2 Armor pieces.</li>
                                    <li><strong className="text-white">Durability:</strong> Items lose durability when you take damage. Broken items are lost!</li>
                                    <li><strong className="text-white">Ultimates:</strong> Weapons can have Ultimate skills. Charge by dealing/taking damage.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                    <ArrowRight className="text-green-400" /> Tips
                                </h3>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li>Prioritize <strong className="text-yellow-400">Gold</strong> to reroll for better gear.</li>
                                    <li>Match your weapon element to the enemies for massive damage.</li>
                                    <li>Defeating <strong className="text-purple-400">Bosses</strong> (every 6 stages) grants powerful <strong>Talents</strong>.</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-xl flex justify-center">
                        <button 
                            onClick={toggleHelp}
                            className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;
