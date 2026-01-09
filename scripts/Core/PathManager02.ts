import * as cc from 'cc';
import { PathLine02 } from '../UI/Components/PathLine02';

const { ccclass, property } = cc._decorator;

@ccclass('PathManager02')
export class PathManager02 extends cc.Component {
    
    @property({ displayName: "Path Line Prefab", type: cc.Prefab })
    pathLinePrefab: cc.Prefab = null;
    
    @property({ displayName: "Path Container", type: cc.Node })
    pathContainer: cc.Node = null;
    
    private currentPathLines: PathLine02[] = []; // Lines for current drawing path
    private completedPathLines: Map<number, PathLine02[]> = new Map(); // Lines for completed paths by node number
    private partialPathLines: Map<number, PathLine02[]> = new Map(); // Lines for partial paths by node number
    
    drawDirectLineWorld(fromWorld: cc.Vec2, toWorld: cc.Vec2, color: cc.Color, isCompleted: boolean = false): PathLine02 | null {
        if (!this.pathLinePrefab || !this.pathContainer) {
            return null;
        }
        
        const lineNode = cc.instantiate(this.pathLinePrefab);
        this.pathContainer.addChild(lineNode);
        
        const pathLine = lineNode.getComponent(PathLine02);
        if (!pathLine) {
            return null;
        }
        
        // Convert world position to local position relative to pathContainer
        const fromLocal = this.worldToLocal(fromWorld);
        const toLocal = this.worldToLocal(toWorld);
        
        pathLine.drawLineWorld(fromLocal, toLocal, color);
        
        // Set glow effect for completed paths
        if (isCompleted) {
            pathLine.setGlowEffect(true);
        }
        
        // Add to current path lines
        this.currentPathLines.push(pathLine);
        
        return pathLine;
    }
    
    completePathForNode(nodeNumber: number): void {
        // Move current path lines to completed paths
        if (this.currentPathLines.length > 0) {
            this.completedPathLines.set(nodeNumber, [...this.currentPathLines]);
            
            // Apply glow effect to all lines in this completed path
            this.currentPathLines.forEach(line => {
                line.setGlowEffect(true);
                line.setCompleted(true);
            });
            
            this.currentPathLines = [];
        }
    }
    
    clearCurrentPath(): void {
        // Clear only current drawing path lines
        this.currentPathLines.forEach(line => {
            if (line && line.node) {
                line.node.destroy();
            }
        });
        this.currentPathLines = [];
        }
    
    savePartialPathForNode(nodeNumber: number): void {
        // Move current path lines to partial paths
        if (this.currentPathLines.length > 0) {
            this.partialPathLines.set(nodeNumber, [...this.currentPathLines]);
            
            // Make partial path lines slightly dimmer
            this.currentPathLines.forEach(line => {
                line.setPartial(true);
            });
            
            this.currentPathLines = [];
            }
    }
    
    clearPartialPathForNode(nodeNumber: number): void {
        // Clear specific partial path
        const pathLines = this.partialPathLines.get(nodeNumber);
        if (pathLines) {
            pathLines.forEach(line => {
                if (line && line.node) {
                    line.node.destroy();
                }
            });
            this.partialPathLines.delete(nodeNumber);
            }
    }
    
    clearAllPaths(): void {
        // Clear all paths
        this.clearCurrentPath();
        
        // Clear completed paths
        this.completedPathLines.forEach((pathLines, nodeNumber) => {
            pathLines.forEach(line => {
                if (line && line.node) {
                    line.node.destroy();
                }
            });
        });
        this.completedPathLines.clear();
        
        // Clear partial paths
        this.partialPathLines.forEach((pathLines, nodeNumber) => {
            pathLines.forEach(line => {
                if (line && line.node) {
                    line.node.destroy();
                }
            });
        });
        this.partialPathLines.clear();
        
        if (this.pathContainer) {
            this.pathContainer.removeAllChildren();
        }
        
    }
    
    private worldToLocal(worldPos: cc.Vec2): cc.Vec2 {
        const containerWorldPos = this.pathContainer.worldPosition;
        return new cc.Vec2(
            worldPos.x - containerWorldPos.x,
            worldPos.y - containerWorldPos.y
        );
    }
    
    getCompletedPathLines(nodeNumber: number): PathLine02[] | null {
        return this.completedPathLines.get(nodeNumber) || null;
    }
    
    getCompletedPathsCount(): number {
        return this.completedPathLines.size;
    }
}
