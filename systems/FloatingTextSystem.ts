
import { FloatingText } from '../types';

export const updateFloatingTexts = (texts: FloatingText[]) => {
    for (let i = texts.length - 1; i >= 0; i--) {
      const ft = texts[i];
      ft.y += ft.vy;
      ft.duration--;
      ft.opacity = Math.max(0, ft.duration / 15);
      if (ft.duration <= 0) texts.splice(i, 1);
    }
};

export const createFloatingText = (
    texts: FloatingText[],
    x: number, 
    y: number, 
    text: string, 
    color: string, 
    isCrit: boolean = false
) => {
    texts.push({
      id: Math.random().toString(),
      x: x + (Math.random() * 20 - 10),
      y: y,
      text,
      color,
      duration: 40,
      opacity: 1,
      vy: -1.5,
      isCrit
    });
};
