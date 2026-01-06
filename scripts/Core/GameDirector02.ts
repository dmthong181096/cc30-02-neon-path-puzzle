import * as cc from 'cc';
import { BoardManager02 } from './BoardManager02';
import { NodeManager02 } from './NodeManager02';
import { PathManager02 } from './PathManager02';
import { GridCell02 } from '../UI/Components/GridCell02';

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
    
    private firstCell: GridCell02 = null;
    private secondCell: GridCell02 = null;

    protected onLoad(): void {
        this.initComponent();
        this.setupEvents();
    }
    
    protected start(): void {
        this.initUI();
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
    
    private onCellClicked(cell: GridCell02): void {
        cc.log(`Step 1: Cell clicked (${cell.getRow()}, ${cell.getCol()})`);
        
        if (!this.firstCell) {
            // First click - save first cell
            this.firstCell = cell;
            cell.setSelected(true);
            cc.log(`Step 2: First cell saved (${cell.getRow()}, ${cell.getCol()})`);
        } else {
            // Second click - draw line
            this.secondCell = cell;
            cell.setSelected(true);
            cc.log(`Step 3: Second cell saved (${cell.getRow()}, ${cell.getCol()})`);
            
            // Draw line between two cells
            this.drawLineBetweenCells();
        }
    }
    
    private drawLineBetweenCells(): void {
        cc.log(`Step 4: Drawing line from (${this.firstCell.getRow()}, ${this.firstCell.getCol()}) to (${this.secondCell.getRow()}, ${this.secondCell.getCol()})`);
        
        // Get world position of cells directly
        const fromWorldPos = this.firstCell.node.worldPosition;
        const toWorldPos = this.secondCell.node.worldPosition;
        
        this.pathManagerCmp.drawDirectLineWorld(
            new cc.Vec2(fromWorldPos.x, fromWorldPos.y),
            new cc.Vec2(toWorldPos.x, toWorldPos.y),
            cc.Color.CYAN
        );
        
        // Reset for next test
        this.firstCell.setSelected(false);
        this.secondCell.setSelected(false);
        this.firstCell = null;
        this.secondCell = null;
    }
    
    onDestroy(): void {
        if (this.boardManager) {
            this.boardManager.off('cell-clicked', this.onCellClicked, this);
        }
    }
}
