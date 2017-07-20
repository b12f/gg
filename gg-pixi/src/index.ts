import * as PIXI from 'pixi.js';
import { Map, MapOptions } from './hex-pixi-js/hexpixi-map';

let map: Map = null;
const app = new PIXI.Application(document.body.clientWidth, document.body.clientHeight, {
        antialias: false,
        transparent: false,
        resolution: 1
    });
const renderer = app.renderer;
const stage = app.stage;

function onHexClick(cell) {
    //map.setCellTerrainType(cell, 0);
    console.log('clicked', cell)
}

function animate() {
    requestAnimationFrame(animate);
    // render the stage
    renderer.render(stage);
}

const MAP_OPTIONS: MapOptions = {
    mapWidth: 60,
    mapHeight: 25,
    coordinateSystem: 2,
    hexLineWidth: 2,
    hexLineColor: 0xd0d0d0,
    hexWidth: 65,
    hexHeight: 65,
    hexBottomPad: 24,
    onHexClick: onHexClick,
    textures: [
        "assets/images/game/tileGrass.png",
        "assets/images/game/tileSand.png",
        "assets/images/game/tileDirt.png",
        "assets/images/game/tileRock.png",
        "assets/images/game/tileSnow.png",
        "assets/images/game/tileWater.png"
    ],
    terrainTypes: [
        //{ name: "empty", color: 0xffffff, isEmpty: true },
        { name: "grass", textureIndex: 0, color: 0x10fa10 },
        { name: "sand", textureIndex: 1, color: 0xdBd588 },
        { name: "dirt", textureIndex: 2, color: 0x9B5523 },
        { name: "rock", textureIndex: 3, color: 0x808080 },
        { name: "snow", textureIndex: 4, color: 0xe2e2fa },
        { name: "water", textureIndex: 5, color: 0x4060fa }
    ],
    onAssetsLoaded: function () { requestAnimationFrame(animate); }
};

function setupPixiJs() {
    // add the renderer view element to the DOM
    document.body.appendChild(renderer.view);

    map = new Map(stage, MAP_OPTIONS);
}

function initPage() {
    setupPixiJs();
    map.generateRandomMap();
}

initPage();
