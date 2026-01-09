import * as cc from 'cc';

export interface Action02 {
    name?: string;
    duration: number;
    onEnter?: () => void;
    onDuration?: (elapsed: number, progress: number) => void;
    onFinish?: () => void;
}

export class ActionRunner02 {
    
    private component: cc.Component = null;
    private actions: Action02[] = [];
    private currentIndex: number = 0;
    private elapsed: number = 0;
    private isRunning: boolean = false;
    private onAllComplete: () => void = null;
    
    constructor(component: cc.Component) {
        this.component = component;
    }
    
    run(actions: Action02[], onComplete?: () => void): void {
        if (this.isRunning) {
            this.stop();
        }
        
        this.actions = actions;
        this.currentIndex = 0;
        this.elapsed = 0;
        this.isRunning = true;
        this.onAllComplete = onComplete;
        
        this.startCurrentAction();
        this.component.schedule(this.update.bind(this), 0);
    }
    
    stop(): void {
        this.isRunning = false;
        this.component.unschedule(this.update.bind(this));
        this.actions = [];
        this.currentIndex = 0;
        this.elapsed = 0;
    }
    
    private startCurrentAction(): void {
        const action = this.actions[this.currentIndex];
        if (!action) return;
        
        const name = action.name || `Action ${this.currentIndex + 1}`;
        
        if (action.onEnter) {
            action.onEnter();
        }
    }
    
    private update(dt: number): void {
        if (!this.isRunning) return;
        
        const action = this.actions[this.currentIndex];
        if (!action) return;
        
        this.elapsed += dt;
        const progress = Math.min(this.elapsed / action.duration, 1);
        
        // Call onDuration
        if (action.onDuration) {
            action.onDuration(this.elapsed, progress);
        }
        
        // Check if action complete
        if (this.elapsed >= action.duration) {
            this.finishCurrentAction();
        }
    }
    
    private finishCurrentAction(): void {
        const action = this.actions[this.currentIndex];
        if (!action) return;
        
        const name = action.name || `Action ${this.currentIndex + 1}`;
        if (action.onFinish) {
            action.onFinish();
        }
        
        // Next action
        this.currentIndex++;
        this.elapsed = 0;
        
        if (this.currentIndex < this.actions.length) {
            this.startCurrentAction();
        } else {
            // All complete
            this.isRunning = false;
            this.component.unschedule(this.update.bind(this));
            
            if (this.onAllComplete) {
                this.onAllComplete();
            }
        }
    }
    
    isPlaying(): boolean {
        return this.isRunning;
    }
    
    getCurrentActionIndex(): number {
        return this.currentIndex;
    }
}
