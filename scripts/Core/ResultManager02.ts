import * as cc from 'cc';

const { ccclass, property } = cc._decorator;

@ccclass('ResultManager02')
export class ResultManager02 extends cc.Component {
    
    @property({ displayName: "Result Node", type: cc.Node })
    resultNode: cc.Node = null;
    
    private resultLabel: cc.Label = null;
    private callbackExecuted: boolean = false; // Flag to prevent multiple callback calls

    protected onLoad(): void {
        this.initProps()
    }
    initProps (){
        this.resultLabel = this.resultNode.getComponent(cc.Label);
    }
    
    showWinAnimation(currentLevel: number, onComplete?: () => void): void {
        cc.log(`🎉 ResultManager02: Starting win animation for Level ${currentLevel}`);
        
        // Reset callback flag
        this.callbackExecuted = false;
        
        // Set up backup timer to ensure callback is called
        if (onComplete) {
            cc.log(`⏰ ResultManager02: Setting up backup timer for 6 seconds`);
            this.scheduleOnce(() => {
                if (!this.callbackExecuted) {
                    cc.log(`🔄 ResultManager02: Backup timer triggered - calling onComplete`);
                    this.callbackExecuted = true;
                    onComplete();
                } else {
                    cc.log(`⚠️ ResultManager02: Backup timer skipped - callback already executed`);
                }
            }, 6.0); // Backup timer slightly longer than countdown
        }
        
        this.showWinText(currentLevel, onComplete);
    }
    
    private showWinText(currentLevel: number, onComplete?: () => void): void {
        cc.log(`📝 ResultManager02: Displaying win text for Level ${currentLevel}`);
    
        this.resultLabel.string = `🎉 LEVEL ${currentLevel} COMPLETE! 🎉\nNext level in 5s...`;
        cc.log(`📄 ResultManager02: Win text set to: "${this.resultLabel.string}"`);
        
        // Position at center of container
        this.resultNode.setPosition(0, 0, 0);
        
        // Simple scale animation
        this.resultNode.setScale(0, 0, 1);
        const scaleUp = cc.tween(this.resultNode)
            .to(0.5, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'backOut' });
        
        scaleUp.start();
        cc.log(`🎬 ResultManager02: Win text scale animation started`);
        
        // Countdown animation
        this.startCountdown(this.resultLabel, currentLevel, onComplete);
        
        // Auto remove after 5 seconds
        this.scheduleOnce(() => {
            this.hideWinText();
        }, 5.0);
        cc.log(`⏰ ResultManager02: Scheduled win text removal in 5 seconds`);
    }
    
    private startCountdown(label: cc.Label, currentLevel: number, onComplete?: () => void): void {
        let countdown = 5;
        cc.log(`⏱️ ResultManager02: Starting 5-second countdown for Level ${currentLevel}`);
        
        const updateCountdown = () => {
            cc.log(`⏰ ResultManager02: Countdown update called - countdown: ${countdown}`);
            
            if (label && label.isValid) {
                if (countdown > 0) {
                    label.string = `🎉 LEVEL ${currentLevel} COMPLETE! 🎉\nNext level in ${countdown}s...`;
                    cc.log(`⏰ ResultManager02: Countdown ${countdown}s remaining`);
                    countdown--;
                    
                    // Schedule next countdown update
                    this.scheduleOnce(updateCountdown, 1.0);
                } else {
                    // Countdown finished
                    label.string = `🎉 LEVEL ${currentLevel} COMPLETE! 🎉\nStarting next level...`;
                    cc.log(`🚀 ResultManager02: Countdown finished! Starting next level...`);
                    
                    // Call onComplete callback with flag check
                    if (!this.callbackExecuted && onComplete) {
                        cc.log(`📞 ResultManager02: Executing onComplete callback to advance level`);
                        this.callbackExecuted = true;
                        onComplete();
                    } else if (this.callbackExecuted) {
                        cc.log(`⚠️ ResultManager02: Callback already executed, skipping`);
                    } else {
                        cc.warn(`⚠️ ResultManager02: No onComplete callback provided!`);
                    }
                }
            } else {
                cc.error(`❌ ResultManager02: Label is invalid during countdown!`);
            }
        };
        
        // Start the first countdown update after 1 second
        this.scheduleOnce(updateCountdown, 1.0);
    }
    
    private hideWinText(): void {
        this.resultLabel.string = "";
    }
    
    showGameOverAnimation(onRestart?: () => void): void {
        cc.log(`💀 ResultManager02: Starting game over animation`);
        
        // Reset callback flag
        this.callbackExecuted = false;
        
        // Set up backup timer to ensure callback is called
        if (onRestart) {
            cc.log(`⏰ ResultManager02: Setting up backup timer for 4 seconds (game over)`);
            this.scheduleOnce(() => {
                if (!this.callbackExecuted) {
                    cc.log(`🔄 ResultManager02: Backup timer triggered - calling onRestart`);
                    this.callbackExecuted = true;
                    onRestart();
                } else {
                    cc.log(`⚠️ ResultManager02: Backup timer skipped - callback already executed`);
                }
            }, 4.0); // Backup timer slightly longer than countdown
        }
        
        this.showGameOverText(onRestart);
    }
    
    private showGameOverText(onRestart?: () => void): void {
        cc.log(`💀 ResultManager02: Displaying game over text`);
        
        // Add label component
        this.resultLabel.string = `💀 GAME OVER 💀\nNo solution possible!\nRestarting in 3s...`;
        cc.log(`📄 ResultManager02: Game over text set to: "${this.resultLabel.string}"`);

        
        // Position at center of container
        this.resultNode.setPosition(0, 0, 0);
        
        // Simple scale animation
        this.resultNode.setScale(0, 0, 1);
        const scaleUp = cc.tween(this.resultNode)
            .to(0.5, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'backOut' });
        
        scaleUp.start();
        cc.log(`🎬 ResultManager02: Game over scale animation started`);
        
        // Countdown for restart
        this.startRestartCountdown(this.resultLabel, onRestart);
        
        // Auto remove after 3 seconds
        this.scheduleOnce(() => {
            this.hideWinText();
        }, 3.0);
        cc.log(`⏰ ResultManager02: Scheduled game over text removal in 3 seconds`);
    }
    
    private startRestartCountdown(label: cc.Label, onRestart?: () => void): void {
        let countdown = 3;
        cc.log(`⏱️ ResultManager02: Starting 3-second restart countdown`);
        
        const updateCountdown = () => {
            cc.log(`⏰ ResultManager02: Restart countdown update called - countdown: ${countdown}`);
            
            if (label && label.isValid) {
                if (countdown > 0) {
                    label.string = `💀 GAME OVER 💀\nNo solution possible!\nRestarting in ${countdown}s...`;
                    cc.log(`⏰ ResultManager02: Restart countdown ${countdown}s remaining`);
                    countdown--;
                    
                    // Schedule next countdown update
                    this.scheduleOnce(updateCountdown, 1.0);
                } else {
                    // Countdown finished
                    label.string = `💀 GAME OVER 💀\nRestarting game...`;
                    cc.log(`🔄 ResultManager02: Restart countdown finished!`);
                    
                    // Call onRestart callback with flag check
                    if (!this.callbackExecuted && onRestart) {
                        cc.log(`📞 ResultManager02: Executing onRestart callback`);
                        this.callbackExecuted = true;
                        onRestart();
                    } else if (this.callbackExecuted) {
                        cc.log(`⚠️ ResultManager02: Restart callback already executed, skipping`);
                    } else {
                        cc.warn(`⚠️ ResultManager02: No onRestart callback provided!`);
                    }
                }
            } else {
                cc.error(`❌ ResultManager02: Label is invalid during restart countdown!`);
            }
        };
        
        // Start the first countdown update after 1 second
        this.scheduleOnce(updateCountdown, 1.0);
    }
    
    hideAllResults(): void {
        this.hideWinText();
    }
    
    onDestroy(): void {
        this.hideWinText();
    }
}