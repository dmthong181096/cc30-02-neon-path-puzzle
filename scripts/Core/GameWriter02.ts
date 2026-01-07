import * as cc from 'cc';
import { EventEmitter02 } from '../Helper/EventEmitter02';
import { GameState02, GameResultEvent, NodeData, CellPosition } from '../Data/GameState02';

export class GameWriter02 extends EventEmitter02 {
    
    constructor() {
        super();
        cc.log('📝 GameWriter02: Initialized');
    }
    
    checkGameResult(gameState: GameState02): void {
        cc.log(`📝 GameWriter02: Checking game result...`);
        
        if (this.checkWinCondition(gameState)) {
            cc.log(`🎉 GameWriter02: WIN detected!`);
            this.emit(GameResultEvent.WIN);
            return;
        }
        
        if (this.checkLoseCondition(gameState)) {
            cc.log(`💀 GameWriter02: LOSE detected!`);
            this.emit(GameResultEvent.LOSE);
            return;
        }
        
        cc.log(`✅ GameWriter02: Game continues...`);
        this.emit(GameResultEvent.CONTINUE);
    }
    
    private checkWinCondition(gameState: GameState02): boolean {
        const completedCount = gameState.completedPaths.size;
        const totalPairs = gameState.totalPairs;
        cc.log(`📝 GameWriter02: Win check - ${completedCount}/${totalPairs} pairs completed`);
        
        const isWin = completedCount === totalPairs;
        cc.log(`📝 GameWriter02: Win condition result: ${isWin}`);
        
        return isWin;
    }
    
    private checkLoseCondition(gameState: GameState02): boolean {
        cc.log(`📝 GameWriter02: Checking lose condition...`);
        
        const incompletePairs = this.getIncompletePairs(gameState);
        
        if (incompletePairs.length === 0) {
            return false;
        }
        
        for (const pairNumber of incompletePairs) {
            const pairNodes = gameState.allNodes.filter(n => n.pairNumber === pairNumber);
            if (pairNodes.length === 2) {
                const start: CellPosition = { row: pairNodes[0].row, col: pairNodes[0].col };
                const end: CellPosition = { row: pairNodes[1].row, col: pairNodes[1].col };
                
                if (!this.canConnect(start, end, pairNumber, gameState)) {
                    cc.log(`❌ GameWriter02: Pair ${pairNumber} cannot be connected - LOSE!`);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private getIncompletePairs(gameState: GameState02): number[] {
        const allPairNumbers = [...new Set(gameState.allNodes.map(n => n.pairNumber))];
        return allPairNumbers.filter(p => !gameState.completedPaths.has(p));
    }
    
    private canConnect(start: CellPosition, end: CellPosition, pairNumber: number, gameState: GameState02): boolean {
        const path = this.findPath(start, end, pairNumber, gameState);
        return path !== null && path.length > 0;
    }
    
    private findPath(start: CellPosition, end: CellPosition, pairNumber: number, gameState: GameState02): CellPosition[] | null {
        const visited = new Set<string>();
        const queue: { pos: CellPosition, path: CellPosition[] }[] = [];
        
        queue.push({ pos: start, path: [start] });
        visited.add(`${start.row},${start.col}`);
        
        const directions = [
            { row: 0, col: 1 },
            { row: 0, col: -1 },
            { row: 1, col: 0 },
            { row: -1, col: 0 }
        ];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.pos.row === end.row && current.pos.col === end.col) {
                return current.path;
            }
            
            for (const dir of directions) {
                const newPos: CellPosition = {
                    row: current.pos.row + dir.row,
                    col: current.pos.col + dir.col
                };
                const posKey = `${newPos.row},${newPos.col}`;
                
                if (newPos.row < 0 || newPos.row >= gameState.gridSize || 
                    newPos.col < 0 || newPos.col >= gameState.gridSize) {
                    continue;
                }
                
                if (visited.has(posKey)) {
                    continue;
                }
                
                if (this.isCellAvailable(newPos, start, end, pairNumber, gameState)) {
                    visited.add(posKey);
                    queue.push({ pos: newPos, path: [...current.path, newPos] });
                }
            }
        }
        
        return null;
    }
    
    private isCellAvailable(pos: CellPosition, start: CellPosition, end: CellPosition, pairNumber: number, gameState: GameState02): boolean {
        const cellKey = `${pos.row},${pos.col}`;
        
        // Allow start and end positions
        if ((pos.row === start.row && pos.col === start.col) || 
            (pos.row === end.row && pos.col === end.col)) {
            return true;
        }
        
        // Check completed paths
        if (gameState.occupiedCells.has(cellKey)) {
            return false;
        }
        
        // Check current drawing path (block for other pairs)
        if (gameState.isDrawingPath && gameState.currentPath.length > 0) {
            const isInCurrentPath = gameState.currentPath.some(c => 
                c.row === pos.row && c.col === pos.col
            );
            if (isInCurrentPath) {
                return gameState.currentDrawingPairNumber === pairNumber;
            }
        }
        
        // Check partial paths (block for other pairs)
        for (const [partialPairNumber, partialPath] of gameState.partialPaths) {
            if (partialPairNumber === pairNumber) continue;
            
            const isInPartialPath = partialPath.some(c => 
                c.row === pos.row && c.col === pos.col
            );
            if (isInPartialPath) {
                return false;
            }
        }
        
        // Check other nodes
        const nodeAtCell = gameState.allNodes.find(n => n.row === pos.row && n.col === pos.col);
        if (nodeAtCell) {
            return nodeAtCell.pairNumber === pairNumber;
        }
        
        return true;
    }
}
