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

    @property({displayName:"Button Back To Lobby", type: cc.Node})
    btnBackToLobby: cc.Node = null;

    protected boardManagerCmp: BoardManager02 = null;
    protected nodeManagerCmp: NodeManager02 = null;
    protected pathManagerCmp: PathManager02 = null;
    protected levelManagerCmp: LevelManager02 = null;
    protected resultManagerCmp: ResultManager02 = null;
    protected scoreManagerCmp: ScoreManager02 = null;
    protected timerManagerCmp: TimerManager02 = null;
    protected soundManagerCmp: any = null;
    protected buttonManagerCmp: any = null;
    protected gameWriter: GameWriter02 = null;
    
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
        
        if (this.buttonManagerCmp && this.soundManagerCmp) {
            this.buttonManagerCmp.setSoundManager(this.soundManagerCmp);
        }
        
        this.gameWriter = new GameWriter02();
    }
    
    private setupEvents(): void {
        this.boardManager.on('cell-clicked', this.onCellClicked, this);
        this.levelManager.on('level-changed', this.onLevelChanged, this);
        
        if (this.buttonManagerCmp) {
            this.buttonManagerCmp.registerEvent('game-pause', this.onGamePause.bind(this));
            this.buttonManagerCmp.registerEvent('game-home', this.onGameHome.bind(this));
            this.buttonManagerCmp.registerEvent('game-restart', this.onGameRestart.bind(this));
            this.buttonManagerCmp.registerEvent('settings-opened', this.onSettingsOpened.bind(this));
            this.buttonManagerCmp.registerEvent('settings-closed', this.onSettingsClosed.bind(this));
        }
        const {WIN, LOSE, CONTINUE} = GameResultEvent;
        this.gameWriter.on(WIN, this.onGameWin.bind(this));
        this.gameWriter.on(LOSE, this.onGameLose.bind(this));
        this.gameWriter.on(CONTINUE, this.onGameContinue.bind(this));
        
        this.boundOnLevelTimeExpired = this.onLevelTimeExpired.bind(this);
        this.boundOnTimeWarning = this.onTimeWarning.bind(this);
        this.boundOnCountdownTick = this.onCountdownTick.bind(this);
        
        this.timerManagerCmp.setLevelTimeExpiredCallback((levelNumber: number) => {
            this.onLevelTimeExpired({ levelNumber });
        });
        
        this.timerManagerCmp.registerEvent('time-warning', this.boundOnTimeWarning);
        this.timerManagerCmp.registerEvent('countdown-tick', this.boundOnCountdownTick);

        this.btnBackToLobby.on(cc.Node.EventType.TOUCH_END, this.onClickBackToLobby, this);
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
            this.savePartialPathWithoutClear();
        } else {
            this.cancelCurrentPath();
        }
    }
    
    private cancelCurrentPath(): void {
        this.pathManagerCmp.clearCurrentPath();
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        this.scheduleOnce(() => {
            this.requestGameResultCheck();
        }, 0.1);
    }
    
    private getGameState(): GameState02 {
        const allNodes: NodeData[] = this.nodeManagerCmp.getNodes().map(node => ({
            pairNumber: node.getNodeNumber(),
            row: node.getGridPosition().x,
            col: node.getGridPosition().y
        }));
        
        const currentPath: CellPosition[] = this.currentPath.map(cell => ({
            row: cell.getRow(),
            col: cell.getCol()
        }));
        
        const completedPaths = new Map<number, CellPosition[]>();
        for (const [pairNumber, cells] of this.completedPaths) {
            completedPaths.set(pairNumber, cells.map(cell => ({
                row: cell.getRow(),
                col: cell.getCol()
            })));
        }
        
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
    
    private requestGameResultCheck(): void {
        if (this.lastGameResult !== null) return;
        this.gameWriter.checkGameResult(this.getGameState());
    }
    
    private onGameWin(): void {
        if (this.lastGameResult !== null) return;
        
        this.lastGameResult = 'win';
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        const totalPairs = this.nodeManagerCmp.getNumberOfPairs();
        
        const remainingTime = this.timerManagerCmp.stopLevelTimer();
        const elapsedTime = 60 - remainingTime;
        
        if (this.soundManagerCmp) {
            this.soundManagerCmp.playLevelWin();
        }
        
        const levelScore = this.scoreManagerCmp.recordLevelCompletion(currentLevel, totalPairs);
        this.playWinAnimation();
    }
    
    private onGameLose(): void {
        if (this.lastGameResult !== null) return;
        
        this.lastGameResult = 'lose';
        
        if (this.soundManagerCmp) {
            this.soundManagerCmp.playLevelLose();
        }
        
        this.triggerGameOver();
    }
    
    private onGameContinue(): void {
    }
    
    private onLevelTimeExpired(data: { levelNumber: number }): void {
        this.lastGameResult = 'lose';
        this.triggerGameOver();
    }
    
    private onTimeWarning(data: { remaining: number }): void {
        if (this.soundManagerCmp) {
            this.soundManagerCmp.playTimerWarning();
        }
    }
    
    private onCountdownTick(data: { seconds: number }): void {
        if (data.seconds <= 5) {
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
            this.scoreManagerCmp.initLevel(currentLevel);
            
            this.timerManagerCmp.registerEvent('time-warning', this.boundOnTimeWarning);
            this.timerManagerCmp.registerEvent('countdown-tick', this.boundOnCountdownTick);
            
            this.timerManagerCmp.startLevelTimer(currentLevel, 60);
        }
    }
    
    private onCellClicked(cell: GridCell02): void {
        const nodeAtCell = this.nodeManagerCmp ? this.nodeManagerCmp.getNodeAt(cell.getRow(), cell.getCol()) : null;
        
        if (nodeAtCell) {
            this.onNodeClicked(nodeAtCell, cell);
        } else {
            this.onEmptyCellClicked(cell);
        }
    }
    
    private onNodeClicked(node: NodeItem02, cell: GridCell02): void {
        if (!this.isDrawingPath) {
            this.selectedStartNode = node;
            this.isDrawingPath = true;
            this.currentPath = [cell];
            
            cell.setSelected(true);
            
            if (this.soundManagerCmp) {
                this.soundManagerCmp.playNodeSelect();
            }
        } else {
            if (this.selectedStartNode && node === this.selectedStartNode) {
                this.cancelCurrentPath();
                return;
            }
            
            if (this.selectedStartNode && 
                node.getNodeNumber() === this.selectedStartNode.getNodeNumber() &&
                node !== this.selectedStartNode) {
                
                if (this.canReachNode(node, cell)) {
                    this.currentPath.push(cell);
                    this.finishPath();
                } 
            } else {
                if (this.currentPath.length > 1) {
                    this.savePartialPathWithoutClear();
                } else {
                    this.cancelCurrentPath();
                }
                
                this.selectedStartNode = node;
                this.isDrawingPath = true;
                this.currentPath = [cell];
                cell.setSelected(true);
                
                if (this.soundManagerCmp) {
                    this.soundManagerCmp.playNodeSelect();
                }
            }
        }
    }
    
    private canReachNode(targetNode: NodeItem02, targetCell: GridCell02): boolean {
        if (this.currentPath.length === 0) return false;
        
        const lastCell = this.currentPath[this.currentPath.length - 1];
        const dx = Math.abs(targetCell.getRow() - lastCell.getRow());
        const dy = Math.abs(targetCell.getCol() - lastCell.getCol());
        
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    
    private onEmptyCellClicked(cell: GridCell02): void {
        if (this.isDrawingPath) {
            const cellKey = `${cell.getRow()},${cell.getCol()}`;
            if (this.occupiedCells.has(cellKey)) {
                return;
            }
            
            if (this.isCellOccupiedByAnyPartialPath(cell)) {
                return;
            }
            
            if (this.currentPath.length > 1) {
                const lastCell = this.currentPath[this.currentPath.length - 1];
                if (lastCell.getRow() === cell.getRow() && lastCell.getCol() === cell.getCol()) {
                    this.savePartialPathWithoutClear();
                    return;
                }
            }
            
            if (this.isValidPathMove(cell)) {
                this.currentPath.push(cell);
                cell.setHighlight(true);
                this.drawPathSegment();
                
                if (this.soundManagerCmp) {
                    this.soundManagerCmp.playPathDraw();
                }
                
                this.scoreManagerCmp.recordMove();
                this.timerManagerCmp.addMove();
                
                this.scheduleOnce(() => {
                    this.requestGameResultCheck();
                }, 0.05);
            }
        } else {
            this.checkContinuePartialPath(cell);
        }
    }
    
    private isCellOccupiedByOtherPartialPath(cell: GridCell02): boolean {
        const currentNodeNumber = this.selectedStartNode ? this.selectedStartNode.getNodeNumber() : -1;
        
        for (const [pairNumber, partialPath] of this.partialPaths) {
            if (pairNumber === currentNodeNumber) {
                continue;
            }
            
            const isInPartialPath = partialPath.some(pathCell => 
                pathCell.getRow() === cell.getRow() && pathCell.getCol() === cell.getCol()
            );
            if (isInPartialPath) {
                return true;
            }
        }
        
        return false;
    }
    
    private canOverwriteOwnPartialPath(cell: GridCell02): boolean {
        const currentNodeNumber = this.selectedStartNode ? this.selectedStartNode.getNodeNumber() : -1;
        
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
        for (const [nodeNumber, partialPath] of this.partialPaths) {
            const lastCell = partialPath[partialPath.length - 1];
            if (lastCell.getRow() === cell.getRow() && lastCell.getCol() === cell.getCol()) {
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
        
        const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
        
        const isAlreadyInCurrentPath = this.currentPath.some(cell => 
            cell.getRow() === newCell.getRow() && cell.getCol() === newCell.getCol()
        );
        
        const cellKey = `${newCell.getRow()},${newCell.getCol()}`;
        const isOccupiedByCompletedPath = this.occupiedCells.has(cellKey);
        
        const isOccupiedByAnyPartialPath = this.isCellOccupiedByAnyPartialPath(newCell);
        
        return isAdjacent && 
               !isAlreadyInCurrentPath && 
               !isOccupiedByCompletedPath && 
               !isOccupiedByAnyPartialPath;
    }
    
    private isCellOccupiedByAnyPartialPath(cell: GridCell02): boolean {
        for (const [pairNumber, partialPath] of this.partialPaths) {
            const isInPartialPath = partialPath.some(pathCell => 
                pathCell.getRow() === cell.getRow() && pathCell.getCol() === cell.getCol()
            );
            
            if (isInPartialPath) {
                return true;
            }
        }
        
        return false;
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
            false
        );
    }
    
    private finishPath(): void {
        this.drawPathSegment();
        
        const nodeNumber = this.selectedStartNode.getNodeNumber();
        this.pathManagerCmp.completePathForNode(nodeNumber);
        
        if (this.soundManagerCmp) {
            this.soundManagerCmp.playPathComplete();
        }
        
        this.completedPaths.set(nodeNumber, [...this.currentPath]);
        
        this.currentPath.forEach((cell, index) => {
            const cellKey = `${cell.getRow()},${cell.getCol()}`;
            const hasNode = this.nodeManagerCmp.getNodeAt(cell.getRow(), cell.getCol());
            if (!hasNode) {
                this.occupiedCells.add(cellKey);
            }
        });
        
        this.nodeManagerCmp.playPairCompletedAnimation(nodeNumber);
        this.scoreManagerCmp.recordPathCompletion(nodeNumber, this.currentPath.length);
        
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
            
        this.requestGameResultCheck();
    }
    
    private savePartialPath(): void {
        if (this.currentPath.length > 1 && this.selectedStartNode) {
            const nodeNumber = this.selectedStartNode.getNodeNumber();
            
            const existingPartialPath = this.partialPaths.get(nodeNumber);
            if (existingPartialPath) {
                this.clearPartialPath(nodeNumber);
            }
            
            this.partialPaths.set(nodeNumber, [...this.currentPath]);
            this.pathManagerCmp.savePartialPathForNode(nodeNumber);
        }
        
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
        
        this.scheduleOnce(() => {
            this.requestGameResultCheck();
        }, 0.1);
    }
    
    private savePartialPathWithoutClear(): void {
        if (this.currentPath.length > 1 && this.selectedStartNode) {
            const nodeNumber = this.selectedStartNode.getNodeNumber();
            this.partialPaths.set(nodeNumber, [...this.currentPath]);
            this.pathManagerCmp.savePartialPathForNode(nodeNumber);
        }
        
        this.isDrawingPath = false;
        this.selectedStartNode = null;
        this.clearCurrentPathHighlights();
        this.currentPath = [];
    }
    
    private continuePartialPath(nodeNumber: number): void {
        const partialPath = this.partialPaths.get(nodeNumber);
        if (!partialPath) return;
        
        const startCell = partialPath[0];
        const startNode = this.nodeManagerCmp.getNodeAt(startCell.getRow(), startCell.getCol());
        
        if (startNode) {
            this.selectedStartNode = startNode;
            this.isDrawingPath = true;
            this.currentPath = [...partialPath];
            
            this.currentPath.forEach(cell => cell.setHighlight(true));
        }
    }
    
    private clearPartialPath(nodeNumber: number): void {
        const partialPath = this.partialPaths.get(nodeNumber);
        if (partialPath) {
            partialPath.forEach(cell => {
                cell.setHighlight(false);
                cell.setSelected(false);
            });
            
            this.pathManagerCmp.clearPartialPathForNode(nodeNumber);
            this.partialPaths.delete(nodeNumber);
        }
    }
    
    private clearCurrentPathHighlights(): void {
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
        const currentScore = this.scoreManagerCmp.getCurrentScore();
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        const totalMoves = this.timerManagerCmp.getTotalMoves();
        
        this.resultManagerCmp.showGameOverAnimationWithStats(currentScore, currentLevel, totalMoves, () => {
            this.restartGame();
        }, () => {
            // this.goToMainMenu();
            this.onClickBackToLobby();
        });
    }
    
    private onLevelChanged(newLevel: number): void {
    }
    
    private playWinAnimation(): void {
        const currentLevel = this.levelManagerCmp.getCurrentLevel();
        const totalPairs = this.nodeManagerCmp.getNumberOfPairs();
        const remainingTime = this.timerManagerCmp.getLevelTime();
        const elapsedTime = 60 - remainingTime;
        
        this.flashCompletedPaths();
        
        const scoreBreakdown = this.scoreManagerCmp.getScoreBreakdown(currentLevel, elapsedTime * 1000, totalPairs);
        
        this.scheduleOnce(() => {
            const totalMoves = this.timerManagerCmp.getTotalMoves();
            this.resultManagerCmp.showWinAnimationWithScore(currentLevel, scoreBreakdown, totalMoves, () => {
                this.nextLevel();
            }, () => {
                // this.goToMainMenu();
                this.onClickBackToLobby();
            });
        }, 1.5);
        
        this.scheduleOnce(() => {
            this.playNodeParticles();
        }, 0.5);

        
    }
    
    private flashCompletedPaths(): void {
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
        this.levelManagerCmp.nextLevel();
        const newLevel = this.levelManagerCmp.getCurrentLevel();
        this.resetGameState();
    }
    
    private resetGameState(): void {
        this.nodeManagerCmp.playNodesHideAnimation(() => {
            this.finishResetGameState();
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
        this.lastGameResult = null;
        
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
        const allNodes = this.nodeManagerCmp.getNodes();
        allNodes.forEach((node, index) => {
            this.scheduleOnce(() => {
                this.createSparkleEffect(node);
            }, index * 0.1);
        });
    }
    
    private createSparkleEffect(node: NodeItem02): void {
        const sparkleNode = new cc.Node('Sparkle');
        node.node.addChild(sparkleNode);
        
        for (let i = 0; i < 6; i++) {
            const sparkle = new cc.Node('SparkleParticle');
            sparkleNode.addChild(sparkle);
            
            const transform = sparkle.addComponent(cc.UITransform);
            transform.setContentSize(6, 6);
            
            const graphics = sparkle.addComponent(cc.Graphics);
            graphics.fillColor = cc.Color.WHITE;
            graphics.circle(0, 0, 3);
            graphics.fill();
            
            const angle = (i / 6) * Math.PI * 2;
            const distance = 40;
            const targetX = Math.cos(angle) * distance;
            const targetY = Math.sin(angle) * distance;
            
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
        
        this.scheduleOnce(() => {
            if (sparkleNode && sparkleNode.isValid) {
                sparkleNode.destroy();
            }
        }, 1.0);
    }
    
    restartGame(): void {
        this.levelManagerCmp.resetToLevel1();
        this.scoreManagerCmp.resetScore();
        this.timerManagerCmp.resetForNewGame();
        this.resetGameState();
    }
    
    private goToMainMenu(): void {
        this.restartGame();
    }
    
    private onGamePause(): void {
        if (this.buttonManagerCmp) {
            this.buttonManagerCmp.showSettings();
        }
    }
    
    private onGameHome(): void {
        this.goToMainMenu();
    }
    
    private onGameRestart(): void {
        this.restartGame();
    }
    
    private onSettingsOpened(): void {
    }
    
    private onSettingsClosed(): void {
    }
    
    onDestroy(): void {
        // if (this.boardManager) {
        //     this.boardManager.off('cell-clicked', this.onCellClicked, this);
        // }
        
        // if (this.levelManager) {
        //     this.levelManager.off('level-changed', this.onLevelChanged, this);
        // }
        
        // if (this.gameWriter) {
        //     this.gameWriter.removeAllListeners();
        // }
        
        // if (this.timerManagerCmp) {
        //     this.timerManagerCmp.unregisterEvent('level-time-expired', this.boundOnLevelTimeExpired);
        //     this.timerManagerCmp.unregisterEvent('time-warning', this.boundOnTimeWarning);
        //     this.timerManagerCmp.unregisterEvent('countdown-tick', this.boundOnCountdownTick);
        // }
        
        // cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    
    private onClickBackToLobby(): void {
          cc.director.loadScene("Lobby");
    }
}
