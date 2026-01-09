import * as cc from 'cc';
import Declaration02 from '../Declaration02';
const { BaseSubscriber } = Declaration02;

const { ccclass, property } = cc._decorator;

@ccclass('ButtonManager02')
export class ButtonManager02 extends BaseSubscriber {
    
    @property({ displayName: "Settings Button", type: cc.Node })
    settingsButton: cc.Node = null;
    

    initEvent(){
        this.settingsButton.on("click", this.onClickSetting, this);
    }
    onClickSetting(){
        
    }
}