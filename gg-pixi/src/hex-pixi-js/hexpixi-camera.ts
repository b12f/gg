export class Camera {
    private _position = { x: 0, y: 0 };
    constructor(
        public map
    ) {}

    updateSceneGraph() {}

    position(x: number, y: number) {
        let result = this._position;

        if (x >= 0 && y >= 0) {
            this._position.x = x;
            this._position.y = y;
            this.updateSceneGraph();
        }

        return result;
    }
}
