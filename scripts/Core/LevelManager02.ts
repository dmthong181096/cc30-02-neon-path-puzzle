import * as cc from 'cc';
import Declaration02 from '../Declaration02';
import { Subscriber02 } from '../Helper/Subscriber02';
const {BaseSubscriber} = Declaration02;
const { ccclass, property } = cc._decorator;

@ccclass('LevelManager02')
export class LevelManager02 extends Subscriber02 {
    
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
        this.updateLevelDisplay();
        // Emit event for GameDirector
        this.node.emit('level-changed', this.currentLevel);
        }
    
    resetToLevel1(): void {
        this.currentLevel = 1;
        this.updateLevelDisplay();
        // Emit event for GameDirector
        this.node.emit('level-changed', this.currentLevel);
    }
    
    setLevel(level: number): void {
        this.currentLevel = level;
        this.getDataStore().setCurrentLevel(level);
        this.updateLevelDisplay();
        }
    
    private updateLevelDisplay(): void {
        if (this.levelDisplayLabel && this.levelDisplayLabel.isValid) {
            this.levelDisplayLabel.string = `${this.currentLevel}`;
            // Add level up animation
            const scaleAnim = cc.tween(this.levelDisplayLabel.node)
                .to(0.2, { scale: cc.v3(1.2, 1.2, 1.0) }, { easing: 'sineOut' })
                .to(0.2, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'sineIn' });
            
            scaleAnim.start();
            } else {
            }
    }
    
    
}
