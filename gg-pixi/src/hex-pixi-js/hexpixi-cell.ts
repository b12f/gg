import * as PIXI from 'pixi.js';

import { Coordinate } from './hexpixi-map';

// The HexPixi.Cell object represents one map hex cell.
export class Cell {
    public center: Coordinate = { x: 0, y: 0};
    public poly = null;
    public hitPoly = null;
    public text: PIXI.Text;
    public outline = null;
    public inner = [];
    public hex = null;
    public isEmpty = null;
    public isOver = false;

    constructor(
        public row: number,
        public column: number,
        public terrainIndex: number[] = [0],
        public data: any = {}
    ) {}

    public resetGraphics() {
        this.terrainIndex = [0];
        this.poly = null; // The cell's poly that is used as a hit area.
        this.outline = null; // The PIXI.Graphics outline of the cell's hex.
        this.inner = null; // If a non-textured cell then this is the PIXI.Graphics of the hex inner.
        this.hex = null; // The parent container of the hex's graphics objects.
    }
}
