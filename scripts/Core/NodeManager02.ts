import * as cc from 'cc';
import { Declaration } from '../Declaration02';
import { GridCell02 } from '../UI/Components/GridCell02';
import { NodeItem02 } from '../UI/Components/NodeItem02';
import { Subscriber02 } from '../Helper/Subscriber02';

const { ccclass, property } = cc._decorator;
const { BaseSubscriber } = Declaration;

@ccclass('NodeManager02')
export class NodeManager02 extends Subscriber02 {
    
    @property({ displayName: "Node Prefab", type: cc.Prefab })
    nodePrefab: cc.Prefab = null;
    
    @property({ displayName: "Board Manager", type: cc.Node })
    boardManager: cc.Node = null;
    
    private nodes: NodeItem02[] = [];
    private occupiedCells: cc.Vec2[] = [];
    private numberOfPairs: number = 0;
    
    start() {
        
    }
    
    generateRandomNodes(): void {
        if (!this.nodePrefab || !this.boardManager) {
            cc.error('NodeManager02: Missing nodePrefab or boardManager');
            return;
        }
        
        // Random number of pairs between minPairs and maxPairs
        this.numberOfPairs = this.getRandomPairCount();
        
        this.clearNodes();
        this.generateNodePairs();
        
        cc.log(`NodeManager02: Generated ${this.numberOfPairs} pairs (${this.numberOfPairs * 2} nodes total)`);
    }
    
    private getRandomPairCount(): number {
        // Random between minPairs and maxPairs (inclusive)
        const {MAX_NODE_PAIR, MIN_NODE_PAIR} = this.getConfig().getMinMaxNodePair();
        const randomPairs = Math.floor(Math.random() * (MAX_NODE_PAIR - MIN_NODE_PAIR + 1)) + MIN_NODE_PAIR;
        return randomPairs;
    }
    
    private clearNodes(): void {
        this.nodes.forEach(node => {
            if (node && node.node) {
                node.node.destroy();
            }
        });
        this.nodes = [];
        this.occupiedCells = [];
    }
    
    private generateNodePairs(): void {
        const gridSize = 8;
        const maxAttempts = 100;
        const usedColors: number[] = []; // Track used colors
        
        // Generate pairs: 1-1, 2-2, 3-3, etc.
        for (let pairIndex = 1; pairIndex <= this.numberOfPairs; pairIndex++) {
            // Generate 2 positions for each pair
            const pairPositions: cc.Vec2[] = [];
            
            for (let nodeInPair = 0; nodeInPair < 2; nodeInPair++) {
                let attempts = 0;
                let validPosition = false;
                
                while (!validPosition && attempts < maxAttempts) {
                    const row = Math.floor(Math.random() * gridSize);
                    const col = Math.floor(Math.random() * gridSize);
                    
                    // Check if position is already occupied
                    const isOccupied = this.occupiedCells.some(pos => 
                        pos.x === row && pos.y === col
                    );
                    
                    if (!isOccupied) {
                        const newPos = new cc.Vec2(row, col);
                        this.occupiedCells.push(newPos);
                        pairPositions.push(newPos);
                        validPosition = true;
                    }
                    
                    attempts++;
                }
                
                if (attempts >= maxAttempts) {
                    cc.warn(`NodeManager02: Could not find valid position for pair ${pairIndex}, node ${nodeInPair + 1}`);
                }
            }
            
            // Create the pair of nodes with unique color
            if (pairPositions.length === 2) {
                // Get unique color for this pair
                let colorId = this.getUniqueColor(usedColors);
                usedColors.push(colorId);
                
                this.createNodePair(pairIndex, pairPositions, colorId);
            }
        }
    }
    
    private getUniqueColor(usedColors: number[]): number {
        const availableColors = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const unusedColors = availableColors.filter(color => !usedColors.includes(color));
        
        if (unusedColors.length === 0) {
            // If all colors used, start reusing (shouldn't happen with max 6 pairs and 9 colors)
            cc.warn('NodeManager02: All colors used, reusing colors');
            return Math.floor(Math.random() * 9) + 1;
        }
        
        // Return random unused color
        const randomIndex = Math.floor(Math.random() * unusedColors.length);
        return unusedColors[randomIndex];
    }
    
    private createNodePair(pairNumber: number, positions: cc.Vec2[], colorId: number): void {
        const boardManagerComponent = this.boardManager.getComponent('BoardManager02');
        if (!boardManagerComponent) {
            cc.error('NodeManager02: BoardManager02 component not found');
            return;
        }
        
        const color = this.getConfig().getColorNode(colorId);
        
        positions.forEach((pos, index) => {
            const cell = boardManagerComponent.getCellAt(pos.x, pos.y);
            if (cell) {
                this.createNodeAtCell(cell, pairNumber, color, index + 1);
            }
        });
    }
    
    private createNodeAtCell(cell: GridCell02, pairNumber: number, color: cc.Color, nodeIndex: number): void {
        const nodeInstance = cc.instantiate(this.nodePrefab);
        cell.node.addChild(nodeInstance);
        
        const nodeComponent = nodeInstance.getComponent(NodeItem02);
        if (nodeComponent) {
            nodeComponent.initNode(pairNumber, color, new cc.Vec2(cell.getRow(), cell.getCol()));
            this.nodes.push(nodeComponent);
            
            cc.log(`NodeManager02: Created node ${pairNumber}-${nodeIndex} at (${cell.getRow()}, ${cell.getCol()})`);
        }
    }
    
    getNodes(): NodeItem02[] {
        return this.nodes;
    }
    
    getNodeAt(row: number, col: number): NodeItem02 | null {
        return this.nodes.find(node => {
            const pos = node.getGridPosition();
            return pos.x === row && pos.y === col;
        }) || null;
    }
    
    getNodesByPairNumber(pairNumber: number): NodeItem02[] {
        return this.nodes.filter(node => node.getNodeNumber() === pairNumber);
    }
    
    getNumberOfPairs(): number {
        return this.numberOfPairs;
    }
    
    getAllPairs(): { [pairNumber: number]: NodeItem02[] } {
        const pairs: { [pairNumber: number]: NodeItem02[] } = {};
        
        for (let i = 1; i <= this.numberOfPairs; i++) {
            pairs[i] = this.getNodesByPairNumber(i);
        }
        
        return pairs;
    }
    
    resetNodes(): void {
        this.nodes.forEach(node => {
            if (node.resetNode) {
                node.resetNode();
            }
        });
    }
}