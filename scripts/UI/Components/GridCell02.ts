import * as cc from 'cc';

const { ccclass, property } = cc._decorator;

@ccclass('GridCell02')
export class GridCell02 extends cc.Component {
    
    @property({ displayName: "Background", type: cc.Sprite })
    background: cc.Sprite = null;

    @property({ displayName: "Highlight", type: cc.Node })
    highlight: cc.Node = null;
    
    private row: number = 0;
    private col: number = 0;
    private isHighlighted: boolean = false;
    
    start() {
        this.setupEvents();
        this.setupCollider();
        this.initHighlight();
    }
    
    private initHighlight(): void {
        // Đảm bảo highlight sprite bị ẩn ban đầu
        if (this.highlight) {
            this.highlight.active = false;
        }
    }
    
    private setupCollider(): void {
        // Ensure the node has a collider for touch events
        let collider = this.node.getComponent(cc.BoxCollider2D);
        if (!collider) {
            collider = this.node.addComponent(cc.BoxCollider2D);
        }
        
        // Set collider size to match cell size (should match BoardManager02)
        collider.size = new cc.Size(40, 40); // Match cellSize from BoardManager02
        collider.sensor = true; // Only for touch detection, not physics
    }
    
    private setupEvents(): void {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onCellClicked, this);
    }
    
    private onCellClicked(): void {
        this.node.emit('cell-clicked', this);
    }
    
    initCell(row: number, col: number): void {
        this.row = row;
        this.col = col;
    }
    
    setHighlight(highlight: boolean): void {
        if (this.highlight) {
            this.highlight.active = highlight;
        }
    }
    
    setSelected(selected: boolean): void {
        this.isHighlighted = selected;
        if (this.highlight) {
            this.highlight.active = selected;
        }
    }
    
    getRow(): number {
        return this.row;
    }
    
    getCol(): number {
        return this.col;
    }
    
    getGridPosition(): cc.Vec2 {
        return new cc.Vec2(this.row, this.col);
    }
    
    isSelected(): boolean {
        return this.isHighlighted;
    }
    
    resetHighlight(): void {
        if (this.highlight) {
            this.highlight.active = false;
        }
        this.isHighlighted = false;
    }
    
    onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_START, this.onCellClicked, this);
    }
}
