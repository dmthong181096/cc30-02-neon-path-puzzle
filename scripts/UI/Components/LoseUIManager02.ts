import * as cc from 'cc';
import Declaration02 from '../../Declaration02'
const {BasePopupItem} = Declaration02;
const { ccclass, property } = cc._decorator;

@ccclass('LoseUIManager02')
export class LoseUIManager02 extends BasePopupItem {
    
    
    @property({ displayName: "Score Label", type: cc.Label })
    scoreLabel: cc.Label = null;
    
    @property({ displayName: "Level Label", type: cc.Label })
    levelLabel: cc.Label = null;
    
    @property({ displayName: "Retry Button", type: cc.Node })
    retryButton: cc.Node = null;
    
    @property({ displayName: "Main Menu Button", type: cc.Node })
    mainMenuButton: cc.Node = null;
    
    private onRetryCallback: () => void = null;
    private onMainMenuCallback: () => void = null;


    init(): void {
        super.init();
        this.setupButtons();
    }
    
    private setupButtons(): void {
        this.retryButton.on(cc.Node.EventType.TOUCH_END, this.onRetryClicked, this);
        this.mainMenuButton.on(cc.Node.EventType.TOUCH_END, this.onMainMenuClicked, this);
    }


    updateUI(data) {
        const { score, level, onRestart, onMainMenu } = data;
        this.scoreLabel.string = score;
        this.levelLabel.string = level;
        this.onRetryCallback = onRestart;
        this.onMainMenuCallback = onMainMenu;
        
    }
    
    public showPopup(isAnim = true, data): void {   
        // Update labels
        this.updateUI(data)
        super.showPopup(isAnim);
        
    }
    
    private onRetryClicked(): void {
        cc.log(`🔄 LoseUIManager02: Retry button clicked`);
        this.hidePopup();
        
        if (this.onRetryCallback) {
            this.scheduleOnce(() => {
                this.onRetryCallback();
            }, 0.3);
        }
    }
    
    private onMainMenuClicked(): void {
        cc.log(`📱 LoseUIManager02: Main menu button clicked`);
        this.hidePopup();
        
        if (this.onMainMenuCallback) {
            this.scheduleOnce(() => {
                this.onMainMenuCallback();
            }, 0.3);
        }
    }
    
    onDestroy(): void {
        this.retryButton.off(cc.Node.EventType.TOUCH_END, this.onRetryClicked, this);      
        this.mainMenuButton.off(cc.Node.EventType.TOUCH_END, this.onMainMenuClicked, this);
    }
}