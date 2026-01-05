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
        
        cc.log(`NodeItem02: Node ${number} initialized at (${gridPos.x}, ${gridPos.y})`);
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