import * as cc from 'cc';
import { NodeManager02 } from './NodeManager02';
import { NodeItem02 } from '../UI/Components/NodeItem02';
import { GridCell02 } from '../UI/Components/GridCell02';
import { EventEmitter02 } from '../Helper/EventEmitter02';

export interface GameState {
    isDrawingPath: boolean;
    currentPath: GridCell02[];
    completedPaths: Map<number, GridCell02[]>;
    partialPaths: Map<number, GridCell02[]>;
    occupiedCells: Set<string>;
    selectedStartNode: NodeItem02 | null;
}

export enum GameResultEvent {
    WIN = 'game-win',
    LOSE = 'game-lose',
    CONTINUE = 'game-continue'
}

export class GameWriter02 extends EventEmitter02 {
    
    private nodeManagerCmp: NodeManager02 = null;
    private gridSize: number = 8;
    
    constructor(nodeManager: NodeManager02) {
        super();
        this.nodeManagerCmp = nodeManager;
        cc.log('📝 GameWriter02: Initialized');
    }
    
    checkGameResult(gameState: GameState): void {
        cc.log(`📝 GameWriter02: Checking game result...`);
        
        // Check win first
        if (this.checkWinCondition(gameState)) {
            cc.log(`🎉 GameWriter02: WIN detected!`);
            this.emit(GameResultEvent.WIN);
            return;
        }
        
        // Check lose
        if (this.checkLoseCondition(gameState)) {
            cc.log(`💀 GameWriter02: LOSE detected!`);
            this.emit(GameResultEvent.LOSE);
            return;
        }
        
        // Game continues
        cc.log(`✅ GameWriter02: Game continues...`);
        this.emit(GameResultEvent.CONTINUE);
    }
    
    private checkWinCondition(gameState: GameState): boolean {
        const totalPairs = this.nodeManagerCmp.getNumberOfPairs();
        const completedCount = gameState.completedPaths.size;
        
        cc.log(`📝 GameWriter02: Win check - ${completedCount}/${totalPairs} pairs completed`);
        
        return completedCount === totalPairs;
    }
    
    private checkLoseCondition(gameState: GameState): boolean {
        cc.log(`📝 GameWriter02: Checking lose condition...`);
        
        const allPairs = this.nodeManagerCmp.getAllPairs();
        const incompletePairs: { [pairNumber: number]: NodeItem02[] } = {};
        
        for (const pairNumber in allPairs) {
            const pairNum = parseInt(pairNumber);
            if (!gameState.completedPaths.has(pairNum)) {
                incompletePairs[pairNum] = allPairs[pairNum];
            }
        }
        
        const incompletePairCount = Object.keys(incompletePairs).length;
        
        if (incompletePairCount === 0) {
            return false;
        }
        
        // Check if ALL incomplete pairs can still be connected
        for (const pairNumber in incompletePairs) {
            const nodes = incompletePairs[pairNumber];
            if (nodes.length === 2) {
                if (!this.canConnectNodes(nodes[0], nodes[1], gameState)) {
                    cc.log(`❌ GameWriter02: Pair ${pairNumber} cannot be connected - LOSE!`);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private canConnectNodes(startNode: NodeItem02, endNode: NodeItem02, gameState: GameState): boolean {
        const startPos = startNode.getGridPosition();
        const endPos = endNode.getGridPosition();
        
        const path = this.findPath(startPos, endPos, gameState);
        return path !== null && path.length > 0;
    }
    
    private findPath(start: cc.Vec2, end: cc.Vec2, gameState: GameState): cc.Vec2[] | null {
        const visited = new Set<string>();
        const queue: { pos: cc.Vec2, path: cc.Vec2[] }[] = [];
        
        queue.push({ pos: start, path: [start] });
        visited.add(`${start.x},${start.y}`);
        
        const directions = [
            new cc.Vec2(0, 1),
            new cc.Vec2(0, -1),
            new cc.Vec2(1, 0),
            new cc.Vec2(-1, 0)
        ];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const currentPos = current.pos;
            
            if (currentPos.x === end.x && currentPos.y === end.y) {
                return current.path;
            }
            
            for (const dir of directions) {
                const newPos = new cc.Vec2(currentPos.x + dir.x, currentPos.y + dir.y);
                const posKey = `${newPos.x},${newPos.y}`;
                
                if (newPos.x < 0 || newPos.x >= this.gridSize || 
                    newPos.y < 0 || newPos.y >= this.gridSize) {
                    continue;
                }
                
                if (visited.has(posKey)) {
                    continue;
                }
                
                if (this.isCellAvailable(newPos, start, end, gameState)) {
                    visited.add(posKey);
                    queue.push({ pos: newPos, path: [...current.path, newPos] });
                }
            }
        }
        
        return null;
    }
    
    private isCellAvailable(pos: cc.Vec2, startNode: cc.Vec2, endNode: cc.Vec2, gameState: GameState): boolean {
        const cellKey = `${pos.x},${pos.y}`;
        
        // Allow start and end positions
        if ((pos.x === startNode.x && pos.y === startNode.y) || 
            (pos.x === endNode.x && pos.y === endNode.y)) {
            return true;
        }
        
        // Check completed paths
        if (gameState.occupiedCells.has(cellKey)) {
            return false;
        }
        
        // Check current drawing path
        if (gameState.isDrawingPath && gameState.currentPath.length > 0) {
            const isInCurrentPath = gameState.currentPath.some(cell => 
                cell.getRow() === pos.x && cell.getCol() === pos.y
            );
            
            if (isInCurrentPath) {
                const currentNodeNumber = gameState.selectedStartNode ? 
                    gameState.selectedStartNode.getNodeNumber() : -1;
                const startNodeAtPos = this.nodeManagerCmp.getNodeAt(startNode.x, startNode.y);
                const endNodeAtPos = this.nodeManagerCmp.getNodeAt(endNode.x, endNode.y);
                
                if (startNodeAtPos && endNodeAtPos && 
                    (startNodeAtPos.getNodeNumber() === currentNodeNumber || 
                     endNodeAtPos.getNodeNumber() === currentNodeNumber)) {
                    return true;
                }
                return false;
            }
        }
        
        // Check partial paths
        for (const [pairNumber, partialPath] of gameState.partialPaths) {
            const startNodeAtPos = this.nodeManagerCmp.getNodeAt(startNode.x, startNode.y);
            const endNodeAtPos = this.nodeManagerCmp.getNodeAt(endNode.x, endNode.y);
            
            if (startNodeAtPos && endNodeAtPos && 
                (startNodeAtPos.getNodeNumber() === pairNumber || 
                 endNodeAtPos.getNodeNumber() === pairNumber)) {
                continue;
            }
            
            const isInPartialPath = partialPath.some(cell => 
                cell.getRow() === pos.x && cell.getCol() === pos.y
            );
            
            if (isInPartialPath) {
                return false;
            }
        }
        
        // Check nodes
        const nodeAtCell = this.nodeManagerCmp.getNodeAt(pos.x, pos.y);
        if (nodeAtCell) {
            const nodePos = nodeAtCell.getGridPosition();
            const isTargetNode = (nodePos.x === startNode.x && nodePos.y === startNode.y) ||
                               (nodePos.x === endNode.x && nodePos.y === endNode.y);
            return isTargetNode;
        }
        
        return true;
    }
}
