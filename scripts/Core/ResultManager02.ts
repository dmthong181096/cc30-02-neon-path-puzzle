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
    
    private showWinTextWithScore(currentLevel: number, scoreData: any, onComplete?: () => void): void {
        cc.log(`📝 ResultManager02: Displaying win text with score for Level ${currentLevel}`);
        
        // Create detailed score text
        let scoreText = `🎉 LEVEL ${currentLevel} COMPLETE! 🎉\n`;
        scoreText += `💯 Score: +${scoreData.totalScore}\n`;
        
        if (scoreData.timeBonus > 0) {
            scoreText += `⚡ Time Bonus: +${scoreData.timeBonus}\n`;
        }
        if (scoreData.efficiencyBonus > 0) {
            scoreText += `🎯 Efficiency: +${scoreData.efficiencyBonus}\n`;
        }
        if (scoreData.perfectBonus > 0) {
            scoreText += `⭐ Perfect: +${scoreData.perfectBonus}\n`;
        }
        
        scoreText += `\nNext level in 5s...`;
        
        this.resultLabel.string = scoreText;
        cc.log(`📄 ResultManager02: Win text with score set`);
        
        // Position at center of container
        this.resultNode.setPosition(0, 0, 0);
        
        // Simple scale animation
        this.resultNode.setScale(0, 0, 1);
        const scaleUp = cc.tween(this.resultNode)
            .to(0.5, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'backOut' });
        
        scaleUp.start();
        cc.log(`🎬 ResultManager02: Win text scale animation started`);
        
        // Countdown animation
        this.startCountdownWithScore(this.resultLabel, currentLevel, scoreData, onComplete);
        
        // Auto remove after 5 seconds
        this.scheduleOnce(() => {
            this.hideWinText();
        }, 5.0);
        cc.log(`⏰ ResultManager02: Scheduled win text removal in 5 seconds`);
    }
    
    private startCountdownWithScore(label: cc.Label, currentLevel: number, scoreData: any, onComplete?: () => void): void {
        let countdown = 5;
        cc.log(`⏱️ ResultManager02: Starting 5-second countdown with score for Level ${currentLevel}`);
        
        const updateCountdown = () => {
            if (label && label.isValid) {
                if (countdown > 0) {
                    let scoreText = `🎉 LEVEL ${currentLevel} COMPLETE! 🎉\n`;
                    scoreText += `💯 Total Score: +${scoreData.totalScore}\n`;
                    scoreText += `\nNext level in ${countdown}s...`;
                    
                    label.string = scoreText;
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
                    }
                }
            }
        };
        
        // Start the first countdown update after 1 second
        this.scheduleOnce(updateCountdown, 1.0);
    }
    
    showWinAnimationWithScore(currentLevel: number, scoreData: any, onComplete?: () => void): void {
        cc.log(`🎉 ResultManager02: Starting win animation with score for Level ${currentLevel}`);
        
        // Reset callback flag
        this.callbackExecuted = false;
        
        // No auto-advance timer - wait for user action
        this.showWinScreenWithScore(currentLevel, scoreData, onComplete);
    }
    
    private showWinScreenWithScore(currentLevel: number, scoreData: any, onComplete?: () => void): void {
        cc.log(`📝 ResultManager02: Displaying win screen with score for Level ${currentLevel} - waiting for user action`);
        
        // Create detailed score text without countdown
        let scoreText = `🎉 LEVEL ${currentLevel} COMPLETE! 🎉\n\n`;
        scoreText += `💯 Total Score: +${scoreData.totalScore}\n`;
        
        if (scoreData.timeBonus > 0) {
            scoreText += `⚡ Time Bonus: +${scoreData.timeBonus}\n`;
        }
        if (scoreData.efficiencyBonus > 0) {
            scoreText += `🎯 Efficiency: +${scoreData.efficiencyBonus}\n`;
        }
        if (scoreData.perfectBonus > 0) {
            scoreText += `⭐ Perfect: +${scoreData.perfectBonus}\n`;
        }
        
        scoreText += `\n[▶️ NEXT LEVEL]     [📱 MAIN MENU]\n\n`;
        scoreText += `Tap to continue...`;
        
        this.resultLabel.string = scoreText;
        cc.log(`📄 ResultManager02: Win text with score set - waiting for user input`);
        
        // Position at center of container
        this.resultNode.setPosition(0, 0, 0);
        
        // Simple scale animation
        this.resultNode.setScale(0, 0, 1);
        const scaleUp = cc.tween(this.resultNode)
            .to(0.5, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'backOut' });
        
        scaleUp.start();
        cc.log(`🎬 ResultManager02: Win text scale animation started`);
        
        // Set up click handler for user actions
        this.setupWinClickHandler(onComplete);
        
        // No auto-removal - screen stays until user action
        cc.log(`⏸️ ResultManager02: Win screen displayed - waiting for user action`);
    }
    
    private setupWinClickHandler(onComplete?: () => void): void {
        cc.log(`🖱️ ResultManager02: Setting up click handler for win screen actions`);
        
        // Add click event to result node
        this.resultNode.on(cc.Node.EventType.TOUCH_END, (event: cc.EventTouch) => {
            cc.log(`🖱️ ResultManager02: Win screen clicked - processing user action`);
            
            // For now, any click will advance to next level
            // Later you can add button detection based on click position
            if (!this.callbackExecuted && onComplete) {
                cc.log(`▶️ ResultManager02: User chose NEXT LEVEL - advancing`);
                this.callbackExecuted = true;
                
                // Hide the screen first
                this.hideWinScreen();
                
                // Then advance level
                onComplete();
            }
        }, this);
        
        cc.log(`✅ ResultManager02: Win click handler set up - user can now interact`);
    }
    
    private hideWinScreen(): void {
        cc.log(`🫥 ResultManager02: Hiding win screen`);
        
        // Remove click handler
        this.resultNode.off(cc.Node.EventType.TOUCH_END);
        
        // Fade out animation
        const fadeOut = cc.tween(this.resultNode)
            .to(0.3, { 
                scale: cc.v3(1.2, 1.2, 1.0),
                opacity: 0 
            }, { easing: 'sineIn' })
            .call(() => {
                this.resultLabel.string = "";
                this.resultNode.opacity = 255; // Reset opacity for next time
            });
        
        fadeOut.start();
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
    
    showGameOverAnimationWithStats(currentScore: number, currentLevel: number, totalMoves: number, onRestart?: () => void): void {
        cc.log(`💀 ResultManager02: Starting cyberpunk game over with stats - Score: ${currentScore}, Level: ${currentLevel}, Moves: ${totalMoves}`);
        
        // Reset callback flag
        this.callbackExecuted = false;
        
        // No auto-restart timer - wait for user action
        this.showCyberpunkGameOverScreen(currentScore, currentLevel, totalMoves, onRestart);
    }
    
    private showCyberpunkGameOverScreen(score: number, level: number, moves: number, onRestart?: () => void): void {
        cc.log(`💀 ResultManager02: Displaying cyberpunk game over screen with stats - waiting for user action`);
        
        // Create cyberpunk-style game over text without countdown
        let gameOverText = `⚠️ SYSTEM FAILURE ⚠️\n`;
        gameOverText += `SEQUENCE INTERRUPTED\n\n`;
        gameOverText += `SCORE\n${score.toLocaleString()}\n\n`;
        gameOverText += `LEVEL\n${level}\n\n`;
        gameOverText += `MOVES\n${moves}\n\n`;
        gameOverText += `[🔄 RETRY]     [📱 MAIN MENU]\n\n`;
        gameOverText += `EXIT GAME\n\n`;
        gameOverText += `💡 TIP: Connect the neon nodes before the\n`;
        gameOverText += `timer runs out to multiply your score.`;
        
        this.resultLabel.string = gameOverText;
        cc.log(`📄 ResultManager02: Cyberpunk game over text set - waiting for user input`);
        
        // Position at center of container
        this.resultNode.setPosition(0, 0, 0);
        
        // Cyberpunk-style entrance animation with glitch effect
        this.resultNode.setScale(0, 0, 1);
        this.resultNode.setRotationFromEuler(0, 0, 2);
        
        const entrance = cc.tween(this.resultNode)
            .to(0.2, { 
                scale: cc.v3(1.2, 1.2, 1.0),
                angle: -1 
            }, { easing: 'quadOut' })
            .to(0.1, { 
                scale: cc.v3(0.9, 0.9, 1.0),
                angle: 1 
            }, { easing: 'quadIn' })
            .to(0.2, { 
                scale: cc.v3(1.0, 1.0, 1.0),
                angle: 0 
            }, { easing: 'backOut' });
        
        entrance.start();
        cc.log(`🎬 ResultManager02: Cyberpunk glitch entrance animation started`);
        
        // Set up click handler for user actions
        this.setupGameOverClickHandler(onRestart);
        
        // No auto-removal - screen stays until user action
        cc.log(`⏸️ ResultManager02: Game over screen displayed - waiting for user action`);
    }
    
    private setupGameOverClickHandler(onRestart?: () => void): void {
        cc.log(`🖱️ ResultManager02: Setting up click handler for game over actions`);
        
        // Add click event to result node
        this.resultNode.on(cc.Node.EventType.TOUCH_END, (event: cc.EventTouch) => {
            cc.log(`🖱️ ResultManager02: Game over screen clicked - processing user action`);
            
            // For now, any click will restart the game
            // Later you can add button detection based on click position
            if (!this.callbackExecuted && onRestart) {
                cc.log(`🔄 ResultManager02: User chose RETRY - restarting game`);
                this.callbackExecuted = true;
                
                // Hide the screen first
                this.hideGameOverScreen();
                
                // Then restart
                onRestart();
            }
        }, this);
        
        cc.log(`✅ ResultManager02: Click handler set up - user can now interact`);
    }
    
    private hideGameOverScreen(): void {
        cc.log(`🫥 ResultManager02: Hiding game over screen`);
        
        // Remove click handler
        this.resultNode.off(cc.Node.EventType.TOUCH_END);
        
        // Fade out animation
        const fadeOut = cc.tween(this.resultNode)
            .to(0.3, { 
                scale: cc.v3(0.8, 0.8, 1.0),
                opacity: 0 
            }, { easing: 'sineIn' })
            .call(() => {
                this.resultLabel.string = "";
                this.resultNode.opacity = 255; // Reset opacity for next time
            });
        
        fadeOut.start();
    }
    
    private startCyberpunkRestartCountdown(label: cc.Label, score: number, level: number, moves: number, onRestart?: () => void): void {
        let countdown = 5;
        cc.log(`⏱️ ResultManager02: Starting 5-second cyberpunk restart countdown`);
        
        const updateCountdown = () => {
            cc.log(`⏰ ResultManager02: Cyberpunk countdown update - ${countdown}s remaining`);
            
            if (label && label.isValid) {
                if (countdown > 0) {
                    let gameOverText = `⚠️ SYSTEM FAILURE ⚠️\n`;
                    gameOverText += `SEQUENCE INTERRUPTED\n\n`;
                    gameOverText += `SCORE: ${score}\n`;
                    gameOverText += `LEVEL: ${level}\n`;
                    gameOverText += `MOVES: ${moves}\n\n`;
                    gameOverText += `💡 TIP: Connect the neon nodes before the\n`;
                    gameOverText += `timer runs out to multiply your score.\n\n`;
                    gameOverText += `Restarting in ${countdown}s...`;
                    
                    label.string = gameOverText;
                    countdown--;
                    
                    // Schedule next countdown update
                    this.scheduleOnce(updateCountdown, 1.0);
                } else {
                    // Countdown finished - show final message
                    let finalText = `⚠️ SYSTEM FAILURE ⚠️\n`;
                    finalText += `SEQUENCE INTERRUPTED\n\n`;
                    finalText += `INITIALIZING RESTART SEQUENCE...\n`;
                    finalText += `LOADING NEW GAME...`;
                    
                    label.string = finalText;
                    cc.log(`🔄 ResultManager02: Cyberpunk restart countdown finished!`);
                    
                    // Call onRestart callback with flag check
                    if (!this.callbackExecuted && onRestart) {
                        cc.log(`📞 ResultManager02: Executing cyberpunk onRestart callback`);
                        this.callbackExecuted = true;
                        onRestart();
                    }
                }
            } else {
                cc.error(`❌ ResultManager02: Label is invalid during cyberpunk countdown!`);
            }
        };
        
        // Start the first countdown update after 1 second
        this.scheduleOnce(updateCountdown, 1.0);
    }
    
    private showGameOverText(onRestart?: () => void): void {
        cc.log(`💀 ResultManager02: Displaying simple game over text - waiting for user action`);
        
        this.resultLabel.string = `💀 GAME OVER 💀\nNo solution possible!\n\n[🔄 RETRY]     [📱 MAIN MENU]\n\nTap to restart...`;
        cc.log(`📄 ResultManager02: Simple game over text set`);

        // Position at center of container
        this.resultNode.setPosition(0, 0, 0);
        
        // Simple scale animation
        this.resultNode.setScale(0, 0, 1);
        const scaleUp = cc.tween(this.resultNode)
            .to(0.5, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'backOut' });
        
        scaleUp.start();
        cc.log(`🎬 ResultManager02: Simple game over scale animation started`);
        
        // Set up click handler for restart
        this.setupGameOverClickHandler(onRestart);
        
        cc.log(`⏸️ ResultManager02: Simple game over displayed - waiting for user action`);
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
        private cleanupClickHandlers(): void {
        if (this.resultNode) {
            this.resultNode.off(cc.Node.EventType.TOUCH_END);
        }
    }
}
