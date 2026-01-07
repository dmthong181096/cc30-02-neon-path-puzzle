import * as cc from 'cc';
import { Subscriber02 } from '../../Helper/Subscriber02';

const { ccclass, property } = cc._decorator;

@ccclass('NodeItem02')
export class NodeItem02 extends Subscriber02 {
    
    @property({ displayName: "Background Circle", type: cc.Sprite })
    backgroundCircle: cc.Sprite = null;
    
    @property({ displayName: "Number Label", type: cc.Label })
    numberLabel: cc.Label = null;
    
    private nodeNumber: number = 0;
    private nodeColor: cc.Color = cc.Color.WHITE;
    private gridPosition: cc.Vec2 = new cc.Vec2(0, 0);
    
    start() {
        
    }
    
    initNode(number: number, color: cc.Color, gridPos: cc.Vec2): void {
        this.nodeNumber = number;
        this.nodeColor = color;
        this.gridPosition = gridPos;
        
        this.updateVisual();
        this.setupInitialState();
        
        cc.log(`NodeItem02: Node ${number} initialized at (${gridPos.x}, ${gridPos.y})`);
    }
    
    private setupInitialState(): void {
        // Start invisible for animation
        this.node.setScale(0, 0, 1);
        
        // Ensure node is visible
        this.node.active = true;
        if (this.backgroundCircle) {
            this.backgroundCircle.node.active = true;
        }
        if (this.numberLabel) {
            this.numberLabel.node.active = true;
        }
    }
    
    playAppearAnimation(delay: number = 0): void {
        cc.log(`🎬 NodeItem02: Playing appear animation for node ${this.nodeNumber} with ${delay}s delay`);
        
        // Ensure node is visible and reset scale
        this.node.active = true;
        this.node.setScale(0, 0, 1);
        
        // Scale up animation with bounce effect
        const scaleUp = cc.tween(this.node)
            .delay(delay)
            .to(0.4, { scale: cc.v3(1.2, 1.2, 1.0) }, { easing: 'backOut' })
            .to(0.1, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'sineOut' });
        
        scaleUp.start();
    }
    
    playHideAnimation(delay: number = 0, onComplete?: () => void): void {
        cc.log(`🎬 NodeItem02: Playing hide animation for node ${this.nodeNumber} with ${delay}s delay`);
        
        // Scale down animation
        const scaleDown = cc.tween(this.node)
            .delay(delay)
            .to(0.3, { scale: cc.v3(0, 0, 1.0) }, { easing: 'backIn' })
            .call(() => {
                if (onComplete) {
                    onComplete();
                }
            });
        
        scaleDown.start();
    }
    
    private updateVisual(): void {
        // Update number label
        if (this.numberLabel) {
            this.numberLabel.string = this.nodeNumber.toString();
            this.numberLabel.color = this.nodeColor;
        }
        
        // Update background circle color
        if (this.backgroundCircle) {
            this.backgroundCircle.color = this.nodeColor;
        }
    }
    
    getNodeNumber(): number {
        return this.nodeNumber;
    }
    
    getNodeColor(): cc.Color {
        return this.nodeColor;
    }
    
    getGridPosition(): cc.Vec2 {
        return this.gridPosition;
    }
    
    resetNode(): void {
        // Reset node state if needed
        this.updateVisual();
    }
}