import * as cc from 'cc';
import Declaration from '../../Declaration02';
const {BasePopupItem} = Declaration;
const { ccclass, property } = cc._decorator;

@ccclass('PopupSetting02')
export class PopupSetting02 extends BasePopupItem {
    @property({displayName:"Button Setting", type:cc.Node})
    btnSetting: cc.Node = null;

    @property({displayName:"Button Close", type:cc.Node})
    btnClose: cc.Node = null;

    init(): void {
        super.init()

        this.btnSetting.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.overlay.on(cc.Node.EventType.TOUCH_END, ()=>{
            this.hidePopup(true);
        });
        this.btnClose.on(cc.Node.EventType.TOUCH_END, ()=>{
            this.hidePopup(true);
        });
        this.hidePopup(false);
    }

    onTouchEnd() {
        this.showPopup();
    }
}


