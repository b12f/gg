import { Cell } from './hexpixi-cell';
import { updateLineStyle } from './pixi-helpers';
import * as PIXI from 'pixi.js';
import * as debug from 'debug';
const debugLog = debug('hexPixiJs:log');
const debugError = debug('hexPixiJs:error');

export type CornerCoordinate = [Coordinate, Coordinate, Coordinate];

export interface Coordinate {
    x: number;
    y: number;
}

export interface TerrainType {
    name: string;
    textureIndex?: number;
    tileIndex?: number;
    color: number;
    isEmpty?: boolean;
}

export interface MapOptions {
    coordinateSystem?: number;
    mapWidth?: number;
    mapHeight?: number;
    hexSize?: number,
    drawHexSize?: number,
    hexWidth?: number;
    hexHeight?: number;
    hexLineColor?: number;
    hexLineWidth?: number;
    showCoordinates?: boolean;
    onHexClick?: Function;
    onHexHover?: Function;
    onHexOut?: Function;
    dontBlurryImages?: boolean;

    sizeBasedOnTexture?: boolean;
    offsetX?: number;
    offsetY?: number;
    // Specify the types of terrain available on the map. Map cells reference these terrain
    // types by index. Add custom properties to extend functionality.
    terrainTypes?: TerrainType[];
    // Array of strings that specify the url of a texture. Can be referenced by index in terrainType.
    textures?: string[];
    // This is the pixel height specifying an area of overlap for hex cells. Necessary when
    // working with isometric view art systems.
    hexBottomPad?: number;
    onAssetsLoaded?: Function;
}

// There are four basic coordinate systems based on http://www.redblobgames.com/grids/hexagons/
const CoordinateSystems = [
    { name: 'odd-q', isFlatTop: true, isOdd: true },
    { name: 'even-q', isFlatTop: true, isOdd: false },
    { name: 'odd-r', isFlatTop: false, isOdd: true },
    { name: 'even-r', isFlatTop: false, isOdd: false }];

const defaultOptions: MapOptions = {
    // The HexPixi.CoordinateSystems index to use for the map.
    coordinateSystem: 1,
    // The map's number of cells across (cell column count).
    mapWidth: 10,
    // The map's number of cells high (cell row count).
    mapHeight: 10,
    // The radius of the hex. Ignored if hexWidth and hexHeight are set to non-null.
    hexSize: 40,
    drawHexSize: 40,
    // The pixel width of a hex.
    hexWidth: null,
    // The pixel height of a hex.
    hexHeight: null,
    // The color to use when drawing hex outlines.
    hexLineColor: 0x909090,
    // The width in pixels of the hex outline.
    hexLineWidth: 2,
    // If true then the hex's coordinates will be visible on the hex.
    showCoordinates: false,
    // Callback function (cell) that handles a hex being clicked on or tapped.
    onHexClick: null,
    onHexHover: null,
    onHexOut: null,
    dontBlurryImages: false,
    sizeBasedOnTexture: false,
    offsetX: 0,
    offsetY: 0,
    // Specify the types of terrain available on the map. Map cells reference these terrain
    // types by index. Add custom properties to extend functionality.
    terrainTypes: [{ name: 'empty', color: 0xffffff, isEmpty: true }],
    // Array of strings that specify the url of a texture. Can be referenced by index in terrainType.
    textures: [],
    // This is the pixel height specifying an area of overlap for hex cells. Necessary when
    // working with isometric view art systems.
    hexBottomPad: 0,
    onAssetsLoaded: function(){}
};

function createTexture (data: HTMLCanvasElement|string): PIXI.Texture {
    let texture: PIXI.Texture;

    if(data instanceof HTMLCanvasElement){
        texture = PIXI.Texture.fromCanvas(data);
    }else if(typeof data === 'string'){
        texture = PIXI.Texture.fromImage(data);
    }/*else if(typeof data._uvs !== 'undefined'){
        texture = data;
    }*/else{
        debugError('Error in texture loading! Format not compatible.');
    }

    return texture;
}

let i = 0;
function getEventCell(event: PIXI.interaction.InteractionEvent) {
    console.log(event.target);
    if(event.target && event.target.p_cell instanceof Cell) {
        return event.target.p_cell;
    }
}

function loadTexturesUrl(textures: string[], callback): Promise<PIXI.loaders.Resource> {
    return new Promise((resolve, reject) => {
        if (textures.length > 0) {
            // create a new loader
            let loader = new PIXI.loaders.Loader();
            loader.add(...textures);

            //begin load
            loader.load((loader, resources) => {
                resolve(resources);
            });

        } else {
            resolve();
        }
    });
}

// Scene graph heirarchy = pixiState -> container -> hexes
export class Map {
    public textures = [];
    public hexes = new PIXI.Graphics();
    public container = new PIXI.Container();
    public pixiStage = null;
    public options: MapOptions = null;
    public cells = [];
    public cellHighlighter = null;
    public inCellCount = 0;
    public hexAxis: Coordinate = { x: 0, y: 0 };
    public hexDrawAxis: Coordinate = { x: 0, y: 0 };
    public aspectRatio = 1;

    constructor(pixiStage, options: MapOptions) {
        this.init(pixiStage, options);
    }


    public init(pixiStage, options: MapOptions) {
        this.options = Object.assign(defaultOptions, options);

        // If we are overiding the top-down view method then need to force some settings
        if (this.options.hexWidth && this.options.hexHeight) {
            let cs = CoordinateSystems[this.options.coordinateSystem];
            this.options.hexSize = this.options.hexWidth / 2;
            this.aspectRatio = this.options.hexHeight / this.options.hexWidth;
            this.hexDrawAxis.x = this.hexAxis.x = cs.isFlatTop ? this.options.hexWidth : ((1 - (Math.sqrt(3) / 2)) * this.options.hexWidth) + this.options.hexWidth;
            this.hexDrawAxis.y = this.hexAxis.y = cs.isFlatTop ? ((1 - (Math.sqrt(3) / 2)) * this.options.hexHeight) + this.options.hexHeight : this.options.hexHeight;
        } else {
            this.aspectRatio = 1;
            this.options.hexWidth = this.getHexWidth();
            this.options.hexHeight = this.getHexHeight();
            this.hexAxis.x = this.options.hexSize * 2;
            this.hexAxis.y = this.options.hexSize * 2;
            this.hexDrawAxis.x = this.options.drawHexSize * 2;
            this.hexDrawAxis.y = this.options.drawHexSize * 2;
        }

        if (this.pixiStage === null) {
            this.pixiStage = pixiStage;
        }

        this.container.addChild(this.hexes);
        this.pixiStage.addChild(this.container);
        this.hexes.clear();
        this.loadTextures();

        if(this.options.hexLineWidth){
            // Setup cell hilighter
            let cell = new Cell(0, 0, [0]);

            cell.poly = this.createHexPoly(this.hexDrawAxis);
            let chg = this.createDrawHex_internal(cell, true, false);
            if (chg) {
                updateLineStyle.call(chg, 3, 0xff5521);
                this.cellHighlighter = new PIXI.Container();
                this.cellHighlighter.addChild(chg);
            } else {
                debugError('Error creating cell hilighter');
            }
        }
    }


    // Creates a hex shaped polygon that is used for the hex's hit area.
    public createHexPoly(hexAxis) {
        let i = 0,
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
    }

    // Creates a drawn hex while ignoring the cell's position. A new PIXI.Graphics object is created
    // and used to draw and (possibly) fill in the hex. The PIXI.Graphics is returned to the caller.
    public createDrawHex_internal(cell, hasOutline, hasFill) {
        let graphics = new PIXI.Graphics(),
            i = 0,
            color = this.options.terrainTypes[cell.terrainIndex].color ? this.options.terrainTypes[cell.terrainIndex].color : 0xffffff;

        if (cell.poly === null) {
            debugError('Cell\'s poly must first be defined by calling createHexPoly');
            return null;
        }

        if (hasOutline === false) {
            // If this is for masking then we don't need the line itself. Just the poly filled.
            graphics.lineStyle(0, 0, 1);
        } else {
            graphics.lineStyle(this.options.hexLineWidth, this.options.hexLineColor, 1);
        }

        if (hasFill !== false) {
            graphics.beginFill(color, 1);
        }

        graphics.moveTo(cell.poly.points[i], cell.poly.points[i+1]);

        for (i = 2; i < cell.poly.points.length; i += 2) {
            graphics.lineTo(cell.poly.points[i], cell.poly.points[i+1]);
        }

        if (hasFill !== false) {
            graphics.endFill();
        }

        return graphics;
    }

    // Used for manually drawing a hex cell. Creates the filled in hex, creates the outline (if there is one)
    // and then wraps them in a PIXI.Container.
    public createDrawnHex(cell: Cell): PIXI.Container {
        let parentContainer = new PIXI.Container();

        let cellInner = this.createDrawHex_internal(cell, false, true);
        cell.inner.push(cellInner);
        parentContainer.addChild(cellInner);

        if (this.options.hexLineWidth > 0) {
            cell.outline = this.createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;

        return parentContainer;
    }

    // Use for creating a hex cell with a textured background. First creates a PIXI.Graphics of the hex shape.
    // Next creates a PIXI.Sprite and uses the PIXI.Graphics hex as a mask. Masked PIXI.Sprite is added to parent
    // PIXI.Container. Hex outline (if there is one) is created and added to parent container.
    // Parent container is returned.
    public createTexturedHex(cell: Cell): PIXI.Container {
        let sprite = new PIXI.Sprite(this.textures[this.options.terrainTypes[cell.terrainIndex[0]].textureIndex]);
        let parentContainer = new PIXI.Container();

        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
        if(!this.options.sizeBasedOnTexture){
            sprite.width = this.options.hexWidth;
            sprite.height = this.options.hexHeight;
        }
        parentContainer.addChild(sprite);

        cell.inner.push(sprite);

        if (this.options.hexLineWidth > 0) {
            cell.outline = this.createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;

        return parentContainer;
    }

    public createMultitextureHex(cell: Cell): PIXI.Container {
        let sprites = [];
        let parentContainer = new PIXI.Container();

        let len = cell.terrainIndex.length;
        for (let i = 0; i < len; i++) {

            let terrain = this.options.terrainTypes[cell.terrainIndex[i]];
            let sprite = this.createSprite(terrain);

            parentContainer.addChild(sprite);
            cell.inner.push(sprite);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;
        return parentContainer;
    }

    public createSprite(terrainType: TerrainType): PIXI.Sprite {
        let texture = this.textures[terrainType.textureIndex];
        let sprite = new PIXI.Sprite(texture);

        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;

        if(!this.options.sizeBasedOnTexture){
            sprite.width = this.options.hexWidth;
            sprite.height = this.options.hexHeight;
        }

        return sprite;
    }

    // Use for creating a hex cell with a textured background that stands on it's own. The hex outline will
    // bee added if options.hexLineWidth is greater than 0. Parent container is returned.
    public createTileHex(cell: Cell): PIXI.Container {
        let sprite = new PIXI.Sprite(this.textures[this.options.terrainTypes[cell.terrainIndex[0]].tileIndex]),
            parentContainer = new PIXI.Container(),
            mask = null,
            topPercent = 0.5;

        sprite.width = this.options.hexWidth;
        sprite.height = this.options.hexHeight + this.options.hexBottomPad;

        topPercent = this.options.hexHeight / sprite.height;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = topPercent / 2;

        parentContainer.addChild(sprite);

        cell.inner.push(sprite);

        if (this.options.hexLineWidth > 0) {
            cell.outline = this.createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;

        return parentContainer;
    }

    public createEmptyHex(cell: Cell): PIXI.Container {
        let parentContainer = new PIXI.Container();

        cell.inner = [];

        if (this.options.hexLineWidth > 0) {
            cell.outline = this.createDrawHex_internal(cell, true, false);
            parentContainer.addChild(cell.outline);
        }

        parentContainer.position.x = cell.center.x;
        parentContainer.position.y = cell.center.y;

        return parentContainer;
    }

    // Calculates and returns the width of a hex cell.
    public getHexWidth(): number {
        let result = null,
            cs = CoordinateSystems[this.options.coordinateSystem];
        result = this.options.hexSize * 2;
        if (cs.isFlatTop === false) {
            result = Math.sqrt(3) / 2 * result;
        }

        return result;
    }

    // Calculates and returns the height of a hex cell.
    public getHexHeight(): number {
        let result = null,
            cs = CoordinateSystems[this.options.coordinateSystem];
        result = this.options.hexSize * 2;
        if (cs.isFlatTop === true) {
            result = Math.sqrt(3) / 2 * result;
        }

        return result;
    }

    // Calculate the center of a cell based on column, row and coordinate system.
    public getCellCenter(column: number, row: number): { x: number, y: number} {
        let incX = 0.75 * this.options.hexWidth,
            incY = this.options.hexHeight,
            cs = CoordinateSystems[this.options.coordinateSystem],
            center = { x: 0, y: 0 },
            offset = (cs.isOdd) ? 0 : 1;

        if (cs.isFlatTop) {
            center.x = (column * incX) + (this.options.hexWidth / 2);
            if ((column + offset) % 2) {
                // even
                center.y = (row * incY) + (incY / 2);
            } else {
                // odd
                center.y = (row * incY) + incY;
            }
        } else {
            incX = this.options.hexWidth;
            incY = (0.75 * this.options.hexHeight);
            center.y = (row * incY) + (this.options.hexHeight / 2);
            offset = (cs.isOdd) ? 1 : 0;
            if ((row + offset) % 2) {
                // even
                center.x = (column * incX) + (this.options.hexWidth / 2);
            } else {
                // odd
                center.x = (column * incX) + this.options.hexWidth;
            }
        }

        //center.y -= this.options.hexBottomPad;
        center.x += this.options.offsetX;
        center.y += this.options.offsetY;

        return center;
    }

    // Takes a cell and creates all the graphics to display it.
    public createCell(cell: Cell): PIXI.Container {
        cell.center = this.getCellCenter(cell.column, cell.row);

        // Generate poly first then use poly to draw hex and create masks and all that.
        cell.poly = this.createHexPoly(this.hexDrawAxis);
        cell.hitPoly = this.createHexPoly(this.hexAxis);

        // Create the hex or textured hex
        let hex = null;

        if (cell.terrainIndex.length > 1) {
            hex = this.createMultitextureHex(cell);
        }else{
            let terrain = this.options.terrainTypes[cell.terrainIndex[0]];
            if (typeof terrain.isEmpty !== 'undefined' && terrain.isEmpty === true) {
                hex = this.createEmptyHex(cell);
            }else if (terrain.textureIndex >= 0) {
                hex = this.createTexturedHex(cell);
            } else if (terrain.tileIndex >= 0) {
                hex = this.createTileHex(cell);
            } else {
                hex = this.createDrawnHex(cell);
            }
        }

        // Text is a child of the display object container containing the hex.
        if (this.options.showCoordinates) {
            cell.text = new PIXI.Text('1', {
                fontFamily: 'Arial',
                fontSize: '10px',
                fill: 'black',
                dropShadow: true,
                dropShadowDistance: 1,
                dropShadowColor: 'white'
            });
            cell.text.text = (3-(cell.row - (-cell.column - (-cell.column & 1)) / 2)).toString() + ', ' + (cell.column).toString();
            cell.text.position.x = -Math.round((cell.text.width / 2));
            cell.text.position.y = 8 - Math.round(this.options.hexHeight / 2);
            hex.addChild(cell.text);
        }

        if(this.options.dontBlurryImages){
            hex.position.x = Math.ceil(hex.position.x);
            hex.position.y = Math.ceil(hex.position.y);

            if(Math.round(hex.width) % 2 !== 0 )
                hex.position.x += 0.5;

            if(Math.round(hex.height) % 2 !== 0 )
                hex.position.y += 0.5;
        }

        // Set a property on the hex that references the cell.
        hex.p_cell = cell;
        hex.p_cell.hex = hex;

        return hex;
    }

    // A wrapper for createCell that adds interactivity to the individual cells.
    public createInteractiveCell(_cell: Cell): PIXI.Container {
        let hex = this.createCell(_cell);
        hex.hitArea = _cell.hitPoly;
        hex.interactive = true;
        let _this = this;

        // set the mouseover callback..
        hex.on('mouseover', (data: PIXI.interaction.InteractionEvent) => {
            let cell = getEventCell(data);

            if(cell && _this.cellHighlighter){
                _this.cellHighlighter.position.x = cell.center.x;
                _this.cellHighlighter.position.y = cell.center.y;

                if (_this.inCellCount === 0) {
                    _this.hexes.addChild(_this.cellHighlighter);
                }
            }

            if (cell && cell.isOver !== true) {
                cell.isOver = true;
                _this.inCellCount++;
            }

            if (cell && _this.options.onHexHover) {
                _this.options.onHexHover(_this, cell);
            }
        });

        // set the mouseout callback..
        hex.on('mouseout', (data: PIXI.interaction.InteractionEvent) => {
            let cell = getEventCell(data);
            if (cell && cell.isOver === true) {
                _this.inCellCount--;

                if (_this.inCellCount === 0 && _this.cellHighlighter) {
                    _this.hexes.removeChild(_this.cellHighlighter);
                }

                cell.isOver = false;
            }
            if (cell && _this.options.onHexOut) {
                _this.options.onHexOut(_this, cell);
            }
        });

        hex.on('click', (data: PIXI.interaction.InteractionEvent) => {
            let cell = getEventCell(data);
            if (cell && _this.options.onHexClick) {
                _this.options.onHexClick(_this, data.target.p_cell);
            }
        });

        hex.on('tap', (data: PIXI.interaction.InteractionEvent) => {
            let cell = getEventCell(data);
            if (cell && _this.options.onHexClick) {
                _this.options.onHexClick(_this, data.target.p_cell);
            }
        });

        return hex;
    }

    // Loads all the textures specified in options.
    public loadTextures() {
        this.textures = [];

        let texturesStrings = [];
        let i;

        for (i = 0; i < this.options.textures.length; i++) {
            let texture = createTexture(this.options.textures[i]);
            if(texture)
                this.textures.push(texture);
        }

        for (i = 0; i < this.options.textures.length; i++) {
            if(typeof this.options.textures[i] === 'string') {
                texturesStrings.push(this.options.textures[i]);
            }
        }

        loadTexturesUrl(texturesStrings, this.options.onAssetsLoaded);
    }

    // Clears out all objects from this.hexes.children.
    public clearHexes() {
        while (this.hexes.children.length) {
            this.hexes.removeChild(this.hexes.children[0]);
        }
    }

    // Resets the entire map without destroying the HexPixi.Map instance.
    public reset (options) {
        while (this.cells.length > 0) {
            while (this.cells[0].length > 0) {
                this.cells[0].splice(0, 1);
            }
            this.cells.splice(0, 1);
        }

        this.clearHexes();

        while (this.container.children.length > 0) {
            this.container.removeChildAt(0);
        }

        this.pixiStage.removeChild(this.container);

        if (this.cellHighlighter) {
            this.cellHighlighter = null;
        }

        this.init(this.pixiStage, options);
    }

    // Clears the scene graph and recreates it from this.cells.
    public createSceneGraph() {
        let cell = null,
            row = null,
            rowIndex = 0,
            colIndex = 0;

        this.clearHexes();
        while (rowIndex < this.cells.length) {
            row = this.cells[rowIndex];
            colIndex = 0;
            while (colIndex < row.length) {
                cell = row[colIndex];
                this.hexes.addChild(this.createInteractiveCell(cell));
                colIndex++;
            }
            rowIndex++;
        }
    }

    public generateRandomMap() {
        let column, rnd, cell;
        for (let row = 0; row < this.options.mapHeight; row++) {
            this.cells.push([]);
            for (column = 0; column < this.options.mapWidth; column += 2) {
                rnd = Math.floor((Math.random() * this.options.terrainTypes.length));
                cell = new Cell(row, column, [rnd], null);
                this.cells[cell.row].push(cell);
            }
            for (column = 1; column < this.options.mapWidth; column+=2) {
                rnd = Math.floor((Math.random() * this.options.terrainTypes.length));
                cell = new Cell(row, column, [rnd], null);
                this.cells[cell.row].push(cell);
            }
        }
        this.createSceneGraph();
    }

    public generateBlankMap() {
        let column, cell;
        for (let row = 0; row < this.options.mapHeight; row++) {
            this.cells.push([]);
            for (column = 0; column < this.options.mapWidth; column += 2) {
                cell = new Cell(row, column, [0], null);
                this.cells[cell.row].push(cell);
            }
            for (column = 1; column < this.options.mapWidth; column += 2) {
                cell = new Cell(row, column, [0], null);
                this.cells[cell.row].push(cell);
            }
        }
        this.createSceneGraph();
    }

    public generateProceduralMap(callback) {
        let column, row;
        for (row = 0; row < this.options.mapHeight; row++) {
            this.cells.push([]);
            for (column = 0; column < this.options.mapWidth; column += 2) {
                this.createProceduralCell(callback, column, row);
            }
            for (column = 1; column < this.options.mapWidth; column += 2) {
                this.createProceduralCell(callback, column, row);
            }
        }
        this.createSceneGraph();
    }

    public createProceduralCell(callback, column, row) {
        let data = callback(column, row);
        let cellData = (typeof data.data !== 'undefined') ? data.data : null;
        let cell = new Cell(row, column, data.type, cellData);
        this.cells[cell.row].push(cell);
    }

    public search(callback) {
        for (let i = this.cells.length - 1; i >= 0; i--) {
            for (let j = this.cells[i].length - 1; j >= 0; j--) {
                let cell = this.cells[i][j];
                if(callback(cell))
                    return cell;
            }
        }

        return false;
    }

    public changeTexture(index, image: string|HTMLCanvasElement) {
        if(image instanceof HTMLCanvasElement){

            this.textures[index] = PIXI.Texture.fromCanvas(image);

        }else if(typeof image === 'string'){

            this.textures[index] = PIXI.Texture.fromImage(image);

        }/*else if(typeof image._uvs !== 'undefined'){

            this.textures[index] = this.options.textures[index];

        }*/else{
            debugError('Error in texture loading! Format not compatible.');
        }

        this.createSceneGraph();
    }

    public changeCellTerrainIndexInLayer(cell, newTerrainIndex, layer) {
        let terrainIndex = cell.terrainIndex[layer];

        let textureIndex = this.options.terrainTypes[newTerrainIndex].textureIndex;
        let texure = this.textures[textureIndex];

        cell.terrainIndex[layer] = newTerrainIndex;
        cell.inner[layer].texture = texure;
    }
}
