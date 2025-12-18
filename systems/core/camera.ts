
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT } from '../../constants';
import { Player } from '../../types';

export const updateCamera = (camera: { x: number, y: number }, player: Player) => {
    // Camera Deadzone Logic
    const marginX = CANVAS_WIDTH * 0.33; 
    const marginY = CANVAS_HEIGHT * 0.33; 
    let nextCamX = camera.x;
    let nextCamY = camera.y;
    
    if (player.x > nextCamX + CANVAS_WIDTH - marginX) {
        nextCamX = player.x - (CANVAS_WIDTH - marginX);
    } 
    else if (player.x < nextCamX + marginX) {
        nextCamX = player.x - marginX;
    }
    
    if (player.y > nextCamY + CANVAS_HEIGHT - marginY) {
        nextCamY = player.y - (CANVAS_HEIGHT - marginY);
    }
    else if (player.y < nextCamY + marginY) {
        nextCamY = player.y - marginY;
    }

    camera.x = Math.max(0, Math.min(MAP_WIDTH - CANVAS_WIDTH, nextCamX));
    camera.y = Math.max(0, Math.min(MAP_HEIGHT - CANVAS_HEIGHT, nextCamY));
};
