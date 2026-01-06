import * as cc from 'cc';
import { PathLine02 } from '../UI/Components/PathLine02';

const { ccclass, property } = cc._decorator;

@ccclass('PathManager02')
export class PathManager02 extends cc.Component {
    
    @property({ displayName: "Path Line Prefab", type: cc.Prefab })
    pathLinePrefab: cc.Prefab = null;
    
    @property({ displayName: "Path Container", type: cc.Node })
    pathContainer: cc.Node = null;
    
    drawDirectLineWorld(fromWorld: cc.Vec2, toWorld: cc.Vec2, color: cc.Color): void {
        cc.log(`Step 5: PathManager drawDirectLineWorld called`);
        cc.log(`  From: (${fromWorld.x}, ${fromWorld.y}) To: (${toWorld.x}, ${toWorld.y})`);
        
        if (!this.pathLinePrefab) {
            cc.error('Step 5 ERROR: pathLinePrefab is null!');
            return;
        }
        
        if (!this.pathContainer) {
            cc.error('Step 5 ERROR: pathContainer is null!');
            return;
        }
        
        cc.log(`Step 6: Creating PathLine prefab instance`);
        const lineNode = cc.instantiate(this.pathLinePrefab);
        this.pathContainer.addChild(lineNode);
        
        cc.log(`Step 7: Getting PathLine02 component`);
        const pathLine = lineNode.getComponent(PathLine02);
        
        if (!pathLine) {
            cc.error('Step 7 ERROR: PathLine02 component not found on prefab!');
            return;
        }
        
        // Convert world position to local position relative to pathContainer
        const fromLocal = this.worldToLocal(fromWorld);
        const toLocal = this.worldToLocal(toWorld);
        
        cc.log(`Step 8: Local positions - From: (${fromLocal.x}, ${fromLocal.y}) To: (${toLocal.x}, ${toLocal.y})`);
        
        pathLine.drawLineWorld(fromLocal, toLocal, color);
    }
    
    private worldToLocal(worldPos: cc.Vec2): cc.Vec2 {
        const containerWorldPos = this.pathContainer.worldPosition;
        return new cc.Vec2(
            worldPos.x - containerWorldPos.x,
            worldPos.y - containerWorldPos.y
        );
    }
    
    clearAllPaths(): void {
        if (this.pathContainer) {
            this.pathContainer.removeAllChildren();
        }
    }
}
