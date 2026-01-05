import * as cc from 'cc';

const { ccclass, property } = cc._decorator;

@ccclass('GridCell02')
export class GridCell02 extends cc.Component {
    
    @property({ displayName: "Background", type: cc.Sprite })
    background: cc.Sprite = null;
    
    private row: number = 0;
    private col: number = 0;
    
    initCell(row: number, col: number): void {
        this.row = row;
        this.col = col;
    }
    
    getRow(): number {
        return this.row;
    }
    
    getCol(): number {
        return this.col;
    }
}