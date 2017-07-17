import { Material, Geometry, MeshPhongMaterial, Mesh } from 'three';
import { DEG_TO_RAD } from '../constants';

export class Tile {
    public cell: any;
    public material: Material;
    public geometry: Geometry;
    public uniqueID: string;

    constructor(config = {}) {
        var settings = {
            cell: null, // required vg.Cell
            geometry: null, // required threejs geometry
            material: null // not required but it would improve performance significantly
        };
        settings = vg.Tools.merge(settings, config);

        if (!settings.cell || !settings.geometry) {
            throw new Error('Missing vg.Tile configuration');
        }

        this.cell = settings.cell;
        if (this.cell.tile && this.cell.tile !== this) this.cell.tile.dispose(); // remove whatever was there
        this.cell.tile = this;

        this.uniqueID = vg.Tools.generateID();

        this.geometry = settings.geometry;
        this.material = settings.material;
        if (!this.material) {
            this.material = new MeshPhongMaterial({
                color: vg.Tools.randomizeRGB('30, 30, 30', 13)
            });
        }

        this.entity = null;
        this.userData = {};

        this.selected = false;
        this.highlight = '0x0084cc';

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
