import * as cc from 'cc';

const { ccclass, property } = cc._decorator;

@ccclass('LevelManager02')
export class LevelManager02 extends cc.Component {
    
    @property({ displayName: "Level Display Label", type: cc.Label })
    levelDisplayLabel: cc.Label = null;
    
    private currentLevel: number = 1;
    
    start() {
        this.updateLevelDisplay();
    }
    
    getCurrentLevel(): number {
        return this.currentLevel;
    }
    
    nextLevel(): void {
        const previousLevel = this.currentLevel;
        this.currentLevel++;
        cc.log(`🔄 LevelManager02: LEVEL PROGRESSION - From Level ${previousLevel} to Level ${this.currentLevel}`);
        
        this.updateLevelDisplay();
        cc.log(`📊 LevelManager02: Level display updated to Level ${this.currentLevel}`);
        
        // Emit event for GameDirector
        this.node.emit('level-changed', this.currentLevel);
        cc.log(`📡 LevelManager02: Emitted 'level-changed' event with Level ${this.currentLevel}`);
    }
    
    resetToLevel1(): void {
        this.currentLevel = 1;
        this.updateLevelDisplay();
        cc.log('LevelManager02: Reset to Level 1');
        
        // Emit event for GameDirector
        this.node.emit('level-changed', this.currentLevel);
    }
    
    setLevel(level: number): void {
        this.currentLevel = level;
        this.updateLevelDisplay();
        cc.log(`LevelManager02: Set to Level ${this.currentLevel}`);
    }
    
    private updateLevelDisplay(): void {
        if (this.levelDisplayLabel && this.levelDisplayLabel.isValid) {
            this.levelDisplayLabel.string = `${this.currentLevel}`;
            cc.log(`✅ LevelManager02: Level display text updated to "${this.levelDisplayLabel.string}"`);
            
            // Add level up animation
            const scaleAnim = cc.tween(this.levelDisplayLabel.node)
                .to(0.2, { scale: cc.v3(1.2, 1.2, 1.0) }, { easing: 'sineOut' })
                .to(0.2, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'sineIn' });
            
            scaleAnim.start();
            cc.log(`🎬 LevelManager02: Level display animation started`);
        } else {
            cc.warn('⚠️ LevelManager02: Level Display Label not assigned or invalid!');
        }
    }
    
    
}