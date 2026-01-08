import * as cc from 'cc';

const { ccclass, property } = cc._decorator;

@ccclass('WinUIManager02')
export class WinUIManager02 extends cc.Component {
    
    @property({ displayName: "Win Panel", type: cc.Node })
    winPanel: cc.Node = null;
    
    @property({ displayName: "Level Label", type: cc.Label })
    levelLabel: cc.Label = null;
    
    @property({ displayName: "Score Label", type: cc.Label })
    scoreLabel: cc.Label = null;
    
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
    
    protected onLoad(): void {
        this.hide();
        this.setupButtons();
    }
    
    private setupButtons(): void {
        if (this.nextLevelButton) {
            this.nextLevelButton.on(cc.Node.EventType.TOUCH_END, this.onNextLevelClicked, this);
        }
        
        if (this.mainMenuButton) {
            this.mainMenuButton.on(cc.Node.EventType.TOUCH_END, this.onMainMenuClicked, this);
        }
    }
    
    public show(level: number, scoreData: any, onNextLevel?: () => void, onMainMenu?: () => void): void {
        cc.log(`🎉 WinUIManager02: Showing win screen - Level: ${level}, Score: ${scoreData.totalScore}`);
        
        this.onNextLevelCallback = onNextLevel;
        this.onMainMenuCallback = onMainMenu;
        
        // Update labels
        if (this.levelLabel) {
            this.levelLabel.string = `LEVEL ${level}`;
        }
        
        if (this.scoreLabel) {
            this.scoreLabel.string = scoreData.totalScore.toLocaleString();
        }
        
        if (this.timeBonusLabel) {
            this.timeBonusLabel.string = scoreData.timeBonus ? `+${scoreData.timeBonus}` : "+0";
        }
        
        if (this.efficiencyBonusLabel) {
            this.efficiencyBonusLabel.string = scoreData.efficiencyBonus ? `+${scoreData.efficiencyBonus}` : "+0";
        }
        
        // Show panel with animation
        if (this.winPanel) {
            this.winPanel.active = true;
            this.winPanel.setScale(0, 0, 1);
            
            cc.tween(this.winPanel)
                .to(0.3, { scale: cc.v3(1.1, 1.1, 1) }, { easing: 'backOut' })
                .to(0.1, { scale: cc.v3(1, 1, 1) }, { easing: 'sineOut' })
                .start();
        }
    }
    
    public hide(): void {
        if (this.winPanel) {
            cc.tween(this.winPanel)
                .to(0.2, { scale: cc.v3(0, 0, 1) }, { easing: 'sineIn' })
                .call(() => {
                    this.winPanel.active = false;
                })
                .start();
        }
    }
    
    private onNextLevelClicked(): void {
        cc.log(`▶️ WinUIManager02: Next level button clicked`);
        this.hide();
        
        if (this.onNextLevelCallback) {
            this.scheduleOnce(() => {
                this.onNextLevelCallback();
            }, 0.3);
        }
    }
    
    private onMainMenuClicked(): void {
        cc.log(`📱 WinUIManager02: Main menu button clicked`);
        this.hide();
        
        if (this.onMainMenuCallback) {
            this.scheduleOnce(() => {
                this.onMainMenuCallback();
            }, 0.3);
        }
    }
    
    protected onDestroy(): void {
        if (this.nextLevelButton) {
            this.nextLevelButton.off(cc.Node.EventType.TOUCH_END, this.onNextLevelClicked, this);
        }
        
        if (this.mainMenuButton) {
            this.mainMenuButton.off(cc.Node.EventType.TOUCH_END, this.onMainMenuClicked, this);
        }
    }
}