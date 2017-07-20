import * as PIXI from 'pixi.js';
import { getRandomId, getRandomColor } from '../util';

export class Player {
    private _id: string = getRandomId();

    constructor(
        private _name: string = getRandomId(),
        public color: number = getRandomColor()
    ) {}

    public get id() {
        return this._id;
    }

    public get name() {
        return this._name;
    }
}
