import * as cc from 'cc';
import { LoseUIManager02 } from '../UI/Components/LoseUIManager02';
import { WinUIManager02 } from '../UI/Components/WinUIManager02';

const { ccclass, property } = cc._decorator;

@ccclass('ResultManager02')
export class ResultManager02 extends cc.Component {
    
    @property({ displayName: "Lose UI Manager", type: LoseUIManager02 })
    loseUIManager: LoseUIManager02 = null;
    
    @property({ displayName: "Win UI Manager", type: WinUIManager02 })
    winUIManager: WinUIManager02 = null;
    
    // Show lose screen with stats
    showGameOverAnimationWithStats(score: number, level: number, moves: number, onRestart?: () => void, onMainMenu?: () => void): void {
        cc.log(`💀 ResultManager02: Showing lose screen - Score: ${score}, Level: ${level}, Moves: ${moves}`);
        
        this.loseUIManager.showPopup(true ,{score, level, moves, onRestart, onMainMenu});
    }
    
    // Show win screen with score
    showWinAnimationWithScore(level: number, scoreData: any, moves: number, onNextLevel?: () => void, onMainMenu?: () => void): void {
        cc.log(`🎉 ResultManager02: Showing win screen - Level: ${level}, Score: ${scoreData.totalScore}, Moves: ${moves}`);
        
        if (this.winUIManager) {
            const data = { level, scoreData, moves, onNextLevel, onMainMenu };
            this.winUIManager.showPopup(true, data);
        } else {
            cc.error(`❌ ResultManager02: WinUIManager not assigned! Game will wait for manual restart.`);
            // No automatic fallback - wait for user action
        }
    }
    
    // Hide all result screens
    hideAllResults(): void {
        if (this.loseUIManager) {
            this.loseUIManager.hidePopup();
        }
        
        if (this.winUIManager) {
            this.winUIManager.hidePopup();
        }
    }
    
    // Legacy methods for backward compatibility
    showGameOverAnimation(onRestart?: () => void): void {
        this.showGameOverAnimationWithStats(0, 1, 0, onRestart);
    }
    
    showWinAnimation(level: number, onComplete?: () => void): void {
        // Legacy method - now waits for user action instead of auto-completing
        this.showWinAnimationWithScore(level, { totalScore: 0 }, 0, onComplete);
    }
}