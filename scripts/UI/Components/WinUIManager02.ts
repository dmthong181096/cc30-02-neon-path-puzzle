import * as cc from 'cc';
import Declaration02 from '../../Declaration02'
const {BasePopupItem} = Declaration02;
const { ccclass, property } = cc._decorator;

@ccclass('WinUIManager02')
export class WinUIManager02 extends BasePopupItem {
    
    @property({ displayName: "Level Label", type: cc.Label })
    levelLabel: cc.Label = null;
    
    @property({ displayName: "Score Label", type: cc.Label })
    scoreLabel: cc.Label = null;
    
    @property({ displayName: "Total Score Label", type: cc.Label })
    totalScoreLabel: cc.Label = null;
    
    @property({ displayName: "Moves Label", type: cc.Label })
    movesLabel: cc.Label = null;
    
    @property({ displayName: "Time Bonus Label", type: cc.Label })
    timeBonusLabel: cc.Label = null;
    
    @property({ displayName: "Efficiency Bonus Label", type: cc.Label })
    efficiencyBonusLabel: cc.Label = null;
    
    @property({ displayName: "Next Level Button", type: cc.Node })
    nextLevelButton: cc.Node = null;
    
    @property({ displayName: "Main Menu Button", type: cc.Node })
    mainMenuButton: cc.Node = null;
    
    private onNextLevelCallback: () => void = null;
    private onMainMenuCallback: () => void = null;

    init(): void {
        super.init();
        this.setupButtons();
    }
    
    private setupButtons(): void {
        this.nextLevelButton.on(cc.Node.EventType.TOUCH_END, this.onNextLevelClicked, this);
        this.mainMenuButton.on(cc.Node.EventType.TOUCH_END, this.onMainMenuClicked, this);
    }

    updateUI(data): void {
        const { level, scoreData, moves, onNextLevel, onMainMenu } = data;
        
        if (this.levelLabel) {
            this.levelLabel.string = `LEVEL ${level}`;
        }
        
        // Display current game score (score accumulated in this game)
        if (this.scoreLabel) {
            this.scoreLabel.string = scoreData.currentGameScore.toLocaleString();
        }
        
        // Display total score (current game score + time bonus)
        if (this.totalScoreLabel) {
            this.totalScoreLabel.string = scoreData.totalScore.toLocaleString();
        }
        
        // Display moves count
        if (this.movesLabel) {
            this.movesLabel.string = moves ? moves.toString() : "0";
        }
        
        if (this.timeBonusLabel) {
            this.timeBonusLabel.string = scoreData.timeBonus ? `+${scoreData.timeBonus}` : "+0";
        }
        
        if (this.efficiencyBonusLabel) {
            this.efficiencyBonusLabel.string = scoreData.efficiencyBonus ? `+${scoreData.efficiencyBonus}` : "+0";
        }
        
        this.onNextLevelCallback = onNextLevel;
        this.onMainMenuCallback = onMainMenu;
        
        }
    
    public showPopup(isAnim = true, data): void {
        // Update labels
        this.updateUI(data);
        super.showPopup(isAnim);
    }
    
    private onNextLevelClicked(): void {
        this.hidePopup();
        
        if (this.onNextLevelCallback) {
            this.scheduleOnce(() => {
                this.onNextLevelCallback();
            }, 0.3);
        }
    }
    
    private onMainMenuClicked(): void {
        this.hidePopup();
        
        if (this.onMainMenuCallback) {
            this.scheduleOnce(() => {
                this.onMainMenuCallback();
            }, 0.3);
        }
    }
    
    onDestroy(): void {
        // this.nextLevelButton.off(cc.Node.EventType.TOUCH_END, this.onNextLevelClicked, this);
        // this.mainMenuButton.off(cc.Node.EventType.TOUCH_END, this.onMainMenuClicked, this);
    }
}
