import * as cc from 'cc';
import { BoardManager02 } from './BoardManager02';
import { NodeManager02 } from './NodeManager02';
import { PathManager02 } from './PathManager02';
import { LevelManager02 } from './LevelManager02';
import { ResultManager02 } from './ResultManager02';
import { GameWriter02 } from './GameWriter02';
import { GameState02, GameResultEvent, CellPosition, NodeData } from '../Data/GameState02';
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
    
    @property({displayName: "Level Manager", type: cc.Node})
    levelManager: cc.Node = null;
    
    @property({displayName: "Result Manager", type: cc.Node})
    resultManager: cc.Node = null;

    protected boardManagerCmp: BoardManager02 = null;
    protected nodeManagerCmp: NodeManager02 = null;
    protected pathManagerCmp: PathManager02 = null;
    protected levelManagerCmp: LevelManager02 = null;
    protected resultManagerCmp: ResultManager02 = null;
    protected gameWriter: GameWriter02 = null;
    
    private selectedStartNode: NodeItem02 = null;
    private isDrawingPath: boolean = false;
    private currentPath: GridCell02[] = [];
    private completedPaths: Map<number, GridCell02[]> = new Map();
    private partialPaths: Map<number, GridCell02[]> = new Map();
    private occupiedCells: Set<string> = new Set();
    private lastGameResult: 'win' | 'lose' | null = null;

    protected onLoad(): void {
        this.initComponent();
        this.setupEvents();
        this.setupKeyboardEvents();
    }
    
    protected start(): void {
        this.initUI();
        this.startGame();
    }

    initComponent(){
        this.boardManagerCmp = this.boardManager.getComponent(BoardManager02);
        this.nodeManagerCmp = this.nodeManager.getComponent(NodeManager02);
        this.pathManagerCmp = this.pathManager.getComponent(PathManager02);
        this.levelManagerCmp = this.levelManager.getComponent(LevelManager02);
        this.resultManagerCmp = this.resultManager.getComponent(ResultManager02);
        
        // Create GameWriter instance (pure class)
        this.gameWriter = new GameWriter02();
        
        cc.log('GameDirector02: BoardManager component:', this.boardManagerCmp ? 'Found' : 'Missing');
        cc.log('GameDirector02: NodeManager component:', this.nodeManagerCmp ? 'Found' : 'Missing');
        cc.log('GameDirector02: PathManager component:', this.pathManagerCmp ? 'Found' : 'Missing');
        cc.log('GameDirector02: LevelManager component:', this.levelManagerCmp ? 'Found' : 'Missing');
        cc.log('GameDirector02: ResultManager component:', this.resultManagerCmp ? 'Found' : 'Missing');
        cc.log('GameDirector02: GameWriter instance:', this.gameWriter ? 'Created' : 'Missing');
    }
    
    private setupEvents(): void {
        this.boardManager.on('cell-clicked', this.onCellClicked, this);
        this.levelManager.on('level-changed', this.onLevelChanged, this);
        
        // Listen for game result events from GameWriter
        this.gameWriter.on(GameResultEvent.WIN, this.onGameWin.bind(this));
        this.gameWriter.on(GameResultEvent.LOSE, this.onGameLose.bind(this));
        this.gameWriter.on(GameResultEvent.CONTINUE, this.onGameContinue.bind(this));
    }
    
    private setupKeyboardEvents(): void {
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
            // Save as partial path without clearing others
            cc.log(`⏹️ User stopped path - saving as partial path`);
            this.savePartialPathWithoutClear();
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
        
        // Check game result after cancelling path
        this.scheduleOnce(() => {
            this.requestGameResultCheck();
        }, 0.1);
    }
    
    // Convert current state to GameState02 for GameWriter
    private getGameState(): GameState02 {
        // Convert nodes to NodeData
        const allNodes: NodeData[] = this.nodeManagerCmp.getNodes().map(node => ({
            pairNumber: node.getNodeNumber(),
            row: node.getGridPosition().x,
            col: node.getGridPosition().y
        }));
        
        // Convert currentPath to CellPosition[]
        const currentPath: CellPosition[] = this.currentPath.map(cell => ({
            row: cell.getRow(),
            col: cell.getCol()
        }));
        
        // Convert completedPaths
        const completedPaths = new Map<number, CellPosition[]>();
        for (const [pairNumber, cells] of this.completedPaths) {
            completedPaths.set(pairNumber, cells.map(cell => ({
                row: cell.getRow(),
                col: cell.getCol()
            })));
        }
        
        // Convert partialPaths
        const partialPaths = new Map<number, CellPosition[]>();
        for (const [pairNumber, cells] of this.partialPaths) {
            partialPaths.set(pairNumber, cells.map(cell => ({
                row: cell.getRow(),
                col: cell.getCol()
            })));
        }
        
        return {
            gridSize: 8,
            isDrawingPath: this.isDrawingPath,
            currentPath: currentPath,
            completedPaths: completedPaths,
            partialPaths: partialPaths,
            occupiedCells: this.occupiedCells,
            currentDrawingPairNumber: this.selectedStartNode ? this.selectedStartNode.getNodeNumber() : -1,
            allNodes: allNodes,
            totalPairs: this.nodeManagerCmp.getNumberOfPairs()
        };
    }
    
    // Request GameWriter to check game result
    private requestGameResultCheck(): void {
        if (this.lastGameResult !== null) return;
        
        cc.log(`📤 GameDirector02: Requesting game result check from GameWriter...`);
        this.gameWriter.checkGameResult(this.getGameState());
    }
    
    // Event handlers from GameWriter
    private onGameWin(): void {
        if (this.lastGameResult !== null) return;
        
        this.lastGameResult = 'win';
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        cc.log(`🎉 GameDirector02: Received WIN event for Level ${currentLevel}!`);
        this.playWinAnimation();
    }
    
    private onGameLose(): void {
        if (this.lastGameResult !== null) return;
        
        this.lastGameResult = 'lose';
        cc.log(`💀 GameDirector02: Received LOSE event!`);
        this.triggerGameOver();
    }
    
    private onGameContinue(): void {
        cc.log(`✅ GameDirector02: Game continues...`);
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
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        cc.log(`🎲 GameDirector02: GENERATING LEVEL ${currentLevel}...`);
        
        if (this.nodeManagerCmp) {
            cc.log(`🎯 GameDirector02: Calling NodeManager.generateRandomNodes()...`);
            this.nodeManagerCmp.generateRandomNodes();
            
            const nodeCount = this.nodeManagerCmp.getNodes().length;
            const pairCount = this.nodeManagerCmp.getNumberOfPairs();
            cc.log(`✅ GameDirector02: Level ${currentLevel} generated - ${pairCount} pairs (${nodeCount} nodes total)`);
        } else {
            cc.error(`❌ GameDirector02: NodeManager component not found!`);
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
                cc.log(`🔄 Switching from node ${this.selectedStartNode.getNodeNumber()} to node ${node.getNodeNumber()}`);
                
                // Save current path as partial (if it has content)
                if (this.currentPath.length > 1) {
                    cc.log(`💾 Saving partial path for node ${this.selectedStartNode.getNodeNumber()}`);
                    this.savePartialPathWithoutClear();
                } else {
                    // Just cancel current path if too short
                    cc.log(`❌ Cancelling short path for node ${this.selectedStartNode.getNodeNumber()}`);
                    this.cancelCurrentPath();
                }
                
                // Start new path from this node
                this.selectedStartNode = node;
                this.isDrawingPath = true;
                this.currentPath = [cell];
                cell.setSelected(true);
                cc.log(`✅ Started new path from node ${node.getNodeNumber()}`);
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
            // Check if cell is already occupied by completed paths
            const cellKey = `${cell.getRow()},${cell.getCol()}`;
            if (this.occupiedCells.has(cellKey)) {
                cc.log(`Cell (${cell.getRow()}, ${cell.getCol()}) is occupied by completed path`);
                return;
            }
            
            // Check if cell is occupied by ANY partial paths (cannot draw over any line)
            if (this.isCellOccupiedByAnyPartialPath(cell)) {
                cc.log(`Cell (${cell.getRow()}, ${cell.getCol()}) is occupied by partial path - cannot draw over`);
                return;
            }
            
            // Check if clicking on the last cell of current path (to stop path)
            if (this.currentPath.length > 1) {
                const lastCell = this.currentPath[this.currentPath.length - 1];
                if (lastCell.getRow() === cell.getRow() && lastCell.getCol() === cell.getCol()) {
                    // Double click on last cell - stop path without clearing others
                    cc.log(`🔄 Double-click detected on last cell - stopping path`);
                    this.savePartialPathWithoutClear();
                    return;
                }
            }
            
            // Add point to current path
            if (this.isValidPathMove(cell)) {
                this.currentPath.push(cell);
                cell.setHighlight(true);
                this.drawPathSegment();
                cc.log(`Added path point at (${cell.getRow()}, ${cell.getCol()})`);
                
                // Check game result immediately after adding each cell
                this.scheduleOnce(() => {
                    this.requestGameResultCheck();
                }, 0.05); // Very short delay to ensure drawing is complete
            } else {
                cc.log(`Invalid path move to (${cell.getRow()}, ${cell.getCol()})`);
            }
        } else {
            // Not drawing - check if clicking on a partial path to continue
            this.checkContinuePartialPath(cell);
        }
    }
    
    private isCellOccupiedByOtherPartialPath(cell: GridCell02): boolean {
        const currentNodeNumber = this.selectedStartNode ? this.selectedStartNode.getNodeNumber() : -1;
        
        // Check all partial paths
        for (const [pairNumber, partialPath] of this.partialPaths) {
            // Skip checking partial path of the same pair we're currently drawing
            if (pairNumber === currentNodeNumber) {
                continue;
            }
            
            // Check if current cell is in this partial path
            const isInPartialPath = partialPath.some(pathCell => 
                pathCell.getRow() === cell.getRow() && pathCell.getCol() === cell.getCol()
            );
            
            if (isInPartialPath) {
                cc.log(`🚫 Cell (${cell.getRow()}, ${cell.getCol()}) is occupied by pair ${pairNumber}'s partial path`);
                return true; // Cell is occupied by another pair's partial path
            }
        }
        
        return false; // Cell is not occupied by other partial paths
    }
    
    private canOverwriteOwnPartialPath(cell: GridCell02): boolean {
        const currentNodeNumber = this.selectedStartNode ? this.selectedStartNode.getNodeNumber() : -1;
        
        // Check if this cell is in our own partial path
        const ownPartialPath = this.partialPaths.get(currentNodeNumber);
        if (ownPartialPath) {
            const isInOwnPartialPath = ownPartialPath.some(pathCell => 
                pathCell.getRow() === cell.getRow() && pathCell.getCol() === cell.getCol()
            );
            
            if (isInOwnPartialPath) {
                cc.log(`✅ Cell (${cell.getRow()}, ${cell.getCol()}) is in our own partial path - can overwrite`);
                return true;
            }
        }
        
        return false;
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
        
        // Check if cell is already in current path
        const isAlreadyInCurrentPath = this.currentPath.some(cell => 
            cell.getRow() === newCell.getRow() && cell.getCol() === newCell.getCol()
        );
        
        // Check if cell is occupied by completed paths
        const cellKey = `${newCell.getRow()},${newCell.getCol()}`;
        const isOccupiedByCompletedPath = this.occupiedCells.has(cellKey);
        
        // Check if cell is occupied by ANY partial paths (including own)
        const isOccupiedByAnyPartialPath = this.isCellOccupiedByAnyPartialPath(newCell);
        
        return isAdjacent && 
               !isAlreadyInCurrentPath && 
               !isOccupiedByCompletedPath && 
               !isOccupiedByAnyPartialPath;
    }
    
    private isCellOccupiedByAnyPartialPath(cell: GridCell02): boolean {
        // Check ALL partial paths (including own pair)
        for (const [pairNumber, partialPath] of this.partialPaths) {
            // Check if current cell is in this partial path
            const isInPartialPath = partialPath.some(pathCell => 
                pathCell.getRow() === cell.getRow() && pathCell.getCol() === cell.getCol()
            );
            
            if (isInPartialPath) {
                cc.log(`🚫 Cell (${cell.getRow()}, ${cell.getCol()}) is occupied by pair ${pairNumber}'s partial path - cannot draw over`);
                return true; // Cell is occupied by any partial path
            }
        }
        
        return false; // Cell is not occupied by any partial paths
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
        
        // 🎉 PLAY COMPLETION ANIMATIONS
        cc.log(`🎉 GameDirector02: Playing completion animations for pair ${nodeNumber}`);
        
        // 1. Animate the pair of nodes
        this.nodeManagerCmp.playPairCompletedAnimation(nodeNumber);
        
        // 2. Path lines already animated via PathManager.completePathForNode()
        
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        
        cc.log(`✨ Path completed for node ${nodeNumber} with glow effect! Total completed: ${this.completedPaths.size}`);
        
        // Check game result (win/lose) via GameWriter
        this.requestGameResultCheck();
    }
    
    private savePartialPath(): void {
        if (this.currentPath.length > 1 && this.selectedStartNode) {
            const nodeNumber = this.selectedStartNode.getNodeNumber();
            
            // DON'T clear existing partial path - keep all partial paths
            // Only clear if we're overwriting the same node's partial path
            const existingPartialPath = this.partialPaths.get(nodeNumber);
            if (existingPartialPath) {
                cc.log(`Overwriting existing partial path for node ${nodeNumber}`);
                this.clearPartialPath(nodeNumber);
            }
            
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
        
        // Check game result after saving partial path
        this.scheduleOnce(() => {
            this.requestGameResultCheck();
        }, 0.1);
    }
    
    private savePartialPathWithoutClear(): void {
        if (this.currentPath.length > 1 && this.selectedStartNode) {
            const nodeNumber = this.selectedStartNode.getNodeNumber();
            
            // NEVER clear existing partial paths - just add new one
            cc.log(`💾 Saving partial path for node ${nodeNumber} (keeping all other partial paths)`);
            
            // Save current path as partial
            this.partialPaths.set(nodeNumber, [...this.currentPath]);
            
            // Keep the lines visible but mark them as partial
            this.pathManagerCmp.savePartialPathForNode(nodeNumber);
            
            cc.log(`✅ Saved partial path for node ${nodeNumber} with ${this.currentPath.length} cells`);
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
    
    private triggerGameOver(): void {
        cc.log(`💀 GameDirector02: GAME OVER - No solution possible!`);
        
        // Show game over animation
        this.resultManagerCmp.showGameOverAnimation(() => {
            cc.log(`🔄 GameDirector02: Restarting game after game over...`);
            this.restartGame();
        });
    }
    
    private onLevelChanged(newLevel: number): void {
        cc.log(`📡 GameDirector02: RECEIVED LEVEL CHANGED EVENT - New Level: ${newLevel}`);
        // Level display is handled by LevelManager02
    }
    
    private playWinAnimation(): void {
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        cc.log(`🎉 GameDirector02: STARTING WIN ANIMATION for Level ${currentLevel}...`);
        
        // 1. Flash all completed paths
        cc.log(`✨ GameDirector02: Flashing completed paths...`);
        this.flashCompletedPaths();
        
        // 2. Show win text with countdown via ResultManager
        this.scheduleOnce(() => {
            cc.log(`📝 GameDirector02: Showing win animation via ResultManager...`);
            this.resultManagerCmp.showWinAnimation(currentLevel, () => {
                cc.log(`📞 GameDirector02: Win animation callback triggered - calling nextLevel()`);
                this.nextLevel();
            });
        }, 0.5);
        
        // 3. Particle effect on all nodes
        this.scheduleOnce(() => {
            cc.log(`🎆 GameDirector02: Playing node particle effects...`);
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
    
    private nextLevel(): void {
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        cc.log(`🚀 GameDirector02: STARTING NEXT LEVEL PROCESS - Current Level: ${currentLevel}`);
        
        // Advance level via LevelManager
        cc.log(`📈 GameDirector02: Calling LevelManager.nextLevel()...`);
        this.levelManagerCmp.nextLevel();
        
        const newLevel = this.levelManagerCmp.getCurrentLevel();
        cc.log(`📊 GameDirector02: Level advanced from ${currentLevel} to ${newLevel}`);
        
        // Reset game state (generateLevel will be called in callback)
        cc.log(`🔄 GameDirector02: Resetting game state for next level ${newLevel}...`);
        this.resetGameState();
        
        cc.log(`✅ GameDirector02: Next level ${newLevel} process started!`);
    }
    
    private resetGameState(): void {
        cc.log(`🔄 GameDirector02: Resetting game state...`);
        
        // Play hide animation for nodes first, then clear everything
        this.nodeManagerCmp.playNodesHideAnimation(() => {
            this.finishResetGameState();
            // Generate new level after reset animation completes
            this.generateLevel();
        });
    }
    
    private finishResetGameState(): void {
        cc.log(`🧹 GameDirector02: Finishing game state reset...`);
        
        this.pathManagerCmp.clearAllPaths();
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        this.completedPaths.clear();
        this.partialPaths.clear();
        this.occupiedCells.clear();
        this.lastGameResult = null; // Reset game result
        
        this.clearAllCellStates();
        this.nodeManagerCmp.clearAllNodes();
        
        cc.log(`✅ GameDirector02: Game state reset completed`);
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
        cc.log('🔄 GameDirector02: Restarting game - back to Level 1');
        this.levelManagerCmp.resetToLevel1();
        this.resetGameState(); // generateLevel() will be called in callback
    }
    
    onDestroy(): void {
        if (this.boardManager) {
            this.boardManager.off('cell-clicked', this.onCellClicked, this);
        }
        
        if (this.levelManager) {
            this.levelManager.off('level-changed', this.onLevelChanged, this);
        }
        
        if (this.gameWriter) {
            this.gameWriter.removeAllListeners();
        }
        
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }
}