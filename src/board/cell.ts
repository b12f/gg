import { Tile } from './tile';
import { generateID } from '../tools';

export class Cell<T> {
    public tile: Tile = null;
    public walkable = true;
    public uniqueID = generateID()
    private calcCost = 0;
    private priority = 0;
    private visited = false;
    private parent = null;

    constructor(
        public q = 0, // x grid coordinate (using different letters so that it won't be confused with pixel/world coordinates)
        public r = 0, // y grid coordinate
        public s = 0, // z grid coordinate
        public h = 1,  // 3D height of the cell, used by visual representation and pathfinder, cannot be less than 1
        public userData?: T
    ) {
    	this.tile = null; // optional link to the visual representation's class instance
    	this.userData = userData; // populate with any extra data needed in your game
    	this.walkable = true; // if true, pathfinder will use as a through node
    }

	public set(q: number, r: number, s: number): Cell<T> {
		this.q = q;
		this.r = r;
		this.s = s;
		return this;
	}

	public copy(cell: Cell<any>): Cell<T> {
		this.q = cell.q;
		this.r = cell.r;
		this.s = cell.s;
		this.h = cell.h;
		this.tile = cell.tile || null;
		this.userData = cell.userData || {};
		this.walkable = cell.walkable;
		return this;
	}

	public add(cell: Cell<any>): Cell<T> {
		this.q += cell.q;
		this.r += cell.r;
		this.s += cell.s;
		return this;
	}

	public equals(cell): boolean {
		return this.q === cell.q && this.r === cell.r && this.s === cell.s;
	}
}
