export interface NodeData {
    pairNumber: number;
    row: number;
    col: number;
}

export interface CellPosition {
    row: number;
    col: number;
}

export interface GameState02 {
    gridSize: number;
    isDrawingPath: boolean;
    currentPath: CellPosition[];
    completedPaths: Map<number, CellPosition[]>;
    partialPaths: Map<number, CellPosition[]>;
    occupiedCells: Set<string>;
    currentDrawingPairNumber: number;
    allNodes: NodeData[];
    totalPairs: number;
}

export enum GameResultEvent {
    WIN = 'game-win',
    LOSE = 'game-lose',
    CONTINUE = 'game-continue'
}
