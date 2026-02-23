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
    
    @property({ displayName: "Button Exit Game", type: cc.Node })
    btnExitGame: cc.Node = null;
    
    private onRetryCallback: () => void = null;
    private onExitGameCallback: () => void = null;


    init(): void {
        super.init();
        this.setupButtons();
    }
    
    private setupButtons(): void {
        this.retryButton.on(cc.Node.EventType.TOUCH_END, this.onRetryClicked, this);
        this.btnExitGame.on(cc.Node.EventType.TOUCH_END, this.onExitGameClicked, this);
    }


    updateUI(data) {
        const { score, level, onRestart, onMainMenu } = data;
        this.scoreLabel.string = score;
        this.levelLabel.string = level;
        this.onRetryCallback = onRestart;
        this.onExitGameCallback = onMainMenu;
        
    }
    
    public showPopup(isAnim = true, data): void {   
        // Update labels
        this.updateUI(data)
        super.showPopup(isAnim);
        
    }
    
    private onRetryClicked(): void {
        this.hidePopup();
        
        if (this.onRetryCallback) {
            this.scheduleOnce(() => {
                this.onRetryCallback();
            }, 0.3);
        }
    }
    
    private onExitGameClicked(): void {
        this.hidePopup();
        
        if (this.onExitGameCallback) {
            this.scheduleOnce(() => {
                this.onExitGameCallback();
            }, 0.3);
        }
    }
    
    onDestroy(): void {
        // this.retryButton.off(cc.Node.EventType.TOUCH_END, this.onRetryClicked, this);      
        // this.mainMenuButton.off(cc.Node.EventType.TOUCH_END, this.onMainMenuClicked, this);
    }
}
