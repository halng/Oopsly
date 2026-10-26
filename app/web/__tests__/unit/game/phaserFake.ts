import { vi } from 'vitest';

type Listener = { fn: (...args: any[]) => void; ctx?: unknown };

export class FakeObject {
    kind: string;
    args: any[];
    children: FakeObject[] = [];
    handlers: Record<string, (...a: any[]) => void> = {};
    destroyed = false;
    scale = 1;
    alpha = 1;
    origin: number | null = null;
    stroke: any[] | null = null;
    interactive: any = null;

    constructor(kind: string, args: any[]) {
        this.kind = kind;
        this.args = args;
    }

    setOrigin(o: number) {
        this.origin = o;
        return this;
    }
    setAlpha(a: number) {
        this.alpha = a;
        return this;
    }
    setScale(s: number) {
        this.scale = s;
        return this;
    }
    setStrokeStyle(...a: any[]) {
        this.stroke = a;
        return this;
    }
    setInteractive(o?: any) {
        this.interactive = o ?? true;
        return this;
    }
    on(event: string, fn: (...a: any[]) => void) {
        this.handlers[event] = fn;
        return this;
    }
    add(items: FakeObject | FakeObject[]) {
        this.children.push(...(Array.isArray(items) ? items : [items]));
        return this;
    }
    destroy = vi.fn(() => {
        this.destroyed = true;
        this.children.forEach((c) => c.destroy());
    });
}

export interface Tween {
    config: any;
}

export class FakeGame {
    static instances: FakeGame[] = [];
    config: any;
    registry = new Map<string, unknown>();
    listeners: Record<string, Listener[]> = {};
    scene: any;
    destroy = vi.fn();
    events = {
        on: (name: string, fn: (...a: any[]) => void, ctx?: unknown) => {
            (this.listeners[name] ??= []).push({ fn, ctx });
        },
        emit: (name: string) => {
            (this.listeners[name] ?? []).forEach((l) => l.fn.call(l.ctx));
        },
    };

    constructor(config: any) {
        this.config = config;
        (this.registry as any).get = Map.prototype.get;
        FakeGame.instances.push(this);
        config.callbacks?.preBoot?.(this);
        const SceneClass = config.scene;
        this.scene = new SceneClass();
        this.scene.game = this;
        this.scene.create();
    }
}

export class FakeScene {
    key: string;
    game!: FakeGame;
    objects: FakeObject[] = [];
    tweens = {
        added: [] as Tween[],
        add: (config: any) => {
            this.tweens.added.push({ config });
        },
    };
    bg: string | null = null;
    cameras = {
        main: {
            setBackgroundColor: (c: string) => {
                this.bg = c;
            },
        },
    };
    add = {
        circle: (...a: any[]) => this.make('circle', a),
        rectangle: (...a: any[]) => this.make('rectangle', a),
        text: (...a: any[]) => this.make('text', a),
        container: (...a: any[]) => this.make('container', a),
    };

    constructor(key: string) {
        this.key = key;
    }

    make(kind: string, args: any[]) {
        const o = new FakeObject(kind, args);
        this.objects.push(o);
        return o;
    }
}

export const phaserFake = {
    AUTO: 'AUTO',
    Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
    Math: {
        Between: (min: number, max: number) => Math.round((min + max) / 2),
    },
    Scene: FakeScene,
    Game: FakeGame,
};
