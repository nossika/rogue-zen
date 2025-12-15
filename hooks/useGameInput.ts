
import { useEffect, useRef } from 'react';

export const useGameInput = (
    onPauseToggle: () => void, 
    activateUltimate: () => void,
    onDevSkip?: () => void
) => {
    const keysRef = useRef<{ [key: string]: boolean }>({});
    
    // Use refs to hold mutable state for the cheat code so it persists across renders
    const devCheatRef = useRef({ count: 0, lastTime: 0 });
    
    // Store callbacks in a ref to avoid adding them to the useEffect dependency array
    // This ensures we always use the latest function without re-binding event listeners
    const callbacksRef = useRef({ onPauseToggle, activateUltimate, onDevSkip });
    
    // Update the ref on every render
    useEffect(() => {
        callbacksRef.current = { onPauseToggle, activateUltimate, onDevSkip };
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.key] = true;
            
            // Access latest callbacks via ref
            if (e.code === 'Space') {
                callbacksRef.current.activateUltimate();
            }
            if (e.key === 'Escape') {
                callbacksRef.current.onPauseToggle();
            }

            // Dev Backdoor: Press 'N' 10 times quickly
            // We check keysRef or event key directly
            if (e.key.toLowerCase() === 'n' && callbacksRef.current.onDevSkip) {
                const now = Date.now();
                if (now - devCheatRef.current.lastTime > 400) {
                    devCheatRef.current.count = 1;
                } else {
                    devCheatRef.current.count++;
                }
                devCheatRef.current.lastTime = now;

                if (devCheatRef.current.count >= 10) {
                    callbacksRef.current.onDevSkip();
                    devCheatRef.current.count = 0;
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current[e.key] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []); // Empty dependency array: Listeners attached ONCE

    const handleJoystickMove = (x: number, y: number) => {
        const threshold = 0.2;
        keysRef.current['d'] = x > threshold;
        keysRef.current['a'] = x < -threshold;
        keysRef.current['s'] = y > threshold;
        keysRef.current['w'] = y < -threshold;
        
        keysRef.current['ArrowRight'] = x > threshold;
        keysRef.current['ArrowLeft'] = x < -threshold;
        keysRef.current['ArrowDown'] = y > threshold;
        keysRef.current['ArrowUp'] = y < -threshold;
    };

    return { keysRef, handleJoystickMove };
};
