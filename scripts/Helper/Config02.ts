import * as cc from 'cc';
import { Declaration } from '../Declaration02';
const {BaseConfig} = Declaration;
const { ccclass, property } = cc._decorator;

@ccclass('Config02')
export class Config02 extends BaseConfig {
    

    defineConfig() {
        this.config = {
            COLOR_NODE: {
                1: cc.color("#00f2ff"),
                2: cc.color("#ff009d"),
                3: cc.color("#00ff41"),
                4: cc.color("#9d00ff"),
                5: cc.color("#ffac00"),
                6: cc.color("#0070ff"),
                7: cc.color("#ff4d4d"),
                8: cc.color("#00ffcc"),
                9: cc.color("#e6ff00"),
            },
            MAX_NODE_PAIR: 9,
            MIN_NODE_PAIR: 2,
        }
        return this.config;
    }

    getColorNode(index: number) {
        if(!this.config){
            this.defineConfig();
        }
        return this.config.COLOR_NODE[index];
    }
    getMinMaxNodePair() {
        if(!this.config){
            this.defineConfig();
        }
        return {
            MAX_NODE_PAIR: this.config.MAX_NODE_PAIR,
            MIN_NODE_PAIR: this.config.MIN_NODE_PAIR,
        }
    }
}