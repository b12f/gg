import { Shape, Geometry, ShapeGeometry, Vector3, ExtrudeGeometry, Mesh, MeshBasicMaterial, Line } from 'three';
import { SQRT3, TAU, PI, DEG_TO_RAD } from '../constants';
import { randomInt, getJSON } from '../tools';
import { Cell } from './cell';
import { Tile } from './tile';

const TWO_THIRDS = 2 / 3;

export interface HexGridConfig {
    cellSize?: number;
};

export class HexGrid {
    public size = 5; // only used for generated maps
    public cellSize: number;
    public cellShape: Shape;
    public cellGeo: Geometry;
    public cellShapeGeo: ShapeGeometry;
    private cellWidth: number;
    private cellLength: number;
    public cells: any = {};
    public numCells = 0;
    public extrudeSettings = null;
    public autogenerated = false;

    private hashDelimeter = '.';
    private directions: Cell<any>[];
    private diagonals: Cell<any>[];

    // cached objects
    private list = [];
    private vec3 = new Vector3();
    private cel = new Cell();
    private conversionVec = new Vector3();
    private geoCache = [];
    private matCache = [];

    constructor(config: HexGridConfig = {}) {
        /*  ______________________________________________
        GRID INTERFACE:
        */
        this.cellSize = typeof config.cellSize === 'undefined' ? 10 : config.cellSize;

        // create base shape used for building geometry
        var i, verts = [];
        // create the skeleton of the hex
        for (i = 0; i < 6; i++) {
            verts.push(this.createVertex(i));
        }
        // copy the verts into a shape for the geometry to use
        this.cellShape = new Shape();
        this.cellShape.moveTo(verts[0].x, verts[0].y);
        for (i = 1; i < 6; i++) {
            this.cellShape.lineTo(verts[i].x, verts[i].y);
        }
        this.cellShape.lineTo(verts[0].x, verts[0].y);
        this.cellShape.autoClose = true;

        this.cellGeo = new Geometry();
        this.cellGeo.vertices = verts;
        this.cellGeo.verticesNeedUpdate = true;

        this.cellShapeGeo = new ShapeGeometry(this.cellShape);

        /*  ______________________________________________
        PRIVATE
        */

        this.cellWidth = this.cellSize * 2;
        this.cellLength = (SQRT3 * 0.5) * this.cellWidth;

        // pre-computed permutations
        this.directions = [new Cell(+1, -1, 0), new Cell(+1, 0, -1), new Cell(0, +1, -1), new Cell(-1, +1, 0), new Cell(-1, 0, +1), new Cell(0, -1, +1)];
        this.diagonals = [new Cell(+2, -1, -1), new Cell(+1, +1, -2), new Cell(-1, +2, -1), new Cell(-2, +1, +1), new Cell(-1, -1, +2), new Cell(+1, -2, +1)];
    }

    /*  ________________________________________________________________________
		High-level functions that the Board interfaces with (all grids implement)
	 */

	// grid cell (Hex in cube coordinate space) to position in pixels/world
	public cellToPixel(cell) {
		this.vec3.x = cell.q * this.cellWidth * 0.75;
		this.vec3.y = cell.h;
		this.vec3.z = -((cell.s - cell.r) * this.cellLength * 0.5);
		return this.vec3;
	}

	public pixelToCell(pos) {
		// convert a position in world space ("pixels") to cell coordinates
		var q = pos.x * (TWO_THIRDS / this.cellSize);
		var r = ((-pos.x / 3) + (SQRT3/3) * pos.z) / this.cellSize;
		this.cel.set(q, r, -q-r);
		return this.cubeRound(this.cel);
	}

	public getCellAt(pos) {
		// get the Cell (if any) at the passed world position
		var q = pos.x * (TWO_THIRDS / this.cellSize);
		var r = ((-pos.x / 3) + (SQRT3/3) * pos.z) / this.cellSize;
		this.cel.set(q, r, -q-r);
		this.cubeRound(this.cel);
		return this.cells[this.cellToHash(this.cel)];
	}

	public getNeighbors(cell, diagonal, filter) {
		// always returns an array
		var i, n, l = this.directions.length;
		this.list.length = 0;
		for (i = 0; i < l; i++) {
			this.cel.copy(cell);
			this.cel.add(this.directions[i]);
			n = this.cells[this.cellToHash(this.cel)];
			if (!n || (filter && !filter(cell, n))) {
				continue;
			}
			this.list.push(n);
		}
		if (diagonal) {
			for (i = 0; i < l; i++) {
				this.cel.copy(cell);
				this.cel.add(this.diagonals[i]);
				n = this.cells[this.cellToHash(this.cel)];
				if (!n || (filter && !filter(cell, n))) {
					continue;
				}
				this.list.push(n);
			}
		}
		return this.list;
	}

	public getRandomCell() {
		var c, i = 0, x = randomInt(0, this.numCells);
		for (c in this.cells) {
			if (i === x) {
				return this.cells[c];
			}
			i++;
		}
		return this.cells[c];
	}

	public cellToHash(cell) {
		return cell.q+this.hashDelimeter+cell.r+this.hashDelimeter+cell.s;
	}

	public distance(cellA, cellB) {
		var d = Math.max(Math.abs(cellA.q - cellB.q), Math.abs(cellA.r - cellB.r), Math.abs(cellA.s - cellB.s));
		d += cellB.h - cellA.h; // include vertical height
		return d;
	}

	public clearPath() {
		var i, c;
		for (i in this.cells) {
			c = this.cells[i];
			c._calcCost = 0;
			c._priority = 0;
			c._parent = null;
			c._visited = false;
		}
	}

	public traverse(cb) {
		var i;
		for (i in this.cells) {
			cb(this.cells[i]);
		}
	}

	public generateTile(cell, scale, material) {
		var height = Math.abs(cell.h);
		if (height < 1) height = 1;

		var geo = this.geoCache[height];
		if (!geo) {
			this.extrudeSettings.amount = height;
			geo = new ExtrudeGeometry(this.cellShape, this.extrudeSettings);
			this.geoCache[height] = geo;
		}

		/*mat = this._matCache[c.matConfig.mat_cache_id];
		if (!mat) { // MaterialLoader? we currently only support basic stuff though. maybe later
			mat.map = Loader.loadTexture(c.matConfig.imgURL);
			delete c.matConfig.imgURL;
			mat = new THREE[c.matConfig.type](c.matConfig);
			this._matCache[c.matConfig.mat_cache_id] = mat;
		}*/

		var tile = new Tile({
			size: this.cellSize,
			scale: scale,
			cell: cell,
			geometry: geo,
			material: material
		});

		cell.tile = tile;

		return tile;
	}

	public generateTiles(config) {
		config = config || {};
		var tiles = [];
		var settings = {
			tileScale: 0.95,
			cellSize: this.cellSize,
			material: null,
			extrudeSettings: {
				amount: 1,
				bevelEnabled: true,
				bevelSegments: 1,
				steps: 1,
				bevelSize: 0.5,
				bevelThickness: 0.5
			}
		}
		settings = Object.assign(settings, config);

		/*if (!settings.material) {
			settings.material = new THREE.MeshPhongMaterial({
				color: vg.Tools.randomizeRGB('30, 30, 30', 10)
			});
		}*/

		// overwrite with any new dimensions
		this.cellSize = settings.cellSize;
		this.cellWidth = this.cellSize * 2;
		this.cellLength = (SQRT3 * 0.5) * this.cellWidth;

		this.autogenerated = true;
		this.extrudeSettings = settings.extrudeSettings;

		var i, t, c;
		for (i in this.cells) {
			c = this.cells[i];
			t = this.generateTile(c, settings.tileScale, settings.material);
			t.position.copy(this.cellToPixel(c));
			t.position.y = 0;
			tiles.push(t);
		}
		return tiles;
	}

	public generateTilePoly(material) {
		if (!material) {
			material = new MeshBasicMaterial({color: 0x24b4ff});
		}
		var mesh = new Mesh(this.cellShapeGeo, material);
		this.vec3.set(1, 0, 0);
		mesh.rotateOnAxis(this.vec3, PI/2);
		return mesh;
	}

	// create a flat, hexagon-shaped grid
	public generate(config) {
		config = config || {};
		this.size = typeof config.size === 'undefined' ? this.size : config.size;
		var x, y, z, c;
		for (x = -this.size; x < this.size+1; x++) {
			for (y = -this.size; y < this.size+1; y++) {
				z = -x-y;
				if (Math.abs(x) <= this.size && Math.abs(y) <= this.size && Math.abs(z) <= this.size) {
					c = new Cell(x, y, z);
					this.add(c);
				}
			}
		}
	}

	public generateOverlay(size, overlayObj, overlayMat) {
		var x, y, z;
		var geo = this.cellShape.createPointsGeometry(0); // TODO: check if this 0 fits here
		for (x = -size; x < size+1; x++) {
			for (y = -size; y < size+1; y++) {
				z = -x-y;
				if (Math.abs(x) <= size && Math.abs(y) <= size && Math.abs(z) <= size) {
					this.cel.set(x, y, z); // define the cell
					var line = new Line(geo, overlayMat);
					line.position.copy(this.cellToPixel(this.cel));
					line.rotation.x = 90 * DEG_TO_RAD;
					overlayObj.add(line);
				}
			}
		}
	}

	public add(cell) {
		var h = this.cellToHash(cell);
		if (this.cells[h]) {
			// console.warn('A cell already exists there');
			return;
		}
		this.cells[h] = cell;
		this.numCells++;

		return cell;
	}

	public remove(cell) {
		var h = this.cellToHash(cell);
		if (this.cells[h]) {
			delete this.cells[h];
			this.numCells--;
		}
	}

	public dispose() {
		this.cells = null;
		this.numCells = 0;
		this.cellShape = null;
		this.cellGeo.dispose();
		this.cellGeo = null;
		this.cellShapeGeo.dispose();
		this.cellShapeGeo = null;
		this.list = null;
		this.vec3 = null;
		this.conversionVec = null;
		this.geoCache = null;
		this.matCache = null;
	}

	/*
		Load a grid from a parsed json object.
		json = {
			extrudeSettings,
			size,
			cellSize,
			autogenerated,
			cells: [],
			materials: [
				{
					cache_id: 0,
					type: 'MeshLambertMaterial',
					color, ambient, emissive, reflectivity, refractionRatio, wrapAround,
					imgURL: url
				},
				{
					cacheId: 1, ...
				}
				...
			]
		}
	*/
	public load(url, cb, scope) {
		var self = this;
		getJSON({
			url: url,
			_callback(json) {
				self.fromJSON(json);
				cb.call(scope || null, json);
			},
			cache: false,
			scope: self
		});
	}

	public fromJSON(json) {
		var i, c;
		var cells = json.cells;

		this.cells = {};
		this.numCells = 0;

		this.size = json.size;
		this.cellSize = json.cellSize;
		this.cellWidth = this.cellSize * 2;
		this.cellLength = (SQRT3 * 0.5) * this.cellWidth;

		this.extrudeSettings = json.extrudeSettings;
		this.autogenerated = json.autogenerated;

		for (i = 0; i < cells.length; i++) {
			c = new Cell();
			c.copy(cells[i]);
			this.add(c);
		}
	}

	public toJSON() {
		var json: any = {
			size: this.size,
			cellSize: this.cellSize,
			extrudeSettings: this.extrudeSettings,
			autogenerated: this.autogenerated
		};
		var cells = [];
		var c, k;

		for (k in this.cells) {
			c = this.cells[k];
			cells.push({
				q: c.q,
				r: c.r,
				s: c.s,
				h: c.h,
				walkable: c.walkable,
				userData: c.userData
			});
		}
		json.cells = cells;

		return json;
	}

	/*  ________________________________________________________________________
		Hexagon-specific conversion math
		Mostly commented out because they're inlined whenever possible to increase performance.
		They're still here for reference.
	 */

	private createVertex(i) {
		var angle = (TAU / 6) * i;
		return new Vector3((this.cellSize * Math.cos(angle)), (this.cellSize * Math.sin(angle)), 0);
	}

	/*public _pixelToAxial(pos) {
		var q, r; // = x, y
		q = pos.x * ((2/3) / this.cellSize);
		r = ((-pos.x / 3) + (vg.SQRT3/3) * pos.y) / this.cellSize;
		this._cel.set(q, r, -q-r);
		return this._cubeRound(this._cel);
	},*/

	/*public _axialToCube(h) {
		return {
			q: h.q,
			r: h.r,
			s: -h.q - h.r
		};
	},*/

	/*public _cubeToAxial(cell) {
		return cell; // yep
	},*/

	/*public _axialToPixel(cell) {
		var x, y; // = q, r
		x = cell.q * this._cellWidth * 0.75;
		y = (cell.s - cell.r) * this._cellLength * 0.5;
		return {x: x, y: -y};
	},*/

	/*public _hexToPixel(h) {
		var x, y; // = q, r
		x = this.cellSize * 1.5 * h.x;
		y = this.cellSize * vg.SQRT3 * (h.y + (h.x * 0.5));
		return {x: x, y: y};
	},*/

	/*public _axialRound(h) {
		return this._cubeRound(this.axialToCube(h));
	},*/

	private cubeRound(h) {
		var rx = Math.round(h.q);
		var ry = Math.round(h.r);
		var rz = Math.round(h.s);

		var xDiff = Math.abs(rx - h.q);
		var yDiff = Math.abs(ry - h.r);
		var zDiff = Math.abs(rz - h.s);

		if (xDiff > yDiff && xDiff > zDiff) {
			rx = -ry-rz;
		}
		else if (yDiff > zDiff) {
			ry = -rx-rz;
		}
		else {
			rz = -rx-ry;
		}

		return this.cel.set(rx, ry, rz);
	}

	/*public _cubeDistance(a, b) {
		return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
	}*/


}
