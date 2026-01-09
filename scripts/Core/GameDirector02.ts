import * as cc from 'cc';
import { BoardManager02 } from './BoardManager02';
import { NodeManager02 } from './NodeManager02';
import { PathManager02 } from './PathManager02';
import { LevelManager02 } from './LevelManager02';
import { ResultManager02 } from './ResultManager02';
import { ScoreManager02 } from './ScoreManager02';
import { TimerManager02 } from './TimerManager02';
import { GameWriter02 } from './GameWriter02';
import { GameState02, GameResultEvent, CellPosition, NodeData } from '../Data/GameState02';
import { GridCell02 } from '../UI/Components/GridCell02';
import { NodeItem02 } from '../UI/Components/NodeItem02';
import Declaration02 from '../Declaration02';
import { Subscriber02 } from '../Helper/Subscriber02';
const {BaseSubscriber} = Declaration02
const { ccclass, property } = cc._decorator;

@ccclass('GameDirector02')
export class GameDirector02 extends Subscriber02 {

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
    
    @property({displayName: "Score Manager", type: cc.Node})
    scoreManager: cc.Node = null;
    
    @property({displayName: "Timer Manager", type: cc.Node})
    timerManager: cc.Node = null;
    
    @property({displayName: "Sound Manager", type: cc.Node})
    soundManager: cc.Node = null;
    
    @property({displayName: "Button Manager", type: cc.Node})
    buttonManager: cc.Node = null;

    protected boardManagerCmp: BoardManager02 = null;
    protected nodeManagerCmp: NodeManager02 = null;
    protected pathManagerCmp: PathManager02 = null;
    protected levelManagerCmp: LevelManager02 = null;
    protected resultManagerCmp: ResultManager02 = null;
    protected scoreManagerCmp: ScoreManager02 = null;
    protected timerManagerCmp: TimerManager02 = null;
    protected soundManagerCmp: any = null; // SoundManager02
    protected buttonManagerCmp: any = null; // ButtonManager02
    protected gameWriter: GameWriter02 = null;
    
    // Store bound event handlers for proper cleanup
    private boundOnLevelTimeExpired: (data: { levelNumber: number }) => void;
    private boundOnTimeWarning: (data: { remaining: number }) => void;
    private boundOnCountdownTick: (data: { seconds: number }) => void;
    
    private selectedStartNode: NodeItem02 = null;
    private isDrawingPath: boolean = false;
    private currentPath: GridCell02[] = [];
    private completedPaths: Map<number, GridCell02[]> = new Map();
    private partialPaths: Map<number, GridCell02[]> = new Map();
    private occupiedCells: Set<string> = new Set();
    private lastGameResult: 'win' | 'lose' | null = null;

    onLoad(): void {
        this.initComponent();
        this.setupEvents();
        this.setupKeyboardEvents();
    }
    
    start(): void {
        this.initUI();
        this.startGame();
    }

    initComponent(){
        this.boardManagerCmp = this.boardManager.getComponent(BoardManager02);
        this.nodeManagerCmp = this.nodeManager.getComponent(NodeManager02);
        this.pathManagerCmp = this.pathManager.getComponent(PathManager02);
        this.levelManagerCmp = this.levelManager.getComponent(LevelManager02);
        this.resultManagerCmp = this.resultManager.getComponent(ResultManager02);
        this.scoreManagerCmp = this.scoreManager.getComponent(ScoreManager02);
        this.timerManagerCmp = this.timerManager.getComponent(TimerManager02);
        this.soundManagerCmp = this.soundManager ? this.soundManager.getComponent('SoundManager02') : null;
        this.buttonManagerCmp = this.buttonManager ? this.buttonManager.getComponent('ButtonManager02') : null;
        
        // Set up button manager with sound manager reference
        if (this.buttonManagerCmp && this.soundManagerCmp) {
            this.buttonManagerCmp.setSoundManager(this.soundManagerCmp);
        }
        
        // Create GameWriter instance (pure class)
        this.gameWriter = new GameWriter02();
    }
    
    private setupEvents(): void {
        this.boardManager.on('cell-clicked', this.onCellClicked, this);
        this.levelManager.on('level-changed', this.onLevelChanged, this);
        
        // Listen for button manager events
        if (this.buttonManagerCmp) {
            this.buttonManagerCmp.registerEvent('game-pause', this.onGamePause.bind(this));
            this.buttonManagerCmp.registerEvent('game-home', this.onGameHome.bind(this));
            this.buttonManagerCmp.registerEvent('game-restart', this.onGameRestart.bind(this));
            this.buttonManagerCmp.registerEvent('settings-opened', this.onSettingsOpened.bind(this));
            this.buttonManagerCmp.registerEvent('settings-closed', this.onSettingsClosed.bind(this));
        }
        
        // Listen for game result events from GameWriter
        this.gameWriter.on(GameResultEvent.WIN, this.onGameWin.bind(this));
        this.gameWriter.on(GameResultEvent.LOSE, this.onGameLose.bind(this));
        this.gameWriter.on(GameResultEvent.CONTINUE, this.onGameContinue.bind(this));
        
        // Store bound functions for proper cleanup
        this.boundOnLevelTimeExpired = this.onLevelTimeExpired.bind(this);
        this.boundOnTimeWarning = this.onTimeWarning.bind(this);
        this.boundOnCountdownTick = this.onCountdownTick.bind(this);
        
        // Set direct callback for timer instead of using event system
        this.timerManagerCmp.setLevelTimeExpiredCallback((levelNumber: number) => {
            this.onLevelTimeExpired({ levelNumber });
        });
        
        // Still register other timer events (these are less critical)
        this.timerManagerCmp.registerEvent('time-warning', this.boundOnTimeWarning);
        this.timerManagerCmp.registerEvent('countdown-tick', this.boundOnCountdownTick);
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
            this.savePartialPathWithoutClear();
        } else {
            // Cancel if too short
            this.cancelCurrentPath();
        }
    }
    
    private cancelCurrentPath(): void {
        this.pathManagerCmp.clearCurrentPath();
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
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
        
        this.gameWriter.checkGameResult(this.getGameState());
    }
    
    // Event handlers from GameWriter
    private onGameWin(): void {
        if (this.lastGameResult !== null) return;
        
        this.lastGameResult = 'win';
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        const totalPairs = this.nodeManagerCmp.getNumberOfPairs();
        
        // Stop level timer and get remaining time
        const remainingTime = this.timerManagerCmp.stopLevelTimer();
        const elapsedTime = 60 - remainingTime; // Calculate elapsed from remaining
        
        // Record level completion and get score (pass elapsed time in milliseconds)
        const levelScore = this.scoreManagerCmp.recordLevelCompletion(currentLevel, totalPairs);
    
        this.playWinAnimation();
    }
    
    private onGameLose(): void {
        if (this.lastGameResult !== null) return;
        
        this.lastGameResult = 'lose';
        this.triggerGameOver();
    }
    
    private onGameContinue(): void {

    }
    
    // Timer event handlers
    private onLevelTimeExpired(data: { levelNumber: number }): void {
        // Trigger game over due to time limit
        this.lastGameResult = 'lose';
        this.triggerGameOver();
    }
    
    private onTimeWarning(data: { remaining: number }): void {

    }
    
    private onCountdownTick(data: { seconds: number }): void {
        // Could add sound effects, screen shake, or other dramatic effects
        if (data.seconds <= 5) {
            // Extra dramatic effects for final 5 seconds
            this.playUrgentCountdownEffects(data.seconds);
        }
    }
    
    private playUrgentCountdownEffects(seconds: number): void {
     
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
        
        if (this.nodeManagerCmp) {
            this.nodeManagerCmp.generateRandomNodes();            
            // Initialize score tracking for this level
            this.scoreManagerCmp.initLevel(currentLevel);
            
            // RE-REGISTER timer events before starting timer (in case they were removed)
            this.timerManagerCmp.registerEvent('time-warning', this.boundOnTimeWarning);
            this.timerManagerCmp.registerEvent('countdown-tick', this.boundOnCountdownTick);
            
            // Start level countdown timer (10 seconds for testing)
            this.timerManagerCmp.startLevelTimer(currentLevel, 60);
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
        } else {
            // Check if clicking the same start node to cancel
            if (this.selectedStartNode && node === this.selectedStartNode) {
                this.cancelCurrentPath();
                return;
            }
            
            // Check if this is a valid end node (same number as start node)
            if (this.selectedStartNode && 
                node.getNodeNumber() === this.selectedStartNode.getNodeNumber() &&
                node !== this.selectedStartNode) {
                
                // Check if current path can reach this node (must be adjacent to last cell)
                if (this.canReachNode(node, cell)) {
                    // Valid end node - complete the path
                    this.currentPath.push(cell);
                    this.finishPath();
                } 
            } else {
                // Save current path as partial (if it has content)
                if (this.currentPath.length > 1) {
                    this.savePartialPathWithoutClear();
                } else {
                    // Just cancel current path if too short
                    this.cancelCurrentPath();
                }
                
                // Start new path from this node
                this.selectedStartNode = node;
                this.isDrawingPath = true;
                this.currentPath = [cell];
                cell.setSelected(true);
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
                return;
            }
            
            // Check if cell is occupied by ANY partial paths (cannot draw over any line)
            if (this.isCellOccupiedByAnyPartialPath(cell)) {
                return;
            }
            
            // Check if clicking on the last cell of current path (to stop path)
            if (this.currentPath.length > 1) {
                const lastCell = this.currentPath[this.currentPath.length - 1];
                if (lastCell.getRow() === cell.getRow() && lastCell.getCol() === cell.getCol()) {
                    // Double click on last cell - stop path without clearing others
                    this.savePartialPathWithoutClear();
                    return;
                }
            }
            
            // Add point to current path
            if (this.isValidPathMove(cell)) {
                this.currentPath.push(cell);
                cell.setHighlight(true);
                this.drawPathSegment();
                
                // Record move for scoring AND for moves counter
                this.scoreManagerCmp.recordMove();
                this.timerManagerCmp.addMove(); // Add to total moves counter
                
                
                // Check game result immediately after adding each cell
                this.scheduleOnce(() => {
                    this.requestGameResultCheck();
                }, 0.05); // Very short delay to ensure drawing is complete
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
                return;
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

        
        // 1. Animate the pair of nodes
        this.nodeManagerCmp.playPairCompletedAnimation(nodeNumber);
        
        // 2. Record path completion for scoring
        this.scoreManagerCmp.recordPathCompletion(nodeNumber, this.currentPath.length);
        
        // 3. Path lines already animated via PathManager.completePathForNode()
        
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
            
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
                this.clearPartialPath(nodeNumber);
            }
            
            // Save current path as partial
            this.partialPaths.set(nodeNumber, [...this.currentPath]);
            
            // Keep the lines visible but mark them as partial
            this.pathManagerCmp.savePartialPathForNode(nodeNumber);
            
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
            // Save current path as partial
            this.partialPaths.set(nodeNumber, [...this.currentPath]);
            
            // Keep the lines visible but mark them as partial
            this.pathManagerCmp.savePartialPathForNode(nodeNumber);
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
        // Get current game stats for cyberpunk display
        const currentScore = this.scoreManagerCmp.getCurrentScore();
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        const totalMoves = this.timerManagerCmp.getTotalMoves();
        // Show cyberpunk game over animation with stats
        this.resultManagerCmp.showGameOverAnimationWithStats(currentScore, currentLevel, totalMoves, () => {
            this.restartGame();
        }, () => {
            this.goToMainMenu();
        });
    }
    
    private onLevelChanged(newLevel: number): void {
    }
    
    private playWinAnimation(): void {
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        const totalPairs = this.nodeManagerCmp.getNumberOfPairs();
        const remainingTime = this.timerManagerCmp.getLevelTime(); // Get remaining time
        const elapsedTime = 60 - remainingTime; // Calculate elapsed time
        // 1. Flash all completed paths
        this.flashCompletedPaths();
        
        // 2. Get score breakdown for display (pass elapsed time in milliseconds)
        const scoreBreakdown = this.scoreManagerCmp.getScoreBreakdown(currentLevel, elapsedTime * 1000, totalPairs);
        
        // 3. Show win text with score breakdown via ResultManager
        this.scheduleOnce(() => {
            
            const totalMoves = this.timerManagerCmp.getTotalMoves();
            this.resultManagerCmp.showWinAnimationWithScore(currentLevel, scoreBreakdown, totalMoves, () => {
                this.nextLevel();
            }, () => {
                this.goToMainMenu();
            });
        }, 0.5);
        
        // 4. Particle effect on all nodes
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
    
    private nextLevel(): void {
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        
        // Advance level via LevelManager
        this.levelManagerCmp.nextLevel();
        
        const newLevel = this.levelManagerCmp.getCurrentLevel();
        
        this.resetGameState();
    }
    
    private resetGameState(): void {
        // Play hide animation for nodes first, then clear everything
        this.nodeManagerCmp.playNodesHideAnimation(() => {
            this.finishResetGameState();
            // Generate new level after reset animation completes
            this.generateLevel();
        });
    }
    
    private finishResetGameState(): void {
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
        cc.log(`🔍 DEBUG: Before restart - lastGameResult = ${this.lastGameResult}`);
        
        this.levelManagerCmp.resetToLevel1();
        this.scoreManagerCmp.resetScore(); // Reset score for new game
        this.timerManagerCmp.resetForNewGame(); // Reset timers for new game
        this.resetGameState(); // generateLevel() will be called in callback
    }
    
    private goToMainMenu(): void {
        cc.log('📱 GameDirector02: Going to main menu');
        // TODO: Implement main menu navigation
        // For now, just restart the game
        this.restartGame();
    }
    
    // Button Manager Event Handlers
    private onGamePause(): void {
        cc.log('⏸️ GameDirector02: Game paused via button');
        // TODO: Implement pause functionality
        // For now, just show settings
        if (this.buttonManagerCmp) {
            this.buttonManagerCmp.showSettings();
        }
    }
    
    private onGameHome(): void {
        cc.log('🏠 GameDirector02: Home button pressed');
        this.goToMainMenu();
    }
    
    private onGameRestart(): void {
        cc.log('🔄 GameDirector02: Restart button pressed');
        this.restartGame();
    }
    
    private onSettingsOpened(): void {
        cc.log('⚙️ GameDirector02: Settings panel opened');
        // Pause game when settings are open
        // TODO: Implement actual pause logic
    }
    
    private onSettingsClosed(): void {
        cc.log('⚙️ GameDirector02: Settings panel closed');
        // Resume game when settings are closed
        // TODO: Implement actual resume logic
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
        
        // Unregister specific timer events using stored bound functions
        if (this.timerManagerCmp) {
            this.timerManagerCmp.unregisterEvent('level-time-expired', this.boundOnLevelTimeExpired);
            this.timerManagerCmp.unregisterEvent('time-warning', this.boundOnTimeWarning);
            this.timerManagerCmp.unregisterEvent('countdown-tick', this.boundOnCountdownTick);
        }
        
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        
        // Don't call super.onDestroy() to avoid removing all event listeners
        // super.onDestroy() would call BaseSubscriber.eventEmitter.removeAllListeners()
    }
}