import * as cc from 'cc';
import { GridCell02 } from '../UI/Components/GridCell02';

const { ccclass, property } = cc._decorator;

@ccclass('BoardManager02')
export class BoardManager02 extends cc.Component {
    
    @property({ displayName: "Cell Prefab", type: cc.Prefab })
    cellPrefab: cc.Prefab = null;
    
    @property({ displayName: "Board Container", type: cc.Node })
    boardContainer: cc.Node = null;
    
    @property({ displayName: "Grid Size" })
    gridSize: number = 8;
    
    @property({ displayName: "Cell Gap" })
    cellGap: number = 4;
    
    private cells: GridCell02[][] = [];

    private cellSize: number = 0;

    initProps() {
        // this.cellSize = this.cellPrefab.data
        this.cellSize = this.cellPrefab.data.getComponent(cc.UITransform).width
    }

    protected onLoad(): void {
        this.initProps();
    }
    
    start() {

    }
    
    initBoard(): void {
        if (!this.cellPrefab || !this.boardContainer) {
            cc.error('BoardManager02: Missing cellPrefab or boardContainer');
            return;
        }
        
        this.clearBoard();
        this.createCells();
        
        cc.log(`BoardManager02: Created ${this.gridSize}x${this.gridSize} board`);
    }
    
    private clearBoard(): void {
        this.boardContainer.removeAllChildren();
        this.cells = [];
    }
    
    private createCells(): void {
        const totalSize = this.gridSize * this.cellSize + (this.gridSize - 1) * this.cellGap;
        const startX = -totalSize / 2 + this.cellSize / 2;
        const startY = totalSize / 2 - this.cellSize / 2;
        
        for (let row = 0; row < this.gridSize; row++) {
            this.cells[row] = [];
            
            for (let col = 0; col < this.gridSize; col++) {
                const cellNode = cc.instantiate(this.cellPrefab);
                this.boardContainer.addChild(cellNode);
                
                const x = startX + col * (this.cellSize + this.cellGap);
                const y = startY - row * (this.cellSize + this.cellGap);
                cellNode.setPosition(x, y, 0);
                
                const cellComponent = cellNode.getComponent(GridCell02);
                if (cellComponent) {
                    cellComponent.initCell(row, col);
                    this.cells[row][col] = cellComponent;
                }
            }
        }
    }
    
    getCellAt(row: number, col: number): GridCell02 | null {
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            return this.cells[row][col];
        }
        return null;
    }
    
    getAllCells(): GridCell02[][] {
        return this.cells;
    }
}