import * as PIXI from 'pixi.js';

import { CornerCoordinate } from '../hex-pixi-js/hexpixi-map';

export class Village {
    constructor(
        public location: CornerCoordinate
    ) {}
}
