import * as cc from 'cc';

const { ccclass, property } = cc._decorator;

@ccclass('PathLine02')
export class PathLine02 extends cc.Component {
    
    @property({ displayName: "Line Graphics", type: cc.Graphics })
    lineGraphics: cc.Graphics = null;
    
    @property({ displayName: "Line Width" })
    lineWidth: number = 6;
    
    start() {
        cc.log('PathLine02: Component started');
        this.initGraphics();
    }
    
    private initGraphics(): void {
        if (!this.lineGraphics) {
            this.lineGraphics = this.node.getComponent(cc.Graphics);
        }
        
        if (!this.lineGraphics) {
            this.lineGraphics = this.node.addComponent(cc.Graphics);
        }
        
        if (this.lineGraphics) {
            cc.log('PathLine02: Graphics component ready');
        } else {
            cc.error('PathLine02: Failed to create Graphics component!');
        }
    }
    
    drawLineWorld(fromWorld: cc.Vec2, toWorld: cc.Vec2, color: cc.Color): void {
        cc.log(`Step 9: PathLine02 drawLineWorld called`);
        cc.log(`  From: (${fromWorld.x}, ${fromWorld.y}) To: (${toWorld.x}, ${toWorld.y})`);
        
        // Ensure graphics is ready
        this.initGraphics();
        
        if (!this.lineGraphics) {
            cc.error('Step 9 ERROR: Graphics component is null!');
            return;
        }
        
        cc.log(`Step 10: Drawing line with Graphics`);
        
        this.lineGraphics.clear();
        this.lineGraphics.lineWidth = this.lineWidth;
        this.lineGraphics.strokeColor = color;
        this.lineGraphics.moveTo(fromWorld.x, fromWorld.y);
        this.lineGraphics.lineTo(toWorld.x, toWorld.y);
        this.lineGraphics.stroke();
        
        cc.log(`Step 11: Line drawn successfully!`);
    }
}
