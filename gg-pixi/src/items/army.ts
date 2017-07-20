import * as PIXI from 'pixi.js';

import { CornerCoordinate } from '../hex-pixi-js/hexpixi-map';

export class Army {
    constructor(
        public location: CornerCoordinate,
        public strength: number = 1
    ) {}
}
