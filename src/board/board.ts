import { Object3D, LineBasicMaterial } from 'three';
import { randomInt } from '../tools';
import { AStarFinder } from '../pathing/a-star-finder';
import { HexGrid } from './hex-grid';

export class Board {
    public tiles = [];
    public tileGroup: any = null; // only for tiles
    public group = new Object3D(); // can hold all entities, also holds tileGroup, never trashed
    public overlay = null;
    public finder: AStarFinder;
    public grid: HexGrid;

    constructor(grid: HexGrid, finderConfig) {
        this.overlay = null;
        this.finder = new AStarFinder(finderConfig);
        // need to keep a resource cache around, so this Loader does that, use it instead of THREE.ImageUtils
        //vg.Loader.init();
        this.setGrid(grid);
    }

    public setEntityOnTile(entity, tile) {
		// snap an entity's position to a tile; merely copies position
		var pos = this.grid.cellToPixel(tile.cell);
		entity.position.copy(pos);
		// adjust for any offset after the entity was set directly onto the tile
		entity.position.y += entity.heightOffset || 0;
		// remove entity from old tile
		if (entity.tile) {
			entity.tile.entity = null;
		}
		// set new situation
		entity.tile = tile;
		tile.entity = entity;
	}

	public addTile(tile) {
		var i = this.tiles.indexOf(tile);
		if (i === -1) this.tiles.push(tile);
		else return;

		this.snapTileToGrid(tile);
		tile.position.y = 0;

		this.tileGroup.add(tile.mesh);
		this.grid.add(tile.cell);

		tile.cell.tile = tile;
	}

	public removeTile(tile) {
		if (!tile) return; // was already removed somewhere
		var i = this.tiles.indexOf(tile);
		this.grid.remove(tile.cell);

		if (i !== -1) this.tiles.splice(i, 1);
		// this.tileGroup.remove(tile.mesh);

		tile.dispose();
	}

	public removeAllTiles() {
		if (!this.tileGroup) return;
		var tiles = this.tileGroup.children;
		for (var i = 0; i < tiles.length; i++) {
			this.tileGroup.remove(tiles[i]);
		}
	}

	public getTileAtCell(cell) {
		var h = this.grid.cellToHash(cell);
		return cell.tile || (typeof this.grid.cells[h] !== 'undefined' ? this.grid.cells[h].tile : null);
	}

	public snapToGrid(pos) {
		var cell = this.grid.pixelToCell(pos);
		pos.copy(this.grid.cellToPixel(cell));
	}

	public snapTileToGrid(tile) {
		if (tile.cell) {
			tile.position.copy(this.grid.cellToPixel(tile.cell));
		}
		else {
			var cell = this.grid.pixelToCell(tile.position);
			tile.position.copy(this.grid.cellToPixel(cell));
		}
		return tile;
	}

	public getRandomTile() {
		var i = randomInt(0, this.tiles.length-1);
		return this.tiles[i];
	}

	public findPath(startTile, endTile, heuristic) {
		return this.finder.findPath(startTile.cell, endTile.cell, heuristic, this.grid);
	}

	public setGrid(newGrid: HexGrid) {
		this.group.remove(this.tileGroup);
		if (this.grid && newGrid !== this.grid) {
			this.removeAllTiles();
			this.tiles.forEach(function(t) {
				this.grid.remove(t.cell);
				t.dispose();
			});
			this.grid.dispose();
		}
		this.grid = newGrid;
		this.tiles = [];
		this.tileGroup = new Object3D();
		this.group.add(this.tileGroup);
	}

	public generateOverlay(size) {
		var mat = new LineBasicMaterial({
			color: 0x000000,
			opacity: 0.3
		});

		if (this.overlay) {
			this.group.remove(this.overlay);
		}

		this.overlay = new Object3D();

		this.grid.generateOverlay(size, this.overlay, mat);

		this.group.add(this.overlay);
	}

	public generateTilemap(config) {
		this.reset();

		var tiles = this.grid.generateTiles(config);
		this.tiles = tiles;

		this.tileGroup = new Object3D();
		for (var i = 0; i < tiles.length; i++) {
			this.tileGroup.add(tiles[i].mesh);
		}

		this.group.add(this.tileGroup);
	}

	public reset() {
		// removes all tiles from the scene, but leaves the grid intact
		this.removeAllTiles();
		if (this.tileGroup) this.group.remove(this.tileGroup);
	}
}
