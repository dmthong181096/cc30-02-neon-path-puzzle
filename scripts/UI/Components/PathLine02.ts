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
            this.updateLine();
        }
    }
    
    getIsCompleted(): boolean {
        return this.isCompleted;
    }
}