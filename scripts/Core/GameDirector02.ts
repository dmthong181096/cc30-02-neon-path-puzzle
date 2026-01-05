import * as cc from 'cc';
import { BoardManager02 } from './BoardManager02';
import { NodeManager02 } from './NodeManager02';

const { ccclass, property } = cc._decorator;

@ccclass('GameDirector02')
export class GameDirector02 extends cc.Component {

    @property({displayName: "Board Manager", type: cc.Node})
    boardManager: cc.Node = null;
    
    @property({displayName: "Node Manager", type: cc.Node})
    nodeManager: cc.Node = null;

    protected boardManagerCmp: BoardManager02 = null;
    protected nodeManagerCmp: NodeManager02 = null;

    protected onLoad(): void {
        this.initComponent();
    }
    
    protected start(): void {
        this.initUI();
        this.startGame();
    }

    initComponent(){
        this.boardManagerCmp = this.boardManager.getComponent(BoardManager02);
        this.nodeManagerCmp = this.nodeManager.getComponent(NodeManager02);
    }

    initUI() {
        this.boardManagerCmp.initBoard();
    }
    
    startGame(): void {
        cc.log('GameDirector02: Starting new game...');
        
        // Wait a frame for board to be initialized
        this.scheduleOnce(() => {
            this.generateLevel();
        }, 0.1);
    }
    
    private generateLevel(): void {
        if (this.nodeManagerCmp) {
            this.nodeManagerCmp.generateRandomNodes();
            cc.log('GameDirector02: Level generated successfully');
        }
    }
    
    restartGame(): void {
        cc.log('GameDirector02: Restarting game...');
        this.generateLevel();
    }
}