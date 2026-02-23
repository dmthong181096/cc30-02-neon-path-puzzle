import * as cc from 'cc';
import { EventEmitter02 } from '../Helper/EventEmitter02';
import { GameState02, GameResultEvent, NodeData, CellPosition } from '../Data/GameState02';

export class GameWriter02 extends EventEmitter02 {
    
    constructor() {
        super();
        }
    
    checkGameResult(gameState: GameState02): void {
        const {WIN, LOSE, CONTINUE} = GameResultEvent
        if (this.checkWinCondition(gameState)) {
            this.emit(WIN);
            return;
        }
        
        if (this.checkLoseCondition(gameState)) {
            this.emit(LOSE);
            return;
        }
        
        this.emit(CONTINUE);
    }
    
    private checkWinCondition(gameState: GameState02): boolean {
        const completedCount = gameState.completedPaths.size;
        const totalPairs = gameState.totalPairs;
        const isWin = completedCount === totalPairs;
        return isWin;
    }
    
    private checkLoseCondition(gameState: GameState02): boolean {
        const incompletePairs = this.getIncompletePairs(gameState);
        
        if (incompletePairs.length === 0) {
            return false;
        }
        
        for (let i = 0; i < incompletePairs.length; i++) {
            const pairNumber = incompletePairs[i];
            const pairNodes = gameState.allNodes.filter(n => n.pairNumber === pairNumber);
            if (pairNodes.length === 2) {
                const start: CellPosition = { row: pairNodes[0].row, col: pairNodes[0].col };
                const end: CellPosition = { row: pairNodes[1].row, col: pairNodes[1].col };
                
                const canConnect = this.canConnect(start, end, pairNumber, gameState);
                if (!canConnect) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private getIncompletePairs(gameState: GameState02): number[] {
        // Extract all pair numbers manually to avoid Set spread issues on mobile
        const pairNumbersSet = new Set<number>();
        for (let i = 0; i < gameState.allNodes.length; i++) {
            pairNumbersSet.add(gameState.allNodes[i].pairNumber);
        }
        
        // Convert Set to Array manually
        const allPairNumbers: number[] = [];
        pairNumbersSet.forEach(num => {
            allPairNumbers.push(num);
        });
        
        const incompletePairs: number[] = [];
        for (let i = 0; i < allPairNumbers.length; i++) {
            const pairNum = allPairNumbers[i];
            if (!gameState.completedPaths.has(pairNum)) {
                incompletePairs.push(pairNum);
            }
        }    
        return incompletePairs;
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
        
        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loop
        
        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            
            const current = queue.shift();
            if (!current) break;
            
            if (current.pos.row === end.row && current.pos.col === end.col) {
                return current.path;
            }
            
            for (let i = 0; i < directions.length; i++) {
                const dir = directions[i];
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
            for (let i = 0; i < gameState.currentPath.length; i++) {
                const c = gameState.currentPath[i];
                if (c.row === pos.row && c.col === pos.col) {
                    return gameState.currentDrawingPairNumber === pairNumber;
                }
            }
        }
        
        // Check partial paths (block for other pairs)
        const partialPathsArray = Array.from(gameState.partialPaths.entries());
        for (let i = 0; i < partialPathsArray.length; i++) {
            const [partialPairNumber, partialPath] = partialPathsArray[i];
            if (partialPairNumber === pairNumber) continue;
            
            for (let j = 0; j < partialPath.length; j++) {
                const c = partialPath[j];
                if (c.row === pos.row && c.col === pos.col) {
                    return false;
                }
            }
        }
        
        // Check other nodes
        let nodeAtCell = null;
        for (let i = 0; i < gameState.allNodes.length; i++) {
            const n = gameState.allNodes[i];
            if (n.row === pos.row && n.col === pos.col) {
                nodeAtCell = n;
                break;
            }
        }
        
        if (nodeAtCell) {
            return nodeAtCell.pairNumber === pairNumber;
        }
        
        return true;
    }
}
