import * as cc from 'cc';

const { ccclass, property } = cc._decorator;

@ccclass('PathLine02')
export class PathLine02 extends cc.Component {
    
    @property({ displayName: "Line Graphics", type: cc.Graphics })
    lineGraphics: cc.Graphics = null;
    
    @property({ displayName: "Line Width" })
    lineWidth: number = 6;
    
    @property({ displayName: "Glow Width" })
    glowWidth: number = 12;
    
    private fromPos: cc.Vec2 = new cc.Vec2();
    private toPos: cc.Vec2 = new cc.Vec2();
    private lineColor: cc.Color = cc.Color.WHITE;
    private hasGlow: boolean = false;
    private isCompleted: boolean = false;
    
    start() {
        this.initGraphics();
    }
    
    private initGraphics(): void {
        if (!this.lineGraphics) {
            this.lineGraphics = this.node.getComponent(cc.Graphics);
        }
        
        if (!this.lineGraphics) {
            this.lineGraphics = this.node.addComponent(cc.Graphics);
        }
    }
    
    drawLineWorld(fromWorld: cc.Vec2, toWorld: cc.Vec2, color: cc.Color): void {
        this.fromPos = fromWorld;
        this.toPos = toWorld;
        this.lineColor = color;
        
        this.updateLine();
    }
    
    private updateLine(): void {
        if (!this.lineGraphics) {
            this.initGraphics();
            if (!this.lineGraphics) return;
        }
        
        this.lineGraphics.clear();
        
        if (this.hasGlow) {
            this.drawGlowEffect();
        }
        
        // Draw main line
        this.lineGraphics.lineWidth = this.lineWidth;
        this.lineGraphics.strokeColor = this.lineColor;
        this.lineGraphics.moveTo(this.fromPos.x, this.fromPos.y);
        this.lineGraphics.lineTo(this.toPos.x, this.toPos.y);
        this.lineGraphics.stroke();
    }
    
    private drawGlowEffect(): void {
        // Draw outer glow (larger, more transparent)
        const outerGlowColor = new cc.Color(this.lineColor);
        outerGlowColor.a = 60; // More transparent
        
        this.lineGraphics.lineWidth = this.glowWidth + 4;
        this.lineGraphics.strokeColor = outerGlowColor;
        this.lineGraphics.moveTo(this.fromPos.x, this.fromPos.y);
        this.lineGraphics.lineTo(this.toPos.x, this.toPos.y);
        this.lineGraphics.stroke();
        
        // Draw inner glow (medium size, medium transparency)
        const innerGlowColor = new cc.Color(this.lineColor);
        innerGlowColor.a = 120;
        
        this.lineGraphics.lineWidth = this.glowWidth;
        this.lineGraphics.strokeColor = innerGlowColor;
        this.lineGraphics.moveTo(this.fromPos.x, this.fromPos.y);
        this.lineGraphics.lineTo(this.toPos.x, this.toPos.y);
        this.lineGraphics.stroke();
    }
    
    setGlowEffect(enabled: boolean): void {
        this.hasGlow = enabled;
        this.updateLine();
    }
    
    setCompleted(completed: boolean): void {
        this.isCompleted = completed;
        
        if (completed) {
            // Make the line slightly brighter when completed
            const brighterColor = new cc.Color(this.lineColor);
            brighterColor.r = Math.min(255, brighterColor.r + 30);
            brighterColor.g = Math.min(255, brighterColor.g + 30);
            brighterColor.b = Math.min(255, brighterColor.b + 30);
            this.lineColor = brighterColor;
            this.setGlowEffect(true); // Enable glow for completed paths
            this.updateLine();
            
            // Play completion animation
            this.playCompletedAnimation();
        }
    }
    
    playCompletedAnimation(): void {
        cc.log(`🎉 PathLine02: Playing completed animation`);
        
        // Gentle pulse effect - smaller changes
        const originalWidth = this.lineWidth;
        const pulseWidth = originalWidth + 2; // Smaller increase
        
        // Manual animation using scheduleOnce
        this.lineWidth = pulseWidth;
        this.updateLine();
        
        this.scheduleOnce(() => {
            this.lineWidth = originalWidth;
            this.updateLine();
        }, 0.2);
        
        // Subtle glow enhancement
        this.playGentleGlow();
    }
    
    private playGentleGlow(): void {
        const originalGlowWidth = this.glowWidth;
        const maxGlowWidth = originalGlowWidth + 3; // Smaller glow increase
        
        // Manual glow animation
        this.glowWidth = maxGlowWidth;
        this.updateLine();
        
        this.scheduleOnce(() => {
            this.glowWidth = originalGlowWidth;
            this.updateLine();
        }, 0.25);
    }
    
    setPartial(isPartial: boolean): void {
        if (isPartial) {
            // Make partial path lines dimmer
            const dimmerColor = new cc.Color(this.lineColor);
            dimmerColor.a = 150; // More transparent
            this.lineColor = dimmerColor;
            this.updateLine();
        }
    }
    
    playWinFlash(): void {
        // Create a bright flash effect for win animation
        const originalColor = new cc.Color(this.lineColor);
        
        // Flash sequence: bright white -> original -> bright -> original
        const flashTween = cc.tween(this)
            .call(() => {
                this.lineColor = cc.Color.WHITE;
                this.updateLine();
            })
            .delay(0.1)
            .call(() => {
                this.lineColor = originalColor;
                this.updateLine();
            })
            .delay(0.1)
            .call(() => {
                this.lineColor = cc.Color.WHITE;
                this.updateLine();
            })
            .delay(0.1)
            .call(() => {
                this.lineColor = originalColor;
                this.updateLine();
            })
            .delay(0.2)
            .call(() => {
                // Final bright glow
                const brightColor = new cc.Color(originalColor);
                brightColor.r = Math.min(255, brightColor.r + 50);
                brightColor.g = Math.min(255, brightColor.g + 50);
                brightColor.b = Math.min(255, brightColor.b + 50);
                this.lineColor = brightColor;
                this.hasGlow = true;
                this.updateLine();
            });
        
        flashTween.start();
    }
    
    getIsCompleted(): boolean {
        return this.isCompleted;
    }
}