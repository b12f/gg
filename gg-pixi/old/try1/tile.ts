import * as PIXI from 'pixi.js';

export class Tile {
    constructor() {}
}

createHexPoly = function (hexAxis) {
    var i = 0,
        cs = CoordinateSystems[this.options.coordinateSystem],
        offset = cs.isFlatTop ? 0 : 0.5,
        angle = 2 * Math.PI / 6 * offset,
        center = { x: hexAxis.x / 2, y: hexAxis.y / 2 },
        x = center.x * Math.cos(angle),
        y = center.y * Math.sin(angle),
        points = [];

    points.push(new PIXI.Point(x, y));

    for (i = 1; i < 7; i++) {
        angle = 2 * Math.PI / 6 * (i + offset);
        x = center.x * Math.cos(angle);
        y = center.y * Math.sin(angle);

        points.push(new PIXI.Point(x, y));
    }

    debugLog('Cell created', points);

    return new PIXI.Polygon(points);
};
