import * as cc from 'cc';
import { Subscriber02 } from '../Helper/Subscriber02';

const { ccclass, property } = cc._decorator;

export interface TimerData {
    id: string;
    startTime: number;
    duration?: number;
    isPaused: boolean;
    onComplete?: () => void;
    onTick?: (elapsed: number, remaining?: number) => void;
}

@ccclass('TimerManager02')
export class TimerManager02 extends Subscriber02 {
    
    @property({ displayName: "Level Timer Label", type: cc.Label })
    levelTimerLabel: cc.Label = null;
    
    @property({ displayName: "Game Timer Label", type: cc.Label })
    gameTimerLabel: cc.Label = null;
    
    private timers: Map<string, TimerData> = new Map();
    private gameStartTime: number = 0;
    private levelStartTime: number = 0;
    private isPaused: boolean = false;
    private pausedTime: number = 0;
    private totalPausedTime: number = 0;
    private lastAnimatedSecond: number = -1; // Track last animated second to avoid duplicates
    
    // Timer IDs
    private readonly LEVEL_TIMER_ID = 'level-timer';
    private readonly GAME_TIMER_ID = 'game-timer';
    
    // Direct callback for level time expired (bypass event system)
    private levelTimeExpiredCallback: (levelNumber: number) => void = null;
    
    onLoad(): void {
        this.initGameTimer();
    }
    
    start(): void {
        this.schedule(this.update, 0);
    }
    
    update(): void {
        if (this.isPaused) return;
        
        const currentTime = Date.now();
        
        // Update all active timers
        for (const [id, timer] of this.timers) {
            if (timer.isPaused) continue;
            
            const elapsed = (currentTime - timer.startTime - this.totalPausedTime) / 1000;
            
            // Call onTick callback
            if (timer.onTick) {
                const remaining = timer.duration ? Math.max(0, timer.duration - elapsed) : undefined;
                timer.onTick(elapsed, remaining);
            }
            
            // Check if countdown timer completed
            if (timer.duration && elapsed >= timer.duration) {
                if (timer.onComplete) {
                    timer.onComplete();
                }
                
                this.fireEvent('timer-complete', { id, elapsed });
                this.removeTimer(id);
            }
        }
        
        // Update display labels
        this.updateTimerDisplays();
    }
    
    // Initialize game timer (total play time)
    private initGameTimer(): void {
        this.gameStartTime = Date.now();
        this.totalPausedTime = 0;
        
        this.addTimer(this.GAME_TIMER_ID, {
            id: this.GAME_TIMER_ID,
            startTime: this.gameStartTime,
            isPaused: false,
            onTick: (elapsed) => {
                this.fireEvent('game-time-tick', { elapsed });
            }
        });
    }
    
    // Set direct callback for level time expired (bypass event system)
    setLevelTimeExpiredCallback(callback: (levelNumber: number) => void): void {
        cc.log(`🔗 TimerManager02: Setting direct callback for level time expired`);
        this.levelTimeExpiredCallback = callback;
    }
    
    // Start level countdown timer
    startLevelTimer(levelNumber: number, duration: number = 60): void {
        cc.log(`🚀 TimerManager02: Starting level timer for level ${levelNumber}, duration: ${duration}s`);
        
        this.levelStartTime = Date.now();
        this.lastAnimatedSecond = -1; // Reset animation tracking
        
        // Remove existing level timer if any
        const hadExistingTimer = this.timers.has(this.LEVEL_TIMER_ID);
        this.removeTimer(this.LEVEL_TIMER_ID);
        cc.log(`🔍 DEBUG: Had existing timer: ${hadExistingTimer}`);
        
        this.addTimer(this.LEVEL_TIMER_ID, {
            id: this.LEVEL_TIMER_ID,
            startTime: this.levelStartTime,
            duration: duration, // Countdown duration in seconds
            isPaused: false,
            onTick: (elapsed, remaining) => {
                this.fireEvent('level-time-tick', { 
                    levelNumber, 
                    elapsed, 
                    remaining: remaining || 0 
                });
                
                // Warning when time is running low
                if (remaining && remaining <= 10 && remaining > 9) {
                    this.fireEvent('time-warning', { remaining });
                }
            },
            onComplete: () => {
                cc.log(`⏰ TimerManager02: Timer completed for level ${levelNumber} - calling direct callback`);
                
                // Use direct callback instead of event system
                if (this.levelTimeExpiredCallback) {
                    cc.log(`📞 TimerManager02: Calling direct callback for level ${levelNumber}`);
                    this.levelTimeExpiredCallback(levelNumber);
                } else {
                    cc.error(`❌ TimerManager02: No callback set for level time expired!`);
                }
                
                // Also fire event for other listeners (but main logic uses callback)
                this.fireEvent('level-time-expired', { levelNumber });
            }
        });
        
        cc.log(`✅ TimerManager02: Level timer started successfully`);
    }
    
    // Stop level timer and return remaining time
    stopLevelTimer(): number {
        const timer = this.timers.get(this.LEVEL_TIMER_ID);
        if (!timer) return 0;
        
        const remaining = this.getRemaining(this.LEVEL_TIMER_ID);
        this.removeTimer(this.LEVEL_TIMER_ID);
        this.fireEvent('level-timer-stopped', { remaining });
        
        return remaining;
    }
    
    // Add custom timer
    addTimer(id: string, config: Partial<TimerData>): void {
        const timer: TimerData = {
            id,
            startTime: config.startTime || Date.now(),
            duration: config.duration,
            isPaused: config.isPaused || false,
            onComplete: config.onComplete,
            onTick: config.onTick
        };
        
        this.timers.set(id, timer);
    }
    
    // Add countdown timer (convenience method)
    addCountdown(id: string, duration: number, onComplete?: () => void, onTick?: (remaining: number) => void): void {
        this.addTimer(id, {
            duration,
            onComplete,
            onTick: onTick ? (elapsed, remaining) => onTick(remaining || 0) : undefined
        });
    }
    
    // Remove timer
    removeTimer(id: string): boolean {
        const removed = this.timers.delete(id);
        return removed;
    }
    
    // Pause all timers
    pauseAll(): void {
        if (this.isPaused) return;
        
        this.isPaused = true;
        this.pausedTime = Date.now();
        
        // Pause individual timers
        for (const timer of this.timers.values()) {
            timer.isPaused = true;
        }
        this.fireEvent('timers-paused');
    }
    
    // Resume all timers
    resumeAll(): void {
        if (!this.isPaused) return;
        
        const pauseDuration = Date.now() - this.pausedTime;
        this.totalPausedTime += pauseDuration;
        this.isPaused = false;
        
        // Resume individual timers
        for (const timer of this.timers.values()) {
            timer.isPaused = false;
        }
        this.fireEvent('timers-resumed', { pauseDuration: pauseDuration / 1000 });
    }
    
    // Pause specific timer
    pauseTimer(id: string): boolean {
        const timer = this.timers.get(id);
        if (!timer) return false;
        
        timer.isPaused = true;
        return true;
    }
    
    // Resume specific timer
    resumeTimer(id: string): boolean {
        const timer = this.timers.get(id);
        if (!timer) return false;
        timer.isPaused = false;
        return true;
    }
    
    // Get elapsed time for timer
    getElapsed(id: string): number {
        const timer = this.timers.get(id);
        if (!timer) return 0;
        
        return (Date.now() - timer.startTime - this.totalPausedTime) / 1000;
    }
    
    // Get remaining time for countdown timer
    getRemaining(id: string): number {
        const timer = this.timers.get(id);
        if (!timer || !timer.duration) return 0;
        
        const elapsed = this.getElapsed(id);
        return Math.max(0, timer.duration - elapsed);
    }
    
    // Get level remaining time
    getLevelTime(): number {
        return this.getRemaining(this.LEVEL_TIMER_ID);
    }
    
    // Get total game time
    getGameTime(): number {
        return this.getElapsed(this.GAME_TIMER_ID);
    }
    
    // Format time as MM:SS or HH:MM:SS
    formatTime(seconds: number, showHours: boolean = false): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const pad = (num: number): string => num < 10 ? '0' + num : num.toString();
        
        if (showHours || hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
        } else {
            return `${pad(minutes)}:${pad(secs)}`;
        }
    }
    
    // Format time as human readable (e.g., "2m 30s")
    formatTimeHuman(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0) result += `${minutes}m `;
        if (secs > 0 || result === '') result += `${secs}s`;
        
        return result.trim();
    }
    
    // Update timer display labels
    private updateTimerDisplays(): void {
        // Update level timer display (countdown as simple number)
        if (this.levelTimerLabel) {
            const levelTimeRemaining = this.getLevelTime();
            const seconds = Math.ceil(levelTimeRemaining); // Round up to show full seconds
            
            this.levelTimerLabel.string = seconds.toString();
            
            // Change color when time is running low
            if (seconds <= 10) {
                this.levelTimerLabel.color = cc.Color.RED;
                // Trigger zoom animation for countdown
                this.playCountdownAnimation(seconds);
            } else if (seconds <= 30) {
                this.levelTimerLabel.color = cc.Color.YELLOW;
            } else {
                this.levelTimerLabel.color = cc.Color.WHITE;
            }
        }
        
        // Update game timer display (elapsed)
        if (this.gameTimerLabel) {
            const gameTime = this.getGameTime();
            this.gameTimerLabel.string = this.formatTime(gameTime, true);
        }
    }
    
    private playCountdownAnimation(seconds: number): void {
        if (!this.levelTimerLabel) return;
        
        // Only animate on each new second (avoid multiple animations per second)
        if (this.lastAnimatedSecond === seconds) return;
        this.lastAnimatedSecond = seconds;
        
        // Stop any existing tween first
        cc.Tween.stopAllByTarget(this.levelTimerLabel.node);
        
        // Reset to original scale first
        this.levelTimerLabel.node.setScale(1, 1, 1);
        
        // Zoom animation - scale up then back to normal
        const zoomScale = cc.v3(1.4, 1.4, 1.0);
        const normalScale = cc.v3(1.0, 1.0, 1.0);
        
        const zoomAnim = cc.tween(this.levelTimerLabel.node)
            .to(0.15, { scale: zoomScale }, { easing: 'backOut' })
            .to(0.2, { scale: normalScale }, { easing: 'sineIn' });
        
        zoomAnim.start();
        
        // Fire event for additional effects (sound, screen shake, etc.)
        this.fireEvent('countdown-tick', { seconds });
    }
    
    // Get timer info for debugging
    getTimerInfo(id: string): { elapsed: number, remaining?: number, isPaused: boolean } | null {
        const timer = this.timers.get(id);
        if (!timer) return null;
        
        const elapsed = this.getElapsed(id);
        const remaining = timer.duration ? this.getRemaining(id) : undefined;
        
        return {
            elapsed,
            remaining,
            isPaused: timer.isPaused
        };
    }
    
    // Get all active timers
    getAllTimers(): string[] {
        return Array.from(this.timers.keys());
    }
    
    // Clear all timers
    clearAllTimers(): void {
        this.timers.clear();
        this.fireEvent('all-timers-cleared');
    }
    
    // Reset for new game
    resetForNewGame(): void {
        this.clearAllTimers();
        this.isPaused = false;
        this.totalPausedTime = 0;
        this.initGameTimer();
    }
    
    onDestroy(): void {
        this.unschedule(this.update);
        this.clearAllTimers();
        // Don't call super.onDestroy() to avoid removing all event listeners
        // super.onDestroy() would call BaseSubscriber.eventEmitter.removeAllListeners()
        // which removes listeners for ALL components, not just this one
    }
    
}