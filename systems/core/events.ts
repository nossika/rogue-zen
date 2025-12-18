
type EventCallback = (...args: any[]) => void;

class EventEmitter {
    private events: Map<string, EventCallback[]> = new Map();

    on(event: string, callback: EventCallback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback) {
        if (!this.events.has(event)) return;
        const callbacks = this.events.get(event)!;
        this.events.set(event, callbacks.filter(cb => cb !== callback));
    }

    emit(event: string, ...args: any[]) {
        if (!this.events.has(event)) return;
        this.events.get(event)!.forEach(cb => cb(...args));
    }
}

export const gameEvents = new EventEmitter();

// Defined Event Constants
export const EVENTS = {
    SPAWN_FLOATING_TEXT: 'spawn_floating_text',
    SPAWN_SPLATTER: 'spawn_splatter',
    PLAYER_HIT: 'player_hit',
    CREATE_HAZARD: 'create_hazard',
    GOLD_PICKUP: 'gold_pickup',
    KILL_ENEMY: 'kill_enemy',
    PLAY_SFX: 'play_sfx'
};
