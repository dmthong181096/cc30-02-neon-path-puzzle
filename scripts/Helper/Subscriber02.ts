import { _decorator, Component, Node } from 'cc';
import { Declaration } from '../Declaration02';
import { Config02 } from './Config02';
import { BaseDataStore } from 'db://assets/common';
import { DataStore02 } from './DataStore02';
const { BaseSubscriber} = Declaration;
const { ccclass, property } = _decorator;

@ccclass('Subscriber02')
export class Subscriber02 extends BaseSubscriber {


    getConfig(): Config02 {
        return new Config02
    }
    getDataStore(): DataStore02 {
        return new DataStore02
    }
}


