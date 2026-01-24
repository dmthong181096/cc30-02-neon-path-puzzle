import * as cc from 'cc';
import { Subscriber02 } from '../Helper/Subscriber02';

const { ccclass, property } = cc._decorator;

@ccclass('ScoreManager02')
export class ScoreManager02 extends Subscriber02 {
    
    @property({ displayName: "Score Label", type: cc.Label })
    scoreLabel: cc.Label = null;
    
    @property({ displayName: "High Score Label", type: cc.Label })
    highScoreLabel: cc.Label = null;
    
    private currentScore: number = 0;
    private highScore: any = 0;
    private levelStartTime: number = 0;
    private pathsCompleted: number = 0;
    private totalMoves: number = 0;
    private comboCount: number = 0;
    private lastPathCompletionTime: number = 0;
    
    // Scoring constants
    private readonly BASE_SCORE_PER_LEVEL = 100;
    private readonly TIME_BONUS_MAX = 200;
    private readonly EFFICIENCY_BONUS_MAX = 150;
    private readonly COMBO_MULTIPLIER = 1.5;
    private readonly COMBO_TIME_WINDOW = 3000; // 3 seconds
    private readonly LEVEL_MULTIPLIER_BASE = 1.2;
    
    onLoad(): void {
        this.loadHighScore();
        this.updateScoreDisplay();
    }
    
    start(): void {
        
    }
    
    // Initialize for new level
    initLevel(levelNumber: number): void {
        this.levelStartTime = Date.now();
        this.pathsCompleted = 0;
        this.totalMoves = 0;
        this.comboCount = 0;
        this.lastPathCompletionTime = 0;
        
        }
    
    // Called when user makes a move (clicks a cell)
    recordMove(): void {
        this.totalMoves++;
        }
    
    // Called when a path is completed
    recordPathCompletion(pairNumber: number, pathLength: number): void {
        const currentTime = Date.now();
        this.pathsCompleted++;
        
        // Check for combo (completed within time window)
        const timeSinceLastPath = currentTime - this.lastPathCompletionTime;
        if (this.lastPathCompletionTime > 0 && timeSinceLastPath <= this.COMBO_TIME_WINDOW) {
            this.comboCount++;
            } else {
            this.comboCount = 1; // Reset combo
        }
        
        this.lastPathCompletionTime = currentTime;
        
        // Calculate path score
        const pathScore = this.calculatePathScore(pathLength);
        this.addScore(pathScore);
        
        }
    
    // Called when level is completed
    recordLevelCompletion(levelNumber: number, totalPairs: number): number {
        const levelTime = Date.now() - this.levelStartTime;
        const levelScore = this.calculateLevelScore(levelNumber, levelTime, totalPairs);
        
        this.addScore(levelScore);
        
        return levelScore;
    }
    
    private calculatePathScore(pathLength: number): number {
        // Base score for completing a path
        let score = 50;
        
        // Bonus for shorter paths (more efficient)
        const efficiencyBonus = Math.max(0, 20 - pathLength) * 5;
        score += efficiencyBonus;
        
        // Combo multiplier
        if (this.comboCount > 1) {
            score = Math.floor(score * Math.pow(this.COMBO_MULTIPLIER, this.comboCount - 1));
        }
        
        return score;
    }
    
    private calculateLevelScore(levelNumber: number, timeMs: number, totalPairs: number): number {
        // Base score for level completion
        let score = this.BASE_SCORE_PER_LEVEL;
        
        // Level multiplier (higher levels worth more)
        const levelMultiplier = Math.pow(this.LEVEL_MULTIPLIER_BASE, levelNumber - 1);
        score = Math.floor(score * levelMultiplier);
        
        // Time bonus (faster completion = higher bonus)
        const timeSeconds = timeMs / 1000;
        const expectedTime = totalPairs * 15; // 15 seconds per pair expected
        const timeBonus = Math.max(0, Math.floor(this.TIME_BONUS_MAX * (1 - timeSeconds / expectedTime)));
        score += timeBonus;
        
        // Efficiency bonus (fewer moves = higher bonus)
        const expectedMoves = totalPairs * 8; // 8 moves per pair expected
        const efficiencyBonus = Math.max(0, Math.floor(this.EFFICIENCY_BONUS_MAX * (1 - this.totalMoves / expectedMoves)));
        score += efficiencyBonus;
        
        // Perfect completion bonus
        if (this.pathsCompleted === totalPairs && this.totalMoves <= expectedMoves * 0.8) {
            score += 300; // Perfect bonus
            }
        
        return score;
    }
    
    private addScore(points: number): void {
        const oldScore = this.currentScore;
        this.currentScore += points;
        
        // Always update high score if current score is higher
        if (this.currentScore > this.highScore) {
            const oldHighScore = this.highScore;
            this.highScore = this.currentScore;
            this.saveHighScore();
            this.fireEvent('new-high-score', { score: this.highScore });
        }
        
        // Update display after high score check
        this.updateScoreDisplay();
        this.getDataStore().setCurrentScore(this.currentScore);

        this.fireEvent('score-updated', { 
            score: this.currentScore, 
            points: points,
            highScore: this.highScore 
        });
    }
    
    private updateScoreDisplay(): void {
        this.scoreLabel.string = `${this.currentScore.toLocaleString()}`;
                
        this.highScoreLabel.string = `${this.highScore.toLocaleString()}`;
           
    }
    
    private loadHighScore(): void {
        const savedData = this.getDataStore().getHighScore();
        this.highScore = savedData;
    }
    
    private saveHighScore(): void {
        this.getDataStore().setHighScore(this.highScore);
    }
    
    // Public getters
    getCurrentScore(): number {
        return this.currentScore;
    }
    
    getHighScore(): number {
        return this.highScore;
    }
    
    getLevelStats(): { moves: number, paths: number, combo: number, time: number } {
        return {
            moves: this.totalMoves,
            paths: this.pathsCompleted,
            combo: this.comboCount,
            time: Date.now() - this.levelStartTime
        };
    }
    
    // Reset score (for new game)
    resetScore(): void {
        this.currentScore = 0;
        this.updateScoreDisplay();
        this.fireEvent('score-reset');
    }
    
    // Get score breakdown for display
    getScoreBreakdown(levelNumber: number, timeMs: number, totalPairs: number): {
        baseScore: number,
        timeBonus: number,
        efficiencyBonus: number,
        perfectBonus: number,
        levelMultiplier: number,
        levelScore: number,
        currentGameScore: number,
        totalScore: number
    } {
        const baseScore = this.BASE_SCORE_PER_LEVEL;
        const levelMultiplier = Math.pow(this.LEVEL_MULTIPLIER_BASE, levelNumber - 1);
        
        const timeSeconds = timeMs / 1000;
        const expectedTime = totalPairs * 15;
        const timeBonus = Math.max(0, Math.floor(this.TIME_BONUS_MAX * (1 - timeSeconds / expectedTime)));
        
        const expectedMoves = totalPairs * 8;
        const efficiencyBonus = Math.max(0, Math.floor(this.EFFICIENCY_BONUS_MAX * (1 - this.totalMoves / expectedMoves)));
        
        const perfectBonus = (this.pathsCompleted === totalPairs && this.totalMoves <= expectedMoves * 0.8) ? 300 : 0;
        
        const levelScore = Math.floor(baseScore * levelMultiplier) + timeBonus + efficiencyBonus + perfectBonus;
        const currentGameScore = this.currentScore; // Score accumulated in current game
        const totalScore = currentGameScore + timeBonus; // Current game score + time bonus
        
        return {
            baseScore: Math.floor(baseScore * levelMultiplier),
            timeBonus,
            efficiencyBonus,
            perfectBonus,
            levelMultiplier,
            levelScore,
            currentGameScore,
            totalScore
        };
    }
}
