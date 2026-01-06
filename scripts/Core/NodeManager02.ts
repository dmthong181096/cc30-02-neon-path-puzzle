import * as cc from 'cc';
import { GridCell02 } from '../UI/Components/GridCell02';
import { NodeItem02 } from '../UI/Components/NodeItem02';
import { Subscriber02 } from '../Helper/Subscriber02';
import { BoardManager02 } from './BoardManager02';

const { ccclass, property } = cc._decorator;

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
        cc.log('NodeManager02: generateRandomNodes() called');
        
        if (!this.nodePrefab || !this.boardManager) {
            cc.error('NodeManager02: Missing nodePrefab or boardManager');
            cc.log('NodeManager02: nodePrefab:', this.nodePrefab ? 'Available' : 'Missing');
            cc.log('NodeManager02: boardManager:', this.boardManager ? 'Available' : 'Missing');
            return;
        }
        
        // Random number of pairs between minPairs and maxPairs
        this.numberOfPairs = this.getRandomPairCount();
        cc.log(`NodeManager02: Will generate ${this.numberOfPairs} pairs`);
        
        this.clearNodes();
        this.generateNodePairs();
        
        cc.log(`NodeManager02: Generated ${this.numberOfPairs} pairs (${this.numberOfPairs * 2} nodes total)`);
        cc.log(`NodeManager02: Actual nodes created: ${this.nodes.length}`);
    }
    
    private getRandomPairCount(): number {
        // Random between minPairs and maxPairs (inclusive)
        try {
            const {MAX_NODE_PAIR, MIN_NODE_PAIR} = this.getConfig().getMinMaxNodePair();
            const randomPairs = Math.floor(Math.random() * (MAX_NODE_PAIR - MIN_NODE_PAIR + 1)) + MIN_NODE_PAIR;
            cc.log(`NodeManager02: Random pair count: ${randomPairs} (min: ${MIN_NODE_PAIR}, max: ${MAX_NODE_PAIR})`);
            return randomPairs;
        } catch (error) {
            cc.error('NodeManager02: Error getting random pair count:', error);
            // Fallback to default values
            const defaultPairs = 4;
            cc.log(`NodeManager02: Using fallback pair count: ${defaultPairs}`);
            return defaultPairs;
        }
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
        const unusedColors = availableColors.filter(color => usedColors.indexOf(color) === -1);
        
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
        const boardManagerComponent = this.boardManager.getComponent(BoardManager02);
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
        cc.log(`NodeManager02: Creating node ${pairNumber}-${nodeIndex} at cell (${cell.getRow()}, ${cell.getCol()})`);
        
        if (!this.nodePrefab) {
            cc.error('NodeManager02: nodePrefab is null!');
            return;
        }
        
        const nodeInstance = cc.instantiate(this.nodePrefab);
        cell.node.addChild(nodeInstance);
        
        cc.log(`NodeManager02: Node instance created:`, nodeInstance.name);
        
        const nodeComponent = nodeInstance.getComponent(NodeItem02);
        if (nodeComponent) {
            nodeComponent.initNode(pairNumber, color, new cc.Vec2(cell.getRow(), cell.getCol()));
            this.nodes.push(nodeComponent);
            
            cc.log(`NodeManager02: Created node ${pairNumber}-${nodeIndex} at (${cell.getRow()}, ${cell.getCol()})`);
            cc.log(`NodeManager02: Total nodes in array: ${this.nodes.length}`);
        } else {
            cc.error(`NodeManager02: NodeItem02 component not found on prefab!`);
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
    
    clearAllNodes(): void {
        cc.log('NodeManager02: Clearing all existing nodes...');
        
        // Destroy all existing node instances
        this.nodes.forEach(node => {
            if (node && node.node && node.node.isValid) {
                cc.log(`NodeManager02: Destroying node ${node.getNodeNumber()} at (${node.getGridPosition().x}, ${node.getGridPosition().y})`);
                node.node.destroy();
            }
        });
        
        // Clear arrays
        this.nodes = [];
        this.occupiedCells = [];
        this.numberOfPairs = 0;
        
        cc.log(`NodeManager02: All nodes cleared. Nodes array length: ${this.nodes.length}`);
    }
}