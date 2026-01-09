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
        
        if (!this.nodePrefab || !this.boardManager) {
            return;
        }
        
        // Random number of pairs between minPairs and maxPairs
        this.numberOfPairs = this.getRandomPairCount();
        this.clearNodes();
        this.generateNodePairs();
        
        // Play appear animations with stagger
        this.playNodesAppearAnimation();
        
        }
    
    private getRandomPairCount(): number {
        // Random between minPairs and maxPairs (inclusive)
        try {
            const {MAX_NODE_PAIR, MIN_NODE_PAIR} = this.getConfig().getMinMaxNodePair();
            const randomPairs = Math.floor(Math.random() * (MAX_NODE_PAIR - MIN_NODE_PAIR + 1)) + MIN_NODE_PAIR;
            return randomPairs;
        } catch (error) {
            // Fallback to default values
            const defaultPairs = 4;
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
            return Math.floor(Math.random() * 9) + 1;
        }
        
        // Return random unused color
        const randomIndex = Math.floor(Math.random() * unusedColors.length);
        return unusedColors[randomIndex];
    }
    
    private createNodePair(pairNumber: number, positions: cc.Vec2[], colorId: number): void {
        const boardManagerComponent = this.boardManager.getComponent(BoardManager02);
        if (!boardManagerComponent) {
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
        
        if (!this.nodePrefab) {
            return;
        }
        
        const nodeInstance = cc.instantiate(this.nodePrefab);
        cell.node.addChild(nodeInstance);
        
        const nodeComponent = nodeInstance.getComponent(NodeItem02);
        if (nodeComponent) {
            nodeComponent.initNode(pairNumber, color, new cc.Vec2(cell.getRow(), cell.getCol()));
            this.nodes.push(nodeComponent);
            
            } else {
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
        // Destroy all existing node instances
        this.nodes.forEach(node => {
            if (node && node.node && node.node.isValid) {
                node.node.destroy();
            }
        });
        
        // Clear arrays
        this.nodes = [];
        this.occupiedCells = [];
        this.numberOfPairs = 0;
        
        }
    
    private playNodesAppearAnimation(): void {
        this.nodes.forEach((node, index) => {
            const delay = index * 0.1; // 0.1s delay between each node
            node.playAppearAnimation(delay);
        });
    }
    
    playNodesHideAnimation(onComplete?: () => void): void {
        let completedCount = 0;
        const totalNodes = this.nodes.length;
        
        if (totalNodes === 0) {
            if (onComplete) onComplete();
            return;
        }
        
        this.nodes.forEach((node, index) => {
            const delay = index * 0.05; // 0.05s delay between each node (faster than appear)
            node.playHideAnimation(delay, () => {
                completedCount++;
                if (completedCount === totalNodes && onComplete) {
                    onComplete();
                }
            });
        });
    }
    
    playPairCompletedAnimation(pairNumber: number): void {
        const pairNodes = this.getNodesByPairNumber(pairNumber);
        if (pairNodes.length === 2) {
            // First node starts immediately
            pairNodes[0].playCompletedAnimation();
            
            // Second node with gentle timing
            this.scheduleOnce(() => {
                pairNodes[1].playCompletedAnimation();
            }, 0.15); // Slower, more natural timing
        }
    }
}
