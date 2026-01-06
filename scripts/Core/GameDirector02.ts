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
    private partialPaths: Map<number, GridCell02[]> = new Map(); // Store partial paths by node number
    private occupiedCells: Set<string> = new Set(); // Track cells occupied by completed paths
    private currentLevel: number = 1;
    private isGameWon: boolean = false;
    private levelDisplay: cc.Label = null;

    protected onLoad(): void {
        this.initComponent();
        this.setupEvents();
        this.setupKeyboardEvents();
    }
    
    protected start(): void {
        this.initUI();
        this.createLevelDisplay();
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
    
    private setupKeyboardEvents(): void {
        // Listen for ESC key to stop current path
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    
    private onKeyDown(event: cc.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.escape) {
            if (this.isDrawingPath) {
                this.stopCurrentPath();
            }
        }
    }
    
    private stopCurrentPath(): void {
        if (this.isDrawingPath && this.currentPath.length > 1) {
            // Save as partial path
            this.savePartialPath();
            cc.log('Path stopped by user - saved as partial path');
        } else {
            // Cancel if too short
            this.cancelCurrentPath();
            cc.log('Path cancelled - too short to save');
        }
    }
    
    private cancelCurrentPath(): void {
        this.pathManagerCmp.clearCurrentPath();
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        cc.log('Current path cancelled');
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
            // Check if this is a valid end node (same number as start node)
            if (this.selectedStartNode && 
                node.getNodeNumber() === this.selectedStartNode.getNodeNumber() &&
                node !== this.selectedStartNode) {
                
                // Check if current path can reach this node (must be adjacent to last cell)
                if (this.canReachNode(node, cell)) {
                    // Valid end node - complete the path
                    this.currentPath.push(cell);
                    this.finishPath();
                    cc.log(`Completed path for node ${node.getNodeNumber()}`);
                } else {
                    cc.log(`Cannot reach node ${node.getNodeNumber()} - not adjacent to current path`);
                }
            } else {
                // Different node clicked - save current partial path and start new one
                cc.log('Saving partial path and starting new path from different node');
                this.savePartialPath();
                
                // Start new path from this node
                this.selectedStartNode = node;
                this.isDrawingPath = true;
                this.currentPath = [cell];
                cell.setSelected(true);
                cc.log(`Started new path from node ${node.getNodeNumber()}`);
            }
        }
    }
    
    private canReachNode(targetNode: NodeItem02, targetCell: GridCell02): boolean {
        if (this.currentPath.length === 0) return false;
        
        const lastCell = this.currentPath[this.currentPath.length - 1];
        const dx = Math.abs(targetCell.getRow() - lastCell.getRow());
        const dy = Math.abs(targetCell.getCol() - lastCell.getCol());
        
        // Target node must be adjacent to the last cell in current path
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    
    private onEmptyCellClicked(cell: GridCell02): void {
        if (this.isDrawingPath) {
            // Check if cell is already occupied by another completed path
            const cellKey = `${cell.getRow()},${cell.getCol()}`;
            if (this.occupiedCells.has(cellKey)) {
                cc.log(`Cell (${cell.getRow()}, ${cell.getCol()}) is occupied by another path`);
                return;
            }
            
            // Check if clicking on the last cell of current path (to stop path)
            if (this.currentPath.length > 1) {
                const lastCell = this.currentPath[this.currentPath.length - 1];
                if (lastCell.getRow() === cell.getRow() && lastCell.getCol() === cell.getCol()) {
                    // Double click on last cell - stop path
                    this.stopCurrentPath();
                    return;
                }
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
        } else {
            // Not drawing - check if clicking on a partial path to continue
            this.checkContinuePartialPath(cell);
        }
    }
    
    private checkContinuePartialPath(cell: GridCell02): void {
        // Check if this cell is the end of any partial path
        for (const [nodeNumber, partialPath] of this.partialPaths) {
            const lastCell = partialPath[partialPath.length - 1];
            if (lastCell.getRow() === cell.getRow() && lastCell.getCol() === cell.getCol()) {
                // Continue this partial path
                this.continuePartialPath(nodeNumber);
                cc.log(`Continuing partial path for node ${nodeNumber}`);
                return;
            }
        }
        cc.log('No partial path to continue from this cell');
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
    
    private savePartialPath(): void {
        if (this.currentPath.length > 1 && this.selectedStartNode) {
            const nodeNumber = this.selectedStartNode.getNodeNumber();
            
            // Clear any existing partial path for this node
            this.clearPartialPath(nodeNumber);
            
            // Save current path as partial
            this.partialPaths.set(nodeNumber, [...this.currentPath]);
            
            // Keep the lines visible but mark them as partial
            this.pathManagerCmp.savePartialPathForNode(nodeNumber);
            
            cc.log(`Saved partial path for node ${nodeNumber} with ${this.currentPath.length} cells`);
        }
        
        // Reset current drawing state
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
    }
    
    private continuePartialPath(nodeNumber: number): void {
        const partialPath = this.partialPaths.get(nodeNumber);
        if (!partialPath) return;
        
        // Find the start node for this path
        const startCell = partialPath[0];
        const startNode = this.nodeManagerCmp.getNodeAt(startCell.getRow(), startCell.getCol());
        
        if (startNode) {
            // Resume drawing from this partial path
            this.selectedStartNode = startNode;
            this.isDrawingPath = true;
            this.currentPath = [...partialPath];
            
            // Highlight the path
            this.currentPath.forEach(cell => cell.setHighlight(true));
            
            cc.log(`Continuing partial path for node ${nodeNumber} from ${this.currentPath.length} cells`);
        }
    }
    
    private clearPartialPath(nodeNumber: number): void {
        const partialPath = this.partialPaths.get(nodeNumber);
        if (partialPath) {
            // Clear highlights from partial path
            partialPath.forEach(cell => {
                cell.setHighlight(false);
                cell.setSelected(false);
            });
            
            // Clear the visual lines
            this.pathManagerCmp.clearPartialPathForNode(nodeNumber);
            
            this.partialPaths.delete(nodeNumber);
            cc.log(`Cleared partial path for node ${nodeNumber}`);
        }
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
        if (this.isGameWon) return; // Prevent multiple win triggers
        
        const totalPairs = this.nodeManagerCmp.getNumberOfPairs();
        cc.log(`Win check: ${this.completedPaths.size}/${totalPairs} pairs completed`);
        
        if (this.completedPaths.size === totalPairs) {
            this.isGameWon = true;
            cc.log(`🎉 Level ${this.currentLevel} completed! Starting win animation...`);
            this.playWinAnimation();
            
            // Auto next level after 5 seconds
            this.scheduleOnce(() => {
                this.nextLevel();
            }, 5.0);
        }
    }
    
    private playWinAnimation(): void {
        // 1. Flash all completed paths
        this.flashCompletedPaths();
        
        // 2. Show win text with scale animation
        this.scheduleOnce(() => {
            this.showWinText();
        }, 0.5);
        
        // 3. Particle effect on all nodes
        this.scheduleOnce(() => {
            this.playNodeParticles();
        }, 1.0);
    }
    
    private flashCompletedPaths(): void {
        // Make all completed paths flash brighter
        for (const [nodeNumber, path] of this.completedPaths) {
            const pathLines = this.pathManagerCmp.getCompletedPathLines(nodeNumber);
            if (pathLines) {
                pathLines.forEach(line => {
                    line.playWinFlash();
                });
            }
        }
    }
    
    private showWinText(): void {
        // Create win text node
        const winTextNode = new cc.Node('WinText');
        this.node.addChild(winTextNode);
        
        // Add UITransform first
        const transform = winTextNode.addComponent(cc.UITransform);
        transform.setContentSize(500, 150);
        
        // Add label component
        const label = winTextNode.addComponent(cc.Label);
        label.string = `🎉 LEVEL ${this.currentLevel} COMPLETE! 🎉\nNext level in 5s...`;
        label.fontSize = 50;
        label.color = cc.Color.YELLOW;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        
        // Position at center
        winTextNode.setPosition(0, 100, 0);
        
        // Simple scale animation
        winTextNode.setScale(0, 0, 1);
        const scaleUp = cc.tween(winTextNode)
            .to(0.5, { scale: cc.v3(1.0, 1.0, 1.0) }, { easing: 'backOut' });
        
        scaleUp.start();
        
        // Countdown animation
        this.startCountdown(label);
        
        // Auto remove after 5 seconds
        this.scheduleOnce(() => {
            if (winTextNode && winTextNode.isValid) {
                winTextNode.destroy();
            }
        }, 5.0);
    }
    
    private startCountdown(label: cc.Label): void {
        let countdown = 5;
        
        const updateCountdown = () => {
            if (label && label.isValid) {
                label.string = `🎉 LEVEL ${this.currentLevel} COMPLETE! 🎉\nNext level in ${countdown}s...`;
                countdown--;
                
                if (countdown >= 0) {
                    this.scheduleOnce(updateCountdown, 1.0);
                }
            }
        };
        
        this.scheduleOnce(updateCountdown, 1.0);
    }
    
    private nextLevel(): void {
        this.currentLevel++;
        this.updateLevelDisplay();
        cc.log(`🚀 Starting Level ${this.currentLevel}`);
        
        // Reset game state
        this.resetGameState();
        
        // Generate new level
        this.generateLevel();
    }
    
    private resetGameState(): void {
        // Clear all paths and states
        this.pathManagerCmp.clearAllPaths();
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        this.completedPaths.clear();
        this.partialPaths.clear();
        this.occupiedCells.clear();
        this.isGameWon = false;
        
        // Clear all cell states
        this.clearAllCellStates();
        
        cc.log(`Game state reset for Level ${this.currentLevel}`);
    }
    
    private createLevelDisplay(): void {
        // Create level display node
        const levelNode = new cc.Node('LevelDisplay');
        this.node.addChild(levelNode);
        
        // Add UITransform
        const transform = levelNode.addComponent(cc.UITransform);
        transform.setContentSize(200, 50);
        
        // Add label
        this.levelDisplay = levelNode.addComponent(cc.Label);
        this.levelDisplay.string = `Level ${this.currentLevel}`;
        this.levelDisplay.fontSize = 36;
        this.levelDisplay.color = cc.Color.WHITE;
        this.levelDisplay.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        
        // Position at top
        levelNode.setPosition(0, 300, 0);
    }
    
    private updateLevelDisplay(): void {
        if (this.levelDisplay && this.levelDisplay.isValid) {
            this.levelDisplay.string = `Level ${this.currentLevel}`;
        }
    }
    
    private clearAllCellStates(): void {
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
    
    private playNodeParticles(): void {
        // Add sparkle effect to all nodes
        const allNodes = this.nodeManagerCmp.getNodes();
        allNodes.forEach((node, index) => {
            this.scheduleOnce(() => {
                this.createSparkleEffect(node);
            }, index * 0.1); // Stagger the effects
        });
    }
    
    private createSparkleEffect(node: NodeItem02): void {
        const sparkleNode = new cc.Node('Sparkle');
        node.node.addChild(sparkleNode);
        
        // Create multiple small sparkles
        for (let i = 0; i < 6; i++) {
            const sparkle = new cc.Node('SparkleParticle');
            sparkleNode.addChild(sparkle);
            
            // Add UITransform first
            const transform = sparkle.addComponent(cc.UITransform);
            transform.setContentSize(6, 6);
            
            // Add Graphics component for simple circle
            const graphics = sparkle.addComponent(cc.Graphics);
            graphics.fillColor = cc.Color.WHITE;
            graphics.circle(0, 0, 3);
            graphics.fill();
            
            // Random direction and distance
            const angle = (i / 6) * Math.PI * 2;
            const distance = 40;
            const targetX = Math.cos(angle) * distance;
            const targetY = Math.sin(angle) * distance;
            
            // Simple animation: move out and fade
            const sparkleAnim = cc.tween(sparkle)
                .to(0.6, { 
                    position: cc.v3(targetX, targetY, 0),
                    scale: cc.v3(0.1, 0.1, 1.0)
                }, { easing: 'sineOut' })
                .call(() => {
                    if (sparkle && sparkle.isValid) {
                        sparkle.destroy();
                    }
                });
            
            sparkleAnim.start();
        }
        
        // Remove sparkle container after animation
        this.scheduleOnce(() => {
            if (sparkleNode && sparkleNode.isValid) {
                sparkleNode.destroy();
            }
        }, 1.0);
    }
    
    restartGame(): void {
        this.currentLevel = 1;
        this.resetGameState();
        this.generateLevel();
        cc.log('Game restarted - back to Level 1');
    }
    
    onDestroy(): void {
        if (this.boardManager) {
            this.boardManager.off('cell-clicked', this.onCellClicked, this);
        }
        
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }
}