import * as cc from 'cc';
import { BoardManager02 } from './BoardManager02';
import { NodeManager02 } from './NodeManager02';
import { PathManager02 } from './PathManager02';
import { GridCell02 } from '../UI/Components/GridCell02';
import { NodeItem02 } from '../UI/Components/NodeItem02';

const { ccclass, property } = cc._decorator;

@ccclass('GameDirector02')
export class GameDirector02 extends cc.Component {

    @property({displayName: "Board Manager", type: cc.Node})
    boardManager: cc.Node = null;
    
    @property({displayName: "Node Manager", type: cc.Node})
    nodeManager: cc.Node = null;
    
    @property({displayName: "Path Manager", type: cc.Node})
    pathManager: cc.Node = null;

    protected boardManagerCmp: BoardManager02 = null;
    protected nodeManagerCmp: NodeManager02 = null;
    protected pathManagerCmp: PathManager02 = null;
    
    private selectedStartNode: NodeItem02 = null;
    private isDrawingPath: boolean = false;
    private currentPath: GridCell02[] = [];
    private completedPaths: Map<number, GridCell02[]> = new Map(); // Store completed paths by node number
    private occupiedCells: Set<string> = new Set(); // Track cells occupied by completed paths

    protected onLoad(): void {
        this.initComponent();
        this.setupEvents();
    }
    
    protected start(): void {
        this.initUI();
        this.startGame();
    }

    initComponent(){
        this.boardManagerCmp = this.boardManager.getComponent(BoardManager02);
        this.nodeManagerCmp = this.nodeManager.getComponent(NodeManager02);
        this.pathManagerCmp = this.pathManager.getComponent(PathManager02);
    }
    
    private setupEvents(): void {
        this.boardManager.on('cell-clicked', this.onCellClicked, this);
    }

    initUI() {
        this.boardManagerCmp.initBoard();
    }
    
    startGame(): void {
        this.scheduleOnce(() => {
            this.generateLevel();
        }, 0.1);
    }
    
    private generateLevel(): void {
        if (this.nodeManagerCmp) {
            this.nodeManagerCmp.generateRandomNodes();
        }
    }
    
    private onCellClicked(cell: GridCell02): void {
        // Check if cell has a node
        const nodeAtCell = this.nodeManagerCmp ? this.nodeManagerCmp.getNodeAt(cell.getRow(), cell.getCol()) : null;
        
        if (nodeAtCell) {
            this.onNodeClicked(nodeAtCell, cell);
        } else {
            this.onEmptyCellClicked(cell);
        }
    }
    
    private onNodeClicked(node: NodeItem02, cell: GridCell02): void {
        if (!this.isDrawingPath) {
            // Start new path from any node
            this.selectedStartNode = node;
            this.isDrawingPath = true;
            this.currentPath = [cell];
            
            cell.setSelected(true);
            cc.log(`Started path from node ${node.getNodeNumber()}`);
        } else {
            // Try to finish path - must be same number/color as start node
            if (this.selectedStartNode && 
                node.getNodeNumber() === this.selectedStartNode.getNodeNumber() &&
                node !== this.selectedStartNode) {
                
                // Valid end node - complete the path
                this.currentPath.push(cell);
                this.finishPath();
                cc.log(`Completed path for node ${node.getNodeNumber()}`);
            } else {
                // Different node clicked - cancel current path and start new one
                cc.log('Starting new path from different node');
                this.cancelCurrentPath();
                
                // Start new path from this node
                this.selectedStartNode = node;
                this.isDrawingPath = true;
                this.currentPath = [cell];
                cell.setSelected(true);
                cc.log(`Started new path from node ${node.getNodeNumber()}`);
            }
        }
    }
    
    private onEmptyCellClicked(cell: GridCell02): void {
        if (this.isDrawingPath) {
            // Check if cell is already occupied by another completed path
            const cellKey = `${cell.getRow()},${cell.getCol()}`;
            if (this.occupiedCells.has(cellKey)) {
                cc.log(`Cell (${cell.getRow()}, ${cell.getCol()}) is occupied by another path`);
                return;
            }
            
            // Add point to current path
            if (this.isValidPathMove(cell)) {
                this.currentPath.push(cell);
                cell.setHighlight(true);
                this.drawPathSegment();
                cc.log(`Added path point at (${cell.getRow()}, ${cell.getCol()})`);
            } else {
                cc.log(`Invalid path move to (${cell.getRow()}, ${cell.getCol()})`);
            }
        }
    }
    
    private isValidPathMove(newCell: GridCell02): boolean {
        if (this.currentPath.length === 0) return true;
        
        const lastCell = this.currentPath[this.currentPath.length - 1];
        const dx = Math.abs(newCell.getRow() - lastCell.getRow());
        const dy = Math.abs(newCell.getCol() - lastCell.getCol());
        
        // Only allow adjacent moves (not diagonal)
        const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
        
        // Check if cell is already in path
        const isAlreadyInPath = this.currentPath.some(cell => 
            cell.getRow() === newCell.getRow() && cell.getCol() === newCell.getCol()
        );
        
        return isAdjacent && !isAlreadyInPath;
    }
    
    private drawPathSegment(): void {
        if (this.currentPath.length < 2) return;
        
        const fromCell = this.currentPath[this.currentPath.length - 2];
        const toCell = this.currentPath[this.currentPath.length - 1];
        
        const fromWorld = fromCell.node.worldPosition;
        const toWorld = toCell.node.worldPosition;
        
        this.pathManagerCmp.drawDirectLineWorld(
            new cc.Vec2(fromWorld.x, fromWorld.y),
            new cc.Vec2(toWorld.x, toWorld.y),
            this.selectedStartNode.getNodeColor(),
            false // Not completed yet
        );
    }
    
    private finishPath(): void {
        // Draw final segment if needed
        this.drawPathSegment();
        
        // Complete the path in PathManager (this will add glow effect)
        const nodeNumber = this.selectedStartNode.getNodeNumber();
        this.pathManagerCmp.completePathForNode(nodeNumber);
        
        // Store completed path
        this.completedPaths.set(nodeNumber, [...this.currentPath]);
        
        // Mark cells as occupied (except start and end nodes)
        this.currentPath.forEach((cell, index) => {
            const cellKey = `${cell.getRow()},${cell.getCol()}`;
            // Don't mark node cells as occupied so they can be clicked again
            const hasNode = this.nodeManagerCmp.getNodeAt(cell.getRow(), cell.getCol());
            if (!hasNode) {
                this.occupiedCells.add(cellKey);
            }
        });
        
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        
        // Check if all pairs are connected
        this.checkWinCondition();
        
        cc.log(`✨ Path completed for node ${nodeNumber} with glow effect! Total completed: ${this.completedPaths.size}`);
    }
    
    private cancelCurrentPath(): void {
        // Only clear current path, not all paths
        this.pathManagerCmp.clearCurrentPath();
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        
        cc.log('Current path cancelled');
    }
    
    private clearCurrentPathHighlights(): void {
        // Only clear highlights from current path
        this.currentPath.forEach(cell => {
            cell.setSelected(false);
            cell.setHighlight(false);
        });
    }
    
    private clearCellSelections(): void {
        const allCells = this.boardManagerCmp.getAllCells();
        allCells.forEach(row => {
            row.forEach(cell => {
                if (cell) {
                    cell.setSelected(false);
                    cell.setHighlight(false);
                }
            });
        });
    }
    
    private checkWinCondition(): void {
        const totalPairs = this.nodeManagerCmp.getNumberOfPairs();
        if (this.completedPaths.size === totalPairs) {
            cc.log('🎉 Congratulations! All pairs connected!');
            // TODO: Show win UI
        }
    }
    
    restartGame(): void {
        this.pathManagerCmp.clearAllPaths();
        this.cancelCurrentPath();
        this.completedPaths.clear();
        this.occupiedCells.clear();
        this.generateLevel();
    }
    
    onDestroy(): void {
        if (this.boardManager) {
            this.boardManager.off('cell-clicked', this.onCellClicked, this);
        }
    }
}