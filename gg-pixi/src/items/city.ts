import * as PIXI from 'pixi.js';

import { CornerCoordinate } from '../hex-pixi-js/hexpixi-map';

export class City {
    private _isCapital = false;

    constructor(
        public location: CornerCoordinate
    ) {}

    public set isCapital(isCapital: boolean) {
        this._isCapital = isCapital;
    }

    public get isCapital(): boolean {
        return this._isCapital;
    }
}
