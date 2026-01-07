import * as cc from 'cc';
import Declaration from '../Declaration02';
const {BaseDataStore} = Declaration
const HIGH_SCORE =  "highScore"

const { ccclass, property } = cc._decorator;

@ccclass('DataStore02')
export class DataStore02 extends BaseDataStore {
    


    protected onLoad(): void {
        // super.onLoad()
        this.gameID = "02";
    }
    defineKey(): void {
        this.gameID = "02"
    }

    setHighScore(score: number) {
        this.setLocalStoreByKey(HIGH_SCORE, score)
    }

    getHighScore(): void {
        return this.getLocalStoreByKey(HIGH_SCORE)
    }
}