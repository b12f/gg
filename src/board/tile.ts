import { Material, Geometry, MeshPhongMaterial, Mesh, Vector3, Euler } from 'three';
import { generateID, randomizeRGB } from '../tools';
import { DEG_TO_RAD } from '../constants';

export interface TileConfig {
    cell: any;
    geometry: Geometry;
    material: Material;
    size?: number;
    scale?: number;
}

export class Tile {
    public cell: any;
    public material: Material;
    public geometry: Geometry;
    public mesh: Mesh;
    public uniqueID: string;
    public entity: any;
    public userData: any = {};
    public selected = false;
    public highlight = '0x0084cc';
    public position: Vector3;
    public rotation: Euler;
    public _emissive: any;

    constructor(settings: TileConfig = {cell: null, geometry: null, material: null}) {
        if (this.cell.tile && this.cell.tile !== this) this.cell.tile.dispose(); // remove whatever was there
        this.cell.tile = this;

        this.uniqueID = generateID();

        this.geometry = settings.geometry;
        this.material = settings.material;
        if (!this.material) {
            this.material = new MeshPhongMaterial({
                color: randomizeRGB('30, 30, 30', 13)
            });
        }

        this.entity = null;

        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.userData.structure = this;

        // create references so we can control orientation through this (Tile), instead of drilling down
        this.position = this.mesh.position;
        this.rotation = this.mesh.rotation;

        // rotate it to face "up" (the threejs coordinate space is Y+)
        this.rotation.x = -90 * DEG_TO_RAD;
        this.mesh.scale.set(settings.scale, settings.scale, 1);

        if (this.material.emissive) {
            this._emissive = this.material.emissive.getHex();
        }
        else {
            this._emissive = null;
        }
    }

    public select() {
        if (this.material.emissive) {
            this.material.emissive.setHex(this.highlight);
        }
        this.selected = true;
        return this;
    }

    public deselect() {
        if (this._emissive !== null && this.material.emissive) {
            this.material.emissive.setHex(this._emissive);
        }
        this.selected = false;
        return this;
    }

    public toggle() {
        if (this.selected) {
            this.deselect();
        }
        else {
            this.select();
        }
        return this;
    }

    public dispose() {
        if (this.cell && this.cell.tile) this.cell.tile = null;
        this.cell = null;
        this.position = null;
        this.rotation = null;
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
        this.mesh.userData.structure = null;
        this.mesh = null;
        this.material = null;
        this.userData = null;
        this.entity = null;
        this.geometry = null;
        this._emissive = null;
    }
}
