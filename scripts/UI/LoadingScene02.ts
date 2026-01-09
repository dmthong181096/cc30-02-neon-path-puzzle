import * as cc from 'cc';
import Declaration02 from '../Declaration02'
const {BaseLoadingScene} = Declaration02;
const { ccclass, property } = cc._decorator;

@ccclass('LoadingScene02')
export class LoadingScene02 extends BaseLoadingScene {
    
    @property({ displayName: "Progress Bar Fill", type: cc.Sprite })
    progressBarFill: cc.Sprite = null;
    
    @property({ displayName: "Progress Percentage Label", type: cc.Label })
    progressPercentageLabel: cc.Label = null;


    updateProgress(progress: number): void {
        this.progressBarFill.getComponent(cc.ProgressBar).progress = progress;        
        this.progressPercentageLabel.string = `${Math.floor(progress * 100)}%`;
    }
}
