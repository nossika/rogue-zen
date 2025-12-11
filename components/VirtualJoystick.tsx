
import React, { useRef, useState, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  forceLandscape?: boolean;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, forceLandscape = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [current, setCurrent] = useState({ x: 0, y: 0 });

  const RADIUS = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only capture the first touch
    const touch = e.changedTouches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Use absolute coordinates relative to the viewport
    setOrigin({ x: touch.clientX, y: touch.clientY });
    setCurrent({ x: touch.clientX, y: touch.clientY });
    setActive(true);
    setPosition({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!active) return;
    const touch = e.changedTouches[0];
    
    // Raw Delta relative to screen
    let rawDx = touch.clientX - origin.x;
    let rawDy = touch.clientY - origin.y;

    let dx, dy;

    if (forceLandscape) {
        // If the game is rotated 90deg CW (forced landscape), the screen inputs need to be swapped.
        // Visual Up is Screen Right (X+)
        // Visual Right is Screen Down (Y+)
        
        // Joystick Up (Game Y-) -> Screen X+
        // Joystick Down (Game Y+) -> Screen X-
        // Joystick Left (Game X-) -> Screen Y-
        // Joystick Right (Game X+) -> Screen Y+

        // Wait, standard rotation:
        // [ | ] -> [ - ]
        // Top of content is Right of phone.
        
        // If I push joystick "Up" (towards top of content / right of phone):
        // My finger moves X+.
        // Game needs Y- (Up).
        // So GameY = -ScreenX.

        // If I push joystick "Right" (towards right of content / bottom of phone):
        // My finger moves Y+.
        // Game needs X+ (Right).
        // So GameX = ScreenY.

        dx = rawDy;
        dy = -rawDx;
    } else {
        dx = rawDx;
        dy = rawDy;
    }
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Clamp to radius
    const cappedDist = Math.min(distance, RADIUS);
    const cappedX = Math.cos(angle) * cappedDist;
    const cappedY = Math.sin(angle) * cappedDist;
    
    setPosition({ x: cappedX, y: cappedY });
    
    // Normalize output (-1 to 1)
    onMove(cappedX / RADIUS, cappedY / RADIUS);
  };

  const handleTouchEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm z-50 touch-none flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
        <div 
            className="w-16 h-16 rounded-full bg-white/50 shadow-lg pointer-events-none transition-transform duration-75"
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px)` 
            }}
        />
    </div>
  );
};

export default VirtualJoystick;
