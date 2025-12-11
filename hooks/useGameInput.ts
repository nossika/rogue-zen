
import { useEffect, useRef } from 'react';

export const useGameInput = (onPauseToggle: () => void, activateUltimate: () => void) => {
    const keysRef = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.key] = true;
            if (e.code === 'Space') activateUltimate();
            if (e.key === 'Escape') onPauseToggle();
        };
        const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onPauseToggle, activateUltimate]);

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
